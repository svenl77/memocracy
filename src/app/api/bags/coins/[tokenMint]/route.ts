import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { getBagsCoinAnalytics, syncBagsCoinFees } from "@/lib/bagsCoinManager";

/**
 * GET /api/bags/coins/[tokenMint]
 * Get Bags Coin details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tokenMint: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const bagsCoin = await prisma.bagsCoin.findUnique({
      where: { tokenMint: params.tokenMint },
      include: {
        foundingWallets: {
          include: {
            _count: {
              select: {
                contributors: true,
                transactions: true,
                polls: true,
              },
            },
          },
          orderBy: {
            feeSharePercentage: "desc",
          },
        },
        feeAnalytics: true,
        coin: {
          include: {
            trustScore: true,
            _count: {
              select: {
                polls: true,
                votes: true,
              },
            },
          },
        },
      },
    });

    if (!bagsCoin) {
      return NextResponse.json(
        { error: "Bags Coin not found" },
        { status: 404 }
      );
    }

    // Get analytics if available
    let analytics = null;
    try {
      analytics = await getBagsCoinAnalytics(params.tokenMint);
    } catch (error) {
      logger.warn("Failed to get Bags analytics", {
        tokenMint: params.tokenMint,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without analytics
    }

    return NextResponse.json({
      ...bagsCoin,
      analytics,
    });
  } catch (error) {
    return safeErrorResponse(error, "Failed to fetch Bags Coin");
  }
}

/**
 * PUT /api/bags/coins/[tokenMint]
 * Update Bags Coin info (name, description, image)
 * Note: Fee distribution cannot be changed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tokenMint: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.strict);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { tokenName, tokenSymbol, description, image } = body;

    // Check if coin exists
    const existing = await prisma.bagsCoin.findUnique({
      where: { tokenMint: params.tokenMint },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Bags Coin not found" },
        { status: 404 }
      );
    }

    // Update coin info
    const updated = await prisma.bagsCoin.update({
      where: { tokenMint: params.tokenMint },
      data: {
        ...(tokenName && { tokenName }),
        ...(tokenSymbol && { tokenSymbol }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
      },
      include: {
        foundingWallets: true,
        coin: true,
      },
    });

    // Also update the linked Coin entry
    if (tokenName || tokenSymbol) {
      await prisma.coin.update({
        where: { id: updated.coinId },
        data: {
          ...(tokenName && { name: tokenName }),
          ...(tokenSymbol && { symbol: tokenSymbol }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      coin: updated,
    });
  } catch (error) {
    return safeErrorResponse(error, "Failed to update Bags Coin");
  }
}
