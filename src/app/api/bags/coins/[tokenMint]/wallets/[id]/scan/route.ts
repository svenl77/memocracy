import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { updateBagsFoundingWalletBalance } from "@/lib/bagsWalletMonitor";
import { logger } from "@/lib/logger";

/**
 * POST /api/bags/coins/[tokenMint]/wallets/[id]/scan
 * Scan for new transactions for a Bags Founding Wallet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tokenMint: string; id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.strict);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const result = await updateBagsFoundingWalletBalance(params.id);

    if (result.updated) {
      return NextResponse.json({
        success: true,
        message: `✅ Found ${result.newTransactions} new transaction(s)`,
        newTransactions: result.newTransactions,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: "No new transactions found",
        newTransactions: 0,
      });
    }
  } catch (error) {
    logger.error("Failed to scan Bags Founding Wallet", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return safeErrorResponse(error, "Failed to scan wallet for transactions");
  }
}
