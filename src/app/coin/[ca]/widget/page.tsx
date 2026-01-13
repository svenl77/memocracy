"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TrustScorePreview from "@/components/trustScore/TrustScorePreview";
import CoinVoteButtons from "@/components/coinVote/CoinVoteButtons";

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

interface CoinData {
  coin: {
    id: string;
    mint: string;
    symbol: string;
    name: string;
  };
  tokenMetadata: TokenMetadata | null;
  polls: Poll[];
  voteStats: {
    upvotes: number;
    downvotes: number;
    netScore: number;
    totalVotes: number;
  } | null;
  trustScore: {
    overallScore: number;
    tier: string;
  } | null;
}

const getTierEmoji = (tier: string): string => {
  switch (tier) {
    case "DIAMOND": return "💎";
    case "GOLD": return "🥇";
    case "SILVER": return "🥈";
    case "BRONZE": return "🥉";
    default: return "❓";
  }
};

const getTierColor = (tier: string): string => {
  switch (tier) {
    case "DIAMOND": return "from-cyan-400 to-blue-600";
    case "GOLD": return "from-yellow-400 to-orange-500";
    case "SILVER": return "from-gray-300 to-gray-500";
    case "BRONZE": return "from-orange-400 to-orange-700";
    default: return "from-gray-400 to-gray-600";
  }
};

export default function CoinWidgetView() {
  const params = useParams();
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        throw new Error(data.error || "Failed to fetch coin data");
      }
      
      setCoinData(data);
    } catch (error: any) {
      console.error("Failed to fetch coin data:", error);
      setError(error.message || "Failed to load coin data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !coinData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-red-500 mb-4">{error || "Coin not found"}</p>
        </div>
      </div>
    );
  }

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/coin/${coinData.coin.mint}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header - Compact */}
        <div className={`bg-gradient-to-br ${coinData.trustScore ? getTierColor(coinData.trustScore.tier) : 'from-gray-400 to-gray-600'} rounded-2xl p-6 text-white shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold shadow-lg relative overflow-hidden">
                <img
                  src={coinData.tokenMetadata?.image || `/api/token-image/${coinData.coin.mint}`}
                  alt={`${coinData.coin.name} logo`}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                  {coinData.coin.symbol.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {coinData.tokenMetadata?.name || coinData.coin.name}
                </h1>
                <p className="text-white/80 font-mono text-sm">
                  {coinData.tokenMetadata?.symbol || coinData.coin.symbol}
                </p>
              </div>
            </div>
            {coinData.trustScore && (
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{getTierEmoji(coinData.trustScore.tier)}</span>
                  <span className="text-sm font-bold">{coinData.trustScore.tier}</span>
                </div>
                <p className="text-4xl font-bold">{coinData.trustScore.overallScore}</p>
                <p className="text-xs text-white/80">/100</p>
              </div>
            )}
          </div>

          {coinData.tokenMetadata?.price && (
            <div className="flex items-center justify-between text-sm pt-4 border-t border-white/20">
              <span className="text-white/80">Price</span>
              <div className="text-right">
                <span className="font-bold text-lg">${coinData.tokenMetadata.price.toFixed(6)}</span>
                <span className={`ml-2 ${coinData.tokenMetadata.priceChange24h >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {coinData.tokenMetadata.priceChange24h >= 0 ? '↗' : '↘'} {Math.abs(coinData.tokenMetadata.priceChange24h).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Coin Votes */}
          {coinData.voteStats && (
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👍</span>
                <span className="text-2xl font-bold text-green-600">{coinData.voteStats.upvotes}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👎</span>
                <span className="text-2xl font-bold text-red-600">{coinData.voteStats.downvotes}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">Coin Rating</p>
            </div>
          )}

          {/* Polls */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <p className="text-3xl font-bold text-blue-600 mb-1">{coinData.polls.length}</p>
            <p className="text-xs text-gray-600">Active Polls</p>
          </div>

          {/* Total Votes */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <p className="text-3xl font-bold text-green-600 mb-1">
              {coinData.polls.reduce((sum, poll) => sum + poll.totalVotes, 0)}
            </p>
            <p className="text-xs text-gray-600">Total Votes</p>
          </div>

          {/* Trust Score Preview */}
          {coinData.trustScore && (
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <p className="text-3xl font-bold text-purple-600 mb-1">{coinData.trustScore.overallScore}</p>
              <p className="text-xs text-gray-600">Trust Score</p>
            </div>
          )}
        </div>

        {/* Vote Buttons */}
        {coinData.voteStats && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <CoinVoteButtons
              coinMint={coinData.coin.mint}
              initialStats={coinData.voteStats}
            />
          </div>
        )}

        {/* Trust Score Details */}
        {coinData.trustScore && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <TrustScorePreview tokenAddress={coinData.coin.mint} />
          </div>
        )}

        {/* Active Polls */}
        {coinData.polls.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Active Polls</h2>
            <div className="space-y-3">
              {coinData.polls.slice(0, 5).map((poll) => (
                <Link
                  key={poll.id}
                  href={`/poll/${poll.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{poll.topic}</h3>
                      <p className="text-xs text-gray-600">
                        {poll.totalVotes} votes · {poll.status}
                      </p>
                    </div>
                    <span className="text-blue-600">→</span>
                  </div>
                </Link>
              ))}
            </div>
            {coinData.polls.length > 5 && (
              <Link
                href={fullUrl}
                className="block mt-4 text-center text-blue-600 hover:underline text-sm font-medium"
              >
                View all {coinData.polls.length} polls →
              </Link>
            )}
          </div>
        )}

        {/* Open Full View */}
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 text-center">
          <Link
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
          >
            Open Full Community View →
          </Link>
        </div>
      </div>
    </div>
  );
}
