import { CheckResult, StabilityDetails } from '../types';

interface StabilityData {
  priceChange24h: number;
}

export async function calculateStabilityScore(
  stabilityData: StabilityData
): Promise<CheckResult & { details: StabilityDetails }> {
  
  let score = 0;
  const priceChange24h = stabilityData.priceChange24h;
  const absChange = Math.abs(priceChange24h);

  // Price Stability Score (20 points max)
  if (absChange < 5) {
    score = 20; // Very stable
  } else if (absChange < 10) {
    score = 15; // Stable
  } else if (absChange < 25) {
    score = 10; // Moderate volatility
  } else if (absChange < 50) {
    score = 5; // High volatility
  } else {
    score = 0; // Extreme volatility
  }

  // Determine volatility rating
  let volatilityRating = '';
  if (absChange < 5) {
    volatilityRating = 'Very Stable';
  } else if (absChange < 10) {
    volatilityRating = 'Stable';
  } else if (absChange < 25) {
    volatilityRating = 'Moderate';
  } else if (absChange < 50) {
    volatilityRating = 'Volatile';
  } else {
    volatilityRating = 'Extremely Volatile';
  }

  // Overall rating
  let rating = '';
  let explanation = '';

  if (score >= 15) {
    rating = 'Excellent';
    explanation = 'Price is stable. Low volatility indicates healthy price action.';
  } else if (score >= 10) {
    rating = 'Good';
    explanation = 'Moderate price movement. Normal for active tokens.';
  } else if (score >= 5) {
    rating = 'Moderate';
    explanation = 'High volatility detected. Price is moving significantly.';
  } else {
    rating = 'Poor';
    explanation = 'Extreme volatility. High speculation or manipulation risk.';
  }

  return {
    score,
    details: {
      priceChange24h,
      volatilityRating,
      rating,
      explanation,
    },
  };
}
