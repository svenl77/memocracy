import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const createProposalSchema = z.object({
  creatorWallet: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(10),
  proposalType: z.enum(["WITHDRAWAL", "REFUND", "COMPLETION", "CHANGE_GOAL"]),
  amountUSD: z.number().positive().optional(),
  votingEndsAt: z.string().datetime(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: any = { foundingWalletId: params.id };
    if (status) whereClause.status = status;

    const proposals = await prisma.foundingWalletProposal.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    logger.error("Failed to fetch founding wallet proposals", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch proposals");
  }
}

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
    const data = createProposalSchema.parse(body);

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

    if (wallet.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Can only create proposals for active founding wallets" },
        { status: 400 }
      );
    }

    // Validate proposal type specific requirements
    if (data.proposalType === "WITHDRAWAL" && !data.amountUSD) {
      return NextResponse.json(
        { error: "amountUSD is required for WITHDRAWAL proposals" },
        { status: 400 }
      );
    }

    const proposal = await prisma.foundingWalletProposal.create({
      data: {
        foundingWalletId: params.id,
        creatorWallet: data.creatorWallet,
        title: data.title,
        description: data.description,
        proposalType: data.proposalType,
        amountUSD: data.amountUSD || null,
        status: "PENDING",
        votingEndsAt: new Date(data.votingEndsAt),
      },
    });

    logger.info("Founding wallet proposal created", {
      proposalId: proposal.id,
      walletId: params.id,
      proposalType: data.proposalType,
    });

    return NextResponse.json(proposal);
  } catch (error) {
    logger.error("Failed to create founding wallet proposal", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return safeErrorResponse(error, "Failed to create proposal");
  }
}
