import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenData } from "@/lib/dexscreener";
import { z } from "zod";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const createCoinSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  // Apply rate limiting (lenient for read operations)
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await prisma.coin.count();

    // Get coins with pagination
    const coins = await prisma.coin.findMany({
      skip,
      take: limit,
      include: {
        polls: {
          select: {
            id: true,
            topic: true,
            createdAt: true,
            votes: {
              select: {
                wallet: true,
              },
            },
          },
        },
        wallets: {
          select: {
            id: true,
            address: true,
            label: true,
          },
        },
        trustScore: {
          select: {
            overallScore: true,
            tier: true,
          },
        },
        votes: {
          select: {
            vote: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response
    const formattedCoins = coins.map((coin: any) => {
      // Calculate coin votes (upvotes/downvotes)
      const coinUpvotes = coin.votes.filter((v: any) => v.vote === "UP").length;
      const coinDownvotes = coin.votes.filter((v: any) => v.vote === "DOWN").length;
      
      // Calculate poll votes (community governance)
      const pollVotes = coin.polls.reduce((sum: number, poll: any) => sum + poll.votes.length, 0);
      const uniqueVoters = new Set(coin.polls.flatMap((poll: any) => poll.votes.map((vote: any) => vote.wallet))).size;
      
      return {
        id: coin.id,
        mint: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
        createdAt: coin.createdAt,
        // Analysis data
        trustScore: coin.trustScore?.overallScore || null,
        tier: coin.trustScore?.tier || null,
        coinUpvotes,
        coinDownvotes,
        // Community data
        pollCount: coin.polls.length,
        pollVotes, // Votes on polls (governance)
        uniqueVoters,
        projectWalletCount: coin.wallets.length,
        latestPoll: coin.polls.length > 0 ? 
          coin.polls.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt : 
          null,
        topics: coin.polls.slice(0, 3).map((poll: any) => poll.topic), // Get first 3 poll topics
      };
    });

    // Fetch token data from cache (much faster, no API calls)
    const coinsWithTokenData = await Promise.all(
      formattedCoins.map(async (coin: any) => {
        try {
          // Try to get from cache first (no API call)
          const cachedMetadata = await prisma.tokenMetadata.findUnique({
            where: { mint: coin.mint },
          });

          if (cachedMetadata && cachedMetadata.price !== null) {
            return {
              ...coin,
              tokenData: {
                name: cachedMetadata.name || coin.name,
                symbol: cachedMetadata.symbol || coin.symbol,
                price: cachedMetadata.price || 0,
                priceChange24h: cachedMetadata.priceChange24h || 0,
                volume24h: cachedMetadata.volume24h || 0,
                marketCap: cachedMetadata.marketCap || undefined,
                liquidity: cachedMetadata.liquidity || undefined,
                image: cachedMetadata.image || undefined,
              },
            };
          }

          // If no cache, try to fetch (but limit concurrent requests)
          // Only fetch for first 10 coins to avoid rate limiting
          if (formattedCoins.indexOf(coin) < 10) {
            const tokenData = await getTokenData(coin.mint, true);
            if (tokenData) {
              return {
                ...coin,
                tokenData: {
                  name: tokenData.name,
                  symbol: tokenData.symbol,
                  price: tokenData.price,
                  priceChange24h: tokenData.priceChange24h,
                  volume24h: tokenData.volume24h,
                  marketCap: tokenData.marketCap,
                  liquidity: tokenData.liquidity,
                  image: tokenData.image,
                },
              };
            }
          }

          // Return coin without token data if fetch fails
          return {
            ...coin,
            tokenData: null,
          };
        } catch (error) {
          logger.warn(`Failed to fetch token data for ${coin.mint}`, {
            mint: coin.mint,
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            ...coin,
            tokenData: null,
          };
        }
      })
    );

    return NextResponse.json({
      coins: coinsWithTokenData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + limit < totalCount,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch coins", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return safeErrorResponse(error, "Failed to fetch coins");
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { mint, symbol, name } = createCoinSchema.parse(body);

    // Check if coin with this mint already exists
    const existingCoin = await prisma.coin.findUnique({
      where: { mint },
    });

    if (existingCoin) {
      // Update existing coin with new metadata
      const updatedCoin = await prisma.coin.update({
        where: { mint },
        data: {
          symbol,
          name,
        },
      });
      return NextResponse.json(updatedCoin);
    }

    const coin = await prisma.coin.create({
      data: {
        mint,
        symbol,
        name,
      },
    });

    logger.info("Coin created", { mint, symbol, name });
    return NextResponse.json(coin);
  } catch (error) {
    logger.error("Failed to create coin", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create coin" },
      { status: 500 }
    );
  }
}
