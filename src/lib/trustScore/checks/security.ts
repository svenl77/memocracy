import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { CheckResult, SecurityDetails } from '../types';
import { env } from '@/lib/env';

const connection = new Connection(
  env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
);

export async function calculateSecurityScore(
  tokenAddress: string
): Promise<CheckResult & { details: SecurityDetails; mintDisabled: boolean; freezeDisabled: boolean }> {
  
  try {
    const mintPubkey = new PublicKey(tokenAddress);
    const mintInfo = await getMint(connection, mintPubkey);

    let score = 0;
    const mintDisabled = mintInfo.mintAuthority === null;
    const freezeDisabled = mintInfo.freezeAuthority === null;

    // Mint Authority Check (15 points)
    if (mintDisabled) {
      score += 15;
    }

    // Freeze Authority Check (10 points)
    if (freezeDisabled) {
      score += 10;
    }

    let rating = '';
    let explanation = '';

    if (score === 25) {
      rating = 'Excellent';
      explanation = 'Both mint and freeze authorities are disabled. Token is secure.';
    } else if (score >= 15) {
      rating = 'Good';
      explanation = 'Mint authority disabled, but freeze authority still active.';
    } else if (score >= 10) {
      rating = 'Moderate';
      explanation = 'Freeze authority disabled, but mint authority still active.';
    } else {
      rating = 'Poor';
      explanation = 'Both authorities are active. High risk of manipulation.';
    }

    const totalSupply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);

    return {
      score,
      mintDisabled,
      freezeDisabled,
      details: {
        mintDisabled,
        freezeDisabled,
        totalSupply: totalSupply.toLocaleString(),
        decimals: mintInfo.decimals,
        rating,
        explanation,
      },
    };
  } catch (error) {
    console.error('Security check failed:', error);
    return {
      score: 0,
      mintDisabled: false,
      freezeDisabled: false,
      details: {
        mintDisabled: false,
        freezeDisabled: false,
        totalSupply: null,
        decimals: null,
        rating: 'Unknown',
        explanation: 'Failed to fetch security information from blockchain.',
      },
    };
  }
}
