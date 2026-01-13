import { CheckResult, MaturityDetails } from '../types';

export async function calculateMaturityScore(
  pairCreatedAt: number | undefined
): Promise<CheckResult & { details: MaturityDetails }> {
  
  if (!pairCreatedAt) {
    return {
      score: 0,
      details: {
        contractAgeDays: null,
        pairCreatedAt: null,
        rating: 'Unknown',
        explanation: 'Contract creation date not available',
      },
    };
  }

  // Calculate age in days
  // pairCreatedAt is in milliseconds from DexScreener
  const now = Date.now(); // Keep in milliseconds
  const ageInMilliseconds = now - pairCreatedAt;
  const ageInDays = Math.floor(ageInMilliseconds / (24 * 60 * 60 * 1000));

  let score = 0;
  let rating = '';
  let explanation = '';

  // Scoring based on age - expanded scale for very old coins
  if (ageInDays < 7) {
    score = 0;
    rating = 'Very New';
    explanation = 'Token is less than a week old. High risk period.';
  } else if (ageInDays < 30) {
    score = 10;
    rating = 'New';
    explanation = 'Token is less than a month old. Still establishing.';
  } else if (ageInDays < 90) {
    score = 20;
    rating = 'Established';
    explanation = 'Token has survived initial launch period.';
  } else if (ageInDays < 180) {
    score = 30;
    rating = 'Mature';
    explanation = 'Token has proven track record over 90+ days.';
  } else if (ageInDays < 365) {
    score = 40;
    rating = 'Very Mature';
    explanation = 'Token has been active for 6+ months. Strong track record.';
  } else {
    score = 50;
    rating = 'Highly Established';
    explanation = 'Token has been active for 1+ year. Excellent longevity.';
  }

  return {
    score,
    details: {
      contractAgeDays: ageInDays,
      pairCreatedAt,
      rating,
      explanation,
    },
  };
}
