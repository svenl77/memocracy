import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenData } from "@/lib/dexscreener";

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json();

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const walletPublicKey = new PublicKey(wallet);

    // Get all token accounts owned by the wallet using getParsedTokenAccountsByOwner
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program
      }
    );

    // Filter out accounts with zero balance and get token info
    const userTokens = [];
    
    for (const tokenAccount of tokenAccounts.value) {
      try {
        const accountInfo = tokenAccount.account.data.parsed.info;
        const mint = accountInfo.mint;
        const amount = accountInfo.tokenAmount.uiAmount;

        // Only include tokens with positive balance
        if (amount && amount > 0) {
          // Try to get token metadata from DexScreener
          let tokenData = null;
          try {
            tokenData = await getTokenData(mint);
          } catch (error) {
            // If DexScreener fails, we'll still include the token with basic info
            console.log(`Could not fetch metadata for token ${mint}:`, error);
          }

          userTokens.push({
            mint,
            amount,
            name: tokenData?.name || "Unknown Token",
            symbol: tokenData?.symbol || mint.slice(0, 8),
            price: tokenData?.price || 0,
            priceChange24h: tokenData?.priceChange24h || 0,
            marketCap: tokenData?.marketCap || 0,
            volume24h: tokenData?.volume24h || 0,
          });
        }
      } catch (error) {
        console.error("Error processing token account:", error);
        // Continue with other tokens
      }
    }

    // Sort by balance value (amount * price) descending
    userTokens.sort((a, b) => {
      const valueA = a.amount * a.price;
      const valueB = b.amount * b.price;
      return valueB - valueA;
    });

    return NextResponse.json(userTokens);
  } catch (error) {
    console.error("Failed to fetch user tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch user tokens" },
      { status: 500 }
    );
  }
}
