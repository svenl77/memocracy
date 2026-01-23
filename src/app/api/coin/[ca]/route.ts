import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenData, getTokenSocialLinks } from "@/lib/dexscreener";

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    const identifier = params.ca;

    // First, try to find coin by mint address
    let coin = await prisma.coin.findUnique({
      where: { mint: identifier },
      include: {
        polls: {
          include: {
            votes: {
              include: {
                poll: true,
              },
            },
            projectWallet: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        votes: true,
        trustScore: true,
        wallets: true,
      },
    });

    // If no coin found, check if it's a project wallet address
    if (!coin) {
      const projectWallet = await prisma.projectWallet.findUnique({
        where: { address: identifier },
        include: {
          polls: {
            include: {
              votes: {
                include: {
                  poll: true,
                },
              },
              coin: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          coin: {
            include: {
              votes: true,
              trustScore: true,
            },
          },
        },
      });

      if (projectWallet && projectWallet.coin) {
        coin = projectWallet.coin as any;
        coin.polls = projectWallet.polls;
      } else if (projectWallet && projectWallet.polls.length > 0) {
        // WALLET mode without a coin
        const polls = projectWallet.polls;
        
        return NextResponse.json({
          identifier,
          pollType: "WALLET",
          tokenCA: null,
          projectWallet: {
            address: projectWallet.address,
            label: projectWallet.label,
          },
          coin: null,
          tokenMetadata: null,
          projectWallets: [],
          stats: {
            totalPolls: polls.length,
            activePolls: polls.filter((poll: any) => {
              const now = new Date();
              return now >= new Date(poll.startAt) && now <= new Date(poll.endAt);
            }).length,
            totalVotes: polls.reduce((sum: number, poll: any) => sum + poll.votes.length, 0),
            uniqueVoters: new Set(polls.flatMap((poll: any) => poll.votes.map((v: any) => v.wallet))).size,
          },
          polls: polls.map((poll: any) => processPoll(poll)),
          voters: Array.from(new Set(polls.flatMap((poll: any) => poll.votes.map((v: any) => v.wallet)))),
          voteStats: {
            upvotes: 0,
            downvotes: 0,
            netScore: 0,
            totalVotes: 0,
          },
        });
      }
    }

    // If still no coin found, return 404 with suggestion to create
    if (!coin) {
      return NextResponse.json(
        {
          error: "Coin not found",
          suggestion: "create",
          mint: identifier,
        },
        { status: 404 }
      );
    }

    const polls = coin.polls || [];

    // Get token metadata from DexScreener
    let tokenMetadata = null;
    try {
      const dexscreenerData = await getTokenData(coin.mint);
      
      if (dexscreenerData) {
        // Get social links
        let socialLinks = null;
        try {
          socialLinks = await getTokenSocialLinks(coin.mint);
        } catch (error) {
          console.error("Failed to fetch social links:", error);
          // Continue without social links
        }

        tokenMetadata = {
          mint: coin.mint,
          name: dexscreenerData.name,
          symbol: dexscreenerData.symbol,
          price: dexscreenerData.price,
          priceChange24h: dexscreenerData.priceChange24h,
          volume24h: dexscreenerData.volume24h,
          marketCap: dexscreenerData.marketCap,
          liquidity: dexscreenerData.liquidity,
          image: dexscreenerData.image,
          website: socialLinks?.website,
          twitter: socialLinks?.twitter,
          telegram: socialLinks?.telegram,
          discord: socialLinks?.discord,
          github: socialLinks?.github,
        };
      }
    } catch (error) {
      console.error("Failed to fetch token metadata:", error);
      // Continue without metadata
    }

    // Calculate coin vote stats
    const upvotes = coin.votes.filter((v: any) => v.vote === "UP").length;
    const downvotes = coin.votes.filter((v: any) => v.vote === "DOWN").length;
    const netScore = upvotes - downvotes;

    // Calculate statistics
    const totalPolls = polls.length;
    const activePolls = polls.filter((poll: any) => {
      const now = new Date();
      return now >= new Date(poll.startAt) && now <= new Date(poll.endAt);
    }).length;
    
    const totalVotes = polls.reduce((sum: number, poll: any) => sum + poll.votes.length, 0);
    
    // Get unique voters
    const uniqueVoters = new Set();
    polls.forEach((poll: any) => {
      poll.votes.forEach((vote: any) => {
        uniqueVoters.add(vote.wallet);
      });
    });

    // Process polls data
    const processedPolls = polls.map((poll: any) => {
      const options = JSON.parse(poll.options);
      const results = options.map((option: string) => ({
        option,
        count: poll.votes.filter((vote: any) => vote.choice === option).length,
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

    // Get all project wallets for this coin
    const projectWallets = await prisma.projectWallet.findMany({
      where: {
        coinId: coin.id,
        type: "STANDARD",
      },
      include: {
        polls: {
          include: {
            votes: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch founding wallets separately
    const foundingWallets = await prisma.projectWallet.findMany({
      where: {
        coinId: coin.id,
        type: "FOUNDING",
      },
      include: {
        contributors: {
          select: {
            walletAddress: true,
            totalContributedUSD: true,
            contributionCount: true,
          },
        },
        trustScore: {
          select: {
            overallScore: true,
            tier: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      identifier,
      pollType: "COIN",
      tokenCA: coin.mint,
      projectWallet: null,
      coin: {
        id: coin.id,
        mint: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
      },
      tokenMetadata,
      voteStats: {
        upvotes,
        downvotes,
        netScore,
        totalVotes: coin.votes.length,
      },
      projectWallets: projectWallets.map((wallet: any) => ({
        id: wallet.id,
        address: wallet.address,
        label: wallet.label,
        createdAt: wallet.createdAt,
        pollCount: wallet.polls.length,
        totalVotes: wallet.polls.reduce((sum: number, poll: any) => sum + poll.votes.length, 0),
        latestPoll: wallet.polls.length > 0 ? wallet.polls[0].createdAt : null,
        polls: wallet.polls.map((poll: any) => ({
          id: poll.id,
          topic: poll.topic,
          status: (() => {
            const now = new Date();
            const startAt = new Date(poll.startAt);
            const endAt = new Date(poll.endAt);
            if (now >= startAt && now <= endAt) return "active";
            else if (now > endAt) return "ended";
            return "upcoming";
          })(),
          totalVotes: poll.votes.length,
          createdAt: poll.createdAt,
        })),
      })),
      stats: {
        totalPolls,
        activePolls,
        totalVotes,
        uniqueVoters: uniqueVoters.size,
      },
      polls: processedPolls,
      voters: Array.from(uniqueVoters),
      foundingWallets: foundingWallets.map((wallet: any) => ({
        id: wallet.id,
        address: wallet.address,
        label: wallet.label,
        description: wallet.description,
        fundingGoalUSD: wallet.fundingGoalUSD,
        currentBalanceUSD: wallet.currentBalanceUSD,
        status: wallet.status,
        contributorCount: wallet.contributors.length,
        transactionCount: wallet._count.transactions,
        trustScore: wallet.trustScore,
        createdAt: wallet.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch coin data:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: "Failed to fetch coin data",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to process poll data
function processPoll(poll: any) {
  const options = JSON.parse(poll.options);
  const results = options.map((option: string) => ({
    option,
    count: poll.votes.filter((vote: any) => vote.choice === option).length,
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
}
