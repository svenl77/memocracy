"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

interface TokenData {
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap?: number;
  liquidity?: number;
  image?: string;
}

interface Coin {
  tokenCA: string;
  pollCount: number;
  totalVotes: number;
  uniqueVoters: number;
  latestPoll: string;
  topics: string[];
  tokenData: TokenData | null;
}

export default function HomePage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    try {
      const response = await fetch("/api/coins");
      const data = await response.json();
      setCoins(data);
    } catch (error) {
      console.error("Failed to fetch coins:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading coins...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Token Communities
        </h1>
        <p className="text-gray-600 text-lg">
          Discover and participate in token-gated community governance for your favorite tokens
        </p>
        <button
          onClick={fetchCoins}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          🔄 Refresh Communities
        </button>
      </div>

      {coins.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-12 max-w-md mx-auto">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Communities Yet</h3>
            <p className="text-gray-600 mb-4">
              Create polls with token requirements to see communities here
            </p>
            <Link
              href="/admin"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Create First Poll
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {coins.map((coin) => (
            <div
              key={coin.tokenCA}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 hover:scale-105"
            >
              {/* Token Header */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg relative overflow-hidden">
                      <img
                        src={coin.tokenData?.image || `/api/token-image/${coin.tokenCA}`}
                        alt={`${coin.tokenData?.name || 'Token'} logo`}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                        {coin.tokenData?.symbol?.charAt(0) || coin.tokenCA.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {coin.tokenData?.name || "Unknown Token"}
                      </h3>
                      <p className="text-sm text-gray-600 font-mono">
                        {coin.tokenData?.symbol || coin.tokenCA.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  {coin.tokenData?.price && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${coin.tokenData.price.toFixed(6)}
                      </p>
                      <p className={`text-sm font-medium ${
                        coin.tokenData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {coin.tokenData.priceChange24h >= 0 ? '↗' : '↘'} {Math.abs(coin.tokenData.priceChange24h).toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Token Stats */}
                {coin.tokenData && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {coin.tokenData.marketCap && (
                      <div>
                        <p className="text-gray-600">Market Cap</p>
                        <p className="font-semibold">${(coin.tokenData.marketCap / 1000000).toFixed(2)}M</p>
                      </div>
                    )}
                    {coin.tokenData.volume24h && (
                      <div>
                        <p className="text-gray-600">24h Volume</p>
                        <p className="font-semibold">${(coin.tokenData.volume24h / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Community Stats */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{coin.pollCount}</p>
                    <p className="text-xs text-gray-600 font-medium">Polls</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{coin.totalVotes}</p>
                    <p className="text-xs text-gray-600 font-medium">Votes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{coin.uniqueVoters}</p>
                    <p className="text-xs text-gray-600 font-medium">Voters</p>
                  </div>
                </div>

                {/* Recent Topics */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Recent Topics:</p>
                  <div className="space-y-2">
                    {coin.topics.map((topic, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {topic}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/coin/${coin.tokenCA}`}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-center block font-semibold shadow-lg hover:shadow-xl"
                >
                  View Community Dashboard
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
