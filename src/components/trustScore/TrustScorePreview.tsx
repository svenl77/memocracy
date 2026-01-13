'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TrustScoreData {
  overallScore: number;
  tier: string;
  breakdown: {
    maturity: number;
    security: number;
    liquidity: number;
    trading: number;
    stability: number;
  };
  flags: {
    mintDisabled: boolean;
    freezeDisabled: boolean;
  };
  details: any;
  lastChecked: string;
}

interface TrustScorePreviewProps {
  tokenAddress: string;
}

export default function TrustScorePreview({ tokenAddress }: TrustScorePreviewProps) {
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrustScore();
  }, [tokenAddress]);

  const fetchTrustScore = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/trust-score/${tokenAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trust score');
      }
      const data = await response.json();
      setTrustScore(data);
    } catch (err) {
      console.error('Failed to fetch trust score:', err);
      setError('Failed to load trust score');
    } finally {
      setLoading(false);
    }
  };

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'DIAMOND': return '💎';
      case 'GOLD': return '🥇';
      case 'SILVER': return '🥈';
      case 'BRONZE': return '🥉';
      default: return '❓';
    }
  };

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'DIAMOND': return 'from-cyan-400 to-blue-600';
      case 'GOLD': return 'from-yellow-400 to-orange-500';
      case 'SILVER': return 'from-gray-300 to-gray-500';
      case 'BRONZE': return 'from-orange-400 to-orange-700';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getHighlights = () => {
    if (!trustScore) return [];

    const highlights = [];

    // Security
    if (trustScore.breakdown.security >= 20) {
      highlights.push({ icon: '✅', label: 'Security', value: 'Excellent', color: 'bg-green-50' });
    } else if (trustScore.breakdown.security >= 10) {
      highlights.push({ icon: '⚠️', label: 'Security', value: 'Moderate', color: 'bg-yellow-50' });
    } else {
      highlights.push({ icon: '❌', label: 'Security', value: 'Poor', color: 'bg-red-50' });
    }

    // Liquidity
    if (trustScore.breakdown.liquidity >= 18) {
      highlights.push({ icon: '✅', label: 'Liquidity', value: 'Healthy', color: 'bg-green-50' });
    } else if (trustScore.breakdown.liquidity >= 10) {
      highlights.push({ icon: '⚠️', label: 'Liquidity', value: 'Moderate', color: 'bg-yellow-50' });
    } else {
      highlights.push({ icon: '❌', label: 'Liquidity', value: 'Low', color: 'bg-red-50' });
    }

    // Maturity
    const days = trustScore.details?.maturity?.contractAgeDays || 0;
    if (days >= 90) {
      highlights.push({ icon: '✅', label: 'Maturity', value: `${days} days`, color: 'bg-green-50' });
    } else if (days >= 30) {
      highlights.push({ icon: '⚠️', label: 'Maturity', value: `${days} days`, color: 'bg-yellow-50' });
    } else if (days >= 7) {
      highlights.push({ icon: '⚠️', label: 'Maturity', value: `${days} days`, color: 'bg-yellow-50' });
    } else {
      highlights.push({ icon: '❌', label: 'Maturity', value: 'Very New', color: 'bg-red-50' });
    }

    return highlights.slice(0, 3);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-blue-100 mb-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !trustScore) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-red-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🛡️</span>
            Community Trust Score
          </h2>
        </div>
        <p className="text-gray-600 text-center py-8">{error || 'Failed to load trust score'}</p>
        <button
          onClick={fetchTrustScore}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const highlights = getHighlights();

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-blue-100 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">🛡️</span>
          Community Trust Score
        </h2>
        <span className="text-sm text-gray-500">
          Updated {new Date(trustScore.lastChecked).toLocaleTimeString()}
        </span>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {trustScore.overallScore}
            <span className="text-2xl text-gray-400">/100</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-4 py-2 bg-gradient-to-r ${getTierGradient(trustScore.tier)} text-white rounded-xl font-bold text-lg shadow-lg`}>
              {getTierEmoji(trustScore.tier)} {trustScore.tier}
            </span>
          </div>
        </div>

        {/* Circle Progress */}
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90 w-24 h-24">
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="url(#progress-gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - trustScore.overallScore / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-700">
            {trustScore.overallScore}%
          </div>
        </div>
      </div>

      {/* Quick Highlights */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {highlights.map((highlight, index) => (
          <div key={index} className={`text-center p-3 ${highlight.color} rounded-lg`}>
            <div className="text-2xl mb-1">{highlight.icon}</div>
            <div className="text-xs font-semibold text-gray-700">{highlight.label}</div>
            <div className={`text-xs font-medium ${
              highlight.icon === '✅' ? 'text-green-600' :
              highlight.icon === '⚠️' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {highlight.value}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <Link
        href={`/coin/${tokenAddress}/analytics`}
        className="block w-full text-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
      >
        📊 View Full Analytics Report →
      </Link>

      {/* Mini Methodology Hint */}
      <p className="text-xs text-gray-500 text-center mt-3">
        Based on Security, Liquidity, Trading Activity & more
      </p>
    </div>
  );
}
