"use client";

import { useState } from "react";

export interface FilterState {
  search: string;
  tier: string;
  scoreMin: number;
  scoreMax: number;
  sortBy: string;
  timeFilter: string;
  communityActivity: string;
}

interface SearchAndFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalResults: number;
}

export default function SearchAndFilters({
  filters,
  onFiltersChange,
  totalResults,
}: SearchAndFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      tier: "all",
      scoreMin: 0,
      scoreMax: 100,
      sortBy: "score",
      timeFilter: "all",
      communityActivity: "all",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.tier !== "all" ||
    filters.scoreMin > 0 ||
    filters.scoreMax < 100 ||
    filters.sortBy !== "score" ||
    filters.timeFilter !== "all" ||
    filters.communityActivity !== "all";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, symbol, or contract address (CA)..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats & Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{totalResults}</span> coins found
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-2"
          >
            <span>🔍</span>
            <span>{showFilters ? "Hide" : "Show"} Filters</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {/* Tier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier
            </label>
            <select
              value={filters.tier}
              onChange={(e) => updateFilter("tier", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tiers</option>
              <option value="DIAMOND">💎 Diamond (80+)</option>
              <option value="GOLD">🥇 Gold (65-79)</option>
              <option value="SILVER">🥈 Silver (45-64)</option>
              <option value="BRONZE">🥉 Bronze (25-44)</option>
              <option value="UNRATED">❓ Unrated (&lt;25)</option>
            </select>
          </div>

          {/* Score Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trust Score: {filters.scoreMin} - {filters.scoreMax}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.scoreMin}
                onChange={(e) => updateFilter("scoreMin", parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.scoreMax}
                onChange={(e) => updateFilter("scoreMax", parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter("sortBy", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="score">Trust Score (High to Low)</option>
              <option value="score-asc">Trust Score (Low to High)</option>
              <option value="name">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="votes">Most Votes</option>
              <option value="polls">Most Polls</option>
            </select>
          </div>

          {/* Community Activity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Activity
            </label>
            <select
              value={filters.communityActivity}
              onChange={(e) => updateFilter("communityActivity", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Activity</option>
              <option value="active">🟢 Very Active</option>
              <option value="moderate">🟡 Active</option>
              <option value="building">⚪ Building</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
