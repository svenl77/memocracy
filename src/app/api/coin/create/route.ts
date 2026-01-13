import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenData } from "@/lib/dexscreener";
import { calculateTrustScore } from "@/lib/trustScore";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { mint } = body;

    if (!mint) {
      return NextResponse.json(
        { error: "Missing mint address" },
        { status: 400 }
      );
    }

    // Check if coin already exists
    const existingCoin = await prisma.coin.findUnique({
      where: { mint },
    });

    if (existingCoin) {
      return NextResponse.json(
        { 
          error: "Coin already exists",
          coin: existingCoin 
        },
        { status: 409 }
      );
    }

    // Fetch token data from DexScreener
    const tokenData = await getTokenData(mint);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Token not found on DexScreener. Please check the mint address." },
        { status: 404 }
      );
    }

    // Create coin in database
    const coin = await prisma.coin.create({
      data: {
        mint,
        symbol: tokenData.symbol,
        name: tokenData.name,
      },
    });

    // Calculate Trust Score (this will also create the TrustScore record)
    try {
      const trustScoreResult = await calculateTrustScore(mint);

      // Save Trust Score to database
      await prisma.trustScore.create({
        data: {
          coinId: coin.id,
          overallScore: trustScoreResult.overallScore,
          tier: trustScoreResult.tier,
          maturityScore: trustScoreResult.breakdown.maturity,
          securityScore: trustScoreResult.breakdown.security,
          liquidityScore: trustScoreResult.breakdown.liquidity,
          tradingScore: trustScoreResult.breakdown.trading,
          stabilityScore: trustScoreResult.breakdown.stability,
          communitySentiment: trustScoreResult.breakdown.communitySentiment || 0,
          mintDisabled: trustScoreResult.flags.mintDisabled,
          freezeDisabled: trustScoreResult.flags.freezeDisabled,
          contractAgeDays: trustScoreResult.metrics.contractAgeDays,
          liquidityUsd: trustScoreResult.metrics.liquidityUsd,
          sellPressure24h: trustScoreResult.metrics.sellPressure24h,
          detailedData: JSON.stringify(trustScoreResult.details),
        },
      });
      logger.info("Trust score calculated", { mint, coinId: coin.id });
    } catch (error) {
      logger.error("Failed to calculate trust score", {
        mint,
        coinId: coin.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue even if trust score fails - the coin is created
    }

    logger.info("Coin created successfully", { mint, coinId: coin.id });
    return NextResponse.json({
      success: true,
      coin: {
        id: coin.id,
        mint: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
      },
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
    });
  } catch (error) {
    logger.error("Failed to create coin", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return safeErrorResponse(error, "Failed to create coin");
  }
}
