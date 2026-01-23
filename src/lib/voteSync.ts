import { prisma } from "./db";
import { logger } from "./logger";
import {
  getVoteStatsFromChain,
  getUserVoteFromChain,
  checkProgramDeployed,
} from "./solanaVoteProgram";
import { retryWithBackoff, withTimeout, isRetryableError } from "./errorHandling";

/**
 * Sync votes from chain for a specific coin
 * @param coinMint - The coin mint address
 * @returns Number of votes synced
 */
export async function syncVotesFromChain(coinMint: string): Promise<number> {
  try {
    // Check if program is deployed
    const isDeployed = await checkProgramDeployed();
    if (!isDeployed) {
      logger.debug("On-chain program not deployed, skipping sync", { coinMint });
      return 0;
    }

    // Get coin from database
    const coin = await prisma.coin.findUnique({
      where: { mint: coinMint },
      include: {
        votes: true,
      },
    });

    if (!coin) {
      logger.warn("Coin not found for sync", { coinMint });
      return 0;
    }

    // Get stats from chain with retry and timeout
    const onChainStats = await retryWithBackoff(
      () => withTimeout(() => getVoteStatsFromChain(coinMint), 10000),
      {
        maxRetries: 2,
        retryDelay: 1000,
        exponentialBackoff: true,
      }
    ).catch((error) => {
      if (isRetryableError(error)) {
        logger.warn("Failed to get on-chain stats after retries", {
          coinMint,
          error: error.message,
        });
      }
      return null;
    });

    if (!onChainStats) {
      logger.debug("No on-chain stats found", { coinMint });
      return 0;
    }

    // Get all votes for this coin that need syncing
    const votesToSync = coin.votes.filter(
      (vote) => !vote.onChainSynced || !vote.transactionSignature
    );

    let syncedCount = 0;

    // Sync each vote
    for (const vote of votesToSync) {
      try {
        const userVote = await retryWithBackoff(
          () => withTimeout(() => getUserVoteFromChain(coinMint, vote.wallet), 5000),
          {
            maxRetries: 1,
            retryDelay: 500,
          }
        ).catch((error) => {
          logger.warn("Failed to get user vote from chain", {
            coinMint,
            wallet: vote.wallet,
            error: error.message,
          });
          return { voteType: null, timestamp: null };
        });

        if (userVote.voteType) {
          // Update vote with on-chain data
          await prisma.coinVote.update({
            where: { id: vote.id },
            data: {
              vote: userVote.voteType,
              onChainSynced: true,
              syncedAt: userVote.timestamp
                ? new Date(userVote.timestamp * 1000)
                : new Date(),
            },
          });
          syncedCount++;
        }
      } catch (error) {
        logger.error("Failed to sync individual vote", {
          coinMint,
          wallet: vote.wallet,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with next vote
      }
    }

    logger.info("Votes synced from chain", {
      coinMint,
      syncedCount,
      totalVotes: coin.votes.length,
    });

    return syncedCount;
  } catch (error) {
    logger.error("Failed to sync votes from chain", {
      coinMint,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Sync votes for all coins
 * @param limit - Maximum number of coins to sync (default: 100)
 * @returns Total number of votes synced
 */
export async function syncAllCoins(limit: number = 100): Promise<number> {
  try {
    // Check if program is deployed
    const isDeployed = await checkProgramDeployed();
    if (!isDeployed) {
      logger.debug("On-chain program not deployed, skipping sync");
      return 0;
    }

    // Get all coins with votes
    const coins = await prisma.coin.findMany({
      where: {
        votes: {
          some: {
            onChainSynced: false,
          },
        },
      },
      take: limit,
      select: {
        mint: true,
      },
    });

    let totalSynced = 0;

    // Sync each coin
    for (const coin of coins) {
      try {
        const synced = await syncVotesFromChain(coin.mint);
        totalSynced += synced;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error("Failed to sync coin", {
          coinMint: coin.mint,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with next coin
      }
    }

    logger.info("All coins synced", {
      coinsProcessed: coins.length,
      totalVotesSynced: totalSynced,
    });

    return totalSynced;
  } catch (error) {
    logger.error("Failed to sync all coins", {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Sync vote stats from chain (upvotes, downvotes, net score)
 * This can be used to verify database stats match on-chain stats
 * @param coinMint - The coin mint address
 * @returns Stats comparison or null if not available
 */
export async function syncVoteStatsFromChain(
  coinMint: string
): Promise<{
  database: { upvotes: number; downvotes: number; netScore: number };
  onChain: { upvotes: number; downvotes: number; netScore: number };
  match: boolean;
} | null> {
  try {
    // Get database stats
    const coin = await prisma.coin.findUnique({
      where: { mint: coinMint },
      include: {
        votes: true,
      },
    });

    if (!coin) {
      return null;
    }

    const dbUpvotes = coin.votes.filter((v) => v.vote === "UP").length;
    const dbDownvotes = coin.votes.filter((v) => v.vote === "DOWN").length;
    const dbNetScore = dbUpvotes - dbDownvotes;

    // Get on-chain stats
    const onChainStats = await getVoteStatsFromChain(coinMint);
    if (!onChainStats) {
      return null;
    }

    const match =
      dbUpvotes === onChainStats.upvotes &&
      dbDownvotes === onChainStats.downvotes &&
      dbNetScore === onChainStats.netScore;

    return {
      database: {
        upvotes: dbUpvotes,
        downvotes: dbDownvotes,
        netScore: dbNetScore,
      },
      onChain: {
        upvotes: onChainStats.upvotes,
        downvotes: onChainStats.downvotes,
        netScore: onChainStats.netScore,
      },
      match,
    };
  } catch (error) {
    logger.error("Failed to sync vote stats from chain", {
      coinMint,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
