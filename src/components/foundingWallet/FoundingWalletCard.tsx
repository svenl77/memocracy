"use client";

import Link from "next/link";
import { format } from "date-fns";

interface FoundingWallet {
  id: string;
  label: string;
  address: string;
  description: string | null;
  fundingGoalUSD: number | null;
  currentBalanceUSD: number;
  status: string;
  contributorCount: number;
  transactionCount: number;
  coin: {
    id: string;
    mint: string;
    symbol: string;
    name: string;
  } | null;
  trustScore: {
    overallScore: number;
    tier: string;
  } | null;
}

interface FoundingWalletCardProps {
  wallet: FoundingWallet;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 border-green-200";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    case "FUNDED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getTierEmoji = (tier: string): string => {
  switch (tier) {
    case "DIAMOND":
      return "💎";
    case "GOLD":
      return "🥇";
    case "SILVER":
      return "🥈";
    case "BRONZE":
      return "🥉";
    default:
      return "❓";
  }
};

export default function FoundingWalletCard({ wallet }: FoundingWalletCardProps) {
  const progressPercentage =
    wallet.fundingGoalUSD && wallet.fundingGoalUSD > 0
      ? Math.min((wallet.currentBalanceUSD / wallet.fundingGoalUSD) * 100, 100)
      : 0;

  const isFullyFunded =
    wallet.fundingGoalUSD && wallet.currentBalanceUSD >= wallet.fundingGoalUSD;

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-300">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{wallet.label}</h3>
            <p className="text-sm text-gray-600 font-mono mb-2">
              {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
            </p>
            {wallet.coin && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  {wallet.coin.symbol}
                </span>
                <span className="text-xs text-gray-600">{wallet.coin.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                wallet.status
              )}`}
            >
              {wallet.status}
            </span>
            {wallet.trustScore && (
              <div className="flex items-center gap-1">
                <span className="text-lg">{getTierEmoji(wallet.trustScore.tier)}</span>
                <span className="text-sm font-bold">{wallet.trustScore.overallScore}</span>
              </div>
            )}
          </div>
        </div>

        {wallet.description && (
          <p className="text-sm text-gray-700 line-clamp-2">{wallet.description}</p>
        )}
      </div>

      {/* Funding Progress */}
      {wallet.fundingGoalUSD && wallet.fundingGoalUSD > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Funding Progress</span>
            <span className="text-sm font-bold text-purple-600">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isFullyFunded
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-purple-500 to-blue-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>${wallet.currentBalanceUSD.toFixed(2)}</span>
            <span>${wallet.fundingGoalUSD.toFixed(2)} goal</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{wallet.contributorCount}</p>
            <p className="text-xs text-gray-600 mt-1">Contributors</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{wallet.transactionCount}</p>
            <p className="text-xs text-gray-600 mt-1">Transactions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${wallet.currentBalanceUSD.toFixed(0)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Raised</p>
          </div>
        </div>

        <Link
          href={`/founding-wallet/${wallet.id}`}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 text-center block font-semibold shadow-lg hover:shadow-xl"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
