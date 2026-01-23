import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySolanaSignature } from "@/lib/verifySolanaSignature";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { getVoteStatsFromChain, checkProgramDeployed } from "@/lib/solanaVoteProgram";

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
    const { searchParams } = new URL(request.url);
    const verifyOnChain = searchParams.get("verify") === "true";

    // First, get from database (fast)
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

    // Optionally verify with on-chain data
    let onChainStats = null;
    if (verifyOnChain) {
      try {
        const isDeployed = await checkProgramDeployed();
        if (isDeployed) {
          onChainStats = await getVoteStatsFromChain(ca);
        }
      } catch (error) {
        logger.warn("Failed to verify on-chain stats", {
          coinMint: ca,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      upvotes,
      downvotes,
      netScore,
      totalVotes: coin.votes.length,
      onChainStats, // Include on-chain stats if requested
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
    const { coinMint, wallet, vote, signature, nonce, transactionSignature } = body;

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
    // The message that was signed matches what the client sends
    const message = `Vote ${vote} for coin ${coinMint}\nNonce: ${nonce}`;
    const isValid = verifySolanaSignature({
      walletBase58: wallet,
      signatureBase58: signature,
      message: message,
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

    // Check if on-chain program is deployed
    const isOnChainDeployed = await checkProgramDeployed();
    const onChainSynced = isOnChainDeployed && !!transactionSignature;

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
        transactionSignature: transactionSignature || null,
        onChainSynced: onChainSynced,
        syncedAt: onChainSynced ? new Date() : null,
      },
      create: {
        coinId: coin.id,
        wallet: wallet,
        vote: vote,
        sig: signature,
        signedAt: new Date(),
        transactionSignature: transactionSignature || null,
        onChainSynced: onChainSynced,
        syncedAt: onChainSynced ? new Date() : null,
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
