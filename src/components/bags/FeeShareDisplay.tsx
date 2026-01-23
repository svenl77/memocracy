"use client";

import { useState, useEffect } from "react";
import { Copy, ExternalLink, Wallet, TrendingUp } from "lucide-react";
import type { BagsFeeShareInfo } from "@/lib/bagsFeeShare";

interface FeeShareDisplayProps {
  tokenMint: string;
}

export default function FeeShareDisplay({ tokenMint }: FeeShareDisplayProps) {
  const [feeShareInfo, setFeeShareInfo] = useState<BagsFeeShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeeShareInfo() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/coin/${encodeURIComponent(tokenMint)}/fee-shares`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Not a Bags token - this is fine, just don't show the component
            setFeeShareInfo(null);
            return;
          }
          throw new Error(`Failed to fetch fee share info: ${response.statusText}`);
        }

        const data = await response.json();
        setFeeShareInfo(data);
      } catch (err) {
        console.error("Error fetching fee share info:", err);
        setError(err instanceof Error ? err.message : "Failed to load fee share information");
      } finally {
        setLoading(false);
      }
    }

    fetchFeeShareInfo();
  }, [tokenMint]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error || !feeShareInfo) {
    return null; // Don't show anything if not a Bags token or error
  }

  const formatAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${(percentage * 100).toFixed(2)}%`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">
          🎯 Fee Distribution (Bags Coin)
        </h2>
        {feeShareInfo.createdByMemocracy && (
          <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
            Created via Memocracy
          </span>
        )}
        {!feeShareInfo.createdByMemocracy && (
          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
            Existing Bags Token
          </span>
        )}
      </div>

      {/* Total Lifetime Fees */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Lifetime Fees</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(feeShareInfo.lifetimeFees)}
            </p>
          </div>
          {feeShareInfo.totalVolume && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Volume</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(feeShareInfo.totalVolume)}
              </p>
            </div>
          )}
        </div>
        {feeShareInfo.totalTrades && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Total Trades: <span className="font-semibold">{feeShareInfo.totalTrades.toLocaleString()}</span>
            </p>
          </div>
        )}
      </div>

      {/* Creators (created by / royalties to) */}
      {feeShareInfo.creators && feeShareInfo.creators.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Creators & Royalties</h3>
          <div className="space-y-2">
            {feeShareInfo.creators.map((creator, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {creator.label || "Creator"}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-600 font-mono">
                        {formatAddress(creator.wallet)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(creator.wallet)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                      <a
                        href={`https://solscan.io/account/${creator.wallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="View on Solscan"
                      >
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPercentage(creator.share)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(feeShareInfo.lifetimeFees * creator.share)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Shares */}
      {feeShareInfo.feeShares.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Fee Shares</h3>
          <div className="space-y-2">
            {feeShareInfo.feeShares.map((feeShare, index) => (
              <div
                key={index}
                className="p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-gray-400" />
                    <div>
                      {feeShare.label ? (
                        <p className="text-sm font-medium text-gray-900">
                          {feeShare.label}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-gray-600">
                          Wallet {index + 1}
                        </p>
                      )}
                      {feeShare.description && (
                        <p className="text-xs text-gray-500">{feeShare.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPercentage(feeShare.percentage)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(feeShare.lifetimeEarnings)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <code className="text-xs text-gray-600 font-mono flex-1">
                    {formatAddress(feeShare.walletAddress)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(feeShare.walletAddress)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy address"
                  >
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                  <a
                    href={`https://solscan.io/account/${feeShare.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="View on Solscan"
                  >
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Fee (only for Memocracy-created coins) */}
      {feeShareInfo.platformFee && (
        <div className="mb-6">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Platform Fee</p>
                <p className="text-xs text-blue-600">Memocracy Platform</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-900">
                  {formatPercentage(feeShareInfo.platformFee.percentage)}
                </p>
                <p className="text-xs text-blue-600">
                  {formatCurrency(feeShareInfo.platformFee.lifetimeEarnings)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holder Share */}
      {feeShareInfo.holderShare.percentage > 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">👥 Holder Share</p>
              <p className="text-xs text-green-600">
                Distributed to all token holders
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-900">
                {formatPercentage(feeShareInfo.holderShare.percentage)}
              </p>
              <p className="text-sm text-green-700">
                {formatCurrency(feeShareInfo.holderShare.lifetimeEarnings)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Link to Bags.fm */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <a
          href={`https://bags.fm/${tokenMint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View on Bags.fm <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
