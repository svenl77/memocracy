import { NextRequest, NextResponse } from "next/server";
import { updateFoundingWalletTrustScore } from "@/lib/foundingWalletTrustScore";
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
    await updateFoundingWalletTrustScore(params.id);

    return NextResponse.json({
      success: true,
      message: "Trust score updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update founding wallet trust score", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to update trust score");
  }
}
