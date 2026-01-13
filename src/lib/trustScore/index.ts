import { getTokenData } from '../dexscreener';
import { calculateMaturityScore } from './checks/maturity';
import { calculateSecurityScore } from './checks/security';
import { calculateLiquidityScore } from './checks/liquidity';
import { calculateTradingScore } from './checks/trading';
import { calculateStabilityScore } from './checks/stability';
import { checkCommunitySentiment } from './checks/communitySentiment';
import { TrustScoreResult } from './types';

// Score weights - must add up to 100%
// Updated to better reflect market size and trading activity
const WEIGHTS = {
  maturity: 0.15,             // 15% (reduced - less critical for established coins)
  security: 0.20,             // 20% (reduced - still important but not dominant)
  liquidity: 0.25,            // 25% (increased - critical for large coins)
  trading: 0.20,              // 20% (doubled - very important for market activity)
  stability: 0.05,            // 5% (unchanged - minor factor)
  communitySentiment: 0.15,   // 15% (unchanged - important for community trust)
};

export async function calculateTrustScore(
  tokenAddress: string
): Promise<TrustScoreResult> {
  try {
    // Fetch token data from DexScreener
    const tokenData = await getTokenData(tokenAddress);

    if (!tokenData) {
      throw new Error('Failed to fetch token data');
    }

    // Run all checks in parallel
    // Pass marketCap to checks that need it for better scoring of large coins
    const marketCap = tokenData.marketCap || 0;
    const [maturityResult, securityResult, liquidityResult, tradingResult, stabilityResult, sentimentResult] =
      await Promise.all([
        calculateMaturityScore((tokenData as any).pairCreatedAt),
        calculateSecurityScore(tokenAddress),
        calculateLiquidityScore({
          liquidity: tokenData.liquidity,
          marketCap: marketCap,
          volume24h: tokenData.volume24h,
        }),
        calculateTradingScore({
          txns: (tokenData as any).txns,
          volume24h: tokenData.volume24h,
          marketCap: marketCap,
        }),
        calculateStabilityScore({
          priceChange24h: tokenData.priceChange24h,
        }),
        checkCommunitySentiment(tokenAddress, marketCap),
      ]);

    // Calculate weighted overall score
    const overallScore = Math.round(
      maturityResult.score * WEIGHTS.maturity +
      securityResult.score * WEIGHTS.security +
      liquidityResult.score * WEIGHTS.liquidity +
      tradingResult.score * WEIGHTS.trading +
      stabilityResult.score * WEIGHTS.stability +
      sentimentResult.score * WEIGHTS.communitySentiment
    );

    // Determine tier
    const tier = determineTier(overallScore);

    return {
      overallScore,
      tier,
      breakdown: {
        maturity: maturityResult.score,
        security: securityResult.score,
        liquidity: liquidityResult.score,
        trading: tradingResult.score,
        stability: stabilityResult.score,
        communitySentiment: sentimentResult.score,
      },
      flags: {
        mintDisabled: securityResult.mintDisabled,
        freezeDisabled: securityResult.freezeDisabled,
      },
      metrics: {
        contractAgeDays: maturityResult.details.contractAgeDays,
        liquidityUsd: liquidityResult.liquidityUsd,
        sellPressure24h: tradingResult.sellPressure24h,
      },
      details: {
        maturity: maturityResult.details,
        security: securityResult.details,
        liquidity: liquidityResult.details,
        trading: tradingResult.details,
        stability: stabilityResult.details,
        communitySentiment: sentimentResult,
      },
    };
  } catch (error) {
    // Error will be logged by caller if needed
    throw error;
  }
}

function determineTier(
  score: number
): 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE' | 'UNRATED' {
  if (score >= 80) return 'DIAMOND';
  if (score >= 65) return 'GOLD';
  if (score >= 45) return 'SILVER';
  if (score >= 25) return 'BRONZE';
  return 'UNRATED';
}

// Helper to get tier emoji
export function getTierEmoji(tier: string): string {
  switch (tier) {
    case 'DIAMOND':
      return '💎';
    case 'GOLD':
      return '🥇';
    case 'SILVER':
      return '🥈';
    case 'BRONZE':
      return '🥉';
    default:
      return '❓';
  }
}

// Helper to get tier color
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'DIAMOND':
      return 'from-cyan-400 to-blue-600';
    case 'GOLD':
      return 'from-yellow-400 to-orange-500';
    case 'SILVER':
      return 'from-gray-300 to-gray-500';
    case 'BRONZE':
      return 'from-orange-400 to-orange-700';
    default:
      return 'from-gray-400 to-gray-600';
  }
}
