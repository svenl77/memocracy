import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getTokenData } from "@/lib/dexscreener";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const createPollSchema = z.object({
  topic: z.string().min(1),
  options: z.array(z.string()).min(2),
  startAt: z.string(),
  endAt: z.string(),
  tokenCA: z.string().min(1), // Always required - all polls are token-gated
  creatorWallet: z.string().min(1), // Required to verify token holdings
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

    return tokenAccountInfo.value.uiAmount && tokenAccountInfo.value.uiAmount > 0;
  } catch (error) {
    console.error("Failed to check token balance:", error);
    return false;
  }
}

export async function GET() {
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
    console.error("Failed to fetch polls:", error);
    return NextResponse.json(
      { error: "Failed to fetch polls" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, options, startAt, endAt, tokenCA, creatorWallet } = createPollSchema.parse(body);

    // Validate that creatorWallet is provided
    if (!creatorWallet) {
      return NextResponse.json(
        { error: "Creator wallet address is required" },
        { status: 400 }
      );
    }

    // Always verify that the creator holds the token (all polls are token-gated)
    const hasToken = await checkTokenBalance(creatorWallet, tokenCA);
    if (!hasToken) {
      return NextResponse.json(
        { error: "You must hold the specified token to create polls for this community" },
        { status: 403 }
      );
    }

      const poll = await prisma.poll.create({
        data: {
          topic,
          options: JSON.stringify(options),
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          tokenCA: tokenCA,
        },
      });

    return NextResponse.json(poll);
  } catch (error) {
    console.error("Failed to create poll:", error);
    return NextResponse.json(
      { error: "Failed to create poll" },
      { status: 500 }
    );
  }
}
