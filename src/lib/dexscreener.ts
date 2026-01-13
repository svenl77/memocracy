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

// Cache duration: 5 minutes for price data (volatile)
const CACHE_DURATION_MS = 5 * 60 * 1000;

export async function getTokenData(tokenAddress: string, useCache: boolean = true): Promise<{
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap?: number;
  liquidity?: number;
  image?: string;
  txns?: {
    h24: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  pairCreatedAt?: number;
} | null> {
  // Try to get from cache first
  if (useCache) {
    try {
      const { prisma } = await import("@/lib/db");
      const cached = await prisma.tokenMetadata.findUnique({
        where: { mint: tokenAddress },
      });

      if (cached && cached.lastUpdated) {
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        if (cacheAge < CACHE_DURATION_MS && cached.price !== null) {
          // Return cached data if fresh
          return {
            name: cached.name || "Unknown Token",
            symbol: cached.symbol || "UNK",
            price: cached.price || 0,
            priceChange24h: cached.priceChange24h || 0,
            volume24h: cached.volume24h || 0,
            marketCap: cached.marketCap || undefined,
            liquidity: cached.liquidity || undefined,
            image: cached.image || undefined,
          };
        }
      }
    } catch (error) {
      // Silently continue to fetch from API if cache read fails
      // Continue to fetch from API
    }
  }

  // Fetch from DexScreener API
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      {
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
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
    
    const tokenData = {
      name: knownToken?.name || bestPair.baseToken.name || "Unknown Token",
      symbol: knownToken?.symbol || bestPair.baseToken.symbol || "UNK",
      price: parseFloat(bestPair.priceUsd) || 0,
      priceChange24h: bestPair.priceChange.h24 || 0,
      volume24h: bestPair.volume.h24 || 0,
      marketCap: bestPair.marketCap,
      liquidity: bestPair.liquidity?.usd,
      image: bestPair.baseToken.image || getTokenImageUrl(bestPair.baseToken.address, bestPair.baseToken.symbol),
      txns: bestPair.txns,
      pairCreatedAt: bestPair.pairCreatedAt,
    };

    // Save to cache (async, don't wait)
    if (useCache) {
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.tokenMetadata.upsert({
          where: { mint: tokenAddress },
          update: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            price: tokenData.price,
            priceChange24h: tokenData.priceChange24h,
            volume24h: tokenData.volume24h,
            marketCap: tokenData.marketCap,
            liquidity: tokenData.liquidity,
            image: tokenData.image,
            lastUpdated: new Date(),
          },
          create: {
            mint: tokenAddress,
            name: tokenData.name,
            symbol: tokenData.symbol,
            price: tokenData.price,
            priceChange24h: tokenData.priceChange24h,
            volume24h: tokenData.volume24h,
            marketCap: tokenData.marketCap,
            liquidity: tokenData.liquidity,
            image: tokenData.image,
          },
        });
      } catch (error) {
        // Silently continue if caching fails (non-critical)
      }
    }

    return tokenData;
  } catch (error) {
    // Error will be logged by caller if needed
    
    // Try to return stale cache if API fails
    if (useCache) {
      try {
        const { prisma } = await import("@/lib/db");
        const cached = await prisma.tokenMetadata.findUnique({
          where: { mint: tokenAddress },
        });
        if (cached && cached.price !== null) {
          return {
            name: cached.name || "Unknown Token",
            symbol: cached.symbol || "UNK",
            price: cached.price || 0,
            priceChange24h: cached.priceChange24h || 0,
            volume24h: cached.volume24h || 0,
            marketCap: cached.marketCap || undefined,
            liquidity: cached.liquidity || undefined,
            image: cached.image || undefined,
          };
        }
      } catch (cacheError) {
        // Ignore cache errors
      }
    }
    
    return null;
  }
}
