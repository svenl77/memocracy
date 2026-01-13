import { CheckResult, TradingDetails } from '../types';

interface TradingData {
  txns?: {
    h24: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  volume24h: number;
  marketCap?: number;
}

export async function calculateTradingScore(
  tradingData: TradingData
): Promise<CheckResult & { details: TradingDetails; sellPressure24h: number | null }> {
  
  let score = 0;
  const buys24h = tradingData.txns?.h24.buys || null;
  const sells24h = tradingData.txns?.h24.sells || null;
  const sellPressure = 
    buys24h && sells24h && buys24h > 0
      ? sells24h / buys24h
      : null;

  // Buy/Sell Ratio Score (15 points max)
  if (sellPressure !== null) {
    if (sellPressure < 0.8) {
      score += 15; // Buy-dominated
    } else if (sellPressure < 1.0) {
      score += 10; // Balanced, slight buy pressure
    } else if (sellPressure < 1.2) {
      score += 5; // Slightly more sells
    }
    // Over 1.2 = 0 points (sell-off)
  }

  // Volume Activity Score (10 points max) - increased thresholds for large coins
  if (tradingData.volume24h > 5_000_000) {
    score += 10; // $5M+ volume - exceptional
  } else if (tradingData.volume24h > 1_000_000) {
    score += 8; // $1M+ volume - very high
  } else if (tradingData.volume24h > 500_000) {
    score += 6; // $500k+ volume - high
  } else if (tradingData.volume24h > 100_000) {
    score += 4; // $100k+ volume - good
  } else if (tradingData.volume24h > 50_000) {
    score += 2; // $50k+ volume - moderate
  } else if (tradingData.volume24h > 10_000) {
    score += 1; // $10k+ volume - low
  }
  
  // Market Cap Bonus (5 points max) - reward large market cap coins with active trading
  if (tradingData.marketCap) {
    if (tradingData.marketCap > 50_000_000 && tradingData.volume24h > 1_000_000) {
      score += 5; // Major coin with high volume
    } else if (tradingData.marketCap > 10_000_000 && tradingData.volume24h > 500_000) {
      score += 3; // Significant coin with good volume
    } else if (tradingData.marketCap > 1_000_000 && tradingData.volume24h > 100_000) {
      score += 1; // Established coin with moderate volume
    }
  }

  // Rating and explanation - updated thresholds for new max score of 30
  let rating = '';
  let explanation = '';

  if (score >= 25) {
    rating = 'Excellent';
    explanation = 'Exceptional trading activity with strong buy pressure. Major coin.';
  } else if (score >= 20) {
    rating = 'Very Good';
    explanation = 'Strong buy pressure with high volume. Bullish signal.';
  } else if (score >= 15) {
    rating = 'Good';
    explanation = 'Healthy trading activity with balanced pressure.';
  } else if (score >= 10) {
    rating = 'Moderate';
    explanation = 'Some trading activity, watch for trends.';
  } else if (score >= 5) {
    rating = 'Low';
    explanation = 'Low trading activity or sell pressure detected.';
  } else {
    rating = 'Very Low';
    explanation = 'Very low trading activity. High risk.';
  }

  return {
    score,
    sellPressure24h: sellPressure,
    details: {
      buys24h,
      sells24h,
      sellPressure,
      volume24h: tradingData.volume24h,
      rating,
      explanation,
    },
  };
}
