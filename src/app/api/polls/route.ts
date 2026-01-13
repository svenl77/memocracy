import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getTokenData } from "@/lib/dexscreener";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";

const createPollSchema = z.object({
  topic: z.string().min(1),
  options: z.array(z.string()).min(2),
  pollType: z.enum(["YES_NO", "MULTIPLE_CHOICE"]).default("YES_NO"),
  allowMultiple: z.boolean().default(false),
  maxSelections: z.number().optional(),
  startAt: z.string(),
  endAt: z.string(),
  tokenCA: z.string().optional(), // Legacy field for backward compatibility
  accessMode: z.enum(["COIN", "WALLET"]).default("COIN"),
  coinId: z.string().optional(),
  coinMinHold: z.string().optional(),
  projectWalletId: z.string().optional(),
  minContributionLamports: z.string().optional(),
  minContributionUSD: z.string().optional(),
  contributionMint: z.string().optional(), // Now accepts any token mint address
  creatorWallet: z.string().min(1), // Required to verify eligibility
});

async function checkTokenBalance(wallet: string, tokenCA: string): Promise<boolean> {
  try {
    const connection = new Connection("https://api.mainnet-beta.solana.com");
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
  // Apply rate limiting (lenient for read operations)
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const polls = await prisma.poll.findMany({
      include: {
        votes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(polls);
  } catch (error) {
    logger.error("Failed to fetch polls", {
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to fetch polls");
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
    const { 
      topic, 
      options, 
      pollType,
      allowMultiple,
      maxSelections,
      startAt, 
      endAt, 
      tokenCA, 
      accessMode, 
      coinId, 
      coinMinHold, 
      projectWalletId, 
      minContributionLamports, 
      minContributionUSD,
      contributionMint, 
      creatorWallet 
    } = createPollSchema.parse(body);

    // Validate that creatorWallet is provided
    if (!creatorWallet) {
      return NextResponse.json(
        { error: "Creator wallet address is required" },
        { status: 400 }
      );
    }

    // Validation based on access mode
    if (accessMode === "COIN") {
      // For COIN mode, require tokenCA
      if (!tokenCA) {
        return NextResponse.json(
          { error: "tokenCA is required for COIN access mode" },
          { status: 400 }
        );
      }

      // Verify that the creator holds the token
      const hasToken = await checkTokenBalance(creatorWallet, tokenCA);
      if (!hasToken) {
        return NextResponse.json(
          { error: "You must hold the specified token to create polls for this community" },
          { status: 403 }
        );
      }
    } else if (accessMode === "WALLET") {
      // For WALLET mode, require minContributionUSD and coinId
      if (!minContributionUSD) {
        return NextResponse.json(
          { error: "minContributionUSD is required for WALLET access mode" },
          { status: 400 }
        );
      }
      if (!coinId) {
        return NextResponse.json(
          { error: "coinId is required for WALLET access mode - wallets must be linked to a coin community" },
          { status: 400 }
        );
      }

      // For WALLET mode, we'll create a project wallet using the creator's wallet address
      // This ensures only the wallet owner can create polls for their wallet
    }

    // Create the poll
    const pollData: any = {
      topic,
      options: JSON.stringify(options),
      pollType,
      allowMultiple,
      maxSelections,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      accessMode,
    };

    // Set fields based on access mode
    if (accessMode === "COIN") {
      // For COIN mode, we need to find or create a coin record
      let coinRecord = await prisma.coin.findUnique({
        where: { mint: tokenCA },
      });

      if (!coinRecord) {
        // Try to get token metadata from DexScreener
        let tokenMetadata = null;
        try {
          const dexscreenerData = tokenCA ? await getTokenData(tokenCA) : null;
          if (dexscreenerData) {
            tokenMetadata = {
              name: dexscreenerData.name,
              symbol: dexscreenerData.symbol,
            };
          }
        } catch (error) {
          console.error("Failed to fetch token metadata for coin creation:", error);
        }

        // Create a new coin record if it doesn't exist
        coinRecord = await prisma.coin.create({
          data: {
            mint: tokenCA,
            symbol: tokenMetadata?.symbol || "TOKEN",
            name: tokenMetadata?.name || "Token",
          },
        });
      }

      pollData.coin = {
        connect: { id: coinRecord.id }
      };
      pollData.coinMinHold = coinMinHold || "1"; // Default to 1 if not provided
      pollData.tokenCA = tokenCA; // Keep legacy field for backward compatibility
    } else if (accessMode === "WALLET") {
      // For WALLET mode, create or find a project wallet using the creator's address
      let projectWallet = await prisma.projectWallet.findUnique({
        where: { address: creatorWallet },
      });

      if (!projectWallet) {
        // Create a new project wallet if it doesn't exist
        projectWallet = await prisma.projectWallet.create({
          data: {
            address: creatorWallet,
            label: `Project Wallet (${creatorWallet.slice(0, 8)}...)`,
            coinId: coinId, // Always link to coin (required)
          },
        });
      } else if (coinId && !projectWallet.coinId) {
        // Update existing project wallet to link to coin if not already linked
        projectWallet = await prisma.projectWallet.update({
          where: { id: projectWallet.id },
          data: { coinId },
        });
      }

      pollData.projectWallet = {
        connect: { id: projectWallet.id }
      };
      pollData.minContributionLamports = minContributionLamports || null; // Keep for backward compatibility
      pollData.minContributionUSD = minContributionUSD; // Store USD value for flexible contributions
      
      // Always set the coin relation on the poll (coinId is required for WALLET mode)
      pollData.coin = {
        connect: { id: coinId }
      };
      pollData.coinMinHold = coinMinHold || "1";
    }

    const poll = await prisma.poll.create({
      data: pollData,
      include: {
        coin: {
          select: {
            id: true,
            mint: true,
            symbol: true,
            name: true,
          },
        },
        projectWallet: {
          select: {
            id: true,
            address: true,
            label: true,
            coinId: true,
          },
        },
      },
    });

    logger.info("Poll created", {
      pollId: poll.id,
      topic: poll.topic,
      coinId: poll.coinId,
      creatorWallet: body.creatorWallet,
    });

    return NextResponse.json(poll);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid poll creation data", { errors: error.errors });
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }
    logger.error("Failed to create poll", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: { topic: body.topic, coinId: body.coinId },
    });
    return safeErrorResponse(error, "Failed to create poll");
  }
}
