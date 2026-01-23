"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import Header from "@/components/Header";

interface FoundingWallet {
  id: string;
  address: string;
  label: string;
  description: string | null;
  fundingGoalUSD: number | null;
  fundingGoalLamports: string | null;
  status: string;
  currentBalanceUSD: number;
  currentBalanceLamports: string;
  actualBalanceSOL?: number;
  creatorWallet: string | null;
  completedAt: string | null;
  createdAt: string;
  coin: {
    id: string;
    mint: string;
    symbol: string;
    name: string;
  } | null;
  contributors: Array<{
    walletAddress: string;
    totalContributedUSD: number;
    contributionCount: number;
  }>;
  trustScore: {
    overallScore: number;
    tier: string;
  } | null;
  progressPercentage: number;
  isFullyFunded: boolean;
}

interface Transaction {
  id?: string;
  signature: string;
  fromWallet: string;
  toWallet: string;
  amountLamports: string;
  amountUSD?: number;
  tokenMint?: string;
  transactionType: string;
  blockTime: number | null;
  slot: number;
  createdAt?: string;
  memo?: string | null;
  projectIdFromMemo?: string | null;
}

export default function FoundingWalletDetail() {
  const params = useParams();
  const [wallet, setWallet] = useState<FoundingWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "contributors">("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchWalletData();
    }
  }, [params.id]);

  useEffect(() => {
    if (activeTab === "transactions" && params.id) {
      fetchTransactions();
    }
  }, [activeTab, params.id]);

  const fetchWalletData = async () => {
    try {
      const response = await fetch(`/api/founding-wallets/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch founding wallet");
      }
      const data = await response.json();
      setWallet(data);
    } catch (error: any) {
      console.error("Failed to fetch wallet:", error);
      setError(error.message || "Failed to load founding wallet");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await fetch(`/api/founding-wallets/${params.id}/transactions?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleScanTransactions = async () => {
    setScanning(true);
    setScanMessage(null);
    
    try {
      const response = await fetch(`/api/founding-wallets/${params.id}/scan`, {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to scan");
      }
      
      setScanMessage(
        data.updated 
          ? `✅ Found ${data.newTransactions} new transaction(s)!`
          : "ℹ️ No new transactions found"
      );
      
      // Refresh wallet data and transactions
      await Promise.all([fetchWalletData(), fetchTransactions()]);
    } catch (error: any) {
      setScanMessage(`❌ Error: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">{error || "Founding wallet not found"}</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
              ← Back to Communities
            </Link>
          </div>
        </div>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">{wallet.label}</h1>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
                      wallet.status
                    )}`}
                  >
                    {wallet.status}
                  </span>
                </div>
                <p className="text-gray-600 font-mono text-sm mb-2">
                  {wallet.address}
                </p>
                {wallet.coin && (
                  <Link
                    href={`/coin/${wallet.coin.mint}`}
                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>🪙</span>
                    <span>{wallet.coin.name} ({wallet.coin.symbol})</span>
                  </Link>
                )}
              </div>
              {wallet.trustScore && (
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl">
                      {wallet.trustScore.tier === "DIAMOND" ? "💎" :
                       wallet.trustScore.tier === "GOLD" ? "🥇" :
                       wallet.trustScore.tier === "SILVER" ? "🥈" :
                       wallet.trustScore.tier === "BRONZE" ? "🥉" : "❓"}
                    </span>
                    <span className="text-sm font-bold">{wallet.trustScore.tier}</span>
                  </div>
                  <p className="text-4xl font-bold">{wallet.trustScore.overallScore}</p>
                  <p className="text-xs text-gray-600">/100</p>
                </div>
              )}
            </div>

            {wallet.description && (
              <p className="text-lg text-gray-700 mb-6">{wallet.description}</p>
            )}

            {/* Contribute Button */}
            <div className="mb-6">
              <Link
                href={`/pay/${wallet.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span>💰</span>
                <span>Contribute to this Project</span>
              </Link>
            </div>

            {/* Current Balance */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-900">Current Balance</span>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">
                    {wallet.actualBalanceSOL !== undefined 
                      ? `${wallet.actualBalanceSOL.toFixed(4)} SOL`
                      : `${(parseInt(wallet.currentBalanceLamports) / 1e9).toFixed(4)} SOL`
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    ${wallet.currentBalanceUSD.toFixed(2)} USD
                  </p>
                </div>
              </div>
            </div>

            {/* Funding Progress */}
            {wallet.fundingGoalUSD && wallet.fundingGoalUSD > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-900">Funding Progress</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {wallet.progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      wallet.isFullyFunded
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : "bg-gradient-to-r from-purple-500 to-blue-500"
                    }`}
                    style={{ width: `${wallet.progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="font-semibold">${wallet.currentBalanceUSD.toFixed(2)} raised</span>
                  <span className="font-semibold">${wallet.fundingGoalUSD.toFixed(2)} goal</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg p-2 border border-gray-100">
            <div className="flex space-x-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview", icon: "📊" },
                { id: "transactions", label: "Transactions", icon: "💸" },
                { id: "contributors", label: "Contributors", icon: "👥" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-3xl font-bold text-purple-600">{wallet.contributors.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Contributors</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-3xl font-bold text-green-600">
                      ${wallet.currentBalanceUSD.toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Raised</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-3xl font-bold text-blue-600">
                      {wallet.fundingGoalUSD ? `${wallet.progressPercentage.toFixed(0)}%` : "—"}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Progress</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contributors" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contributors</h2>
                {wallet.contributors.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-500 text-lg mb-2">No contributors yet</p>
                    <p className="text-gray-400 text-sm">Be the first to contribute to this wallet!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wallet.contributors.map((contributor, index) => (
                      <div
                        key={contributor.walletAddress}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-mono text-sm text-gray-900">
                              {contributor.walletAddress.slice(0, 8)}...
                              {contributor.walletAddress.slice(-8)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {contributor.contributionCount} contribution{contributor.contributionCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            ${contributor.totalContributedUSD.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
                  <button
                    onClick={handleScanTransactions}
                    disabled={scanning}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {scanning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Scanning...
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        Scan for New Transactions
                      </>
                    )}
                  </button>
                </div>

                {scanMessage && (
                  <div className={`p-4 rounded-xl border ${
                    scanMessage.includes("✅") 
                      ? "bg-green-50 border-green-200 text-green-800"
                      : scanMessage.includes("❌")
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}>
                    <p className="text-sm font-medium">{scanMessage}</p>
                  </div>
                )}

                {loadingTransactions ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💸</div>
                    <p className="text-gray-500 text-lg mb-2">No transactions yet</p>
                    <p className="text-gray-400 text-sm mb-4">
                      Click "Scan for New Transactions" to check for deposits
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.signature}
                        className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">💰</span>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {(parseInt(tx.amountLamports) / 1e9).toFixed(6)} SOL
                                </p>
                                {tx.amountUSD && tx.amountUSD > 0.01 && (
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    ${tx.amountUSD.toFixed(2)} USD
                                  </p>
                                )}
                                {(!tx.amountUSD || tx.amountUSD <= 0.01) && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    ${tx.amountUSD ? tx.amountUSD.toFixed(6) : '0.00'} USD
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                  From: {tx.fromWallet.slice(0, 8)}...{tx.fromWallet.slice(-8)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                                {tx.transactionType}
                              </span>
                              {tx.tokenMint && (
                                <span className="text-xs text-gray-600">
                                  Token: {tx.tokenMint.slice(0, 8)}...
                                </span>
                              )}
                              {tx.memo && (
                                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                                  <span>📝</span>
                                  <span>Memo: {tx.memo.length > 30 ? `${tx.memo.slice(0, 30)}...` : tx.memo}</span>
                                </span>
                              )}
                              {tx.projectIdFromMemo && (
                                <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                  ✓ Auto-identified via Memo
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {tx.blockTime 
                                ? format(new Date(tx.blockTime * 1000), "MMM d, yyyy 'at' h:mm a")
                                : tx.createdAt
                                ? format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")
                                : "Unknown date"
                              }
                            </p>
                            <a
                              href={`https://solscan.io/tx/${tx.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:text-purple-800 mt-1 inline-block"
                            >
                              View on Solscan →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
