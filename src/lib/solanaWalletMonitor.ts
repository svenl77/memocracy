import { Connection, PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { extractProjectIdFromMemo, isValidMemocracyMemo } from "./solanaPayLinks";

const connection = new Connection(
  env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "confirmed"
);

// Memo Program ID (Solana's official memo program)
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

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
  memo?: string; // Memo text from transaction
  projectId?: string; // Extracted project ID from memo (if MEMOCRACY: format)
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
        const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((key) =>
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
            // Filter out very small changes that are likely just transaction fees or account initialization
            // Minimum: 1000 lamports (0.000001 SOL) to be considered a real deposit
            const MIN_DEPOSIT_LAMPORTS = 1000;
            if (balanceChange <= 0 || balanceChange < MIN_DEPOSIT_LAMPORTS) {
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

        // Extract memo from transaction
        let memo: string | undefined = undefined;
        let projectId: string | undefined = undefined;

        try {
          // Check for memo instruction in transaction
          // Handle both legacy and versioned transactions
          const message = tx.transaction.message;
          const instructions = 'instructions' in message 
            ? message.instructions 
            : 'compiledInstructions' in message
            ? message.compiledInstructions
            : [];
          for (const instruction of instructions) {
            // Check if this is a memo instruction
            // Handle both legacy and compiled instructions
            const programId = 'programId' in instruction 
              ? instruction.programId 
              : (instruction as any).programIdIndex !== undefined
              ? accountKeys[(instruction as any).programIdIndex]
              : null;
            
            if (programId && programId.toString() === MEMO_PROGRAM_ID.toString()) {
              // Extract memo data
              const memoData = 'data' in instruction 
                ? instruction.data 
                : (instruction as any).data;
              
              if (memoData) {
                try {
                  // The data might be a Buffer, Uint8Array, or base64 string
                  let memoBytes: Buffer | null = null;
                  if (typeof memoData === "string") {
                    // Try base64 first, then assume it's already a string
                    try {
                      memoBytes = Buffer.from(memoData, "base64");
                    } catch {
                      // If base64 fails, treat as direct string
                      memo = memoData.trim();
                    }
                  } else if (memoData instanceof Uint8Array) {
                    memoBytes = Buffer.from(memoData);
                  } else if (Buffer.isBuffer(memoData)) {
                    memoBytes = memoData;
                  } else {
                    // Try to convert to buffer
                    memoBytes = Buffer.from(memoData as any);
                  }

                  if (memoBytes) {
                    memo = memoBytes.toString("utf-8").trim();
                  }
                  
                  // Extract project ID if it's a MEMOCRACY memo
                  if (memo && isValidMemocracyMemo(memo)) {
                    const extractedId = extractProjectIdFromMemo(memo);
                    projectId = extractedId || undefined;
                  }
                } catch (error) {
                  logger.debug("Failed to decode memo", {
                    signature: sigInfo.signature,
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
              }
            }
          }
        } catch (error) {
          logger.debug("Error extracting memo from transaction", {
            signature: sigInfo.signature,
            error: error instanceof Error ? error.message : String(error),
          });
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
          amountUSD: amountUSD ?? null,
          tokenMint,
          blockTime: sigInfo.blockTime ?? null,
          slot: sigInfo.slot,
          transactionType: "DEPOSIT",
          memo,
          projectId,
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
      // Determine which founding wallet this transaction belongs to
      // Priority: 1. projectId from memo, 2. walletId parameter (fallback)
      let targetWalletId = walletId;

      if (tx.projectId) {
        // Validate that the projectId exists and belongs to this wallet address
        try {
          const memoWallet = await prisma.projectWallet.findUnique({
            where: { id: tx.projectId },
            select: { id: true, address: true, type: true },
          });

          if (memoWallet && memoWallet.address === wallet.address && memoWallet.type === "FOUNDING") {
            targetWalletId = tx.projectId;
            logger.info("Transaction assigned via memo", {
              signature: tx.signature,
              projectId: tx.projectId,
              memo: tx.memo,
            });
          } else {
            logger.warn("Memo projectId does not match wallet address, using fallback", {
              signature: tx.signature,
              projectId: tx.projectId,
              walletAddress: wallet.address,
              memo: tx.memo,
            });
            // Fallback: Use walletId parameter
            targetWalletId = walletId;
          }
        } catch (error) {
          logger.error("Error validating memo projectId, using fallback", {
            signature: tx.signature,
            projectId: tx.projectId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Fallback: Use walletId parameter
          targetWalletId = walletId;
        }
      }

      // Check for duplicate transaction (by signature)
      const existingTx = await prisma.foundingWalletTransaction.findUnique({
        where: { signature: tx.signature },
      });

      if (existingTx) {
        logger.debug("Transaction already exists, skipping", {
          signature: tx.signature,
        });
        continue;
      }

      try {
        await prisma.foundingWalletTransaction.create({
          data: {
            foundingWalletId: targetWalletId,
            signature: tx.signature,
            fromWallet: tx.fromWallet,
            toWallet: tx.toWallet,
            amountLamports: tx.amountLamports,
            amountUSD: tx.amountUSD || null,
            tokenMint: tx.tokenMint || null,
            transactionType: tx.transactionType,
            blockTime: tx.blockTime,
            slot: tx.slot,
            memo: tx.memo || null,
            projectIdFromMemo: tx.projectId || null,
          },
        });
      } catch (error) {
        // Handle duplicate key error gracefully
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          logger.debug("Transaction already exists (race condition), skipping", {
            signature: tx.signature,
          });
          continue;
        }
        throw error;
      }

      // Only count transactions that belong to this wallet
      if (targetWalletId === walletId) {
        totalNewUSD += tx.amountUSD || 0;
        totalNewLamports += BigInt(tx.amountLamports);
      }
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

    // Invalidate caches after update
    invalidateBalanceCache(wallet.address);
    invalidateTransactionCache(wallet.address);

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

// Simple in-memory cache for SOL price (5 minutes)
let solPriceCache: { price: number; timestamp: number } | null = null;
const SOL_PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for wallet balances (1 minute - balance changes frequently)
interface BalanceCacheEntry {
  balance: { lamports: string; sol: number; usd: number };
  timestamp: number;
}
const balanceCache = new Map<string, BalanceCacheEntry>();
const BALANCE_CACHE_DURATION = 1 * 60 * 1000; // 1 minute

// Cache for wallet transactions (2 minutes - transactions don't change that often)
interface TransactionCacheEntry {
  transactions: TransactionInfo[];
  timestamp: number;
}
const transactionCache = new Map<string, TransactionCacheEntry>();
const TRANSACTION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Gets SOL price in USD from CoinGecko API
 * Cached in memory for 5 minutes to avoid rate limiting
 */
export async function getSOLPrice(): Promise<number> {
  // Check cache first
  if (solPriceCache && Date.now() - solPriceCache.timestamp < SOL_PRICE_CACHE_DURATION) {
    return solPriceCache.price;
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { 
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data.solana?.usd;
      
      if (typeof price === 'number' && price > 0) {
        // Update cache
        solPriceCache = { price, timestamp: Date.now() };
        return price;
      }
      
      throw new Error('Invalid price data from CoinGecko');
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.warn("Failed to fetch SOL price, using fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return cached price if available, otherwise fallback
    if (solPriceCache) {
      return solPriceCache.price;
    }
    
    return 100; // Fallback: $100 per SOL
  }
}

/**
 * Gets wallet balance with USD conversion
 * Cached for 1 minute to avoid RPC rate limiting
 */
export async function getWalletBalanceWithUSD(
  walletAddress: string,
  useCache: boolean = true
): Promise<{ lamports: string; sol: number; usd: number }> {
  // Check cache first
  if (useCache) {
    const cached = balanceCache.get(walletAddress);
    if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_DURATION) {
      logger.debug("Returning cached balance", { walletAddress });
      return cached.balance;
    }
  }

  // Fetch fresh balance
  const balance = await getWalletBalance(walletAddress);
  const solPrice = await getSOLPrice();
  const balanceWithUSD = {
    ...balance,
    usd: balance.sol * solPrice,
  };

  // Update cache
  if (useCache) {
    balanceCache.set(walletAddress, {
      balance: balanceWithUSD,
      timestamp: Date.now(),
    });
  }

  return balanceWithUSD;
}

/**
 * Invalidates balance cache for a wallet
 * Call this after a transaction to force refresh
 */
export function invalidateBalanceCache(walletAddress: string): void {
  balanceCache.delete(walletAddress);
  logger.debug("Balance cache invalidated", { walletAddress });
}

/**
 * Gets transaction history directly from Solana blockchain
 * Cached for 2 minutes to avoid RPC rate limiting
 * @param walletAddress - The wallet address to fetch transactions for
 * @param limit - Maximum number of transactions to fetch
 * @param useCache - Whether to use cache (default: true)
 * @param forceRefresh - Force refresh even if cache exists (default: false)
 */
export async function getWalletTransactionsFromBlockchain(
  walletAddress: string,
  limit: number = 50,
  useCache: boolean = true,
  forceRefresh: boolean = false
): Promise<TransactionInfo[]> {
  // Check cache first
  const cacheKey = `${walletAddress}:${limit}`;
  if (useCache && !forceRefresh) {
    const cached = transactionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TRANSACTION_CACHE_DURATION) {
      logger.debug("Returning cached transactions", { walletAddress, count: cached.transactions.length });
      return cached.transactions;
    }
  }

  try {
    const publicKey = new PublicKey(walletAddress);
    const transactions: TransactionInfo[] = [];

    // Get signatures for this wallet
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: Math.min(limit, 100), // Max 100 at a time
    });

    if (signatures.length === 0) {
      return [];
    }

    // Get SOL price once for all transactions
    const solPrice = await getSOLPrice();

    // Process transactions in batches for better performance
    const BATCH_SIZE = 10;
    for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
      const batch = signatures.slice(i, i + BATCH_SIZE);
      
      const txDetails = await Promise.all(
        batch.map(async (sigInfo) => {
          try {
            const tx = await connection.getTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx || !tx.meta || tx.meta.err) {
              return null;
            }

            // Parse transaction to find transfers to/from this wallet
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((key) =>
              key.toString()
            );

            const walletIndex = accountKeys.findIndex((key) => key === walletAddress);
            if (walletIndex === -1) {
              return null;
            }

            const preBalance = preBalances[walletIndex];
            const postBalance = postBalances[walletIndex];
            const balanceChange = postBalance - preBalance;

            // Only process deposits (positive balance change)
            // Filter out very small changes that are likely just transaction fees or account initialization
            // Minimum: 1000 lamports (0.000001 SOL) to be considered a real deposit
            const MIN_DEPOSIT_LAMPORTS = 1000;
            if (balanceChange <= 0 || balanceChange < MIN_DEPOSIT_LAMPORTS) {
              return null;
            }

            // Find the sender (account with negative balance change)
            let fromWallet = "";
            for (let j = 0; j < preBalances.length; j++) {
              if (j === walletIndex) continue;
              const change = postBalances[j] - preBalances[j];
              if (change < 0) {
                fromWallet = accountKeys[j];
                break;
              }
            }

            if (!fromWallet) {
              return null;
            }

            // Extract memo from transaction
            let memo: string | undefined;
            let projectId: string | undefined;

            try {
              // Check for memo instruction in transaction
              // Handle both legacy and versioned transactions
              const message = tx.transaction.message;
              const instructions = 'instructions' in message 
                ? message.instructions 
                : 'compiledInstructions' in message
                ? message.compiledInstructions
                : [];
          for (const instruction of instructions) {
            // Check if this is a memo instruction
            // Handle both legacy and compiled instructions
            const programId = 'programId' in instruction 
              ? instruction.programId 
              : (instruction as any).programIdIndex !== undefined
              ? accountKeys[(instruction as any).programIdIndex]
              : null;
            
            if (programId && programId.toString() === MEMO_PROGRAM_ID.toString()) {
              // Extract memo data
              const memoData = 'data' in instruction 
                ? instruction.data 
                : (instruction as any).data;
              
              if (memoData) {
                    try {
                      const memoBytes = typeof memoData === "string" 
                        ? Buffer.from(memoData, "base64")
                        : Buffer.from(memoData);
                      memo = memoBytes.toString("utf-8").trim();
                      
                      // Extract project ID if it's a MEMOCRACY memo
                      if (memo && isValidMemocracyMemo(memo)) {
                        const extractedId = extractProjectIdFromMemo(memo);
                        projectId = extractedId || undefined;
                      }
                    } catch (error) {
                      // Silently continue if memo decoding fails
                    }
                  }
                }
              }
            } catch (error) {
              // Silently continue if memo extraction fails
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

            // Calculate USD value
            const amountUSD = solPrice ? (balanceChange / 1e9) * solPrice : null;

            return {
              signature: sigInfo.signature,
              fromWallet,
              toWallet: walletAddress,
              amountLamports: balanceChange.toString(),
              amountUSD: amountUSD ?? undefined,
              tokenMint,
              blockTime: sigInfo.blockTime ?? null,
              slot: sigInfo.slot,
              transactionType: "DEPOSIT" as const,
              memo,
              projectId,
            };
          } catch (error) {
            logger.error("Error processing transaction", {
              signature: sigInfo.signature,
              error: error instanceof Error ? error.message : String(error),
            });
            return null;
          }
        })
      );

      // Filter out null values and add to transactions array
      const validTransactions = txDetails.filter(
        (tx): tx is NonNullable<typeof tx> => tx !== null
      );
      transactions.push(...validTransactions);
    }

    // Update cache
    if (useCache) {
      transactionCache.set(cacheKey, {
        transactions,
        timestamp: Date.now(),
      });
    }

    return transactions;
  } catch (error) {
    logger.error("Error fetching wallet transactions from blockchain", {
      walletAddress,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return cached data if available, even if stale
    if (useCache) {
      const cached = transactionCache.get(cacheKey);
      if (cached) {
        logger.warn("Returning stale cache due to error", { walletAddress });
        return cached.transactions;
      }
    }
    
    return [];
  }
}

/**
 * Invalidates transaction cache for a wallet
 * Call this after scanning for new transactions
 */
export function invalidateTransactionCache(walletAddress: string): void {
  // Remove all cache entries for this wallet (different limits)
  const keysToDelete: string[] = [];
  transactionCache.forEach((_, key) => {
    if (key.startsWith(`${walletAddress}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => transactionCache.delete(key));
  logger.debug("Transaction cache invalidated", { walletAddress, count: keysToDelete.length });
}
