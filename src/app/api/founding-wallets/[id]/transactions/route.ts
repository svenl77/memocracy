import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletTransactionsFromBlockchain } from "@/lib/solanaWalletMonitor";
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
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Verify wallet exists and is a founding wallet
    const wallet = await prisma.projectWallet.findUnique({
      where: { id: params.id },
      select: { id: true, type: true, address: true },
    });

    if (!wallet || wallet.type !== "FOUNDING") {
      return NextResponse.json(
        { error: "Founding wallet not found" },
        { status: 404 }
      );
    }

    // Get transactions from database (includes memo fields)
    const dbTransactions = await prisma.foundingWalletTransaction.findMany({
      where: { foundingWalletId: params.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        signature: true,
        fromWallet: true,
        toWallet: true,
        amountLamports: true,
        amountUSD: true,
        tokenMint: true,
        transactionType: true,
        blockTime: true,
        slot: true,
        memo: true,
        projectIdFromMemo: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      transactions: dbTransactions,
      pagination: {
        page: 1,
        limit,
        total: dbTransactions.length,
        totalPages: 1,
        hasMore: dbTransactions.length === limit,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch founding wallet transactions", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch transactions");
  }
}
