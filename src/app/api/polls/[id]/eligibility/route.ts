import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  hasTokenBalance, 
  hasSufficientContribution,
  getSplBalance,
  sumTransfersTo 
} from "@/lib/solanaHelpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet parameter is required" },
        { status: 400 }
      );
    }

    // Load poll with all relations
    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        coin: true,
        projectWallet: {
          include: {
            coin: true,
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json(
        { error: "Poll not found" },
        { status: 404 }
      );
    }

    const reasons: string[] = [];
    let eligible = true;
    let isFoundingWallet = false;

    // Check if this is a founding wallet (project wallet owner)
    if (poll.accessMode === "WALLET" && poll.projectWallet && wallet === poll.projectWallet.address) {
      isFoundingWallet = true;
      eligible = true;
      reasons.push("✅ Founding wallet owner - full access granted");
    }

    if (poll.accessMode === "COIN") {
      // COIN mode: check token balance
      if (!poll.coin) {
        reasons.push("Poll configuration error: no coin specified");
        eligible = false;
      } else {
        const minHold = poll.coinMinHold || "1";
        const hasBalance = await hasTokenBalance(wallet, poll.coin.mint, minHold);
        
        if (!hasBalance) {
          const balance = await getSplBalance(wallet, poll.coin.mint);
          reasons.push(`Not enough ${poll.coin.symbol} balance (need ≥ ${minHold}, have ${balance.toString()})`);
          eligible = false;
        }
      }
    } else if (poll.accessMode === "WALLET" && !isFoundingWallet) {
      // WALLET mode: check contribution (flexible - any cryptocurrency)
      // Skip checks for founding wallet owners
      if (!poll.projectWallet) {
        reasons.push("Poll configuration error: no project wallet specified");
        eligible = false;
      } else {
        const minContributionUSD = poll.minContributionUSD || "0";
        
        // Check for any contributions to the project wallet
        const hasContribution = await hasSufficientContribution(
          wallet,
          poll.projectWallet.address,
          minContributionUSD,
          'ANY' // Accept any cryptocurrency
        );

        if (!hasContribution) {
          const totalContribution = await sumTransfersTo(
            wallet,
            poll.projectWallet.address,
            'ANY' // Sum all transfers regardless of token type
          );
          reasons.push(`No sufficient contribution found to ${poll.projectWallet.label} (need ≥ $${minContributionUSD} USD, have $${totalContribution.toString()} USD)`);
          eligible = false;
        }

        // If project wallet has a parent coin, also check coin balance
        if (poll.projectWallet.coin) {
          const minHold = poll.coinMinHold || "1";
          const hasBalance = await hasTokenBalance(wallet, poll.projectWallet.coin.mint, minHold);
          
          if (!hasBalance) {
            const balance = await getSplBalance(wallet, poll.projectWallet.coin.mint);
            reasons.push(`Not enough ${poll.projectWallet.coin.symbol} balance (need ≥ ${minHold}, have ${balance.toString()})`);
            eligible = false;
          }
        }
      }
    }

    // If no specific reasons were found but still not eligible, add a generic message
    if (!eligible && reasons.length === 0) {
      reasons.push("Cannot read balance / RPC error");
    }

    return NextResponse.json({
      eligible,
      reasons,
      isFoundingWallet,
      poll: {
        id: poll.id,
        accessMode: poll.accessMode,
        coin: poll.coin ? {
          id: poll.coin.id,
          mint: poll.coin.mint,
          symbol: poll.coin.symbol,
          name: poll.coin.name,
        } : null,
        coinMinHold: poll.coinMinHold,
        projectWallet: poll.projectWallet ? {
          id: poll.projectWallet.id,
          address: poll.projectWallet.address,
          label: poll.projectWallet.label,
          coinId: poll.projectWallet.coinId,
        } : null,
        minContributionLamports: poll.minContributionLamports,
        minContributionUSD: poll.minContributionUSD,
        contributionMint: poll.contributionMint,
      },
    });
  } catch (error) {
    console.error("Failed to check eligibility:", error);
    return NextResponse.json(
      { 
        eligible: false, 
        reasons: ["Cannot read balance / RPC error"],
        error: "Failed to check eligibility" 
      },
      { status: 500 }
    );
  }
}
