import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { prepareBagsCoinCreation, finalizeBagsCoin, validateFeeDistribution } from "@/lib/bagsCoinManager";
import { env } from "@/lib/env";

/**
 * GET /api/bags/coins
 * List all Bags-powered coins
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const [bagsCoins, total] = await Promise.all([
      prisma.bagsCoin.findMany({
        skip,
        take: limit,
        include: {
          foundingWallets: {
            select: {
              id: true,
              label: true,
              walletAddress: true,
              feeSharePercentage: true,
              lifetimeFees: true,
              currentBalanceUSD: true,
            },
          },
          feeAnalytics: true,
          coin: {
            select: {
              id: true,
              mint: true,
              symbol: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.bagsCoin.count(),
    ]);

    return NextResponse.json({
      coins: bagsCoins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Failed to fetch Bags coins");
  }
}

/**
 * POST /api/bags/coins
 * Create a new Bags-powered coin
 * 
 * Body:
 * {
 *   tokenName: string;
 *   tokenSymbol: string;
 *   description?: string;
 *   image?: string;
 *   foundingWallets: Array<{
 *     label: string;
 *     description?: string;
 *     walletAddress: string;
 *     feeSharePercentage: number; // 0.0 - 1.0
 *     fundingGoalUSD?: number;
 *   }>;
 *   createdBy: string; // Wallet address
 * }
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.strict);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Check content type to determine if it's FormData or JSON
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle FormData for file uploads (prepare action)
      const formData = await request.formData();
      const action = formData.get("action") as string;
      
      if (action !== "prepare") {
        return NextResponse.json(
          { error: "FormData is only supported for 'prepare' action" },
          { status: 400 }
        );
      }
      
      const tokenName = formData.get("tokenName") as string;
      const tokenSymbol = formData.get("tokenSymbol") as string;
      const description = formData.get("description") as string | null;
      const imageFile = formData.get("image") as File | null;
      const foundingWalletsJson = formData.get("foundingWallets") as string;
      const createdBy = formData.get("createdBy") as string;
      
      const foundingWallets = JSON.parse(foundingWalletsJson);
      
      // Validate required fields
      if (!tokenName || !tokenSymbol || !foundingWallets || !createdBy) {
        return NextResponse.json(
          { error: "Missing required fields: tokenName, tokenSymbol, foundingWallets, createdBy" },
          { status: 400 }
        );
      }
      
      if (!imageFile) {
        return NextResponse.json(
          { error: "Image file is required" },
          { status: 400 }
        );
      }
      
      // Validate founding wallets array
      if (!Array.isArray(foundingWallets) || foundingWallets.length === 0) {
        return NextResponse.json(
          { error: "At least one founding wallet is required" },
          { status: 400 }
        );
      }
      
      // Validate fee distribution
      const platformFeePercentage = parseFloat(env.MEMOCRACY_PLATFORM_FEE_PERCENTAGE || "0.03");
      const validation = validateFeeDistribution(foundingWallets, platformFeePercentage);
      
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Invalid fee distribution" },
          { status: 400 }
        );
      }
      
      // Convert File to Buffer for Bags API
      const imageBlob = await imageFile.arrayBuffer();
      const imageBuffer = Buffer.from(imageBlob);
      
      // Prepare Bags Coin with image file
      const preparation = await prepareBagsCoinCreation({
        tokenName,
        tokenSymbol,
        description: description || undefined,
        imageFile: imageBuffer,
        foundingWallets,
        createdBy,
      });
      
      return NextResponse.json({
        success: true,
        action: "prepare",
        tokenMint: preparation.tokenMint,
        tokenInfo: preparation.tokenInfo,
        transactions: {
          launch: preparation.launchTransaction,
          feeShare: preparation.feeShareTransaction,
        },
      });
    } else {
      // Handle JSON requests (for finalize action)
      const body = await request.json();
      const { action, launchTxSignature, feeShareTxSignature, tokenMint } = body;
      
      if (action === "finalize" && launchTxSignature && feeShareTxSignature && tokenMint) {
        // Step 2: Finalize after transactions are signed
        const { tokenName, tokenSymbol, description, image, foundingWallets, createdBy } = body;
        
        const bagsCoin = await finalizeBagsCoin({
          tokenName,
          tokenSymbol,
          description,
          image,
          foundingWallets,
          createdBy,
          tokenMint,
          launchTxSignature,
          feeShareTxSignature,
        });

        logger.info("Bags Coin finalized", {
          tokenMint: bagsCoin.tokenMint,
          createdBy,
        });

        return NextResponse.json({
          success: true,
          action: "finalize",
          coin: bagsCoin,
        });
      } else {
        return NextResponse.json(
          { error: "Invalid action. Use 'prepare' (FormData) or 'finalize' (JSON) with required signatures." },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    logger.error("Failed to create Bags Coin", {
      error: error instanceof Error ? error.message : String(error),
    });

    return safeErrorResponse(error, "Failed to create Bags Coin");
  }
}
