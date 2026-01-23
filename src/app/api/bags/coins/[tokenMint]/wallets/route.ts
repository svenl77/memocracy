import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { safeErrorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/bags/coins/[tokenMint]/wallets
 * List all founding wallets for a Bags Coin
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
    // Verify Bags Coin exists
    const bagsCoin = await prisma.bagsCoin.findUnique({
      where: { tokenMint: params.tokenMint },
      select: { id: true },
    });

    if (!bagsCoin) {
      return NextResponse.json(
        { error: "Bags Coin not found" },
        { status: 404 }
      );
    }

    const wallets = await prisma.bagsFoundingWallet.findMany({
      where: { bagsCoinId: bagsCoin.id },
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
    });

    return NextResponse.json({
      wallets,
    });
  } catch (error) {
    return safeErrorResponse(error, "Failed to fetch founding wallets");
  }
}
