import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenData } from "@/lib/dexscreener";

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    const tokenCA = params.ca;

    // Get all polls for this token
    const polls = await prisma.poll.findMany({
      where: { tokenCA },
      include: {
        votes: {
          include: {
            poll: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (polls.length === 0) {
      return NextResponse.json(
        { error: "No polls found for this token" },
        { status: 404 }
      );
    }

    // Get token metadata from DexScreener
    let tokenMetadata = null;
    try {
      const dexscreenerData = await getTokenData(tokenCA);
      
      if (dexscreenerData) {
        tokenMetadata = {
          mint: tokenCA,
          name: dexscreenerData.name,
          symbol: dexscreenerData.symbol,
          price: dexscreenerData.price,
          priceChange24h: dexscreenerData.priceChange24h,
          volume24h: dexscreenerData.volume24h,
          marketCap: dexscreenerData.marketCap,
          liquidity: dexscreenerData.liquidity,
          image: dexscreenerData.image,
        };
      }
    } catch (error) {
      console.error("Failed to fetch token metadata:", error);
      // Continue without metadata
    }

    // Calculate statistics
    const totalPolls = polls.length;
    const activePolls = polls.filter(poll => {
      const now = new Date();
      return now >= new Date(poll.startAt) && now <= new Date(poll.endAt);
    }).length;
    
    const totalVotes = polls.reduce((sum, poll) => sum + poll.votes.length, 0);
    
    // Get unique voters
    const uniqueVoters = new Set();
    polls.forEach(poll => {
      poll.votes.forEach(vote => {
        uniqueVoters.add(vote.wallet);
      });
    });

    // Process polls data
    const processedPolls = polls.map(poll => {
      const options = JSON.parse(poll.options);
      const results = options.map((option: string) => ({
        option,
        count: poll.votes.filter(vote => vote.choice === option).length,
      }));

      const now = new Date();
      const startAt = new Date(poll.startAt);
      const endAt = new Date(poll.endAt);
      
      let status = "upcoming";
      if (now >= startAt && now <= endAt) status = "active";
      else if (now > endAt) status = "ended";

      return {
        ...poll,
        options,
        results,
        totalVotes: poll.votes.length,
        status,
      };
    });

    return NextResponse.json({
      tokenCA,
      tokenMetadata,
      stats: {
        totalPolls,
        activePolls,
        totalVotes,
        uniqueVoters: uniqueVoters.size,
      },
      polls: processedPolls,
      voters: Array.from(uniqueVoters),
    });
  } catch (error) {
    console.error("Failed to fetch coin data:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}
