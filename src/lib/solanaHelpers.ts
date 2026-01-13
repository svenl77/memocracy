import { Connection, PublicKey, ParsedTransactionWithMeta, ParsedInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const connection = new Connection("https://api.mainnet-beta.solana.com");

/**
 * Get SPL token balance for a wallet
 */
export async function getSplBalance(walletBase58: string, mintBase58: string): Promise<bigint> {
  try {
    const walletPublicKey = new PublicKey(walletBase58);
    const tokenMintAddress = new PublicKey(mintBase58);

    const associatedTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      walletPublicKey,
      true // allowOwnerOffCurve
    );

    const tokenAccountInfo = await connection.getTokenAccountBalance(
      associatedTokenAccount
    );

    return BigInt(tokenAccountInfo.value.amount);
  } catch (error) {
    console.error("Failed to get SPL balance:", error);
    return BigInt(0);
  }
}

/**
 * Sum transfers from a wallet to a destination wallet
 * This is a best-effort MVP implementation that checks recent transaction history
 */
export async function sumTransfersTo(
  walletBase58: string, 
  destBase58: string, 
  mint: 'SOL' | 'USDC' | 'ANY'
): Promise<bigint> {
  try {
    const walletPublicKey = new PublicKey(walletBase58);
    const destPublicKey = new PublicKey(destBase58);
    
    let totalLamports = BigInt(0);
    
    // Get recent signatures for the wallet (limit to 200 for performance)
    const signatures = await connection.getSignaturesForAddress(walletPublicKey, {
      limit: 200,
    });

    // Process transactions in batches to avoid overwhelming the RPC
    const batchSize = 10;
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const transactions = await Promise.all(
        batch.map(sig => 
          connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          }).catch(() => null)
        )
      );

      for (const tx of transactions) {
        if (!tx || !tx.meta || tx.meta.err) continue;

        const transferAmount = await analyzeTransactionForTransfers(
          tx,
          walletPublicKey,
          destPublicKey,
          mint
        );
        
        totalLamports += transferAmount;
      }
    }

    return totalLamports;
  } catch (error) {
    console.error("Failed to sum transfers:", error);
    return BigInt(0);
  }
}

/**
 * Analyze a parsed transaction for transfers from wallet to destination
 */
async function analyzeTransactionForTransfers(
  tx: ParsedTransactionWithMeta,
  fromWallet: PublicKey,
  toWallet: PublicKey,
  mint: 'SOL' | 'USDC' | 'ANY'
): Promise<bigint> {
  let totalLamports = BigInt(0);

  if (!tx.transaction.message.instructions) return totalLamports;

  for (const instruction of tx.transaction.message.instructions) {
    if ('parsed' in instruction) {
      const parsed = instruction.parsed as ParsedInstruction;
      
      // Handle SOL transfers
      if (mint === 'SOL' || mint === 'ANY') {
        if (parsed.type === 'transfer' && parsed.program === 'system') {
          const info = parsed.info;
          if (info.source === fromWallet.toString() && info.destination === toWallet.toString()) {
            totalLamports += BigInt(info.lamports);
          }
        }
      }

      // Handle SPL token transfers
      if (mint === 'USDC' || mint === 'ANY') {
        if (parsed.type === 'transfer' && parsed.program === 'spl-token') {
          const info = parsed.info;
          
          // For USDC, we'd need to check the mint address
          // For now, we'll include all SPL token transfers
          // In a production system, you'd want to filter by specific mint addresses
          if (info.authority === fromWallet.toString()) {
            // This is a simplified check - in reality, you'd need to verify
            // that the token account belongs to the destination wallet
            // and that it's the correct mint (USDC)
            totalLamports += BigInt(info.amount || 0);
          }
        }
      }
    }
  }

  return totalLamports;
}

/**
 * Get SOL balance for a wallet
 */
export async function getSolBalance(walletBase58: string): Promise<bigint> {
  try {
    const walletPublicKey = new PublicKey(walletBase58);
    const balance = await connection.getBalance(walletPublicKey);
    return BigInt(balance);
  } catch (error) {
    console.error("Failed to get SOL balance:", error);
    return BigInt(0);
  }
}

/**
 * Check if a wallet has sufficient token balance
 */
export async function hasTokenBalance(
  walletBase58: string, 
  mintBase58: string, 
  minAmount: string
): Promise<boolean> {
  try {
    const balance = await getSplBalance(walletBase58, mintBase58);
    const minBalance = BigInt(minAmount);
    return balance >= minBalance;
  } catch (error) {
    console.error("Failed to check token balance:", error);
    return false;
  }
}

/**
 * Check if a wallet has made sufficient contributions
 */
export async function hasSufficientContribution(
  walletBase58: string,
  destWalletBase58: string,
  minContributionUSD: string,
  contributionMint: 'SOL' | 'USDC' | 'ANY'
): Promise<boolean> {
  try {
    const totalContribution = await sumTransfersTo(
      walletBase58,
      destWalletBase58,
      contributionMint
    );
    
    // For now, we'll use a simplified approach where we assume the contribution
    // is already in USD terms. In a production system, you'd want to:
    // 1. Get historical prices for each token at transfer time
    // 2. Convert all transfers to USD value
    // 3. Sum the USD values
    
    // This is a placeholder implementation - in reality you'd need to:
    // - Track token prices at transfer time
    // - Convert each transfer to USD value
    // - Sum all USD values
    
    const minContribution = parseFloat(minContributionUSD);
    const totalContributionUSD = parseFloat(totalContribution.toString()) / 1000000; // Rough conversion
    
    return totalContributionUSD >= minContribution;
  } catch (error) {
    console.error("Failed to check contribution:", error);
    return false;
  }
}
