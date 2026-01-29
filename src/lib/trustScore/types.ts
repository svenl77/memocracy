// Trust Score Type Definitions

export interface TrustScoreResult {
  overallScore: number;
  tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE' | 'UNRATED';
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
  metrics: {
    contractAgeDays: number | null;
    liquidityUsd: number | null;
    sellPressure24h: number | null;
  };
  details: {
    maturity: MaturityDetails;
    security: SecurityDetails;
    liquidity: LiquidityDetails;
    trading: TradingDetails;
    stability: StabilityDetails;
    communitySentiment: CommunitySentimentResult;
  };
}

export interface MaturityDetails {
  contractAgeDays: number | null;
  pairCreatedAt: number | null;
  rating: string;
  explanation: string;
}

export interface SecurityDetails {
  mintDisabled: boolean;
  freezeDisabled: boolean;
  totalSupply: string | null;
  decimals: number | null;
  rating: string;
  explanation: string;
}

export interface LiquidityDetails {
  liquidityUsd: number | null;
  mcLiquidityRatio: number | null;
  volumeMcRatio: number | null;
  rating: string;
  explanation: string;
}

export interface TradingDetails {
  buys24h: number | null;
  sells24h: number | null;
  sellPressure: number | null;
  volume24h: number | null;
  rating: string;
  explanation: string;
}

export interface StabilityDetails {
  priceChange24h: number | null;
  volatilityRating: string;
  rating: string;
  explanation: string;
}

export interface CommunitySentimentResult {
  score: number;
  totalVotes?: number;
  upvotes?: number;
  downvotes?: number;
  approvalRate?: number;
  marketCap?: number;
  rating: string;
  explanation: string;
}

export interface CheckResult {
  score: number;
  details: any;
}
