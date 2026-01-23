import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { env } from "./env";
import { logger } from "./logger";

// Program ID - will be set after deployment
// For now, use placeholder that matches Anchor.toml
const PROGRAM_ID = new PublicKey("MEMOCRACYVOTESP11111111111111111111111111");

// Memo Program ID (for reference)
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// Account sizes (from Rust program)
const VOTE_ACCOUNT_SIZE = 8 + 32 + 32 + 1 + 8; // 73 bytes + 8 discriminator
const STATS_ACCOUNT_SIZE = 8 + 32 + 8 + 8 + 8 + 8; // 64 bytes + 8 discriminator

export interface VoteStats {
  upvotes: number;
  downvotes: number;
  netScore: number;
  lastUpdated: number;
}

export interface UserVote {
  voteType: "UP" | "DOWN" | null;
  timestamp: number | null;
}

/**
 * Get Program ID from environment or use default
 */
export function getProgramId(): PublicKey {
  const envProgramId = process.env.SOLANA_VOTE_PROGRAM_ID;
  if (envProgramId) {
    try {
      return new PublicKey(envProgramId);
    } catch (error) {
      logger.warn("Invalid SOLANA_VOTE_PROGRAM_ID, using default", { envProgramId });
    }
  }
  return PROGRAM_ID;
}

/**
 * Get Connection from environment
 */
function getConnection(): Connection {
  const rpcUrl = env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Find Program Derived Address (PDA) for VoteAccount
 */
export async function findVoteAccountPDA(
  coinMint: PublicKey,
  voter: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("vote"),
      coinMint.toBuffer(),
      voter.toBuffer(),
    ],
    getProgramId()
  );
}

/**
 * Find Program Derived Address (PDA) for CoinVoteStats
 */
export async function findStatsAccountPDA(
  coinMint: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("stats"),
      coinMint.toBuffer(),
    ],
    getProgramId()
  );
}

/**
 * Submit a vote on-chain
 * @param coinMint - The coin mint address
 * @param voter - The voter's wallet public key
 * @param voteType - "UP" (1) or "DOWN" (0)
 * @param signer - Keypair or signer function to sign the transaction
 * @returns Transaction signature
 */
export async function submitVoteOnChain(
  coinMint: string,
  voter: string,
  voteType: "UP" | "DOWN",
  signer: Keypair | ((tx: Transaction) => Promise<Transaction>)
): Promise<string> {
  try {
    const connection = getConnection();
    const programId = getProgramId();
    const coinMintPubkey = new PublicKey(coinMint);
    const voterPubkey = new PublicKey(voter);
    
    const voteTypeU8 = voteType === "UP" ? 1 : 0;
    
    // Find PDAs
    const [voteAccountPDA, voteBump] = await findVoteAccountPDA(coinMintPubkey, voterPubkey);
    const [statsAccountPDA, statsBump] = await findStatsAccountPDA(coinMintPubkey);
    
    // Create transaction
    const transaction = new Transaction();
    
    // For now, we'll use a simplified approach without Anchor
    // In production, you would use @coral-xyz/anchor to generate the instruction
    
    // This is a placeholder - actual implementation would use Anchor-generated IDL
    // For now, return a mock signature that indicates the structure is ready
    // The actual transaction building will be done when Anchor is properly set up
    
    logger.info("Vote transaction prepared", {
      coinMint,
      voter,
      voteType,
      voteAccountPDA: voteAccountPDA.toString(),
      statsAccountPDA: statsAccountPDA.toString(),
    });
    
    // TODO: Build actual instruction using Anchor IDL
    // For now, this is a placeholder that shows the structure
    
    throw new Error(
      "Anchor IDL not yet generated. Please build the Anchor program first: " +
      "cd programs/memocracy-votes && anchor build"
    );
  } catch (error) {
    logger.error("Failed to submit vote on-chain", {
      coinMint,
      voter,
      voteType,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get vote stats from chain
 * @param coinMint - The coin mint address
 * @returns Vote stats or null if not found
 */
export async function getVoteStatsFromChain(
  coinMint: string
): Promise<VoteStats | null> {
  try {
    const connection = getConnection();
    const coinMintPubkey = new PublicKey(coinMint);
    const [statsAccountPDA] = await findStatsAccountPDA(coinMintPubkey);
    
    // Try to fetch the account
    const accountInfo = await connection.getAccountInfo(statsAccountPDA);
    
    if (!accountInfo || !accountInfo.data) {
      return null;
    }
    
    // Parse account data
    // Account structure: discriminator (8) + coin_mint (32) + upvotes (8) + downvotes (8) + net_score (8) + last_updated (8)
    const data = accountInfo.data;
    
    if (data.length < STATS_ACCOUNT_SIZE) {
      return null;
    }
    
    // Skip discriminator (first 8 bytes)
    let offset = 8;
    
    // Skip coin_mint (32 bytes)
    offset += 32;
    
    // Read upvotes (u64, 8 bytes, little-endian)
    const upvotes = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // Read downvotes (u64, 8 bytes, little-endian)
    const downvotes = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // Read net_score (i64, 8 bytes, little-endian)
    const netScore = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    // Read last_updated (i64, 8 bytes, little-endian)
    const lastUpdated = Number(data.readBigInt64LE(offset));
    
    return {
      upvotes,
      downvotes,
      netScore,
      lastUpdated,
    };
  } catch (error) {
    logger.error("Failed to get vote stats from chain", {
      coinMint,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get user's vote from chain
 * @param coinMint - The coin mint address
 * @param voter - The voter's wallet address
 * @returns User vote or null if not found
 */
export async function getUserVoteFromChain(
  coinMint: string,
  voter: string
): Promise<UserVote> {
  try {
    const connection = getConnection();
    const coinMintPubkey = new PublicKey(coinMint);
    const voterPubkey = new PublicKey(voter);
    
    const [voteAccountPDA] = await findVoteAccountPDA(coinMintPubkey, voterPubkey);
    
    // Try to fetch the account
    const accountInfo = await connection.getAccountInfo(voteAccountPDA);
    
    if (!accountInfo || !accountInfo.data) {
      return { voteType: null, timestamp: null };
    }
    
    // Parse account data
    // Account structure: discriminator (8) + voter (32) + coin_mint (32) + vote_type (1) + timestamp (8)
    const data = accountInfo.data;
    
    if (data.length < VOTE_ACCOUNT_SIZE) {
      return { voteType: null, timestamp: null };
    }
    
    // Skip discriminator (first 8 bytes)
    let offset = 8;
    
    // Skip voter (32 bytes)
    offset += 32;
    
    // Skip coin_mint (32 bytes)
    offset += 32;
    
    // Read vote_type (u8, 1 byte)
    const voteTypeU8 = data[offset];
    offset += 1;
    
    // Read timestamp (i64, 8 bytes, little-endian)
    const timestamp = Number(data.readBigInt64LE(offset));
    
    const voteType = voteTypeU8 === 1 ? "UP" : voteTypeU8 === 0 ? "DOWN" : null;
    
    return {
      voteType,
      timestamp,
    };
  } catch (error) {
    logger.error("Failed to get user vote from chain", {
      coinMint,
      voter,
      error: error instanceof Error ? error.message : String(error),
    });
    return { voteType: null, timestamp: null };
  }
}

/**
 * Check if program is deployed and accessible
 */
export async function checkProgramDeployed(): Promise<boolean> {
  try {
    const connection = getConnection();
    const programId = getProgramId();
    const programInfo = await connection.getAccountInfo(programId);
    return programInfo !== null;
  } catch (error) {
    return false;
  }
}
