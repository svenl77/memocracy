import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { getBagsCoinAnalytics, syncBagsCoinFees } from "@/lib/bagsCoinManager";

/**
 * GET /api/bags/coins/[tokenMint]/analytics
 * Get fee analytics for a Bags Coin
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
    const { searchParams } = new URL(request.url);
    const sync = searchParams.get("sync") === "true";

    if (sync) {
      // Sync fees from Bags API
      await syncBagsCoinFees(params.tokenMint);
    }

    const analytics = await getBagsCoinAnalytics(params.tokenMint);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    return safeErrorResponse(error, "Failed to get Bags Coin analytics");
  }
}
