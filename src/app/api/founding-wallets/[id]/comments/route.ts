import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const createCommentSchema = z.object({
  walletAddress: z.string().min(1),
  content: z.string().min(10).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const skip = (page - 1) * limit;
    const includeHidden = searchParams.get("includeHidden") === "true";

    const whereClause: any = {
      foundingWalletId: params.id,
    };

    if (!includeHidden) {
      whereClause.isVisible = true;
    }

    const [comments, total] = await Promise.all([
      prisma.foundingWalletComment.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.foundingWalletComment.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch founding wallet comments", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch comments");
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
    const data = createCommentSchema.parse(body);

    // Verify wallet exists and is a founding wallet
    const wallet = await prisma.projectWallet.findUnique({
      where: { id: params.id },
      select: { id: true, type: true },
    });

    if (!wallet || wallet.type !== "FOUNDING") {
      return NextResponse.json(
        { error: "Founding wallet not found" },
        { status: 404 }
      );
    }

    // Verify contributor exists (only contributors can comment)
    const contributor = await prisma.foundingWalletContributor.findUnique({
      where: {
        foundingWalletId_walletAddress: {
          foundingWalletId: params.id,
          walletAddress: data.walletAddress,
        },
      },
    });

    if (!contributor) {
      return NextResponse.json(
        { error: "Only contributors can leave comments" },
        { status: 403 }
      );
    }

    const comment = await prisma.foundingWalletComment.create({
      data: {
        foundingWalletId: params.id,
        walletAddress: data.walletAddress,
        content: data.content,
        rating: data.rating || null,
        isVisible: true,
      },
    });

    logger.info("Founding wallet comment created", {
      commentId: comment.id,
      walletId: params.id,
    });

    return NextResponse.json(comment);
  } catch (error) {
    logger.error("Failed to create founding wallet comment", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return safeErrorResponse(error, "Failed to create comment");
  }
}
