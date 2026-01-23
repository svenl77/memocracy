"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import TrustScorePreview from "@/components/trustScore/TrustScorePreview";
import CoinVoteButtons from "@/components/coinVote/CoinVoteButtons";
import FoundingWalletCard from "@/components/foundingWallet/FoundingWalletCard";
import SocialLinks from "@/components/coin/SocialLinks";
import FeeShareDisplay from "@/components/bags/FeeShareDisplay";

interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap?: number;
  liquidity?: number;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
}

interface Poll {
  id: string;
  topic: string;
  options: string[];
  startAt: string;
  endAt: string;
  createdAt: string;
  results: Array<{
    option: string;
    count: number;
  }>;
  totalVotes: number;
  status: string;
}

interface ProjectWallet {
  id: string;
  address: string;
  label: string;
  createdAt: string;
  pollCount: number;
  totalVotes: number;
  latestPoll: string | null;
  polls: Array<{
    id: string;
    topic: string;
    status: string;
    totalVotes: number;
    createdAt: string;
  }>;
}

interface CoinData {
  identifier: string;
  pollType: "COIN" | "WALLET";
  tokenCA: string | null;
  projectWallet: {
    address: string;
    label: string;
  } | null;
  coin: {
    id: string;
    mint: string;
    symbol: string;
    name: string;
  } | null;
  tokenMetadata: TokenMetadata | null;
  projectWallets: ProjectWallet[];
  stats: {
    totalPolls: number;
    activePolls: number;
    totalVotes: number;
    uniqueVoters: number;
  };
  polls: Poll[];
  voters: string[];
  voteStats?: {
    upvotes: number;
    downvotes: number;
    netScore: number;
    totalVotes: number;
  };
  foundingWallets?: Array<{
    id: string;
    address: string;
    label: string;
    description: string | null;
    fundingGoalUSD: number | null;
    currentBalanceUSD: number;
    status: string;
    contributorCount: number;
    transactionCount: number;
    coin?: {
      id: string;
      mint: string;
      symbol: string;
      name: string;
    } | null;
    trustScore: {
      overallScore: number;
      tier: string;
    } | null;
    createdAt: string;
  }>;
}

