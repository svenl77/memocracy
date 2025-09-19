interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerToken[];
}

// Special handling for well-known tokens
const KNOWN_TOKENS: Record<string, { name: string; symbol: string }> = {
  "So11111111111111111111111111111111111111112": { name: "Wrapped SOL", symbol: "SOL" },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { name: "USD Coin", symbol: "USDC" },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { name: "Tether USD", symbol: "USDT" },
  "JosjEXh69RckgSs2AWsN1xN8zmiSHxBuJjHLURJnHhg": { name: "JuliaOS", symbol: "JOS" },
  "B9jYrBoCPN7FcXVHe56KXsYgJE5gbTxsadjvyFiVpump": { name: "MOONBAG", symbol: "BAG" },
  "AnUmd399EDCEmoXjSpUAVWE4TcyT1xFMJcPgAZ2VgChn": { name: "Baby DOWGE", symbol: "Baby DOWGE" },
  "G4zwEA9NSd3nMBbEj31MMPq2853Brx2oGsKzex3ebonk": { name: "Momo", symbol: "MOMO" },
  "Eyc4ozMWwUxBUTK61MTjzLBjSWWWNqqc8sjTF3Gfbonk": { name: "solle", symbol: "SOLLE" },
};

// Function to get token image URL from our local API
function getTokenImageUrl(tokenAddress: string, symbol?: string): string {
  // Use our local API that downloads from DexScreener
  return `/api/token-image/${tokenAddress}`;
}

export async function getTokenData(tokenAddress: string): Promise<{
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap?: number;
  liquidity?: number;
  image?: string;
} | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }
    
    const data: DexScreenerResponse = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }
    
    // Get the pair with highest liquidity
    const bestPair = data.pairs.reduce((best, current) => {
      const currentLiquidity = current.liquidity?.usd || 0;
      const bestLiquidity = best.liquidity?.usd || 0;
      return currentLiquidity > bestLiquidity ? current : best;
    });
    
    // Use known token data if available, otherwise use API data
    const knownToken = KNOWN_TOKENS[tokenAddress];
    
    return {
      name: knownToken?.name || bestPair.baseToken.name || "Unknown Token",
      symbol: knownToken?.symbol || bestPair.baseToken.symbol || "UNK",
      price: parseFloat(bestPair.priceUsd) || 0,
      priceChange24h: bestPair.priceChange.h24 || 0,
      volume24h: bestPair.volume.h24 || 0,
      marketCap: bestPair.marketCap,
      liquidity: bestPair.liquidity?.usd,
      image: bestPair.baseToken.image || getTokenImageUrl(bestPair.baseToken.address, bestPair.baseToken.symbol),
    };
  } catch (error) {
    console.error("Failed to fetch token data from DexScreener:", error);
    return null;
  }
}
