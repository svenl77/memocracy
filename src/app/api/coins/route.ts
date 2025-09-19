import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenData } from "@/lib/dexscreener";

export async function GET() {
  try {
    // Get all unique token CAs that have polls
    const polls = await prisma.poll.findMany({
      where: {
        tokenCA: {
          not: null,
        },
      },
      select: {
        tokenCA: true,
        topic: true,
        createdAt: true,
        votes: {
          select: {
            wallet: true,
          },
        },
      },
    });

    // Group by token CA
    const coinMap = new Map();
    
    polls.forEach(poll => {
      if (!poll.tokenCA) return;
      
      if (!coinMap.has(poll.tokenCA)) {
        coinMap.set(poll.tokenCA, {
          tokenCA: poll.tokenCA,
          pollCount: 0,
          totalVotes: 0,
          uniqueVoters: new Set(),
          latestPoll: poll.createdAt,
          topics: [],
        });
      }
      
      const coin = coinMap.get(poll.tokenCA);
      coin.pollCount++;
      coin.totalVotes += poll.votes.length;
      poll.votes.forEach(vote => coin.uniqueVoters.add(vote.wallet));
      
      if (poll.createdAt > coin.latestPoll) {
        coin.latestPoll = poll.createdAt;
      }
      
      coin.topics.push(poll.topic);
    });

    // Convert to array and format
    const coins = Array.from(coinMap.values()).map(coin => ({
      tokenCA: coin.tokenCA,
      pollCount: coin.pollCount,
      totalVotes: coin.totalVotes,
      uniqueVoters: coin.uniqueVoters.size,
      latestPoll: coin.latestPoll,
      topics: coin.topics.slice(0, 3), // Show first 3 topics
    }));

    // Sort by latest poll activity
    coins.sort((a, b) => new Date(b.latestPoll).getTime() - new Date(a.latestPoll).getTime());

    // Fetch token metadata for each coin (in parallel)
    const coinsWithMetadata = await Promise.all(
      coins.map(async (coin) => {
        try {
          const tokenData = await getTokenData(coin.tokenCA);
          return {
            ...coin,
            tokenData,
          };
        } catch (error) {
          console.error(`Failed to fetch metadata for ${coin.tokenCA}:`, error);
          return {
            ...coin,
            tokenData: null,
          };
        }
      })
    );

    return NextResponse.json(coinsWithMetadata);
  } catch (error) {
    console.error("Failed to fetch coins:", error);
    return NextResponse.json(
      { error: "Failed to fetch coins" },
      { status: 500 }
    );
  }
}
