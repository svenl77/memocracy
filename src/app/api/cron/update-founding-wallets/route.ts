import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateFoundingWalletBalance } from "@/lib/solanaWalletMonitor";
import { updateFoundingWalletTrustScore } from "@/lib/foundingWalletTrustScore";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active founding wallets
    const wallets = await prisma.projectWallet.findMany({
      where: {
        type: "FOUNDING",
        status: "ACTIVE",
      },
      select: {
        id: true,
        address: true,
      },
    });

    logger.info("Starting founding wallet balance update", {
      walletCount: wallets.length,
    });

    const results = {
      total: wallets.length,
      updated: 0,
      newTransactions: 0,
      errors: [] as string[],
    };

    // Update each wallet (with rate limiting - process in batches)
    const BATCH_SIZE = 5;
    for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
      const batch = wallets.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (wallet: { id: string; address: string }) => {
          try {
            const result = await updateFoundingWalletBalance(wallet.id);
            if (result.updated) {
              results.updated++;
              results.newTransactions += result.newTransactions;
            }
            
            // Update trust score after balance update
            try {
              await updateFoundingWalletTrustScore(wallet.id);
            } catch (scoreError) {
              logger.error("Error updating trust score", {
                walletId: wallet.id,
                error: scoreError instanceof Error ? scoreError.message : String(scoreError),
              });
            }
          } catch (error) {
            const errorMsg = `Wallet ${wallet.id}: ${
              error instanceof Error ? error.message : String(error)
            }`;
            results.errors.push(errorMsg);
            logger.error("Error updating founding wallet", {
              walletId: wallet.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < wallets.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    logger.info("Founding wallet balance update completed", results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error("Failed to update founding wallets", {
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
