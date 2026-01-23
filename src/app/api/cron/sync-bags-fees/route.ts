import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { syncBagsCoinFees } from "@/lib/bagsCoinManager";
import { env } from "@/lib/env";

/**
 * GET /api/cron/sync-bags-fees
 * Cron job to sync fees from Bags API for all Bags Coins
 * 
 * Authentication: CRON_SECRET header
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");
  
  if (env.CRON_SECRET && cronSecret !== env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Get all Bags Coins that need fee updates
    const bagsCoins = await prisma.bagsCoin.findMany({
      include: {
        feeAnalytics: true,
      },
    });

    logger.info("Starting Bags fee sync", {
      totalCoins: bagsCoins.length,
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const coin of bagsCoins) {
      try {
        // Check if update is needed
        const needsUpdate = !coin.feeAnalytics || 
          !coin.feeAnalytics.nextUpdateAt ||
          new Date(coin.feeAnalytics.nextUpdateAt) <= new Date();

        if (!needsUpdate) {
          logger.debug("Skipping fee sync (not due yet)", {
            tokenMint: coin.tokenMint,
            nextUpdateAt: coin.feeAnalytics?.nextUpdateAt,
          });
          continue;
        }

        await syncBagsCoinFees(coin.tokenMint);
        results.success++;
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`${coin.tokenMint}: ${errorMessage}`);
        
        logger.error("Failed to sync fees for Bags Coin", {
          tokenMint: coin.tokenMint,
          error: errorMessage,
        });
      }
    }

    logger.info("Bags fee sync completed", results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Bags fee sync cron job failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
