"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

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
  tokenCA: string;
  tokenMetadata: TokenMetadata | null;
  stats: {
    totalPolls: number;
    activePolls: number;
    totalVotes: number;
    uniqueVoters: number;
  };
  polls: Poll[];
  voters: string[];
}

export default function CoinDashboard() {
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
      if (!response.ok) {
        throw new Error("Failed to fetch coin data");
      }
      const data = await response.json();
      setCoinData(data);
    } catch (error) {
      console.error("Failed to fetch coin data:", error);
      setError("Failed to load coin data");
    } finally {
      setLoading(false);
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

  if (error || !coinData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">{error || "Coin not found"}</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Coin Header */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-xl p-8 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/20 to-blue-200/20 rounded-full translate-y-12 -translate-x-12"></div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg relative overflow-hidden">
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
                {coinData.tokenMetadata?.symbol?.charAt(0) || coinData.tokenCA.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {coinData.tokenMetadata?.name || "Token Community"}
              </h1>
              <p className="text-gray-600 font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg inline-block">
                {coinData.tokenMetadata?.symbol || coinData.tokenCA.slice(0, 12)}...
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            ← Back to Communities
          </Link>
        </div>

        {/* Token Price & Stats */}
        {coinData.tokenMetadata && (
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
    </div>
  );
}
