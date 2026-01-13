import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const createVoteSchema = z.object({
  walletAddress: z.string().min(1),
  proposalId: z.string().optional(),
  voteType: z.enum(["PROPOSAL", "WITHDRAWAL", "REFUND", "COMPLETION"]),
  choice: z.string().min(1),
  signature: z.string().min(1),
  signedAt: z.string().datetime(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const data = createVoteSchema.parse(body);

    // Verify wallet exists and is a founding wallet
    const wallet = await prisma.projectWallet.findUnique({
      where: { id: params.id },
      select: { id: true, type: true, status: true },
    });

    if (!wallet || wallet.type !== "FOUNDING") {
      return NextResponse.json(
        { error: "Founding wallet not found" },
        { status: 404 }
      );
    }

    // Verify contributor exists and is active
    if (data.voteType === "PROPOSAL" && data.proposalId) {
      const contributor = await prisma.foundingWalletContributor.findUnique({
        where: {
          foundingWalletId_walletAddress: {
            foundingWalletId: params.id,
            walletAddress: data.walletAddress,
          },
        },
      });

      if (!contributor || !contributor.isActive) {
        return NextResponse.json(
          { error: "Only active contributors can vote" },
          { status: 403 }
        );
      }

      // Check if already voted
      const existingVote = await prisma.foundingWalletVote.findUnique({
        where: {
          proposalId_walletAddress: {
            proposalId: data.proposalId,
            walletAddress: data.walletAddress,
          },
        },
      });

      if (existingVote) {
        return NextResponse.json(
          { error: "Already voted on this proposal" },
          { status: 400 }
        );
      }

      // Verify proposal exists and is still pending
      const proposal = await prisma.foundingWalletProposal.findUnique({
        where: { id: data.proposalId },
      });

      if (!proposal) {
        return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
      }

      if (proposal.status !== "PENDING") {
        return NextResponse.json(
          { error: "Proposal is no longer pending" },
          { status: 400 }
        );
      }

      if (new Date(proposal.votingEndsAt) < new Date()) {
        return NextResponse.json(
          { error: "Voting period has ended" },
          { status: 400 }
        );
      }
    }

    // Create vote
    const vote = await prisma.foundingWalletVote.create({
      data: {
        foundingWalletId: params.id,
        proposalId: data.proposalId || null,
        walletAddress: data.walletAddress,
        voteType: data.voteType,
        choice: data.choice,
        signature: data.signature,
        signedAt: new Date(data.signedAt),
      },
    });

    // Update proposal vote counts if it's a proposal vote
    if (data.voteType === "PROPOSAL" && data.proposalId) {
      const proposal = await prisma.foundingWalletProposal.findUnique({
        where: { id: data.proposalId },
      });

      if (proposal) {
        const isYes = data.choice === "YES" || data.choice === "1";
        await prisma.foundingWalletProposal.update({
          where: { id: data.proposalId },
          data: {
            votesFor: isYes ? proposal.votesFor + 1 : proposal.votesFor,
            votesAgainst: isYes ? proposal.votesAgainst : proposal.votesAgainst + 1,
            totalVotes: proposal.totalVotes + 1,
          },
        });
      }
    }

    logger.info("Founding wallet vote created", {
      voteId: vote.id,
      walletId: params.id,
      proposalId: data.proposalId,
    });

    return NextResponse.json(vote);
  } catch (error) {
    logger.error("Failed to create founding wallet vote", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return safeErrorResponse(error, "Failed to create vote");
  }
}
