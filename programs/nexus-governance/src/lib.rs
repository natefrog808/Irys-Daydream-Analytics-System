// Save as: programs/nexus-governance/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("NEXUSGOVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod nexus_governance {
    use super::*;

    // Governance configuration
    const MIN_VOTING_PERIOD: i64 = 3 * 24 * 60 * 60; // 3 days
    const MAX_VOTING_PERIOD: i64 = 7 * 24 * 60 * 60; // 7 days
    const MIN_VOTING_DELAY: i64 = 1 * 24 * 60 * 60;  // 1 day
    const MAX_VOTING_DELAY: i64 = 5 * 24 * 60 * 60;  // 5 days
    const MIN_QUORUM: u8 = 4;  // 4%
    const MAX_QUORUM: u8 = 75; // 75%

    pub fn create_governance(
        ctx: Context<CreateGovernance>,
        config: GovernanceConfig,
    ) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        
        // Validate configuration
        require!(
            config.voting_period >= MIN_VOTING_PERIOD 
            && config.voting_period <= MAX_VOTING_PERIOD,
            GovernanceError::InvalidVotingPeriod
        );

        require!(
            config.voting_delay >= MIN_VOTING_DELAY 
            && config.voting_delay <= MAX_VOTING_DELAY,
            GovernanceError::InvalidVotingDelay
        );

        require!(
            config.quorum_percentage >= MIN_QUORUM 
            && config.quorum_percentage <= MAX_QUORUM,
            GovernanceError::InvalidQuorum
        );

        governance.config = config;
        governance.proposal_count = 0;
        governance.total_locked_tokens = 0;

        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_type: ProposalType,
        title: String,
        description: String,
        link: String,
    ) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        // Check minimum tokens required based on proposal type
        let required_tokens = match proposal_type {
            ProposalType::Core => 100_000,
            ProposalType::Technical => 50_000,
            ProposalType::Operational => 10_000,
        };

        let proposer_tokens = ctx.accounts.proposer_token_account.amount;
        require!(
            proposer_tokens >= required_tokens,
            GovernanceError::InsufficientTokens
        );

        proposal.proposal_id = governance.proposal_count;
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.proposal_type = proposal_type;
        proposal.title = title;
        proposal.description = description;
        proposal.link = link;
        proposal.created_at = clock.unix_timestamp;
        proposal.voting_starts_at = clock.unix_timestamp + governance.config.voting_delay;
        proposal.voting_ends_at = clock.unix_timestamp + governance.config.voting_delay + governance.config.voting_period;
        proposal.executed = false;
        proposal.cancelled = false;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;
        proposal.veto_votes = 0;
        proposal.abstain_votes = 0;
        proposal.quorum = governance.config.quorum_percentage;

        governance.proposal_count += 1;

        Ok(())
    }

    pub fn cast_vote(
        ctx: Context<CastVote>,
        vote: Vote,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let voter_weight = ctx.accounts.voter_token_account.amount;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= proposal.voting_starts_at,
            GovernanceError::VotingNotStarted
        );

        require!(
            clock.unix_timestamp <= proposal.voting_ends_at,
            GovernanceError::VotingEnded
        );

        // Record vote
        match vote {
            Vote::Yes => proposal.yes_votes += voter_weight,
            Vote::No => proposal.no_votes += voter_weight,
            Vote::Veto => proposal.veto_votes += voter_weight,
            Vote::Abstain => proposal.abstain_votes += voter_weight,
        }

        // Record that this voter has voted
        let vote_record = &mut ctx.accounts.vote_record;
        vote_record.proposal = proposal.key();
        vote_record.voter = ctx.accounts.voter.key();
        vote_record.vote = vote;
        vote_record.weight = voter_weight;

        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp > proposal.voting_ends_at,
            GovernanceError::VotingNotEnded
        );

        require!(!proposal.executed, GovernanceError::AlreadyExecuted);
        require!(!proposal.cancelled, GovernanceError::ProposalCancelled);

        // Check quorum and vote outcome
        let total_votes = proposal.yes_votes + proposal.no_votes + proposal.veto_votes + proposal.abstain_votes;
        let quorum_threshold = (ctx.accounts.governance.total_locked_tokens * proposal.quorum as u64) / 100;

        require!(
            total_votes >= quorum_threshold,
            GovernanceError::QuorumNotReached
        );

        // Check if proposal passed based on type
        let passed = match proposal.proposal_type {
            ProposalType::Core => {
                proposal.yes_votes as f64 / total_votes as f64 >= 0.75 // 75% required
            }
            ProposalType::Technical => {
                proposal.yes_votes as f64 / total_votes as f64 >= 0.66 // 66% required
            }
            ProposalType::Operational => {
                proposal.yes_votes > proposal.no_votes // Simple majority
            }
        };

        require!(passed, GovernanceError::ProposalNotPassed);
        require!(proposal.veto_votes == 0, GovernanceError::ProposalVetoed);

        proposal.executed = true;

        Ok(())
    }

    pub fn emergency_action(ctx: Context<EmergencyAction>) -> Result<()> {
        // Implement emergency action logic
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateGovernance<'info> {
    #[account(init, payer = authority, space = 8 + size_of::<GovernanceState>())]
    pub governance: Account<'info, GovernanceState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub governance: Account<'info, GovernanceState>,
    #[account(init, payer = proposer, space = 8 + size_of::<Proposal>())]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub proposer_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    pub governance: Account<'info, GovernanceState>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init,
        payer = voter,
        space = 8 + size_of::<VoteRecord>(),
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub voter_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    pub governance: Account<'info, GovernanceState>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyAction<'info> {
    #[account(mut)]
    pub governance: Account<'info, GovernanceState>,
    pub emergency_council_member: Signer<'info>,
}

#[account]
pub struct GovernanceState {
    pub config: GovernanceConfig,
    pub proposal_count: u64,
    pub total_locked_tokens: u64,
    pub emergency_council: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GovernanceConfig
