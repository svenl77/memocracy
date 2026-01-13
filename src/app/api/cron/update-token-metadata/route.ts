import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenData } from "@/lib/dexscreener";

// This endpoint can be called by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
// to update token metadata in the background
// Example: Call this every 5 minutes to keep token data fresh

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    // For example, check for a secret token in headers
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all coins that need updating (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const coins = await prisma.coin.findMany({
      select: {
        mint: true,
      },
    });

    const results = {
      total: coins.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Update tokens in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < coins.length; i += BATCH_SIZE) {
      const batch = coins.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (coin: { id: string; mint: string }) => {
          try {
            // Check if metadata exists and is fresh
            const existing = await prisma.tokenMetadata.findUnique({
              where: { mint: coin.mint },
            });

            if (existing && existing.lastUpdated > fiveMinutesAgo) {
              results.skipped++;
              return;
            }

            // Fetch fresh data from DexScreener
            const tokenData = await getTokenData(coin.mint, false); // Don't use cache

            if (tokenData) {
              await prisma.tokenMetadata.upsert({
                where: { mint: coin.mint },
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
                  mint: coin.mint,
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
              results.updated++;
            } else {
              results.failed++;
              results.errors.push(`No data for ${coin.mint}`);
            }
          } catch (error) {
            results.failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.errors.push(`${coin.mint}: ${errorMsg}`);
            console.error(`Failed to update token ${coin.mint}:`, error);
          }
        })
      );

      // Wait between batches to avoid rate limiting
      if (i + BATCH_SIZE < coins.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Token metadata update completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update token metadata:", error);
    return NextResponse.json(
      {
        error: "Failed to update token metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
