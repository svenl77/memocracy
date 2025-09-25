import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionWallet } from "@/lib/session";
import { createVoteLoginMessage } from "@/lib/signingMessages";
import { verifySolanaSignature } from "@/lib/verifySolanaSignature";
import { z } from "zod";

const voteSchema = z.object({
  choice: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!options.includes(choice)) {
      return NextResponse.json(
        { error: "Invalid choice" },
        { status: 400 }
      );
    }

    // Create vote
    const vote = await prisma.vote.create({
      data: {
        pollId: params.id,
        wallet: sessionWallet,
        choice,
        sig: signature,
        signedAt: new Date(),
      },
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error("Failed to cast vote:", error);
    return NextResponse.json(
      { error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
