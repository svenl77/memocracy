import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { z } from "zod";

const checkBalanceSchema = z.object({
  wallet: z.string().min(1),
  tokenCA: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, tokenCA } = checkBalanceSchema.parse(body);

    // Create connection to Solana mainnet
    const connection = new Connection("https://api.mainnet-beta.solana.com");

    // Get token accounts for the wallet
    const walletPubkey = new PublicKey(wallet);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      {
        mint: new PublicKey(tokenCA),
      }
    );

    // Check if user has any balance of this token
    let hasToken = false;
    let balance = 0;

    for (const account of tokenAccounts.value) {
      const tokenAmount = account.account.data.parsed.info.tokenAmount;
      if (parseFloat(tokenAmount.uiAmountString || "0") > 0) {
        hasToken = true;
        balance = parseFloat(tokenAmount.uiAmountString || "0");
        break;
      }
    }

    return NextResponse.json({
      hasToken,
      balance,
      tokenCA,
      wallet,
    });
  } catch (error) {
    console.error("Token balance check error:", error);
    return NextResponse.json(
      { error: "Failed to check token balance" },
      { status: 500 }
    );
  }
}
