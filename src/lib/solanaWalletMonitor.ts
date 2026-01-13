import { Connection, PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const connection = new Connection(
  env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "confirmed"
);

interface TransactionInfo {
  signature: string;
  fromWallet: string;
  toWallet: string;
  amountLamports: string;
  amountUSD?: number;
  tokenMint?: string;
  blockTime: number | null;
  slot: number;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "REFUND";
}

/**
 * Scans a Solana wallet for new transactions
 */
export async function scanWalletTransactions(
  walletAddress: string,
  lastSignature?: string
): Promise<TransactionInfo[]> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const transactions: TransactionInfo[] = [];

    // Get signatures for this wallet (limit to 100 most recent)
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: 100,
      before: lastSignature,
    });

    for (const sigInfo of signatures) {
      try {
        // Skip if we've already processed this transaction
        const existing = await prisma.foundingWalletTransaction.findUnique({
          where: { signature: sigInfo.signature },
        });

        if (existing) {
          continue;
        }

        // Get transaction details
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) {
          continue;
        }

        // Parse transaction to find transfers to/from this wallet
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys.map((key) =>
          key.toString()
        );

        const walletIndex = accountKeys.findIndex((key) => key === walletAddress);
        if (walletIndex === -1) {
          continue;
        }

        const preBalance = preBalances[walletIndex];
        const postBalance = postBalances[walletIndex];
        const balanceChange = postBalance - preBalance;

        // Only process deposits (positive balance change)
        if (balanceChange <= 0) {
          continue;
        }

        // Find the sender (account with negative balance change)
        let fromWallet = "";
        for (let i = 0; i < preBalances.length; i++) {
          if (i === walletIndex) continue;
          const change = postBalances[i] - preBalances[i];
          if (change < 0) {
            fromWallet = accountKeys[i];
            break;
          }
        }

        if (!fromWallet) {
          continue;
        }

        // Check for token transfers (SPL tokens)
        let tokenMint: string | undefined;
        let tokenAmount = "0";

        if (tx.meta.postTokenBalances && tx.meta.postTokenBalances.length > 0) {
          const tokenBalance = tx.meta.postTokenBalances.find(
            (tb) => tb.owner === walletAddress
          );
          if (tokenBalance) {
            tokenMint = tokenBalance.mint;
            tokenAmount = tokenBalance.uiTokenAmount.uiAmountString || "0";
          }
        }

        // Calculate USD value (simplified - would need price oracle in production)
        const amountUSD = balanceChange / 1e9; // Convert lamports to SOL, assume $100/SOL (placeholder)

        transactions.push({
          signature: sigInfo.signature,
          fromWallet,
          toWallet: walletAddress,
          amountLamports: balanceChange.toString(),
          amountUSD,
          tokenMint,
          blockTime: sigInfo.blockTime,
          slot: sigInfo.slot,
          transactionType: "DEPOSIT",
        });
      } catch (error) {
        logger.error("Error processing transaction", {
          signature: sigInfo.signature,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    return transactions;
  } catch (error) {
    logger.error("Error scanning wallet transactions", {
      walletAddress,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Updates founding wallet balance and creates transaction records
 */
export async function updateFoundingWalletBalance(
  walletId: string
): Promise<{ updated: boolean; newTransactions: number }> {
  try {
    const wallet = await prisma.projectWallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        address: true,
        type: true,
        currentBalanceLamports: true,
      },
    });

    if (!wallet || wallet.type !== "FOUNDING") {
      return { updated: false, newTransactions: 0 };
    }

    // Get the last processed transaction signature
    const lastTransaction = await prisma.foundingWalletTransaction.findFirst({
      where: { foundingWalletId: walletId },
      orderBy: { createdAt: "desc" },
      select: { signature: true },
    });

    // Scan for new transactions
    const newTransactions = await scanWalletTransactions(
      wallet.address,
      lastTransaction?.signature
    );

    if (newTransactions.length === 0) {
      return { updated: false, newTransactions: 0 };
    }

    // Create transaction records
    let totalNewUSD = 0;
    let totalNewLamports = BigInt(0);

    for (const tx of newTransactions) {
      await prisma.foundingWalletTransaction.create({
        data: {
          foundingWalletId: walletId,
          signature: tx.signature,
          fromWallet: tx.fromWallet,
          toWallet: tx.toWallet,
          amountLamports: tx.amountLamports,
          amountUSD: tx.amountUSD || null,
          tokenMint: tx.tokenMint || null,
          transactionType: tx.transactionType,
          blockTime: tx.blockTime,
          slot: tx.slot,
        },
      });

      totalNewUSD += tx.amountUSD || 0;
      totalNewLamports += BigInt(tx.amountLamports);
    }

    // Update contributor records
    for (const tx of newTransactions) {
      const contributor = await prisma.foundingWalletContributor.findUnique({
        where: {
          foundingWalletId_walletAddress: {
            foundingWalletId: walletId,
            walletAddress: tx.fromWallet,
          },
        },
      });

      if (contributor) {
        // Update existing contributor
        await prisma.foundingWalletContributor.update({
          where: {
            foundingWalletId_walletAddress: {
              foundingWalletId: walletId,
              walletAddress: tx.fromWallet,
            },
          },
          data: {
            totalContributedUSD: contributor.totalContributedUSD + (tx.amountUSD || 0),
            totalContributedLamports: (
              BigInt(contributor.totalContributedLamports) + BigInt(tx.amountLamports)
            ).toString(),
            lastContributionAt: new Date(),
            contributionCount: contributor.contributionCount + 1,
            isActive: true,
          },
        });
      } else {
        // Create new contributor
        await prisma.foundingWalletContributor.create({
          data: {
            foundingWalletId: walletId,
            walletAddress: tx.fromWallet,
            totalContributedUSD: tx.amountUSD || 0,
            totalContributedLamports: tx.amountLamports,
            firstContributionAt: new Date(),
            lastContributionAt: new Date(),
            contributionCount: 1,
            isActive: true,
          },
        });
      }
    }

    // Update wallet balance
    const currentBalanceLamports = BigInt(wallet.currentBalanceLamports || "0");
    const newBalanceLamports = currentBalanceLamports + totalNewLamports;
    const currentBalanceUSD =
      (wallet.currentBalanceUSD || 0) + totalNewUSD;

    await prisma.projectWallet.update({
      where: { id: walletId },
      data: {
        currentBalanceLamports: newBalanceLamports.toString(),
        currentBalanceUSD: currentBalanceUSD,
      },
    });

    logger.info("Founding wallet balance updated", {
      walletId,
      newTransactions: newTransactions.length,
      newBalanceUSD: currentBalanceUSD,
    });

    return { updated: true, newTransactions: newTransactions.length };
  } catch (error) {
    logger.error("Error updating founding wallet balance", {
      walletId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { updated: false, newTransactions: 0 };
  }
}

/**
 * Gets current balance of a Solana wallet
 */
export async function getWalletBalance(
  walletAddress: string
): Promise<{ lamports: string; sol: number }> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return {
      lamports: balance.toString(),
      sol: balance / 1e9,
    };
  } catch (error) {
    logger.error("Error getting wallet balance", {
      walletAddress,
      error: error instanceof Error ? error.message : String(error),
    });
    return { lamports: "0", sol: 0 };
  }
}
