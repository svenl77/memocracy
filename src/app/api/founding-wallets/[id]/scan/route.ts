import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  updateFoundingWalletBalance, 
  invalidateBalanceCache, 
  invalidateTransactionCache 
} from "@/lib/solanaWalletMonitor";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
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

    // Scan for new transactions and update balance
    const result = await updateFoundingWalletBalance(wallet.id);

    // Cache invalidation is handled in updateFoundingWalletBalance
    // But we also invalidate here to be safe
    invalidateBalanceCache(wallet.address);
    invalidateTransactionCache(wallet.address);

    logger.info("Founding wallet scanned", {
      walletId: params.id,
      updated: result.updated,
      newTransactions: result.newTransactions,
    });

    return NextResponse.json({
      success: true,
      updated: result.updated,
      newTransactions: result.newTransactions,
      message: result.updated
        ? `Found ${result.newTransactions} new transaction(s)`
        : "No new transactions found",
    });
  } catch (error) {
    logger.error("Failed to scan founding wallet", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to scan wallet");
  }
}
