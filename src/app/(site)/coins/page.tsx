"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SearchAndFilters, { FilterState } from "@/components/SearchAndFilters";
import CoinVoteButtons from "@/components/coinVote/CoinVoteButtons";
import { Vote, Users, BarChart3, TrendingUp, TrendingDown, Zap, Shield } from "lucide-react";

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
  if (!tier) return "bg-gray-500";
  switch (tier) {
    case "DIAMOND":
      return "bg-gradient-to-r from-cyan-500 to-blue-600";
    case "GOLD":
      return "bg-gradient-to-r from-yellow-400 to-orange-500";
    case "SILVER":
      return "bg-gradient-to-r from-gray-300 to-gray-500";
    case "BRONZE":
      return "bg-gradient-to-r from-orange-400 to-orange-700";
    default:
      return "bg-gray-500";
  }
};

const getTierBorderColor = (tier: string | null): string => {
  if (!tier) return "border-gray-400";
  switch (tier) {
    case "DIAMOND":
      return "border-cyan-400";
    case "GOLD":
      return "border-yellow-400";
    case "SILVER":
      return "border-gray-300";
    case "BRONZE":
      return "border-orange-400";
    default:
      return "border-gray-400";
  }
};

export default function CoinsPage() {
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

  const filteredCoins = useMemo(() => {
    if (!Array.isArray(allCoins)) {
      return [];
    }
    let filtered = [...allCoins];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchLower) ||
          coin.symbol.toLowerCase().includes(searchLower) ||
          coin.mint.toLowerCase().includes(searchLower)
      );
    }

    if (filters.tier !== "all") {
      filtered = filtered.filter((coin) => coin.tier === filters.tier);
    }

    filtered = filtered.filter((coin) => {
      const score = coin.trustScore ?? 0;
      return score >= filters.scoreMin && score <= filters.scoreMax;
    });

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
              
              {filters.search && filters.search.length >= 32 && filters.search.length <= 44 && /^[A-Za-z0-9]+$/.test(filters.search) ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    This looks like a token address. Create a new community for this coin:
                  </p>
                  <Link
                    href={`/coin/${filters.search}`}
                    className="inline-block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
                  >
                    🚀 Start Free Analysis Now and Create a New Community for this Coin
                  </Link>
                </div>
              ) : !filters.search && filters.tier === "all" && filters.scoreMin === 0 && filters.scoreMax === 100 ? (
                <Link
                  href="/admin"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  ➕ Add First Coin
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCoins.map((coin) => {
              const totalEngagement = coin.pollVotes + coin.uniqueVoters;
              const netVotes = coin.coinUpvotes - coin.coinDownvotes;
              const marketCap = coin.tokenData?.marketCap ? 
                coin.tokenData.marketCap >= 1000000 
                  ? `$${(coin.tokenData.marketCap / 1000000).toFixed(2)}M`
                  : coin.tokenData.marketCap >= 1000
                  ? `$${(coin.tokenData.marketCap / 1000).toFixed(2)}K`
                  : `$${coin.tokenData.marketCap.toFixed(0)}`
                : null;
              
              return (
                <Link
                  key={coin.id}
                  href={`/coin/${coin.mint}`}
                  className="group block bg-white rounded-lg border-2 hover:shadow-lg transition-all duration-200 overflow-hidden"
                  style={{
                    borderColor: coin.tier ? 
                      coin.tier === "DIAMOND" ? "#22d3ee" :
                      coin.tier === "GOLD" ? "#fbbf24" :
                      coin.tier === "SILVER" ? "#9ca3af" :
                      coin.tier === "BRONZE" ? "#fb923c" : "#9ca3af"
                      : "#9ca3af"
                  }}
                >
                  <div className="flex items-center gap-4 p-3">
                    {/* Large Icon */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300">
                        <img
                          src={coin.tokenData?.image || `/api/token-image/${coin.mint}`}
                          alt={`${coin.tokenData?.name || coin.name} logo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                          <span className="text-3xl font-bold text-gray-600">
                            {coin.tokenData?.symbol?.charAt(0) || coin.symbol.charAt(0)}
                          </span>
                        </div>
                      </div>
                      {/* Tier Badge on Icon */}
                      {coin.tier && (
                        <div className={`absolute -bottom-1 -right-1 ${getTierColor(coin.tier)} rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg`}>
                          <span className="text-xs">{getTierEmoji(coin.tier)}</span>
                        </div>
                      )}
                    </div>

                    {/* Coin Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {coin.tokenData?.name || coin.name}
                        </h3>
                        <span className="text-sm text-gray-500 font-mono">
                          {coin.tokenData?.symbol || coin.symbol}
                        </span>
                        {coin.trustScore !== null && (
                          <span className="text-xs text-blue-600 font-semibold">
                            {coin.trustScore}/100
                          </span>
                        )}
                      </div>
                      
                      {/* Metrics Row */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Vote className="w-3.5 h-3.5" />
                          <span>{coin.pollCount} Polls</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{totalEngagement} Engagement</span>
                        </div>
                        {coin.tokenData?.price && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>${coin.tokenData.price.toFixed(6)}</span>
                            {coin.tokenData.priceChange24h !== 0 && (
                              <span className={coin.tokenData.priceChange24h >= 0 ? "text-green-600" : "text-red-600"}>
                                {coin.tokenData.priceChange24h >= 0 ? "↗" : "↘"} {Math.abs(coin.tokenData.priceChange24h).toFixed(2)}%
                              </span>
                            )}
                          </div>
                        )}
                        {marketCap && (
                          <div className="flex items-center gap-1">
                            <span>MC {marketCap}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vote Button - Right Side */}
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    >
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-md transition-all">
                        <Zap className="w-4 h-4 text-white" />
                        <span className="text-white font-bold text-sm">
                          {netVotes > 0 ? `+${netVotes}` : netVotes < 0 ? netVotes : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
