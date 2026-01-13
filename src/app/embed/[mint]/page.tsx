"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
  id: string;
  mint: string;
  symbol: string;
  name: string;
  trustScore: number | null;
  tier: string | null;
  coinUpvotes: number;
  coinDownvotes: number;
  pollCount: number;
  pollVotes: number;
  uniqueVoters: number;
  tokenData: TokenData | null;
}

const getTierEmoji = (tier: string | null): string => {
  if (!tier) return "❓";
  switch (tier) {
    case "DIAMOND": return "💎";
    case "GOLD": return "🥇";
    case "SILVER": return "🥈";
    case "BRONZE": return "🥉";
    default: return "❓";
  }
};

const getTierColor = (tier: string | null): string => {
  if (!tier) return "from-gray-400 to-gray-600";
  switch (tier) {
    case "DIAMOND": return "from-cyan-400 to-blue-600";
    case "GOLD": return "from-yellow-400 to-orange-500";
    case "SILVER": return "from-gray-300 to-gray-500";
    case "BRONZE": return "from-orange-400 to-orange-700";
    default: return "from-gray-400 to-gray-600";
  }
};

export default function EmbedWidget() {
  const params = useParams();
  const mint = params.mint as string;
  const [coin, setCoin] = useState<Coin | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (mint) {
      fetchCoinData();
    }
  }, [mint]);

  const fetchCoinData = async () => {
    try {
      const response = await fetch(`/api/coins?page=1&limit=1000`);
      const data = await response.json();
      const coins = data.coins || data;
      const foundCoin = coins.find((c: Coin) => c.mint === mint);
      setCoin(foundCoin || null);
    } catch (error) {
      console.error("Failed to fetch coin:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 max-w-md mx-auto">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 max-w-md mx-auto text-center">
        <p className="text-gray-600">Coin not found</p>
      </div>
    );
  }

  const widgetUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = `${widgetUrl}/coin/${coin.mint}`;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-md mx-auto font-sans">
      {/* Compact View */}
      {!expanded ? (
        <div className="p-6">
          {/* Header */}
          <div className={`bg-gradient-to-br ${getTierColor(coin.tier)} p-4 rounded-xl text-white mb-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-xl font-bold shadow-lg relative overflow-hidden">
                  <img
                    src={coin.tokenData?.image || `/api/token-image/${coin.mint}`}
                    alt={`${coin.name} logo`}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                    {coin.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-white">{coin.name}</h3>
                  <p className="text-sm text-white/80 font-mono">{coin.symbol}</p>
                </div>
              </div>
              {coin.trustScore !== null && coin.tier && (
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xl">{getTierEmoji(coin.tier)}</span>
                    <span className="text-xs font-bold">{coin.tier}</span>
                  </div>
                  <p className="text-2xl font-bold">{coin.trustScore}</p>
                  <p className="text-xs text-white/80">/100</p>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Section */}
          <div className="mb-4 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center">
              <span className="mr-2">📊</span>
              Analysis
            </h4>
            {coin.trustScore === null ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 italic text-center">No analysis available yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Coin Votes (Upvotes/Downvotes) */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👍</span>
                      <span className="text-lg font-bold text-green-600">{coin.coinUpvotes}</span>
                    </div>
                    <div className="w-px h-5 bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👎</span>
                      <span className="text-lg font-bold text-red-600">{coin.coinDownvotes}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">Coin Rating</p>
                </div>
              </div>
            )}
          </div>

          {/* Community Activity Section */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center">
              <span className="mr-2">👥</span>
              Community Activity
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-lg font-bold text-blue-600">{coin.pollCount}</p>
                <p className="text-xs text-gray-600">Polls</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                <p className="text-lg font-bold text-green-600">{coin.pollVotes}</p>
                <p className="text-xs text-gray-600">Votes</p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-lg font-bold text-purple-600">{coin.uniqueVoters}</p>
                <p className="text-xs text-gray-600">Voters</p>
              </div>
            </div>

            {/* Activity Indicator */}
            {coin.pollVotes > 0 || coin.uniqueVoters > 0 ? (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <span className="text-green-600">🟢</span>
                <p className="text-xs text-green-700 font-medium">
                  {coin.pollVotes > 10 || coin.uniqueVoters > 5 
                    ? "Very active community" 
                    : "Active community"}
                </p>
              </div>
            ) : coin.pollCount > 0 ? (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-yellow-600">🟡</span>
                <p className="text-xs text-yellow-700 font-medium">Community building</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-400">⚪</span>
                <p className="text-xs text-gray-600 font-medium">No activity yet</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(true)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-sm"
            >
              View Full Community →
            </button>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
            >
              ↗
            </a>
          </div>

          {/* Powered By */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Powered by{" "}
              <a
                href={widgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-semibold"
              >
                Memecoin Community Platform
              </a>
            </p>
          </div>
        </div>
      ) : (
        /* Expanded View */
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">{coin.name} Community</h3>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <iframe
            src={`${widgetUrl}/coin/${coin.mint}/widget`}
            className="w-full h-[600px] border border-gray-200 rounded-lg"
            title={`${coin.name} Community`}
          />

          <div className="mt-4 flex gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-center font-semibold text-sm"
            >
              Open in New Tab →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
