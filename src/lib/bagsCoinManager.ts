/**
 * Bags Coin Manager
 * High-level functions for managing Bags-powered coins
 */

import { bagsApi, type TokenMetadata, type FeeClaimer, type TokenInfo } from "./bagsApi";
import { prisma } from "./db";
import { logger } from "./logger";
import { env } from "./env";
import { PublicKey } from "@solana/web3.js";

export interface CreateBagsCoinParams {
  // Token Info
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  image?: string; // URL (deprecated, use imageFile instead)
  imageFile?: Buffer; // File buffer for direct upload
  
  // Founding Wallets
  foundingWallets: Array<{
    label: string;
    description?: string;
    walletAddress: string;
    feeSharePercentage: number; // 0.0 - 1.0
    fundingGoalUSD?: number;
  }>;
  
  // Creator
  createdBy: string; // Wallet address
}

export interface BagsCoin {
  id: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  image?: string;
  bagsLaunchTxSignature?: string;
  bagsFeeShareConfigTxSignature?: string;
  platformFeePercentage: number;
  platformWallet: string;
  createdBy: string;
  createdAt: Date;
  foundingWallets: Array<{
    id: string;
    label: string;
    description?: string;
    walletAddress: string;
    feeSharePercentage: number;
    fundingGoalUSD?: number;
    currentBalanceUSD: number;
    lifetimeFees: number;
  }>;
}

/**
 * Validates fee distribution
 * Ensures all percentages sum to 100% (including platform fee)
 */
export function validateFeeDistribution(
  wallets: Array<{ feeSharePercentage: number }>,
  platformFeePercentage: number = 0.03
): { valid: boolean; error?: string; total: number } {
  const walletTotal = wallets.reduce((sum, w) => sum + w.feeSharePercentage, 0);
  const total = walletTotal + platformFeePercentage;
  const expectedTotal = 1.0; // 100%

  if (Math.abs(total - expectedTotal) > 0.0001) {
    return {
      valid: false,
      error: `Fee distribution must equal 100%. Current: ${(total * 100).toFixed(2)}%`,
      total,
    };
  }

  // Check individual wallet percentages
  for (const wallet of wallets) {
    if (wallet.feeSharePercentage <= 0 || wallet.feeSharePercentage >= 1) {
      return {
        valid: false,
        error: `Wallet fee share must be between 0% and 100%. Found: ${(wallet.feeSharePercentage * 100).toFixed(2)}%`,
        total,
      };
    }
  }

  return { valid: true, total };
}

/**
 * Prepares Bags Coin creation (returns transactions to sign)
 * User must sign transactions before calling finalizeBagsCoin
 */
