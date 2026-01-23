import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncAllCoins, syncVoteStatsFromChain } from "@/lib/voteSync";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { checkProgramDeployed } from "@/lib/solanaVoteProgram";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if program is deployed
    const isDeployed = await checkProgramDeployed();
    if (!isDeployed) {
      logger.info("On-chain program not deployed, skipping vote sync");
      return NextResponse.json({
        success: true,
        message: "On-chain program not deployed, sync skipped",
        synced: 0,
      });
    }

    logger.info("Starting vote sync from chain");

    // Sync all coins (limit to 50 per run to avoid timeout)
    const syncedCount = await syncAllCoins(50);

    logger.info("Vote sync completed", {
      syncedCount,
    });

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Synced ${syncedCount} votes from chain`,
    });
  } catch (error) {
    logger.error("Failed to sync votes", {
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

/**
 * Manual sync endpoint for a specific coin
 * GET /api/cron/sync-votes?coinMint=...
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { coinMint, verifyStats } = body;

    if (!coinMint) {
      return NextResponse.json(
        { error: "coinMint is required" },
        { status: 400 }
      );
    }

    // Check if program is deployed
    const isDeployed = await checkProgramDeployed();
    if (!isDeployed) {
      return NextResponse.json({
        success: false,
        message: "On-chain program not deployed",
      });
    }

    // Sync votes for specific coin
    const { syncVotesFromChain } = await import("@/lib/voteSync");
    const syncedCount = await syncVotesFromChain(coinMint);

    let statsComparison = null;
    if (verifyStats) {
      statsComparison = await syncVoteStatsFromChain(coinMint);
    }

    return NextResponse.json({
      success: true,
      coinMint,
      synced: syncedCount,
      statsComparison,
    });
  } catch (error) {
    logger.error("Failed to sync votes for coin", {
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
