/**
 * Bags Fee Share Information
 * Retrieves and formats fee share information for any Bags token
 */

import { bagsApi } from "./bagsApi";
import { prisma } from "./db";
import { logger } from "./logger";

export interface BagsFeeShareInfo {
  isBagsToken: boolean; // Changed from isBagsCoin for consistency
  createdByMemocracy: boolean;
  tokenMint: string; // Added for reference
  lifetimeFees: number; // Changed from totalLifetimeFees for consistency
  totalVolume?: number;
  totalTrades?: number;
  holderShare: {
    percentage: number;
    lifetimeEarnings: number;
  };
  feeShares: Array<{
    walletAddress: string;
    label?: string; // Only if createdByMemocracy
    description?: string; // Only if createdByMemocracy
    percentage: number; // 0.0 - 1.0
    lifetimeEarnings: number;
  }>;
  platformFee?: {
    percentage: number;
    lifetimeEarnings: number;
  }; // Only if createdByMemocracy
  creators?: Array<{
    wallet: string;
    share: number;
    label?: string; // "created by" or "royalties to"
  }>;
}

/**
 * Gets fee share information for a Bags token
 * Works for both Memocracy-created and existing Bags tokens
 */
export async function getBagsFeeShareInfo(
  tokenMint: string
): Promise<BagsFeeShareInfo | null> {
  try {
    logger.info("Getting Bags fee share info", { tokenMint });
    
    // Check if this is a Memocracy-created Bags coin
    // Note: This might throw if database connection fails, but we catch it below
    let bagsCoin;
    try {
      bagsCoin = await prisma.bagsCoin.findUnique({
        where: { tokenMint },
        include: {
          foundingWallets: true,
        },
      });
    } catch (dbError) {
      logger.error("Database error when looking up Bags coin", {
        tokenMint,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      // Continue anyway - might be an existing Bags token not created by Memocracy
      bagsCoin = null;
    }

    const createdByMemocracy = !!bagsCoin;
    logger.info("Bags coin lookup", { tokenMint, createdByMemocracy });

    // Try to get lifetime fees from Bags API to verify it's a Bags token
    const feesResult = await bagsApi.getTokenLifetimeFees(tokenMint);

    logger.info("Bags API lifetime fees result", {
      tokenMint,
      success: feesResult.success,
      response: feesResult.response,
      responseType: typeof feesResult.response,
      error: feesResult.error,
    });

    if (!feesResult.success) {
      // Not a Bags token or API error
      logger.warn("Token is not a Bags token or API error", {
        tokenMint,
        error: feesResult.error,
        success: feesResult.success,
      });
      return null;
    }

    // Response is a string (lamports), convert to number
    // The API returns: { success: true, response: "51965716479" } (string of lamports)
    // Empty string means no fees yet, which is valid
    const lifetimeFeesLamports = typeof feesResult.response === 'string' 
      ? (feesResult.response === '' ? 0 : parseFloat(feesResult.response))
      : (typeof feesResult.response === 'object' && feesResult.response !== null && 'lifetimeFees' in feesResult.response)
      ? (feesResult.response as any).lifetimeFees || 0
      : 0;
    
    // If we got 0 and response was not an empty string, it might be an error
    if (lifetimeFeesLamports === 0 && feesResult.response !== '' && feesResult.response !== '0') {
      logger.warn("Could not parse lifetime fees from response", {
        tokenMint,
        response: feesResult.response,
        responseType: typeof feesResult.response,
      });
    }
    
    // Convert lamports to SOL (1 SOL = 1e9 lamports)
    // Note: We'll need SOL price to convert to USD, for now we use SOL
    const lifetimeFees = lifetimeFeesLamports / 1e9; // Convert to SOL
    const totalVolume = (feesResult.response as any)?.totalVolume;
    const totalTrades = (feesResult.response as any)?.totalTrades;

    // Get creators information
    let creatorsResult;
    try {
      creatorsResult = await bagsApi.getTokenCreators(tokenMint);
    } catch (error) {
      logger.error("Error calling getTokenCreators", {
        tokenMint,
        error: error instanceof Error ? error.message : String(error),
      });
      creatorsResult = { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    
    logger.info("Bags API creators result", {
      tokenMint,
      success: creatorsResult.success,
      responseLength: creatorsResult.response ? (Array.isArray(creatorsResult.response) ? creatorsResult.response.length : 'not array') : 'null',
      error: creatorsResult.error,
    });
    
    let creators: Array<{ wallet: string; share: number; label?: string }> | undefined;

    if (creatorsResult.success && creatorsResult.response && Array.isArray(creatorsResult.response)) {
      creators = creatorsResult.response.map((c: any) => {
        // royaltyBps is in basis points (10000 = 100%), convert to decimal (0.0 - 1.0)
        const share = c.royaltyBps ? c.royaltyBps / 10000 : 0;
        return {
          wallet: c.wallet,
          share: share,
          // Label: isCreator = "created by", royaltyBps > 0 = "royalties to"
          label: c.isCreator ? "created by" : (share > 0 ? "royalties to" : "created by"),
        };
      });
    } else {
      logger.warn("Creators result not successful or not an array", {
        tokenMint,
        success: creatorsResult.success,
        hasResponse: !!creatorsResult.response,
        isArray: Array.isArray(creatorsResult.response),
        error: creatorsResult.error,
      });
    }

    // Extract fee shares from creators (royaltyBps represents the fee share percentage)
    // For existing Bags tokens, fee shares come from creators with royaltyBps > 0
    // For Memocracy-created tokens, we use our database
    let feeShares: Array<{
      walletAddress: string;
      label?: string;
      description?: string;
      percentage: number;
      lifetimeEarnings: number;
    }> = [];

    let holderSharePercentage = 1.0; // Default: 100% to holders if no fee shares

    if (createdByMemocracy && bagsCoin) {
      // For Memocracy-created coins, use our database
      feeShares = bagsCoin.foundingWallets.map((w: any) => ({
        walletAddress: w.walletAddress,
        label: w.label,
        description: w.description || undefined,
        percentage: w.feeSharePercentage,
        lifetimeEarnings: lifetimeFees * w.feeSharePercentage,
      }));

      // Add platform fee
      const platformFeePercentage = bagsCoin.platformFeePercentage;
      const totalUserFeeShare = feeShares.reduce(
        (sum, fs) => sum + fs.percentage,
        0
      );
      holderSharePercentage = Math.max(
        0,
        1.0 - totalUserFeeShare - platformFeePercentage
      );
    } else if (creators && creators.length > 0) {
      // For existing Bags tokens, extract fee shares from creators with royaltyBps > 0
      feeShares = creators
        .filter((c) => c.share > 0) // Only include creators with royalty share > 0
        .map((c) => ({
          walletAddress: c.wallet,
          label: c.label,
          percentage: c.share,
          lifetimeEarnings: lifetimeFees * c.share,
        }));

      // Calculate holder share (what's left after all fee shares)
      const totalFeeSharePercentage = feeShares.reduce(
        (sum, fs) => sum + fs.percentage,
        0
      );
      holderSharePercentage = Math.max(0, 1.0 - totalFeeSharePercentage);
    }

    const holderShareEarnings = lifetimeFees * holderSharePercentage;

    const result: BagsFeeShareInfo = {
      isBagsToken: true,
      createdByMemocracy,
      tokenMint,
      lifetimeFees,
      totalVolume,
      totalTrades,
      holderShare: {
        percentage: holderSharePercentage,
        lifetimeEarnings: holderShareEarnings,
      },
      feeShares,
      creators,
    };

    // Add platform fee if Memocracy-created
    if (createdByMemocracy && bagsCoin) {
      result.platformFee = {
        percentage: bagsCoin.platformFeePercentage,
        lifetimeEarnings: lifetimeFees * bagsCoin.platformFeePercentage,
      };
    }

    logger.info("Bags fee share info result", {
      tokenMint,
      isBagsToken: result.isBagsToken,
      createdByMemocracy: result.createdByMemocracy,
      lifetimeFees: result.lifetimeFees,
      feeSharesCount: result.feeShares.length,
      creatorsCount: result.creators?.length || 0,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get Bags fee share info", {
      tokenMint,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}
