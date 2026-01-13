"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SearchAndFilters, { FilterState } from "@/components/SearchAndFilters";

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
  createdAt: string;
  trustScore: number | null;
  tier: string | null;
  coinUpvotes: number;
  coinDownvotes: number;
  pollCount: number;
  pollVotes: number;
  uniqueVoters: number;
  projectWalletCount: number;
  latestPoll: string | null;
  topics: string[];
  tokenData: TokenData | null;
}

const getTierEmoji = (tier: string | null): string => {
  if (!tier) return "❓";
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

const getTierColor = (tier: string | null): string => {
  if (!tier) return "from-gray-400 to-gray-600";
  switch (tier) {
    case "DIAMOND":
      return "from-cyan-400 to-blue-600";
    case "GOLD":
      return "from-yellow-400 to-orange-500";
    case "SILVER":
      return "from-gray-300 to-gray-500";
    case "BRONZE":
      return "from-orange-400 to-orange-700";
    default:
      return "from-gray-400 to-gray-600";
  }
};

export default function HomePage() {
  const [allCoins, setAllCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    tier: "all",
    scoreMin: 0,
    scoreMax: 100,
    sortBy: "score",
    timeFilter: "all",
    communityActivity: "all",
  });

  useEffect(() => {
    fetchAllCoins();
  }, []);

  const fetchAllCoins = async () => {
    try {
      setLoading(true);
      // Fetch all coins (we'll handle pagination client-side for filtering)
      const response = await fetch(`/api/coins?page=1&limit=1000`);
      
      if (!response.ok) {
        console.error("Failed to fetch coins:", response.status, response.statusText);
        setAllCoins([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.coins && Array.isArray(data.coins)) {
        setAllCoins(data.coins);
      } else if (Array.isArray(data)) {
        setAllCoins(data);
      } else {
        console.error("Invalid data format:", data);
        setAllCoins([]);
      }
    } catch (error) {
      console.error("Failed to fetch coins:", error);
      setAllCoins([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort coins
  const filteredCoins = useMemo(() => {
    if (!Array.isArray(allCoins)) {
      return [];
    }
    let filtered = [...allCoins];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchLower) ||
          coin.symbol.toLowerCase().includes(searchLower) ||
          coin.mint.toLowerCase().includes(searchLower)
      );
    }

    // Tier filter
    if (filters.tier !== "all") {
      filtered = filtered.filter((coin) => coin.tier === filters.tier);
    }

    // Score range filter
    filtered = filtered.filter((coin) => {
      const score = coin.trustScore ?? 0;
      return score >= filters.scoreMin && score <= filters.scoreMax;
    });

    // Community activity filter
    if (filters.communityActivity !== "all") {
      filtered = filtered.filter((coin) => {
        if (filters.communityActivity === "active") {
          return coin.pollVotes > 10 || coin.uniqueVoters > 5;
        } else if (filters.communityActivity === "moderate") {
          return (coin.pollVotes > 0 || coin.uniqueVoters > 0) && 
                 !(coin.pollVotes > 10 || coin.uniqueVoters > 5);
        } else if (filters.communityActivity === "building") {
          return coin.pollCount > 0 && coin.pollVotes === 0 && coin.uniqueVoters === 0;
        }
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "score":
          return (b.trustScore ?? 0) - (a.trustScore ?? 0);
        case "score-asc":
          return (a.trustScore ?? 0) - (b.trustScore ?? 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "votes":
          return b.pollVotes - a.pollVotes;
        case "polls":
          return b.pollCount - a.pollCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allCoins, filters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg text-gray-600">Loading coins...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🪙 Memecoin Communities
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover, vote for, and evaluate memecoin communities. See trust scores, community sentiment, and participate in governance.
          </p>
        </div>

        {/* Search & Filters */}
        <SearchAndFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalResults={filteredCoins.length}
        />

        {/* Coins Grid */}
        {filteredCoins.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto border border-gray-200">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Coins Found</h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.tier !== "all" || filters.scoreMin > 0 || filters.scoreMax < 100
                  ? "Try adjusting your filters or search terms"
                  : "Add your first memecoin to start building a community"}
              </p>
              {!filters.search && filters.tier === "all" && filters.scoreMin === 0 && filters.scoreMax === 100 && (
                <Link
                  href="/admin"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  ➕ Add First Coin
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCoins.map((coin) => (
              <div
                key={coin.id}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-300 hover:scale-[1.02]"
              >
                {/* Token Header */}
                <div className={`bg-gradient-to-br ${getTierColor(coin.tier)} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold shadow-lg relative overflow-hidden">
                        <img
                          src={coin.tokenData?.image || `/api/token-image/${coin.mint}`}
                          alt={`${coin.tokenData?.name || coin.name} logo`}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                          {coin.tokenData?.symbol?.charAt(0) || coin.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {coin.tokenData?.name || coin.name}
                        </h3>
                        <p className="text-sm text-white/80 font-mono">
                          {coin.tokenData?.symbol || coin.symbol}
                        </p>
                      </div>
                    </div>
                    {coin.trustScore !== null && coin.tier && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-2xl">{getTierEmoji(coin.tier)}</span>
                          <span className="text-sm font-bold">{coin.tier}</span>
                        </div>
                        <p className="text-2xl font-bold">{coin.trustScore}</p>
                        <p className="text-xs text-white/80">/100</p>
                      </div>
                    )}
                  </div>
                  
                  {coin.tokenData?.price && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">Price</span>
                      <div className="text-right">
                        <span className="font-bold">${coin.tokenData.price.toFixed(6)}</span>
                        <span className={`ml-2 ${coin.tokenData.priceChange24h >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                          {coin.tokenData.priceChange24h >= 0 ? '↗' : '↘'} {Math.abs(coin.tokenData.priceChange24h).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis Section */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="mr-2">📊</span>
                    Analysis
                  </h4>
                  {coin.trustScore === null ? (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 italic text-center">No analysis available yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">👍</span>
                          <span className="text-lg font-bold text-green-600">{coin.coinUpvotes}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">👎</span>
                          <span className="text-lg font-bold text-red-600">{coin.coinDownvotes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Community Section */}
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="mr-2">👥</span>
                    Community Activity
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-2xl font-bold text-blue-600">{coin.pollCount}</p>
                      <p className="text-xs text-gray-600 font-medium mt-1">Polls</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-2xl font-bold text-green-600">{coin.pollVotes}</p>
                      <p className="text-xs text-gray-600 font-medium mt-1">Votes</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-2xl font-bold text-purple-600">{coin.uniqueVoters}</p>
                      <p className="text-xs text-gray-600 font-medium mt-1">Voters</p>
                    </div>
                  </div>

                  {/* Activity Indicator */}
                  <div className="mb-4">
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

                  {/* Action Button */}
                  <Link
                    href={`/coin/${coin.mint}`}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-center block font-semibold shadow-lg hover:shadow-xl"
                  >
                    View Coin & Vote →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
