/**
 * Bags Wallet Monitor
 * Handles transaction scanning for Bags Founding Wallets
 * Similar to solanaWalletMonitor but for Bags wallets
 */

import { scanWalletTransactions } from "./solanaWalletMonitor";
import { prisma } from "./db";
import { logger } from "./logger";
import { getWalletBalanceWithUSD } from "./solanaWalletMonitor";

/**
 * Updates Bags Founding Wallet balance and creates transaction records
 * Similar to updateFoundingWalletBalance but for Bags wallets
 */
export async function updateBagsFoundingWalletBalance(
  walletId: string
): Promise<{ updated: boolean; newTransactions: number }> {
  try {
    const wallet = await prisma.bagsFoundingWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error(`Bags Founding Wallet not found: ${walletId}`);
    }

    // Scan for new transactions
    const newTransactions = await scanWalletTransactions(
      wallet.walletAddress
    );

    if (newTransactions.length === 0) {
      return { updated: false, newTransactions: 0 };
    }

    // Filter transactions that are deposits to this wallet
    const deposits = newTransactions.filter(
      (tx) => tx.toWallet === wallet.walletAddress && tx.transactionType === "DEPOSIT"
    );

    let totalNewUSD = 0;
    let totalNewLamports = BigInt(0);

    // Create transaction records and update contributors
    for (const tx of deposits) {
      // Check for duplicate
      const existing = await prisma.bagsWalletTransaction.findUnique({
        where: { signature: tx.signature },
      });

      if (existing) {
        continue;
      }

      // Create transaction record
      await prisma.bagsWalletTransaction.create({
        data: {
          foundingWalletId: walletId,
          signature: tx.signature,
          fromWallet: tx.fromWallet,
          toWallet: tx.toWallet,
          amountLamports: tx.amountLamports,
          amountUSD: tx.amountUSD || 0,
          transactionType: tx.transactionType,
          blockTime: tx.blockTime,
          memo: tx.memo,
          projectIdFromMemo: tx.projectId,
        },
      });

      totalNewUSD += tx.amountUSD || 0;
      totalNewLamports += BigInt(tx.amountLamports);

      // Update or create contributor
      const contributor = await prisma.bagsWalletContributor.findUnique({
        where: {
          foundingWalletId_walletAddress: {
            foundingWalletId: walletId,
            walletAddress: tx.fromWallet,
          },
        },
      });

      if (contributor) {
        await prisma.bagsWalletContributor.update({
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
          },
        });
      } else {
        await prisma.bagsWalletContributor.create({
          data: {
            foundingWalletId: walletId,
            walletAddress: tx.fromWallet,
            totalContributedUSD: tx.amountUSD || 0,
            totalContributedLamports: tx.amountLamports,
            firstContributionAt: new Date(),
            lastContributionAt: new Date(),
            contributionCount: 1,
          },
        });
      }
    }

    // Update wallet balance (for contributions, not fees)
    const currentBalanceLamports = BigInt(wallet.currentBalanceLamports || "0");
    const newBalanceLamports = currentBalanceLamports + totalNewLamports;
    const newBalanceUSD = (wallet.currentBalanceUSD || 0) + totalNewUSD;

    await prisma.bagsFoundingWallet.update({
      where: { id: walletId },
      data: {
        currentBalanceUSD: newBalanceUSD,
        currentBalanceLamports: newBalanceLamports.toString(),
      },
    });

    logger.info("Updated Bags Founding Wallet balance", {
      walletId,
      newTransactions: deposits.length,
      totalNewUSD,
    });

    return {
      updated: deposits.length > 0,
      newTransactions: deposits.length,
    };
  } catch (error) {
    logger.error("Failed to update Bags Founding Wallet balance", {
      walletId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
