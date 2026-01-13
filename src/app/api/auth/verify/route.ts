import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { createVoteLoginMessage } from "@/lib/signingMessages";
import { verifySolanaSignature } from "@/lib/verifySolanaSignature";
import { z } from "zod";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger, log } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const verifySchema = z.object({
  wallet: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Apply rate limiting (strict for auth endpoints)
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.strict);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { wallet, nonce, signature } = verifySchema.parse(body);

    // Check if nonce exists and hasn't been consumed
    const nonceRecord = await prisma.nonce.findUnique({
      where: { value: nonce },
    });

    if (!nonceRecord || nonceRecord.consumedAt || nonceRecord.wallet !== wallet) {
      log.warn("Invalid nonce attempt", { wallet, nonce });
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 400 }
      );
    }

    // Verify signature
    const message = createVoteLoginMessage(nonce);
    const isValid = verifySolanaSignature({
      walletBase58: wallet,
      signatureBase58: signature,
      message,
    });

    if (!isValid) {
      log.warn("Invalid signature attempt", { wallet });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Mark nonce as consumed
    await prisma.nonce.update({
      where: { id: nonceRecord.id },
      data: { consumedAt: new Date() },
    });

    // Set session
    setSession(wallet);

    log.info("User authenticated", { wallet });

    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    logger.error("Verification error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return safeErrorResponse(error, "Failed to verify signature");
  }
}
