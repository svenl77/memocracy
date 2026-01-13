import { prisma } from "@/lib/db";
import { CommunitySentimentResult } from "../types";

/**
 * Check Community Sentiment based on coin votes and market cap
 * 
 * Score calculation:
 * - Based on approval rate (upvotes / total votes)
 * - Requires minimum votes for full weight (10 votes)
 * - Market cap as proxy for community size (if no votes yet)
 * - 0-100 scale
 */
export async function checkCommunitySentiment(
  tokenAddress: string,
  marketCap: number = 0
): Promise<CommunitySentimentResult> {
  try {
    const coin = await prisma.coin.findUnique({
      where: { mint: tokenAddress },
      include: { votes: true },
    });

    // If no votes, use market cap as proxy for community size
    if (!coin || coin.votes.length === 0) {
      let marketCapScore = 0;
      let marketCapRating = "No Data";
      let marketCapDescription = "No community votes yet";
      
      // Market cap as proxy: large market cap = large community
      if (marketCap > 50_000_000) {
        marketCapScore = 60; // $50M+ = major community
        marketCapRating = "Large Community (Market Cap)";
        marketCapDescription = "Major coin with $50M+ market cap indicates large community";
      } else if (marketCap > 10_000_000) {
        marketCapScore = 45; // $10M+ = significant community
        marketCapRating = "Significant Community (Market Cap)";
        marketCapDescription = "Significant coin with $10M+ market cap indicates good community";
      } else if (marketCap > 1_000_000) {
        marketCapScore = 30; // $1M+ = established community
        marketCapRating = "Established Community (Market Cap)";
        marketCapDescription = "Established coin with $1M+ market cap indicates community presence";
      } else if (marketCap > 100_000) {
        marketCapScore = 15; // $100k+ = small community
        marketCapRating = "Small Community (Market Cap)";
        marketCapDescription = "Small coin with $100k+ market cap";
      }
      
      return {
        score: marketCapScore,
        rating: marketCapRating,
        description: marketCapDescription,
        upvotes: 0,
        downvotes: 0,
        totalVotes: 0,
        approvalRate: 0,
      };
    }

    const upvotes = coin.votes.filter((v) => v.vote === "UP").length;
    const totalVotes = coin.votes.length;
    const downvotes = totalVotes - upvotes;
    const approvalRate = upvotes / totalVotes;

    // Minimum votes threshold (need at least 10 votes for full score)
    // This prevents manipulation with just 1-2 votes
    const MIN_VOTES_FOR_FULL_WEIGHT = 10;
    const voteMultiplier = Math.min(totalVotes / MIN_VOTES_FOR_FULL_WEIGHT, 1);

    // Score based on approval rate and vote count
    const baseScore = approvalRate * 100;
    let score = Math.round(baseScore * voteMultiplier);
    
    // Market cap bonus: if coin has both votes AND large market cap, boost score
    // This rewards coins that have both community engagement AND market size
    if (marketCap > 10_000_000 && totalVotes >= 5) {
      // Large market cap + some votes = very strong community
      score = Math.min(100, score + 10); // Cap at 100
    } else if (marketCap > 1_000_000 && totalVotes >= 5) {
      // Significant market cap + some votes = good community
      score = Math.min(100, score + 5); // Cap at 100
    }

    // Determine rating based on approval rate
    let rating = "Poor";
    if (approvalRate >= 0.75) rating = "Excellent";
    else if (approvalRate >= 0.60) rating = "Good";
    else if (approvalRate >= 0.45) rating = "Fair";

    const approvalPercentage = Math.round(approvalRate * 100);
    const description = `${upvotes}/${totalVotes} community approval (${approvalPercentage}%)`;

    return {
      score,
      rating,
      description,
      upvotes,
      downvotes,
      totalVotes,
      approvalRate,
    };
  } catch (error) {
    console.error("Error checking community sentiment:", error);
    return {
      score: 0,
      rating: "Error",
      description: "Failed to check community sentiment",
      upvotes: 0,
      downvotes: 0,
      totalVotes: 0,
      approvalRate: 0,
    };
  }
}
