use anchor_lang::prelude::*;

declare_id!("MEMOCRACYVOTESP11111111111111111111111111"); // Placeholder - will be replaced after deployment

#[program]
pub mod memocracy_votes {
    use super::*;

    /// Vote for a coin (UP or DOWN)
    pub fn vote(ctx: Context<Vote>, coin_mint: Pubkey, vote_type: u8) -> Result<()> {
        let vote_account = &mut ctx.accounts.vote_account;
        let stats_account = &mut ctx.accounts.stats_account;
        
        // Validate vote_type (0 = DOWN, 1 = UP)
        require!(vote_type <= 1, ErrorCode::InvalidVoteType);
        
        // Get previous vote if exists
        let previous_vote = vote_account.vote_type;
        
        // Update vote account
        vote_account.voter = ctx.accounts.voter.key();
        vote_account.coin_mint = coin_mint;
        vote_account.vote_type = vote_type;
        vote_account.timestamp = Clock::get()?.unix_timestamp;
        
        // Update stats
        match previous_vote {
            0 => {
                // Was DOWN, now might be UP or still DOWN
                if vote_type == 1 {
                    stats_account.downvotes = stats_account.downvotes.saturating_sub(1);
                    stats_account.upvotes = stats_account.upvotes.saturating_add(1);
                }
                // If still DOWN, no change needed
            }
            1 => {
                // Was UP, now might be DOWN or still UP
                if vote_type == 0 {
                    stats_account.upvotes = stats_account.upvotes.saturating_sub(1);
                    stats_account.downvotes = stats_account.downvotes.saturating_add(1);
                }
                // If still UP, no change needed
            }
            _ => {
                // New vote
                if vote_type == 1 {
                    stats_account.upvotes = stats_account.upvotes.saturating_add(1);
                } else {
                    stats_account.downvotes = stats_account.downvotes.saturating_add(1);
                }
            }
        }
        
        stats_account.net_score = (stats_account.upvotes as i64) - (stats_account.downvotes as i64);
        stats_account.last_updated = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    /// Initialize stats account for a coin
    pub fn initialize_stats(ctx: Context<InitializeStats>, coin_mint: Pubkey) -> Result<()> {
        let stats = &mut ctx.accounts.stats_account;
        stats.coin_mint = coin_mint;
        stats.upvotes = 0;
        stats.downvotes = 0;
        stats.net_score = 0;
        stats.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(coin_mint: Pubkey)]
pub struct Vote<'info> {
    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + VoteAccount::LEN,
        seeds = [b"vote", coin_mint.as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_account: Account<'info, VoteAccount>,
    
    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + CoinVoteStats::LEN,
        seeds = [b"stats", coin_mint.as_ref()],
        bump
    )]
    pub stats_account: Account<'info, CoinVoteStats>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(coin_mint: Pubkey)]
pub struct InitializeStats<'info> {
    #[account(
        init,
        payer = initializer,
        space = 8 + CoinVoteStats::LEN,
        seeds = [b"stats", coin_mint.as_ref()],
        bump
    )]
    pub stats_account: Account<'info, CoinVoteStats>,
    
    #[account(mut)]
    pub initializer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct VoteAccount {
    pub voter: Pubkey,        // 32 bytes
    pub coin_mint: Pubkey,    // 32 bytes
    pub vote_type: u8,        // 1 byte (0 = DOWN, 1 = UP)
    pub timestamp: i64,      // 8 bytes
}

impl VoteAccount {
    pub const LEN: usize = 32 + 32 + 1 + 8; // 73 bytes
}

#[account]
pub struct CoinVoteStats {
    pub coin_mint: Pubkey,    // 32 bytes
    pub upvotes: u64,         // 8 bytes
    pub downvotes: u64,       // 8 bytes
    pub net_score: i64,       // 8 bytes
    pub last_updated: i64,   // 8 bytes
}

impl CoinVoteStats {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8; // 64 bytes
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid vote type. Must be 0 (DOWN) or 1 (UP)")]
    InvalidVoteType,
}
