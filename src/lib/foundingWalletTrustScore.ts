import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

interface TrustScoreResult {
  overallScore: number;
  tier: string;
  transparencyScore: number;
  executionScore: number;
  communityScore: number;
  totalContributors: number;
  totalContributionsUSD: number;
  completionRate: number | null;
  averageRating: number | null;
}

/**
 * Calculates trust score for a founding wallet
 */
export async function calculateFoundingWalletTrustScore(
  walletId: string
): Promise<TrustScoreResult> {
  try {
    const wallet = await prisma.projectWallet.findUnique({
      where: { id: walletId },
      include: {
        contributors: true,
        transactions: true,
      },
    });

    if (!wallet || wallet.type !== "FOUNDING") {
      throw new Error("Wallet not found or not a founding wallet");
    }

    // 1. Transparency Score (0-100)
    // Based on: transaction visibility, description, funding goal
    const transactionCount = wallet.transactions.length;
    const hasDescription = wallet.description && wallet.description.length > 50;
    
    let transparencyScore = 0;
    transparencyScore += Math.min(transactionCount * 2, 40); // Max 40 points for transactions
    transparencyScore += hasDescription ? 30 : 0; // 30 points for description
    transparencyScore += wallet.fundingGoalUSD || wallet.fundingGoalLamports ? 30 : 0; // 30 points for goal

    // 2. Execution Score (0-100)
    // Based on: completion status, goal achievement
    let executionScore = 50; // Base score
    
    if (wallet.status === "COMPLETED") {
      executionScore += 30; // +30 for completion
    } else if (wallet.status === "FUNDED") {
      executionScore += 20; // +20 for reaching goal
    }

    // Check if goal is being met
    if (wallet.fundingGoalUSD && wallet.fundingGoalUSD > 0) {
      const progress = wallet.currentBalanceUSD / wallet.fundingGoalUSD;
      if (progress >= 1.0) {
        executionScore += 20; // Fully funded
      } else if (progress >= 0.5) {
        executionScore += 10; // Halfway there
      }
    }

    // 3. Community Score (0-100)
    // Based on: number of contributors, total contributions
    const contributorCount = wallet.contributors.length;
    const totalContributions = wallet.currentBalanceUSD;

    let communityScore = 0;
    communityScore += Math.min(contributorCount * 8, 50); // Max 50 points for contributors
    communityScore += Math.min(totalContributions / 100, 50); // Max 50 points for contributions (scaled)

    // 4. Calculate Overall Score (weighted average)
    const weights = {
      transparency: 0.35,
      execution: 0.35,
      community: 0.30,
    };

    const overallScore = Math.round(
      transparencyScore * weights.transparency +
        executionScore * weights.execution +
        communityScore * weights.community
    );

    // 5. Determine Tier
    let tier = "UNRATED";
    if (overallScore >= 80) tier = "DIAMOND";
    else if (overallScore >= 65) tier = "GOLD";
    else if (overallScore >= 50) tier = "SILVER";
    else if (overallScore >= 30) tier = "BRONZE";

    // 6. Calculate completion rate
    const completionRate =
      wallet.status === "COMPLETED" ? 1.0 : wallet.status === "FUNDED" ? 1.0 : null;

    // 7. Calculate average rating (if ratings exist)
    // TODO: Implement rating system when available
    const averageRating: number | null = null;

    return {
      overallScore,
      tier,
      transparencyScore: Math.round(transparencyScore),
      executionScore: Math.round(executionScore),
      communityScore: Math.round(communityScore),
      totalContributors: contributorCount,
      totalContributionsUSD: wallet.currentBalanceUSD,
      completionRate,
      averageRating,
    };
  } catch (error) {
    logger.error("Failed to calculate founding wallet trust score", {
      walletId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Updates or creates trust score for a founding wallet
 */
export async function updateFoundingWalletTrustScore(
  walletId: string
): Promise<void> {
  try {
    const scoreResult = await calculateFoundingWalletTrustScore(walletId);

    await prisma.foundingWalletTrustScore.upsert({
      where: { foundingWalletId: walletId },
      create: {
        foundingWalletId: walletId,
        overallScore: scoreResult.overallScore,
        tier: scoreResult.tier,
        transparencyScore: scoreResult.transparencyScore,
        executionScore: scoreResult.executionScore,
        communityScore: scoreResult.communityScore,
        totalContributors: scoreResult.totalContributors,
        totalContributionsUSD: scoreResult.totalContributionsUSD,
        completionRate: scoreResult.completionRate,
        averageRating: scoreResult.averageRating,
        lastChecked: new Date(),
      },
      update: {
        overallScore: scoreResult.overallScore,
        tier: scoreResult.tier,
        transparencyScore: scoreResult.transparencyScore,
        executionScore: scoreResult.executionScore,
        communityScore: scoreResult.communityScore,
        totalContributors: scoreResult.totalContributors,
        totalContributionsUSD: scoreResult.totalContributionsUSD,
        completionRate: scoreResult.completionRate,
        averageRating: scoreResult.averageRating,
        lastChecked: new Date(),
      },
    });

    logger.info("Founding wallet trust score updated", {
      walletId,
      overallScore: scoreResult.overallScore,
      tier: scoreResult.tier,
    });
  } catch (error) {
    logger.error("Failed to update founding wallet trust score", {
      walletId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
