import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createProjectWalletSchema = z.object({
  address: z.string().min(1),
  label: z.string().min(1),
  coinId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get("coinId");

    const whereClause = coinId ? { coinId } : {};

    const projectWallets = await prisma.projectWallet.findMany({
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
        polls: {
          select: {
            id: true,
            topic: true,
            createdAt: true,
            accessMode: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response
    const formattedWallets = projectWallets.map((wallet: typeof projectWallets[0]) => ({
      id: wallet.id,
      address: wallet.address,
      label: wallet.label,
      coinId: wallet.coinId,
      coin: wallet.coin,
      createdAt: wallet.createdAt,
      pollCount: wallet.polls.length,
      latestPoll: wallet.polls.length > 0 ? 
        wallet.polls.sort((a: typeof wallet.polls[0], b: typeof wallet.polls[0]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt : 
        null,
    }));

    return NextResponse.json(formattedWallets);
  } catch (error) {
    console.error("Failed to fetch project wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch project wallets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, label, coinId } = createProjectWalletSchema.parse(body);

    // Check if project wallet with this address already exists
    const existingWallet = await prisma.projectWallet.findUnique({
      where: { address },
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "Project wallet with this address already exists" },
        { status: 400 }
      );
    }

    // If coinId is provided, verify the coin exists
    if (coinId) {
      const coin = await prisma.coin.findUnique({
        where: { id: coinId },
      });

      if (!coin) {
        return NextResponse.json(
          { error: "Coin not found" },
          { status: 400 }
        );
      }
    }

    const projectWallet = await prisma.projectWallet.create({
      data: {
        address,
        label,
        coinId: coinId || null,
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

    return NextResponse.json(projectWallet);
  } catch (error) {
    console.error("Failed to create project wallet:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create project wallet" },
      { status: 500 }
    );
  }
}




