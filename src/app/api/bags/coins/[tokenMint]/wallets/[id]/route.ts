import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { getWalletBalanceWithUSD } from "@/lib/solanaWalletMonitor";

/**
 * GET /api/bags/coins/[tokenMint]/wallets/[id]
 * Get founding wallet details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tokenMint: string; id: string } }
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

    const wallet = await prisma.bagsFoundingWallet.findUnique({
      where: { id: params.id },
      include: {
        bagsCoin: {
          select: {
            tokenMint: true,
            tokenName: true,
            tokenSymbol: true,
          },
        },
        contributors: {
          orderBy: {
            totalContributedUSD: "desc",
          },
          take: 50,
        },
        _count: {
          select: {
            contributors: true,
            transactions: true,
            polls: true,
          },
        },
      },
    });

    if (!wallet || wallet.bagsCoinId !== bagsCoin.id) {
      return NextResponse.json(
        { error: "Founding wallet not found" },
        { status: 404 }
      );
    }

    // Get actual balance from blockchain (for contributions, not fees)
    const actualBalance = await getWalletBalanceWithUSD(wallet.walletAddress);
    const currentBalanceUSD = actualBalance.usd;
    const currentBalanceLamports = actualBalance.lamports;

    // Calculate progress if funding goal exists
    const fundingGoal = wallet.fundingGoalUSD || 0;
    const progressPercentage =
      fundingGoal > 0 ? Math.min((currentBalanceUSD / fundingGoal) * 100, 100) : 0;

    return NextResponse.json({
      ...wallet,
      currentBalanceUSD,
      currentBalanceLamports,
      progressPercentage,
    });
  } catch (error) {
    return safeErrorResponse(error, "Failed to fetch founding wallet");
  }
}
