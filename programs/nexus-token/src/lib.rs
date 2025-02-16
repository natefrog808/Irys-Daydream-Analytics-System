// Save as: programs/nexus-token/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("NEXUSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod nexus_token {
    use super::*;

    // Token config
    const INITIAL_SUPPLY: u64 = 100_000_000 * 1_000_000_000; // 100M tokens with 9 decimals
    const COMMUNITY_POOL: u64 = 40_000_000 * 1_000_000_000;  // 40%
    const TREASURY_POOL: u64 = 20_000_000 * 1_000_000_000;   // 20%
    const TEAM_POOL: u64 = 15_000_000 * 1_000_000_000;       // 15%
    const BACKERS_POOL: u64 = 15_000_000 * 1_000_000_000;    // 15%
    const DAO_RESERVE: u64 = 10_000_000 * 1_000_000_000;     // 10%

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let token_mint = &mut ctx.accounts.token_mint;
        let token_authority = &mut ctx.accounts.token_authority;
        
        // Create mint and set authority
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: token_mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            9, // 9 decimals
            token_authority.key,
            Some(token_authority.key),
        )?;

        Ok(())
    }

    pub fn create_vesting_schedule(
        ctx: Context<CreateVestingSchedule>,
        amount: u64,
        start_ts: i64,
        duration: i64,
        cliff: i64,
    ) -> Result<()> {
        require!(amount > 0, NexusError::InvalidAmount);
        require!(duration > 0, NexusError::InvalidDuration);
        require!(cliff <= duration, NexusError::InvalidCliff);

        let vesting_account = &mut ctx.accounts.vesting_account;
        vesting_account.beneficiary = ctx.accounts.beneficiary.key();
        vesting_account.total_amount = amount;
        vesting_account.released_amount = 0;
        vesting_account.start_timestamp = start_ts;
        vesting_account.duration = duration;
        vesting_account.cliff = cliff;

        // Transfer tokens to vesting account
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.vesting_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn release_vested_tokens(ctx: Context<ReleaseVestedTokens>) -> Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        let clock = Clock::get()?;
        
        let releasable = calculate_releasable_amount(
            vesting_account.total_amount,
            vesting_account.released_amount,
            vesting_account.start_timestamp,
            vesting_account.duration,
            vesting_account.cliff,
            clock.unix_timestamp,
        )?;

        require!(releasable > 0, NexusError::NoTokensToRelease);

        // Transfer tokens to beneficiary
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vesting_account.to_account_info(),
                    to: ctx.accounts.beneficiary_token.to_account_info(),
                    authority: ctx.accounts.vesting_account.to_account_info(),
                },
                &[&[
                    b"vesting",
                    ctx.accounts.beneficiary.key().as_ref(),
                    &[ctx.bumps.vesting_account],
                ]],
            ),
            releasable,
        )?;

        vesting_account.released_amount += releasable;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    pub token_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateVestingSchedule<'info> {
    #[account(
        init,
        payer = authority,
        space = VestingAccount::LEN,
        seeds = [b"vesting", beneficiary.key().as_ref()],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    pub beneficiary: AccountInfo<'info>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ReleaseVestedTokens<'info> {
    #[account(
        mut,
        seeds = [b"vesting", beneficiary.key().as_ref()],
        bump,
        has_one = beneficiary
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    pub beneficiary: Signer<'info>,
    #[account(mut)]
    pub beneficiary_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct VestingAccount {
    pub beneficiary: Pubkey,
    pub total_amount: u64,
    pub released_amount: u64,
    pub start_timestamp: i64,
    pub duration: i64,
    pub cliff: i64,
}

impl VestingAccount {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8;
}

#[error_code]
pub enum NexusError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Duration must be greater than 0")]
    InvalidDuration,
    #[msg("Cliff must be less than or equal to duration")]
    InvalidCliff,
    #[msg("No tokens available for release")]
    NoTokensToRelease,
}

// Save as: programs/nexus-dao/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("NEXUSDAOxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod nexus_dao {
    use super::*;

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        voting_delay: i64,
        voting_period: i64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title;
        proposal.description = description;
        proposal.created_at = clock.unix_timestamp;
        proposal.voting_starts_at = clock.unix_timestamp + voting_delay;
        proposal.voting_ends_at = clock.unix_timestamp + voting_delay + voting_period;
        proposal.executed = false;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;

        Ok(())
    }

    pub fn cast_vote(
        ctx: Context<CastVote>,
        support: bool,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vote_account = &mut ctx.accounts.vote_account;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= proposal.voting_starts_at,
            NexusError::VotingNotStarted
        );
        require!(
            clock.unix_timestamp <= proposal.voting_ends_at,
            NexusError::VotingEnded
        );

        let voting_power = ctx.accounts.voter_token_account.amount;
        
        if support {
            proposal.yes_votes = proposal.yes_votes.checked_add(voting_power)
                .ok_or(NexusError::VoteOverflow)?;
        } else {
            proposal.no_votes = proposal.no_votes.checked_add(voting_power)
                .ok_or(NexusError::VoteOverflow)?;
        }

        vote_account.voter = ctx.accounts.voter.key();
        vote_account.proposal = proposal.key();
        vote_account.support = support;
        vote_account.voting_power = voting_power;

        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp > proposal.voting_ends_at,
            NexusError::VotingNotEnded
        );
        require!(!proposal.executed, NexusError::ProposalAlreadyExecuted);

        let total_votes = proposal.yes_votes + proposal.no_votes;
        let quorum = 1_000_000; // Example: 1M tokens needed for quorum

        require!(total_votes >= quorum, NexusError::QuorumNotReached);
        require!(
            proposal.yes_votes > proposal.no_votes,
            NexusError::ProposalNotPassed
        );

        proposal.executed = true;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = proposer,
        space = Proposal::LEN
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init,
        payer = voter,
        space = Vote::LEN,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_account: Account<'info, Vote>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub voter_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
}

#[account]
pub struct Proposal {
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub created_at: i64,
    pub voting_starts_at: i64,
    pub voting_ends_at: i64,
    pub executed: bool,
    pub yes_votes: u64,
    pub no_votes: u64,
}

#[account]
pub struct Vote {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub support: bool,
    pub voting_power: u64,
}

impl Proposal {
    pub const LEN: usize = 8 + 32 + 100 + 1000 + 8 + 8 + 8 + 1 + 8 + 8;
}

impl Vote {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8;
}

#[error_code]
pub enum NexusError {
    #[msg("Voting has not started yet")]
    VotingNotStarted,
    #[msg("Voting has ended")]
    VotingEnded,
    #[msg("Voting has not ended yet")]
    VotingNotEnded,
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    #[msg("Quorum not reached")]
    QuorumNotReached,
    #[msg("Proposal did not pass")]
    ProposalNotPassed,
    #[msg("Vote calculation overflow")]
    VoteOverflow,
}
