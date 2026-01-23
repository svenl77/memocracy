# On-Chain Voting Implementation

## Overview

This implementation adds on-chain voting for Memocracy coin votes using a Solana Program (Anchor). Votes are stored on the blockchain for transparency and verifiability, while the database serves as a fast cache for UI performance.

## Architecture

### Hybrid Approach
- **On-Chain Storage**: All votes are stored in a Solana Program
- **Off-Chain Cache**: Database for fast queries (<10ms)
- **Sync Service**: Regular synchronization between blockchain and database

### Data Flow
```
User Votes → Solana Transaction → On-Chain Program → Database Sync → UI Update
```

## Components

### 1. Solana Program (`programs/memocracy-votes/`)
- **VoteAccount**: Stores individual votes (voter, coin_mint, vote_type, timestamp)
- **CoinVoteStats**: Aggregated stats per coin (upvotes, downvotes, net_score)
- Functions: `vote()`, `initialize_stats()`

### 2. TypeScript Client (`src/lib/solanaVoteProgram.ts`)
- `submitVoteOnChain()`: Submit vote transaction
- `getVoteStatsFromChain()`: Read aggregated stats
- `getUserVoteFromChain()`: Read user's vote
- `checkProgramDeployed()`: Verify program availability

### 3. Sync Service (`src/lib/voteSync.ts`)
- `syncVotesFromChain()`: Sync votes for a specific coin
- `syncAllCoins()`: Batch sync for all coins
- `syncVoteStatsFromChain()`: Verify stats match

### 4. API Routes
- **GET `/api/coin-vote/[ca]`**: Get vote stats (with optional on-chain verification)
- **POST `/api/coin-vote/[ca]`**: Submit vote (handles on-chain + database cache)
- **GET `/api/cron/sync-votes`**: Cron job for regular synchronization

### 5. Frontend (`src/components/coinVote/CoinVoteButtons.tsx`)
- Transaction status indicators
- Retry logic for failed requests
- Graceful error handling

## Database Schema Updates

Added to `CoinVote` model:
- `transactionSignature`: Solana transaction signature
- `onChainSynced`: Boolean flag
- `syncedAt`: Timestamp of last sync

## Deployment

### Prerequisites
1. Install Anchor CLI: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest`
2. Install Solana CLI
3. Setup Solana wallet

### Steps

1. **Build Program**
   ```bash
   cd programs/memocracy-votes
   anchor build
   ```

2. **Deploy to Devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

3. **Update Program ID**
   - Update `declare_id!` in `programs/memocracy-votes/src/lib.rs`
   - Update `SOLANA_VOTE_PROGRAM_ID` in `.env`

4. **Deploy to Mainnet**
   ```bash
   anchor deploy --provider.cluster mainnet
   ```

5. **Environment Variables**
   ```env
   SOLANA_VOTE_PROGRAM_ID=your_program_id_here
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

## Error Handling

- **Retry Logic**: Automatic retry with exponential backoff for network errors
- **Graceful Degradation**: Falls back to database if on-chain is unavailable
- **Timeout Protection**: 30s timeout for transactions
- **User-Friendly Messages**: Clear error messages for different failure types

## Sync Strategy

- **Cron Job**: Runs every 5 minutes (configurable)
- **Batch Processing**: Processes up to 50 coins per run
- **Rate Limiting**: 100ms delay between coins to avoid RPC limits

## Testing

### Manual Testing
1. Test vote submission with wallet connected
2. Verify transaction appears on-chain
3. Check database sync
4. Test error scenarios (network failure, program not deployed)

### Integration Testing
- Test full vote flow: Frontend → API → On-Chain → Database
- Test sync service
- Test error handling and retries

## Performance

- **Database Cache**: <10ms query time
- **On-Chain Read**: ~100-500ms (RPC dependent)
- **On-Chain Write**: ~1-2 seconds (transaction confirmation)
- **Transaction Cost**: ~0.000005 SOL per vote (~$0.0001)

## Current Status

✅ Solana Program structure created
✅ TypeScript client implemented
✅ Database schema updated
✅ API routes updated
✅ Frontend integration
✅ Sync service implemented
✅ Error handling with retry logic
✅ Cron job for synchronization

⚠️ **Note**: The Anchor program needs to be built and deployed before on-chain voting is fully functional. Until then, the system uses database-only voting with graceful fallback.

## Next Steps

1. Build and deploy Anchor program
2. Update Program ID in environment variables
3. Test on Devnet
4. Deploy to Mainnet
5. Monitor sync service
6. Optional: Migrate existing votes to on-chain