export async function prepareBagsCoinCreation(
  params: CreateBagsCoinParams
): Promise<{
  tokenMint: string;
  tokenInfo: TokenInfo;
  launchTransaction: string; // Base58 encoded transaction
  feeShareTransaction: string; // Base58 encoded transaction
}> {
  // Validate fee distribution
  const platformFeePercentage = parseFloat(env.MEMOCRACY_PLATFORM_FEE_PERCENTAGE || "0.03");
  const validation = validateFeeDistribution(params.foundingWallets, platformFeePercentage);
  
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid fee distribution");
  }

  // Validate wallet addresses
  for (const wallet of params.foundingWallets) {
    try {
      new PublicKey(wallet.walletAddress);
    } catch (error) {
      throw new Error(`Invalid wallet address: ${wallet.walletAddress}`);
    }
  }

  // Validate creator wallet
  try {
    new PublicKey(params.createdBy);
  } catch (error) {
    throw new Error(`Invalid creator wallet address: ${params.createdBy}`);
  }

  // Step 1: Create token info via Bags API
  const tokenMetadata: TokenMetadata = {
    name: params.tokenName,
    symbol: params.tokenSymbol,
    description: params.description,
    image: params.image, // URL (if provided, will be downloaded)
    imageFile: params.imageFile, // Direct file buffer (preferred)
  };

  logger.info("Creating token info via Bags API", { 
    tokenName: params.tokenName,
    tokenSymbol: params.tokenSymbol,
    hasImageFile: !!params.imageFile,
    hasImageUrl: !!params.image,
  });
  const tokenInfoResult = await bagsApi.createTokenInfo(tokenMetadata);

  if (!tokenInfoResult.success || !tokenInfoResult.response) {
    throw new Error(
      tokenInfoResult.error || "Failed to create token info via Bags API"
    );
  }

  const tokenInfo = tokenInfoResult.response;
  logger.info("Token info created", { tokenMint: tokenInfo.mint });

  // Step 2: Create token launch transaction
  const launchResult = await bagsApi.createTokenLaunch({
    tokenMint: tokenInfo.mint,
  });

  if (!launchResult.success || !launchResult.response) {
    throw new Error(
      launchResult.error || "Failed to create token launch transaction"
    );
  }

  // Step 3: Create fee share config
  const platformWallet = env.MEMOCRACY_PLATFORM_WALLET;
  if (!platformWallet) {
    throw new Error("MEMOCRACY_PLATFORM_WALLET is not configured");
  }

  const feeClaimers: FeeClaimer[] = [
    ...params.foundingWallets.map((w) => ({
      wallet: w.walletAddress,
      share: w.feeSharePercentage,
    })),
    {
      wallet: platformWallet,
      share: platformFeePercentage,
    },
  ];

  const feeShareResult = await bagsApi.createFeeShareConfig({
    tokenMint: tokenInfo.mint,
    feeClaimers,
  });

  if (!feeShareResult.success || !feeShareResult.response) {
    throw new Error(
      feeShareResult.error || "Failed to create fee share config"
    );
  }

  return {
    tokenMint: tokenInfo.mint,
    tokenInfo,
    launchTransaction: launchResult.response.transaction,
    feeShareTransaction: feeShareResult.response.transaction,
  };
}

/**
 * Finalizes Bags Coin creation after transactions are signed
 */
export async function finalizeBagsCoin(
  params: CreateBagsCoinParams & {
    tokenMint: string;
    launchTxSignature: string;
    feeShareTxSignature: string;
  }
): Promise<BagsCoin> {
  const platformFeePercentage = parseFloat(env.MEMOCRACY_PLATFORM_FEE_PERCENTAGE || "0.03");
  const platformWallet = env.MEMOCRACY_PLATFORM_WALLET;
  
  if (!platformWallet) {
    throw new Error("MEMOCRACY_PLATFORM_WALLET is not configured");
  }

  // Register in database
  // First create the Coin entry
  const coin = await prisma.coin.create({
    data: {
      mint: params.tokenMint,
      symbol: params.tokenSymbol,
      name: params.tokenName,
    },
  });

  // Then create the BagsCoin entry
  const bagsCoin = await prisma.bagsCoin.create({
    data: {
      tokenMint: params.tokenMint,
      tokenName: params.tokenName,
      tokenSymbol: params.tokenSymbol,
      description: params.description,
      image: params.image,
      coinId: coin.id,
      bagsLaunchTxSignature: params.launchTxSignature,
      bagsFeeShareConfigTxSignature: params.feeShareTxSignature,
      platformFeePercentage,
      platformWallet,
      createdBy: params.createdBy,
      foundingWallets: {
        create: params.foundingWallets.map((w) => ({
          label: w.label,
          description: w.description,
          walletAddress: w.walletAddress,
          feeSharePercentage: w.feeSharePercentage,
          fundingGoalUSD: w.fundingGoalUSD,
        })),
      },
    },
    include: {
      foundingWallets: true,
    },
  });

  logger.info("Bags Coin finalized successfully", {
    tokenMint: params.tokenMint,
    bagsCoinId: bagsCoin.id,
  });

  return {
    id: bagsCoin.id,
    tokenMint: bagsCoin.tokenMint,
    tokenName: bagsCoin.tokenName,
    tokenSymbol: bagsCoin.tokenSymbol,
    description: bagsCoin.description || undefined,
    image: bagsCoin.image || undefined,
    bagsLaunchTxSignature: bagsCoin.bagsLaunchTxSignature || undefined,
    bagsFeeShareConfigTxSignature: bagsCoin.bagsFeeShareConfigTxSignature || undefined,
    platformFeePercentage: bagsCoin.platformFeePercentage,
    platformWallet: bagsCoin.platformWallet,
    createdBy: bagsCoin.createdBy,
    createdAt: bagsCoin.createdAt,
    foundingWallets: bagsCoin.foundingWallets.map((w: typeof bagsCoin.foundingWallets[0]) => ({
      id: w.id,
      label: w.label,
      description: w.description || undefined,
      walletAddress: w.walletAddress,
      feeSharePercentage: w.feeSharePercentage,
      fundingGoalUSD: w.fundingGoalUSD || undefined,
      currentBalanceUSD: w.currentBalanceUSD,
      lifetimeFees: w.lifetimeFees,
    })),
  };
}