export default function CoinDashboard() {
  const params = useParams();
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createSuggestion, setCreateSuggestion] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (params.ca) {
      fetchCoinData();
    }
  }, [params.ca]);

  const fetchCoinData = async () => {
    try {
      const response = await fetch(`/api/coin/${params.ca}`);
      const data = await response.json();
      
      if (!response.ok) {
        if (data.suggestion === "create" && data.mint) {
          setCreateSuggestion(data.mint);
          setError("");
        } else {
          // Even if no suggestion, allow creation with the searched address
          setError(data.error || "Coin not found");
        }
      } else {
        setCoinData(data);
      }
    } catch (error: any) {
      console.error("Failed to fetch coin data:", error);
      // On error, still allow creation with the searched address
      setError(error.message || "Failed to load coin data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoin = async () => {
    if (!createSuggestion || isCreating) return;

    try {
      setIsCreating(true);
      const response = await fetch("/api/coin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint: createSuggestion }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create coin");
      }

      // Reload the page to show the new coin
      window.location.reload();
    } catch (error: any) {
      console.error("Failed to create coin:", error);
      setError(error.message || "Failed to create coin");
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-yellow-100 text-yellow-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading coin dashboard...</div>
      </div>
    );
  }

  // Show "Create Coin" UI if coin doesn't exist
  const mintToCreate = createSuggestion || ((error || !coinData) && params.ca ? params.ca as string : null);
  
  if (mintToCreate) {
    const handleCreateCoinFromError = async () => {
      if (isCreating) return;

      try {
        setIsCreating(true);
        setError("");
        const response = await fetch("/api/coin/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mint: mintToCreate }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create coin");
        }

        // Reload the page to show the new coin
        window.location.reload();
      } catch (error: any) {
        console.error("Failed to create coin:", error);
        setError(error.message || "Failed to create coin");
        setIsCreating(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-200">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
              <span className="text-4xl">🔍</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Coin Not Found
            </h2>
            <p className="text-gray-600 text-lg">
              This memecoin hasn't been added to the platform yet. Start a free analysis and create a new community for this coin to enable trust score analysis, community voting, and sentiment tracking.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Token Address:</p>
            <code className="text-sm bg-white px-3 py-2 rounded border border-gray-200 break-all">
              {mintToCreate}
            </code>
          </div>

          <button
            onClick={createSuggestion ? handleCreateCoin : handleCreateCoinFromError}
            disabled={isCreating}
            className={`
              px-8 py-4 rounded-xl font-semibold text-lg transition-all transform
              ${
                isCreating
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 shadow-lg hover:shadow-xl"
              }
              text-white w-full
            `}
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Coin & Running Analysis...
              </span>
            ) : (
              "🚀 Start Free Analysis Now and Create a New Community for this Coin"
            )}
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-2">✨ What you'll get:</p>
            <ul className="text-sm text-blue-700 text-left space-y-1 list-disc list-inside">
              <li>Complete Trust Score Analysis</li>
              <li>Community Voting System</li>
              <li>Sentiment Tracking</li>
              <li>Price & Market Data</li>
            </ul>
          </div>

          <Link
            href="/"
            className="block mt-6 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Memecoin Communities
          </Link>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || !coinData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">{error || "Coin not found"}</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Memecoin Communities
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Coin Header */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-xl p-8 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/20 to-blue-200/20 rounded-full translate-y-12 -translate-x-12"></div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg relative overflow-hidden">
              {coinData.pollType === "COIN" ? (
                <>
                  <img
                    src={coinData.tokenMetadata?.image || `/api/token-image/${coinData.tokenCA}`}
                    alt={`${coinData.tokenMetadata?.name || 'Token'} logo`}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl">
                    {coinData.tokenMetadata?.symbol?.charAt(0) || coinData.tokenCA?.charAt(0) || "T"}
                  </span>
                </>
              ) : (
                <span className="flex items-center justify-center text-white font-bold text-2xl">
                  💳
                </span>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {coinData.pollType === "COIN" 
                  ? (coinData.tokenMetadata?.name || coinData.coin?.name || "Token Community")
                  : (coinData.projectWallet?.label || "Project Wallet Community")
                }
              </h1>
              <p className="text-gray-600 font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg inline-block">
                {coinData.pollType === "COIN" 
                  ? (coinData.tokenMetadata?.symbol || coinData.coin?.symbol || coinData.tokenCA?.slice(0, 12) || "TOKEN")
                  : (coinData.projectWallet?.address?.slice(0, 12) || "WALLET")
                }...
              </p>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  coinData.pollType === "COIN" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {coinData.pollType === "COIN" ? "🪙 Token-Gated" : "💳 Contribution-Gated"}
                </span>
              </div>
              {/* Social Links - Only for COIN mode */}
              {coinData.pollType === "COIN" && coinData.tokenMetadata && (
                <SocialLinks
                  website={coinData.tokenMetadata.website}
                  twitter={coinData.tokenMetadata.twitter}
                  telegram={coinData.tokenMetadata.telegram}
                  discord={coinData.tokenMetadata.discord}
                  github={coinData.tokenMetadata.github}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            {/* Vote Buttons - Only for COIN mode */}
            {coinData.pollType === "COIN" && coinData.coin && coinData.voteStats && (
              <CoinVoteButtons
                coinMint={coinData.coin.mint}
                initialStats={coinData.voteStats}
              />
            )}
          </div>
        </div>

        {/* Token Price & Stats - Only for COIN mode */}
        {coinData.pollType === "COIN" && coinData.tokenMetadata && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
              <h3 className="text-sm font-medium opacity-90 mb-2">Current Price</h3>
              <p className="text-3xl font-bold">
                ${coinData.tokenMetadata.price.toFixed(6)}
              </p>
              <p className={`text-sm font-medium mt-1 ${
                coinData.tokenMetadata.priceChange24h >= 0 ? 'text-green-200' : 'text-red-200'
              }`}>
                {coinData.tokenMetadata.priceChange24h >= 0 ? '↗' : '↘'} {Math.abs(coinData.tokenMetadata.priceChange24h).toFixed(2)}%
              </p>
            </div>
            {coinData.tokenMetadata.marketCap && (
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">Market Cap</h3>
                <p className="text-3xl font-bold">
                  ${(coinData.tokenMetadata.marketCap / 1000000).toFixed(2)}M
                </p>
              </div>
            )}
            {coinData.tokenMetadata.volume24h && (
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">24h Volume</h3>
                <p className="text-3xl font-bold">
                  ${(coinData.tokenMetadata.volume24h / 1000).toFixed(1)}K
                </p>
              </div>
            )}
            {coinData.tokenMetadata.liquidity && (
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">Liquidity</h3>
                <p className="text-3xl font-bold">
                  ${(coinData.tokenMetadata.liquidity / 1000).toFixed(1)}K
                </p>
              </div>
            )}
          </div>
        )}

        {/* Project Wallet Info - Only for WALLET mode */}
        {coinData.pollType === "WALLET" && coinData.projectWallet && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
              <h3 className="text-sm font-medium opacity-90 mb-2">Project Wallet</h3>
              <p className="text-lg font-bold mb-2">{coinData.projectWallet.label}</p>
              <p className="text-sm font-mono opacity-90 break-all">
                {coinData.projectWallet.address}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
              <h3 className="text-sm font-medium opacity-90 mb-2">Access Type</h3>
              <p className="text-2xl font-bold mb-2">💳 Contribution-Gated</p>
              <p className="text-sm opacity-90">
                Only contributors to this wallet can vote
              </p>
            </div>
          </div>
        )}

        {/* Community Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
            <p className="text-3xl font-bold text-blue-600 mb-2">{coinData.stats.totalPolls}</p>
            <p className="text-sm text-gray-600 font-medium">Total Polls</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
            <p className="text-3xl font-bold text-green-600 mb-2">{coinData.stats.activePolls}</p>
            <p className="text-sm text-gray-600 font-medium">Active Polls</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
            <p className="text-3xl font-bold text-purple-600 mb-2">{coinData.stats.totalVotes}</p>
            <p className="text-sm text-gray-600 font-medium">Total Votes</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
            <p className="text-3xl font-bold text-orange-600 mb-2">{coinData.stats.uniqueVoters}</p>
            <p className="text-sm text-gray-600 font-medium">Unique Voters</p>
          </div>
        </div>
      </div>

      {/* Bags Fee Share Display - Only for COIN mode */}
      {coinData.pollType === "COIN" && coinData.tokenCA && (
        <FeeShareDisplay tokenMint={coinData.tokenCA} />
      )}

      {/* Trust Score Preview - Only for COIN mode */}
      {coinData.pollType === "COIN" && coinData.tokenCA && (
        <TrustScorePreview tokenAddress={coinData.tokenCA} />
      )}

      {/* Voters List */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">
            👥
          </span>
          Community Voters ({coinData.voters.length})
        </h2>
        {coinData.voters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗳️</div>
            <p className="text-gray-500 text-lg">No votes yet</p>
            <p className="text-gray-400 text-sm">Be the first to vote on a poll!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coinData.voters.map((voter, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="font-mono text-sm text-gray-700">
                    {voter.slice(0, 8)}...{voter.slice(-8)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Wallets Section - Only for COIN mode */}
      {coinData.pollType === "COIN" && coinData.projectWallets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Project Wallets</h2>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {coinData.projectWallets.length} project{coinData.projectWallets.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coinData.projectWallets.map((wallet) => (
              <div key={wallet.id} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      💳
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{wallet.label}</h3>
                      <p className="text-xs text-gray-500 font-mono">{wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{wallet.pollCount}</p>
                    <p className="text-xs text-gray-600">Polls</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{wallet.totalVotes}</p>
                    <p className="text-xs text-gray-600">Votes</p>
                  </div>
                </div>

                {wallet.polls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Polls:</p>
                    {wallet.polls.slice(0, 2).map((poll) => (
                      <div key={poll.id} className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-800 line-clamp-1">{poll.topic}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            poll.status === 'active' ? 'bg-green-100 text-green-800' :
                            poll.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {poll.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{poll.totalVotes} votes</p>
                      </div>
                    ))}
                    {wallet.polls.length > 2 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{wallet.polls.length - 2} more poll{wallet.polls.length - 2 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}

                {wallet.polls.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No polls yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Founding Wallets Section */}
      {coinData.pollType === "COIN" &&
        coinData.foundingWallets &&
        coinData.foundingWallets.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">
                💰
              </span>
              Founding Wallets ({coinData.foundingWallets.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coinData.foundingWallets.map((wallet) => (
                <FoundingWalletCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
        </div>
      )}

      {/* Polls List */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
          <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">
            📊
          </span>
          Community Polls ({coinData.polls.length})
        </h2>
        <div className="space-y-8">
          {coinData.polls.map((poll) => (
            <div key={poll.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-gray-900 pr-4">{poll.topic}</h3>
                <span
                  className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${getStatusColor(
                    poll.status
                  )}`}
                >
                  {poll.status.toUpperCase()}
                </span>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  📅 {format(new Date(poll.startAt), "MMM d, yyyy")} - {format(new Date(poll.endAt), "MMM d, yyyy")}
                </p>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Poll Results:</h4>
                <div className="space-y-4">
                  {poll.results.map((result) => {
                    const percentage = poll.totalVotes > 0 
                      ? Math.round((result.count / poll.totalVotes) * 100) 
                      : 0;
                    
                    return (
                      <div key={result.option} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-800">{result.option}</span>
                          <span className="text-sm font-bold text-gray-600">
                            {result.count} vote{result.count !== 1 ? 's' : ''} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700 text-center">
                    Total votes: {poll.totalVotes}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  Created {format(new Date(poll.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
                <Link
                  href={`/poll/${poll.id}`}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl"
                >
                  View & Vote
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embed Widget Footer Section */}
      {coinData.pollType === "COIN" && coinData.coin && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>📦</span>
                  Embed this coin as widget
                </h3>
                <p className="text-sm text-gray-600">
                  Share your community on your website, WordPress, Wix, or any platform
                </p>
              </div>
              <Link
                href={`/coin/${coinData.coin.mint}/embed`}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold whitespace-nowrap"
              >
                Get Embed Code →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
