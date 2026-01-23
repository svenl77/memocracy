import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getTokenData } from "@/lib/dexscreener";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";
import { env } from "@/lib/env";

const createFoundingWalletSchema = z.object({
  address: z.string().min(1),
  label: z.string().min(1),
  tokenCA: z.string().min(1),
  description: z.string().min(10),
  fundingGoalUSD: z.number().positive().optional(),
  fundingGoalLamports: z.string().optional(),
  creatorWallet: z.string().min(1),
});

async function checkTokenBalance(wallet: string, tokenCA: string): Promise<boolean> {
  try {
    const connection = new Connection(
      env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
    );
    const walletPublicKey = new PublicKey(wallet);
    const tokenMintAddress = new PublicKey(tokenCA);

    const associatedTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      walletPublicKey,
      true // allowOwnerOffCurve
    );

    const tokenAccountInfo = await connection.getTokenAccountBalance(
      associatedTokenAccount
    );

    return !!(tokenAccountInfo.value.uiAmount && tokenAccountInfo.value.uiAmount > 0);
  } catch (error) {
    logger.warn("Failed to check token balance", {
      wallet,
      tokenCA,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get("coinId");
    const status = searchParams.get("status");
    const type = searchParams.get("type") || "FOUNDING";

    const whereClause: any = { type };
    if (coinId) whereClause.coinId = coinId;
    if (status) whereClause.status = status;

    const wallets = await prisma.projectWallet.findMany({
      where: whereClause,
      include: {
        coin: {
          select: {
            id: true,
            mint: true,
            symbol: true,
            name: true,
          },
        },
        contributors: {
          select: {
            walletAddress: true,
            totalContributedUSD: true,
            contributionCount: true,
          },
        },
        trustScore: {
          select: {
            overallScore: true,
            tier: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedWallets = wallets.map((wallet: any) => ({
      id: wallet.id,
      address: wallet.address,
      label: wallet.label,
      coinId: wallet.coinId,
      coin: wallet.coin,
      type: wallet.type,
      description: wallet.description,
      fundingGoalUSD: wallet.fundingGoalUSD,
      fundingGoalLamports: wallet.fundingGoalLamports,
      status: wallet.status,
      currentBalanceUSD: wallet.currentBalanceUSD,
      currentBalanceLamports: wallet.currentBalanceLamports,
      creatorWallet: wallet.creatorWallet,
      completedAt: wallet.completedAt,
      createdAt: wallet.createdAt,
      contributorCount: wallet.contributors.length,
      totalContributions: wallet.contributors.reduce(
        (sum: number, c: any) => sum + c.totalContributedUSD,
        0
      ),
      transactionCount: wallet._count.transactions,
      trustScore: wallet.trustScore,
    }));

    return NextResponse.json(formattedWallets);
  } catch (error) {
    logger.error("Failed to fetch founding wallets", {
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch founding wallets");
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.default);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const data = createFoundingWalletSchema.parse(body);

    // Verify that the creator holds the token
    const hasToken = await checkTokenBalance(data.creatorWallet, data.tokenCA);
    if (!hasToken) {
      return NextResponse.json(
        { error: "You must hold the specified token to create a founding wallet for this coin" },
        { status: 403 }
      );
    }

    // Find or create coin record
    let coin = await prisma.coin.findUnique({
      where: { mint: data.tokenCA },
    });

    if (!coin) {
      // Try to get token metadata from DexScreener
      let tokenMetadata = null;
      try {
        const dexscreenerData = await getTokenData(data.tokenCA);
        if (dexscreenerData) {
          tokenMetadata = {
            name: dexscreenerData.name,
            symbol: dexscreenerData.symbol,
          };
        }
      } catch (error) {
        logger.warn("Failed to fetch token metadata for coin creation", {
          tokenCA: data.tokenCA,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Create a new coin record if it doesn't exist
      coin = await prisma.coin.create({
        data: {
          mint: data.tokenCA,
          symbol: tokenMetadata?.symbol || "TOKEN",
          name: tokenMetadata?.name || "Token",
        },
      });
    }

    // Check if wallet with this address already exists
    const existingWallet = await prisma.projectWallet.findUnique({
      where: { address: data.address },
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet with this address already exists" },
        { status: 400 }
      );
    }

    // Validate funding goal
    if (!data.fundingGoalUSD && !data.fundingGoalLamports) {
      return NextResponse.json(
        { error: "Either fundingGoalUSD or fundingGoalLamports must be provided" },
        { status: 400 }
      );
    }

    const foundingWallet = await prisma.projectWallet.create({
      data: {
        address: data.address,
        label: data.label,
        coinId: coin.id,
        type: "FOUNDING",
        description: data.description,
        fundingGoalUSD: data.fundingGoalUSD || null,
        fundingGoalLamports: data.fundingGoalLamports || null,
        status: "ACTIVE",
        creatorWallet: data.creatorWallet,
        currentBalanceUSD: 0,
        currentBalanceLamports: "0",
      },
      include: {
        coin: {
          select: {
            id: true,
            mint: true,
            symbol: true,
            name: true,
          },
        },
      },
    });

    logger.info("Founding wallet created", {
      walletId: foundingWallet.id,
      coinId: coin.id,
      tokenCA: data.tokenCA,
      creatorWallet: data.creatorWallet,
    });

    return NextResponse.json(foundingWallet);
  } catch (error) {
    logger.error("Failed to create founding wallet", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return safeErrorResponse(error, "Failed to create founding wallet");
  }
}
