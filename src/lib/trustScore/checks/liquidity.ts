import { CheckResult, LiquidityDetails } from '../types';

interface TokenData {
  liquidity?: number;
  marketCap?: number;
  volume24h: number;
}

export async function calculateLiquidityScore(
  tokenData: TokenData
): Promise<CheckResult & { details: LiquidityDetails; liquidityUsd: number | null }> {
  
  let score = 0;
  const liquidityUsd = tokenData.liquidity || null;
  const mcLiquidityRatio = 
    tokenData.marketCap && tokenData.liquidity
      ? tokenData.marketCap / tokenData.liquidity
      : null;
  const volumeMcRatio = 
    tokenData.marketCap && tokenData.volume24h
      ? (tokenData.volume24h / tokenData.marketCap) * 100
      : null;

  // Absolute Liquidity Score (15 points max) - increased thresholds for large coins
  if (liquidityUsd) {
    if (liquidityUsd > 5_000_000) {
      score += 15; // $5M+ liquidity - excellent
    } else if (liquidityUsd > 1_000_000) {
      score += 12; // $1M+ liquidity - very good
    } else if (liquidityUsd > 500_000) {
      score += 9; // $500k+ liquidity - good
    } else if (liquidityUsd > 100_000) {
      score += 6; // $100k+ liquidity - moderate
    } else if (liquidityUsd > 50_000) {
      score += 3; // $50k+ liquidity - low
    } else if (liquidityUsd > 10_000) {
      score += 1; // $10k+ liquidity - very low
    }
  }

  // MC/Liquidity Ratio Score (10 points max)
  if (mcLiquidityRatio !== null) {
    if (mcLiquidityRatio < 20) {
      score += 10; // Excellent ratio - high liquidity relative to market cap
    } else if (mcLiquidityRatio < 50) {
      score += 7; // Good ratio
    } else if (mcLiquidityRatio < 100) {
      score += 4; // Acceptable ratio
    } else if (mcLiquidityRatio < 200) {
      score += 1; // Poor ratio
    }
    // Over 200 = 0 points (very poor liquidity)
  }

  // Volume/MC Ratio Score (5 points max)
  if (volumeMcRatio !== null) {
    if (volumeMcRatio > 30) {
      score += 5; // Very high trading activity relative to market cap
    } else if (volumeMcRatio > 20) {
      score += 4; // High trading activity
    } else if (volumeMcRatio > 10) {
      score += 3; // Good trading activity
    } else if (volumeMcRatio > 5) {
      score += 1; // Moderate trading activity
    }
  }
  
  // Market Cap Bonus (5 points max) - reward large market cap coins
  if (tokenData.marketCap) {
    if (tokenData.marketCap > 50_000_000) {
      score += 5; // $50M+ market cap - major coin
    } else if (tokenData.marketCap > 10_000_000) {
      score += 3; // $10M+ market cap - significant coin
    } else if (tokenData.marketCap > 1_000_000) {
      score += 1; // $1M+ market cap - established coin
    }
  }

  // Rating and explanation - updated thresholds for new max score of 35
  let rating = '';
  let explanation = '';

  if (score >= 30) {
    rating = 'Excellent';
    explanation = 'Very high liquidity with excellent ratios. Major coin. Safe for trading.';
  } else if (score >= 25) {
    rating = 'Very Good';
    explanation = 'High liquidity with healthy ratios. Safe for trading.';
  } else if (score >= 20) {
    rating = 'Good';
    explanation = 'Adequate liquidity with acceptable ratios.';
  } else if (score >= 15) {
    rating = 'Moderate';
    explanation = 'Limited liquidity. Be cautious with large trades.';
  } else if (score >= 10) {
    rating = 'Low';
    explanation = 'Low liquidity. High slippage risk.';
  } else {
    rating = 'Very Low';
    explanation = 'Very low liquidity. Extreme caution advised.';
  }

  return {
    score,
    liquidityUsd,
    details: {
      liquidityUsd,
      mcLiquidityRatio,
      volumeMcRatio,
      rating,
      explanation,
    },
  };
}
