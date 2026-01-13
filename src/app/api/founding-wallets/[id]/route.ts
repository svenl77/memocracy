import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const wallet = await prisma.projectWallet.findUnique({
      where: { id: params.id },
      include: {
        coin: {
          select: {
            id: true,
            mint: true,
            symbol: true,
            name: true,
          },
        },
        contributors: {
          orderBy: {
            totalContributedUSD: "desc",
          },
          take: 50,
        },
        proposals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        comments: {
          where: {
            isVisible: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
        trustScore: true,
        _count: {
          select: {
            transactions: true,
            contributors: true,
            proposals: true,
            comments: true,
          },
        },
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Founding wallet not found" }, { status: 404 });
    }

    if (wallet.type !== "FOUNDING") {
      return NextResponse.json(
        { error: "Wallet is not a founding wallet" },
        { status: 400 }
      );
    }

    // Calculate progress
    const fundingGoal = wallet.fundingGoalUSD || 0;
    const currentBalance = wallet.currentBalanceUSD || 0;
    const progressPercentage =
      fundingGoal > 0 ? Math.min((currentBalance / fundingGoal) * 100, 100) : 0;

    return NextResponse.json({
      ...wallet,
      progressPercentage,
      isFullyFunded: fundingGoal > 0 && currentBalance >= fundingGoal,
    });
  } catch (error) {
    logger.error("Failed to fetch founding wallet", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch founding wallet");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { status, description, fundingGoalUSD, fundingGoalLamports } = body;

    const wallet = await prisma.projectWallet.findUnique({
      where: { id: params.id },
    });

    if (!wallet || wallet.type !== "FOUNDING") {
      return NextResponse.json(
        { error: "Founding wallet not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (description) updateData.description = description;
    if (fundingGoalUSD !== undefined) updateData.fundingGoalUSD = fundingGoalUSD;
    if (fundingGoalLamports !== undefined)
      updateData.fundingGoalLamports = fundingGoalLamports;
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const updatedWallet = await prisma.projectWallet.update({
      where: { id: params.id },
      data: updateData,
      include: {
        coin: {
          select: {
            id: true,
            mint: true,
            symbol: true,
            name: true,
          },
        },
      },
    });

    logger.info("Founding wallet updated", {
      walletId: params.id,
      updates: Object.keys(updateData),
    });

    return NextResponse.json(updatedWallet);
  } catch (error) {
    logger.error("Failed to update founding wallet", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to update founding wallet");
  }
}