/**
 * Gets Bags Coin analytics from Bags API
 */
export async function getBagsCoinAnalytics(
  tokenMint: string
): Promise<{
  lifetimeFees: number;
  totalVolume?: number;
  totalTrades?: number;
  walletDistributions: Record<string, number>;
}> {
  // Get Bags Coin from database
  const bagsCoin = await prisma.bagsCoin.findUnique({
    where: { tokenMint },
    include: {
      foundingWallets: true,
      feeAnalytics: true,
    },
  });

  if (!bagsCoin) {
    throw new Error(`Bags Coin not found: ${tokenMint}`);
  }

  // Get lifetime fees from Bags API
  const feesResult = await bagsApi.getTokenLifetimeFees(tokenMint);

  if (!feesResult.success || !feesResult.response) {
    throw new Error(
      feesResult.error || "Failed to get lifetime fees from Bags API"
    );
  }

  const lifetimeFees = feesResult.response.lifetimeFees;

  // Calculate per-wallet distribution
  const walletDistributions: Record<string, number> = {};
  
  for (const wallet of bagsCoin.foundingWallets) {
    walletDistributions[wallet.id] = lifetimeFees * wallet.feeSharePercentage;
  }

  // Platform fee
  walletDistributions["platform"] = lifetimeFees * bagsCoin.platformFeePercentage;

  return {
    lifetimeFees,
    totalVolume: feesResult.response.totalVolume,
    totalTrades: feesResult.response.totalTrades,
    walletDistributions,
  };
}

/**
 * Syncs fees from Bags API for a specific coin
 */
export async function syncBagsCoinFees(tokenMint: string): Promise<void> {
  const analytics = await getBagsCoinAnalytics(tokenMint);

  // Get Bags Coin
  const bagsCoin = await prisma.bagsCoin.findUnique({
    where: { tokenMint },
    include: { foundingWallets: true },
  });

  if (!bagsCoin) {
    throw new Error(`Bags Coin not found: ${tokenMint}`);
  }

  // Update fee analytics
  await prisma.bagsFeeAnalytics.upsert({
    where: { bagsCoinId: bagsCoin.id },
    create: {
      bagsCoinId: bagsCoin.id,
      lifetimeFees: analytics.lifetimeFees,
      totalVolume: analytics.totalVolume,
      totalTrades: analytics.totalTrades,
      walletDistributions: JSON.stringify(analytics.walletDistributions),
      nextUpdateAt: new Date(Date.now() + 3600000), // 1 hour from now
    },
    update: {
      lifetimeFees: analytics.lifetimeFees,
      totalVolume: analytics.totalVolume,
      totalTrades: analytics.totalTrades,
      walletDistributions: JSON.stringify(analytics.walletDistributions),
      lastUpdated: new Date(),
      nextUpdateAt: new Date(Date.now() + 3600000),
    },
  });

  // Update individual wallet fees
  for (const wallet of bagsCoin.foundingWallets) {
    const walletFees = analytics.walletDistributions[wallet.id] || 0;
    
    await prisma.bagsFoundingWallet.update({
      where: { id: wallet.id },
      data: {
        lifetimeFees: walletFees,
        lastFeeUpdate: new Date(),
      },
    });
  }

  logger.info("Synced fees for Bags Coin", {
    tokenMint,
    lifetimeFees: analytics.lifetimeFees,
  });
}
