import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionWallet } from "@/lib/session";
import { createVoteLoginMessage } from "@/lib/signingMessages";
import { verifySolanaSignature } from "@/lib/verifySolanaSignature";
import { z } from "zod";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const voteSchema = z.object({
  choice: z.union([z.string().min(1), z.array(z.string().min(1))]),
  nonce: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Get session wallet
    const sessionWallet = getSessionWallet();
    if (!sessionWallet) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { choice, nonce, signature } = voteSchema.parse(body);

    // Get poll
    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
    });

    if (!poll) {
      return NextResponse.json(
        { error: "Poll not found" },
        { status: 404 }
      );
    }

    // Check if poll is active
    const now = new Date();
    if (now < poll.startAt || now > poll.endAt) {
      return NextResponse.json(
        { error: "Poll is not active" },
        { status: 400 }
      );
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        pollId_wallet: {
          pollId: params.id,
          wallet: sessionWallet,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "Already voted on this poll" },
        { status: 400 }
      );
    }

    // Verify signature
    const message = createVoteLoginMessage(nonce);
    const isValid = verifySolanaSignature({
      walletBase58: sessionWallet,
      signatureBase58: signature,
      message,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Check if choice is valid
    const options = JSON.parse(poll.options);
    const choices = Array.isArray(choice) ? choice : [choice];
    
    // Validate all choices
    for (const singleChoice of choices) {
      if (!options.includes(singleChoice)) {
        return NextResponse.json(
          { error: `Invalid choice: ${singleChoice}` },
          { status: 400 }
        );
      }
    }

    // Check multiple selection limits
    if (poll.allowMultiple && choices.length > 1) {
      if (poll.maxSelections && choices.length > poll.maxSelections) {
        return NextResponse.json(
          { error: `Maximum ${poll.maxSelections} selections allowed` },
          { status: 400 }
        );
      }
    } else if (!poll.allowMultiple && choices.length > 1) {
      return NextResponse.json(
        { error: "Multiple selections not allowed for this poll" },
        { status: 400 }
      );
    }

    // Create vote(s) - one vote per choice for multiple choice polls
    const votes = [];
    for (const singleChoice of choices) {
      const vote = await prisma.vote.create({
        data: {
          pollId: params.id,
          wallet: sessionWallet,
          choice: singleChoice,
          sig: signature,
          signedAt: new Date(),
        },
      });
      votes.push(vote);
    }

    logger.info("Vote cast successfully", {
      pollId: params.id,
      wallet: sessionWallet,
      choices: votes.length,
    });

    return NextResponse.json(votes.length === 1 ? votes[0] : votes);
  } catch (error) {
    logger.error("Failed to cast vote", {
      pollId: params.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return safeErrorResponse(error, "Failed to cast vote");
  }
}
