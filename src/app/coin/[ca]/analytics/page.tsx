'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

interface TrustScoreData {
  overallScore: number;
  tier: string;
  breakdown: {
    maturity: number;
    security: number;
    liquidity: number;
    trading: number;
    stability: number;
    communitySentiment: number;
  };
  flags: {
    mintDisabled: boolean;
    freezeDisabled: boolean;
  };
  details: {
    maturity: any;
    security: any;
    liquidity: any;
    trading: any;
    stability: any;
    communitySentiment?: {
      score: number;
      rating: string;
      description: string;
      upvotes: number;
      downvotes: number;
      totalVotes: number;
      approvalRate: number;
    };
  };
  lastChecked: string;
  cached?: boolean;
}

export default function AnalyticsPage() {
  const params = useParams();
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  useEffect(() => {
    fetchTrustScore();
  }, [params.ca]);

  const fetchTrustScore = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/trust-score/${params.ca}`, {
        method: force ? 'POST' : 'GET',
      });
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (score >= 60) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (score >= 40) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Calculating trust score...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trustScore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">
            <p className="text-red-500 text-lg mb-4">{error || 'Failed to load analytics'}</p>
            <button
              onClick={fetchTrustScore}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">🛡️ Trust Score Analytics</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMethodologyModal(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-sm font-medium"
            >
              📊 Scoring Methodology
            </button>
            <button
              onClick={() => fetchTrustScore(true)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"
            >
              {loading ? 'Updating...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Complete community analytics report · Last updated:{' '}
          {new Date(trustScore.lastChecked).toLocaleString()}
          {trustScore.cached && ' (cached)'}
        </p>
      </div>

      {/* Overall Score Hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-8 rounded-2xl text-white shadow-lg bg-gradient-to-br ${getTierGradient(trustScore.tier)}`}>
          <h3 className="text-sm font-medium opacity-90 mb-2">Overall Trust Score</h3>
          <p className="text-6xl font-bold">{trustScore.overallScore}</p>
          <div className="mt-4 flex items-center">
            <span className="text-2xl font-bold">{trustScore.tier}</span>
            <span className="ml-2 text-3xl">{getTierEmoji(trustScore.tier)}</span>
          </div>
          <p className="mt-4 text-sm opacity-90">
            Your community ranks in the top tier for quality metrics
          </p>
        </div>

        {/* Security Flags */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Checks</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Mint Authority</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  trustScore.flags.mintDisabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {trustScore.flags.mintDisabled ? '✓ Disabled' : '✗ Enabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Freeze Authority</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  trustScore.flags.freezeDisabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {trustScore.flags.freezeDisabled ? '✓ Disabled' : '✗ Enabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Score Breakdown</h2>
        <div className="space-y-4">
          {Object.entries(trustScore.breakdown).map(([category, score]) => (
            <div key={category}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700 capitalize">{category}</span>
                <span className="text-sm font-bold text-gray-600">{score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maturity */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⏱️</span>
            Maturity
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Contract Age:</span>
              <span className="font-semibold">
                {trustScore.details.maturity?.contractAgeDays || 0} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rating:</span>
              <span className="font-semibold">{trustScore.details.maturity?.rating}</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">{trustScore.details.maturity?.explanation}</p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔒</span>
            Security
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Supply:</span>
              <span className="font-semibold">{trustScore.details.security?.totalSupply || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rating:</span>
              <span className="font-semibold">{trustScore.details.security?.rating}</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">{trustScore.details.security?.explanation}</p>
          </div>
        </div>

        {/* Liquidity */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">💧</span>
            Liquidity
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Liquidity USD:</span>
              <span className="font-semibold">
                ${trustScore.details.liquidity?.liquidityUsd?.toLocaleString() || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MC/Liq Ratio:</span>
              <span className="font-semibold">
                {trustScore.details.liquidity?.mcLiquidityRatio?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rating:</span>
              <span className="font-semibold">{trustScore.details.liquidity?.rating}</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">{trustScore.details.liquidity?.explanation}</p>
          </div>
        </div>

        {/* Trading */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📈</span>
            Trading Activity
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Buys 24h:</span>
              <span className="font-semibold">{trustScore.details.trading?.buys24h || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sells 24h:</span>
              <span className="font-semibold">{trustScore.details.trading?.sells24h || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sell Pressure:</span>
              <span className="font-semibold">
                {trustScore.details.trading?.sellPressure?.toFixed(2) || 'N/A'}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rating:</span>
              <span className="font-semibold">{trustScore.details.trading?.rating}</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">{trustScore.details.trading?.explanation}</p>
          </div>
        </div>

        {/* Community Sentiment */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🗳️</span>
            Community Sentiment
          </h3>
          {trustScore.details.communitySentiment && trustScore.details.communitySentiment.totalVotes > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Upvotes:</span>
                <span className="font-semibold flex items-center gap-1">
                  <span>👍</span> {trustScore.details.communitySentiment.upvotes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Downvotes:</span>
                <span className="font-semibold flex items-center gap-1">
                  <span>👎</span> {trustScore.details.communitySentiment.downvotes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Approval Rate:</span>
                <span className="font-semibold">
                  {Math.round(trustScore.details.communitySentiment.approvalRate * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating:</span>
                <span className="font-semibold">{trustScore.details.communitySentiment.rating}</span>
              </div>
              <p className="text-sm text-gray-600 mt-4">{trustScore.details.communitySentiment.description}</p>
              {trustScore.details.communitySentiment.totalVotes < 10 && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                  ⚠️ Limited data: Score weight reduced until 10+ votes collected
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-2">No community votes yet</p>
              <p className="text-xs text-gray-400">Connect your wallet and vote in the coin header to contribute</p>
            </div>
          )}
        </div>
      </div>

      {/* Methodology */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl p-6 border border-blue-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 How We Calculate This</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Maturity (25%):</strong> Contract age and trading history. Older tokens have proven track
            records.
          </p>
          <p>
            <strong>Security (25%):</strong> Mint and freeze authority checks. Disabled authorities mean the
            token cannot be manipulated.
          </p>
          <p>
            <strong>Liquidity (20%):</strong> Absolute liquidity amount and MC/Liquidity ratio. Higher
            liquidity means safer trading.
          </p>
          <p>
            <strong>Trading (10%):</strong> Buy/Sell ratio and volume. Buy pressure indicates community
            confidence.
          </p>
          <p>
            <strong>Stability (5%):</strong> Price volatility. Stable prices indicate healthy market action.
          </p>
          <p>
            <strong>Community Sentiment (15%):</strong> Community voting and approval rate. Higher approval indicates community trust.
          </p>
        </div>
        <button
          onClick={() => setShowMethodologyModal(true)}
          className="mt-4 text-purple-600 hover:text-purple-700 font-semibold text-sm underline"
        >
          → Show detailed methodology & used values
        </button>
      </div>

      {/* Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">📊 Trust Score Methodology</h2>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Overall Calculation */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Overall Score Calculation</h3>
                <p className="text-gray-700 mb-4">
                  The Trust Score is calculated as a weighted average from 6 categories:
                </p>
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Overall Score =</span>
                    <span className="text-sm text-gray-600">(Weighted Average)</span>
                  </div>
                  <div className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded">
                    {trustScore && (
                      <>
                        ({trustScore.breakdown.maturity} × 25%) +<br />
                        ({trustScore.breakdown.security} × 25%) +<br />
                        ({trustScore.breakdown.liquidity} × 20%) +<br />
                        ({trustScore.breakdown.trading} × 10%) +<br />
                        ({trustScore.breakdown.stability} × 5%) +<br />
                        ({trustScore.breakdown.communitySentiment} × 15%)<br />
                        = <strong className="text-lg">{trustScore.overallScore} points</strong>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Details */}
              <div className="space-y-4">
                {/* Maturity */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">⏱️</span>
                    Maturity (25% Weight)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Evaluates the age of the token based on the pair creation date.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Used Value:</span>
                      <span className="font-semibold">
                        {trustScore.details.maturity?.contractAgeDays !== null && trustScore.details.maturity?.contractAgeDays !== undefined
                          ? `${trustScore.details.maturity.contractAgeDays} days`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pair created on:</span>
                      <span className="font-semibold">
                        {trustScore.details.maturity?.pairCreatedAt
                          ? new Date(trustScore.details.maturity.pairCreatedAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p><strong>Scoring:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>&lt; 7 days: 0 points (Very New)</li>
                      <li>7-30 days: 10 points (New)</li>
                      <li>30-90 days: 20 points (Established)</li>
                      <li>&gt; 90 days: 30 points (Mature)</li>
                    </ul>
                  </div>
                </div>

                {/* Security */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔒</span>
                    Security (25% Weight)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Checks the mint and freeze authority of the token on the blockchain.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mint Authority:</span>
                      <span className={`font-semibold ${trustScore.flags.mintDisabled ? 'text-green-600' : 'text-red-600'}`}>
                        {trustScore.flags.mintDisabled ? '✓ Disabled' : '✗ Active'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Freeze Authority:</span>
                      <span className={`font-semibold ${trustScore.flags.freezeDisabled ? 'text-green-600' : 'text-red-600'}`}>
                        {trustScore.flags.freezeDisabled ? '✓ Disabled' : '✗ Active'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Supply:</span>
                      <span className="font-semibold">{trustScore.details.security?.totalSupply || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Decimals:</span>
                      <span className="font-semibold">{trustScore.details.security?.decimals || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p><strong>Scoring:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Mint Authority disabled: +15 points</li>
                      <li>Freeze Authority disabled: +10 points</li>
                      <li>Maximum: 25 points</li>
                    </ul>
                  </div>
                </div>

                {/* Liquidity */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">💧</span>
                    Liquidity (20% Weight)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Evaluates liquidity based on absolute liquidity, MC/Liquidity ratio, and Volume/MC ratio.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Liquidity USD:</span>
                      <span className="font-semibold">
                        ${trustScore.details.liquidity?.liquidityUsd?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MC/Liquidity Ratio:</span>
                      <span className="font-semibold">
                        {trustScore.details.liquidity?.mcLiquidityRatio?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volume/MC Ratio:</span>
                      <span className="font-semibold">
                        {trustScore.details.liquidity?.volumeMcRatio?.toFixed(2) || 'N/A'}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p><strong>Scoring:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Absolute Liquidity: &gt;$100k (10), &gt;$50k (7), &gt;$10k (4), &gt;$5k (2)</li>
                      <li>MC/Liq Ratio: &lt;20 (10), &lt;50 (5), &lt;100 (2)</li>
                      <li>Volume/MC: &gt;20% (5), &gt;10% (3), &gt;5% (1)</li>
                      <li>Maximum: 25 points</li>
                    </ul>
                  </div>
                </div>

                {/* Trading */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📈</span>
                    Trading (10% Weight)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Analyzes trading behavior based on Buy/Sell ratio and volume.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buys (24h):</span>
                      <span className="font-semibold">{trustScore.details.trading?.buys24h || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sells (24h):</span>
                      <span className="font-semibold">{trustScore.details.trading?.sells24h || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sell Pressure:</span>
                      <span className="font-semibold">
                        {trustScore.details.trading?.sellPressure?.toFixed(2) || 'N/A'}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volume 24h:</span>
                      <span className="font-semibold">
                        ${trustScore.details.trading?.volume24h?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p><strong>Scoring:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Buy/Sell Ratio: &lt;0.8 (15), &lt;1.0 (10), &lt;1.2 (5)</li>
                      <li>Volume: &gt;$50k (5), &gt;$10k (3), &gt;$1k (1)</li>
                      <li>Maximum: 20 points</li>
                    </ul>
                  </div>
                </div>

                {/* Stability */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📊</span>
                    Stability (5% Weight)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Measures price volatility based on the 24h price change.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preisänderung 24h:</span>
                      <span className="font-semibold">
                        {trustScore.details.stability?.priceChange24h?.toFixed(2) || 'N/A'}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volatilität:</span>
                      <span className="font-semibold">
                        {trustScore.details.stability?.volatilityRating || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p><strong>Scoring:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>&lt;5% change: 20 points (Very Stable)</li>
                      <li>&lt;10% change: 15 points (Stable)</li>
                      <li>&lt;25% change: 10 points (Moderate)</li>
                      <li>&lt;50% change: 5 points (Volatile)</li>
                      <li>&gt;50% change: 0 points (Extremely Volatile)</li>
                    </ul>
                  </div>
                </div>

                {/* Community Sentiment */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🗳️</span>
                    Community Sentiment (15% Weight)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Based on community votes and approval rate. Minimum 10 votes for full weight.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Upvotes:</span>
                      <span className="font-semibold">
                        {trustScore.details.communitySentiment?.upvotes || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Downvotes:</span>
                      <span className="font-semibold">
                        {trustScore.details.communitySentiment?.downvotes || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Votes:</span>
                      <span className="font-semibold">
                        {trustScore.details.communitySentiment?.totalVotes || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approval Rate:</span>
                      <span className="font-semibold">
                        {trustScore.details.communitySentiment
                          ? Math.round(trustScore.details.communitySentiment.approvalRate * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p><strong>Scoring:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Base Score = Approval Rate × 100</li>
                      <li>Vote Multiplier = min(Total Votes / 10, 1)</li>
                      <li>Final Score = Base Score × Vote Multiplier</li>
                      <li>Rating: ≥75% (Excellent), ≥60% (Good), ≥45% (Fair), &lt;45% (Poor)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Tier System */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">🏆 Tier System</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">💎 DIAMOND:</span>
                    <span>≥ 80 points</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🥇 GOLD:</span>
                    <span>≥ 65 points</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🥈 SILVER:</span>
                    <span>≥ 45 points</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🥉 BRONZE:</span>
                    <span>≥ 25 points</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">❓ UNRATED:</span>
                    <span>&lt; 25 points</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
