import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySolanaSignature } from "@/lib/verifySolanaSignature";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  // Apply rate limiting (lenient for read operations)
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { ca } = params;

    const coin = await prisma.coin.findUnique({
      where: { mint: ca },
      include: {
        votes: true,
      },
    });

    if (!coin) {
      return NextResponse.json(
        { error: "Coin not found" },
        { status: 404 }
      );
    }

    const upvotes = coin.votes.filter((v: { vote: string }) => v.vote === "UP").length;
    const downvotes = coin.votes.filter((v: { vote: string }) => v.vote === "DOWN").length;
    const netScore = upvotes - downvotes;

    return NextResponse.json({
      upvotes,
      downvotes,
      netScore,
      totalVotes: coin.votes.length,
    });
  } catch (error) {
    logger.error("Failed to fetch vote stats", {
      coinMint: params.ca,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch vote stats");
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { coinMint, wallet, vote, signature, nonce } = body;

    // Validate input
    if (!coinMint || !wallet || !vote || !signature || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (vote !== "UP" && vote !== "DOWN") {
      return NextResponse.json(
        { error: "Vote must be UP or DOWN" },
        { status: 400 }
      );
    }

    // Verify signature
    // Note: verifySolanaSignature expects a specific message format
    // For coin votes, we use the nonce as the message
    const isValid = verifySolanaSignature({
      walletBase58: wallet,
      nonce: nonce,
      signatureBase58: signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Find or create coin
    let coin = await prisma.coin.findUnique({
      where: { mint: coinMint },
      include: { votes: true },
    });

    if (!coin) {
      return NextResponse.json(
        { error: "Coin not found. Please create the coin first." },
        { status: 404 }
      );
    }

    // Validate coin has an id
    if (!coin.id) {
      logger.error("Coin found but missing id", { coinMint, coin });
      return NextResponse.json(
        { error: "Coin data is invalid" },
        { status: 500 }
      );
    }

    // Upsert vote (user can change their vote)
    await prisma.coinVote.upsert({
      where: {
        coinId_wallet: {
          coinId: coin.id,
          wallet: wallet,
        },
      },
      update: {
        vote: vote,
        sig: signature,
        signedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        coinId: coin.id,
        wallet: wallet,
        vote: vote,
        sig: signature,
        signedAt: new Date(),
      },
    });

    // Fetch updated votes
    const updatedCoin = await prisma.coin.findUnique({
      where: { mint: coinMint },
      include: { votes: true },
    });

    if (!updatedCoin) {
      throw new Error("Failed to fetch updated coin");
    }

    const upvotes = updatedCoin.votes.filter((v: { vote: string }) => v.vote === "UP").length;
    const downvotes = updatedCoin.votes.filter((v: { vote: string }) => v.vote === "DOWN").length;
    const netScore = upvotes - downvotes;

    // Trigger Trust Score recalculation in background
    // (Don't wait for it to complete)
    fetch(`${request.nextUrl.origin}/api/trust-score/${coinMint}`, {
      method: "GET",
    }).catch((err) => {
      logger.error("Failed to trigger trust score update", {
        coinMint,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    logger.info("Coin vote submitted", {
      coinMint,
      wallet,
      vote,
      upvotes,
      downvotes,
    });

    return NextResponse.json({
      success: true,
      upvotes,
      downvotes,
      netScore,
      totalVotes: updatedCoin.votes.length,
      userVote: vote,
    });
  } catch (error) {
    logger.error("Failed to submit coin vote", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return safeErrorResponse(error, "Failed to submit vote");
  }
}
