# Memocracy Votes Solana Program

On-Chain Voting Program für Memocracy Coin Votes.

## Deployment Instructions

### Prerequisites
1. Install Anchor CLI: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest`
2. Install Solana CLI: `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`
3. Setup Solana Wallet: `solana-keygen new` (or use existing)

### Build
```bash
anchor build
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet
```bash
anchor deploy --provider.cluster mainnet
```

### Update Program ID
After deployment, update the `declare_id!` in `src/lib.rs` with the actual Program ID.

## Program Structure

- `VoteAccount`: Stores individual votes (voter, coin_mint, vote_type, timestamp)
- `CoinVoteStats`: Aggregated stats per coin (upvotes, downvotes, net_score)

## Functions

- `vote(coin_mint, vote_type)`: Submit or update a vote (0 = DOWN, 1 = UP)
- `initialize_stats(coin_mint)`: Initialize stats account for a coin

## Account Seeds

- VoteAccount: `["vote", coin_mint, voter]`
- CoinVoteStats: `["stats", coin_mint]`
