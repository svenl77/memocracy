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
  proposals: Array<{
    id: string;
    title: string;
    description: string;
    proposalType: string;
    status: string;
    votesFor: number;
    votesAgainst: number;
    createdAt: string;
    votingEndsAt: string;
  }>;
  comments: Array<{
    id: string;
    walletAddress: string;
    content: string;
    rating: number | null;
    createdAt: string;
  }>;
  trustScore: {
    overallScore: number;
    tier: string;
  } | null;
  progressPercentage: number;
  isFullyFunded: boolean;
}

export default function FoundingWalletDetail() {
  const params = useParams();
  const [wallet, setWallet] = useState<FoundingWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "proposals" | "contributors" | "comments">("overview");

  useEffect(() => {
    if (params.id) {
      fetchWalletData();
    }
  }, [params.id]);

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
                { id: "proposals", label: "Proposals", icon: "📋" },
                { id: "contributors", label: "Contributors", icon: "👥" },
                { id: "comments", label: "Comments", icon: "💬" },
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-3xl font-bold text-purple-600">{wallet.contributors.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Contributors</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-3xl font-bold text-blue-600">{wallet.proposals.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Proposals</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-3xl font-bold text-green-600">
                      ${wallet.currentBalanceUSD.toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Raised</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <p className="text-3xl font-bold text-yellow-600">{wallet.comments.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Comments</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contributors" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contributors</h2>
                {wallet.contributors.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No contributors yet</p>
                ) : (
                  <div className="space-y-3">
                    {wallet.contributors.map((contributor, index) => (
                      <div
                        key={contributor.walletAddress}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between"
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

            {activeTab === "proposals" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Proposals</h2>
                {wallet.proposals.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No proposals yet</p>
                ) : (
                  <div className="space-y-4">
                    {wallet.proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                              {proposal.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">{proposal.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                {proposal.proposalType}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded border ${getStatusColor(
                                  proposal.status
                                )}`}
                              >
                                {proposal.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>👍 {proposal.votesFor}</span>
                            <span>👎 {proposal.votesAgainst}</span>
                            <span>
                              Ends: {format(new Date(proposal.votingEndsAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments & Reviews</h2>
                {wallet.comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-4">
                    {wallet.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-gray-600">
                              {comment.walletAddress.slice(0, 8)}...
                              {comment.walletAddress.slice(-8)}
                            </p>
                            {comment.rating && (
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={i < comment.rating! ? "text-yellow-400" : "text-gray-300"}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
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
