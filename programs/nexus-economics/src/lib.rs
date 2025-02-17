use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("NEXUSECONxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod nexus_economics {
    use super::*;

    // Fee constants
    const BASE_STREAM_FEE: u64 = 100 * 10^9;  // 100 NEXUS
    const BASE_AGENT_FEE: u64 = 500 * 10^9;   // 500 NEXUS
    const BASE_STORAGE_FEE: u64 = 50 * 10^9;  // 50 NEXUS

    // Distribution constants
    const VENEXUS_SHARE: u8 = 40;  // 40%
    const AINEXUS_SHARE: u8 = 30;  // 30%
    const TREASURY_SHARE: u8 = 20; // 20%
    const BURN_SHARE: u8 = 10;     // 10%

    pub fn initialize_economics(
        ctx: Context<InitializeEconomics>,
        config: EconomicsConfig,
    ) -> Result<()> {
        let economics = &mut ctx.accounts.economics;
        economics.config = config;
        economics.total_fees_collected = 0;
        economics.total_burned = 0;
        Ok(())
    }

    pub fn process_fee(
        ctx: Context<ProcessFee>,
        amount: u64,
        fee_type: FeeType,
    ) -> Result<()> {
        let economics = &mut ctx.accounts.economics;
        
        // Calculate fee distributions
        let venexus_amount = (amount * VENEXUS_SHARE as u64) / 100;
        let ainexus_amount = (amount * AINEXUS_SHARE as u64) / 100;
        let treasury_amount = (amount * TREASURY_SHARE as u64) / 100;
        let burn_amount = (amount * BURN_SHARE as u64) / 100;

        // Transfer to veNEXUS holders
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.fee_account.to_account_info(),
                    to: ctx.accounts.venexus_treasury.to_account_info(),
                    authority: ctx.accounts.fee_authority.to_account_info(),
                },
            ),
            venexus_amount,
        )?;

        // Transfer to aiNEXUS stakers
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.fee_account.to_account_info(),
                    to: ctx.accounts.ainexus_treasury.to_account_info(),
                    authority: ctx.accounts.fee_authority.to_account_info(),
                },
            ),
            ainexus_amount,
        )?;

        // Transfer to protocol treasury
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.fee_account.to_account_info(),
                    to: ctx.accounts.protocol_treasury.to_account_info(),
                    authority: ctx.accounts.fee_authority.to_account_info(),
                },
            ),
            treasury_amount,
        )?;

        // Burn tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    from: ctx.accounts.fee_account.to_account_info(),
                    authority: ctx.accounts.fee_authority.to_account_info(),
                },
            ),
            burn_amount,
        )?;

        // Update economics state
        economics.total_fees_collected = economics.total_fees_collected.checked_add(amount)
            .ok_or(EconomicsError::Overflow)?;
        economics.total_burned = economics.total_burned.checked_add(burn_amount)
            .ok_or(EconomicsError::Overflow)?;

        Ok(())
    }

    pub fn create_lock(
        ctx: Context<CreateLock>,
        amount: u64,
        duration: i64,
    ) -> Result<()> {
        require!(
            duration >= MIN_LOCK_DURATION && duration <= MAX_LOCK_DURATION,
            EconomicsError::InvalidLockDuration
        );

        let lock = &mut ctx.accounts.lock;
        lock.owner = ctx.accounts.owner.key();
        lock.amount = amount;
        lock.start_time = Clock::get()?.unix_timestamp;
        lock.end_time = lock.start_time + duration;
        lock.locked = true;

        // Transfer tokens to lock account
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.owner_token_account.to_account_info(),
                    to: ctx.accounts.lock_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let lock = &mut ctx.accounts.lock;
        let economics = &ctx.accounts.economics;

        require!(lock.locked, EconomicsError::LockNotActive);

        // Calculate rewards
        let rewards = calculate_rewards(
            lock.amount,
            lock.start_time,
            lock.end_time,
            economics.total_fees_collected,
        )?;

        // Transfer rewards
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.rewards_treasury.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.rewards_authority.to_account_info(),
                },
            ),
            rewards,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeEconomics<'info> {
    #[account(init, payer = authority, space = 8 + size_of::<EconomicsState>())]
    pub economics: Account<'info, EconomicsState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessFee<'info> {
    #[account(mut)]
    pub economics: Account<'info, EconomicsState>,
    #[account(mut)]
    pub fee_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub venexus_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub ainexus_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub protocol_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_mint: Account<'info, token::Mint>,
    pub fee_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateLock<'info> {
    #[account(init, payer = owner, space = 8 + size_of::<LockAccount>())]
    pub lock: Account<'info, LockAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lock_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub lock: Account<'info, LockAccount>,
    pub economics: Account<'info, EconomicsState>,
    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub rewards_treasury: Account<'info, TokenAccount>,
    pub rewards_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EconomicsState {
    pub config: EconomicsConfig,
    pub total_fees_collected: u64,
    pub total_burned: u64,
}

#[account]
pub struct LockAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub locked: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EconomicsConfig {
     pub max_lock_duration: i64,
    pub reward_rate: u64,
    pub boost_factor: u64,
    pub min_stake: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum FeeType {
    Stream,
    Agent,
    Storage,
    Custom,
}

// Constants
const MIN_LOCK_DURATION: i64 = 7 * 24 * 60 * 60;   // 1 week
const MAX_LOCK_DURATION: i64 = 4 * 365 * 24 * 60 * 60; // 4 years
const SECONDS_PER_YEAR: i64 = 365 * 24 * 60 * 60;

#[error_code]
pub enum EconomicsError {
    #[msg("Math overflow")]
    Overflow,
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Lock not active")]
    LockNotActive,
    #[msg("Insufficient stake")]
    InsufficientStake,
    #[msg("Invalid fee amount")]
    InvalidFeeAmount,
}

// Helper functions for reward calculations
fn calculate_rewards(
    amount: u64,
    start_time: i64,
    end_time: i64,
    total_fees: u64,
) -> Result<u64> {
    let now = Clock::get()?.unix_timestamp;
    let duration = end_time - start_time;
    let elapsed = now - start_time;
    
    if elapsed <= 0 {
        return Ok(0);
    }

    let lock_weight = (duration as f64) / (SECONDS_PER_YEAR as f64);
    let time_factor = (elapsed as f64) / (duration as f64);
    
    let reward_base = ((amount as f64) * lock_weight * time_factor) as u64;
    let fee_share = (total_fees * reward_base) / total_fees;
    
    Ok(fee_share)
}

// Save as: tests/economics.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { NexusEconomics } from '../target/types/nexus_economics';
import { expect } from 'chai';

describe('nexus-economics', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.NexusEconomics as Program<NexusEconomics>;
    
    let economics: anchor.web3.PublicKey;
    let feeAuthority: anchor.web3.Keypair;
    let tokenMint: anchor.web3.PublicKey;

    before(async () => {
        // Setup test accounts and mint
    });

    it('Initializes economics', async () => {
        const config = {
            minLockDuration: new anchor.BN(7 * 24 * 60 * 60),
            maxLockDuration: new anchor.BN(4 * 365 * 24 * 60 * 60),
            rewardRate: new anchor.BN(10),
            boostFactor: new anchor.BN(2),
            minStake: new anchor.BN(1000 * 10^9),
        };

        await program.methods
            .initializeEconomics(config)
            .accounts({
                economics: economics,
                authority: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        const state = await program.account.economicsState.fetch(economics);
        expect(state.config.minStake.toNumber()).to.equal(config.minStake.toNumber());
    });

    it('Processes fees', async () => {
        const amount = new anchor.BN(100 * 10^9);
        const feeType = { stream: {} };

        await program.methods
            .processFee(amount, feeType)
            .accounts({
                economics: economics,
                feeAccount: feeAccount,
                venexusTreasury: venexusTreasury,
                ainexusTreasury: ainexusTreasury,
                protocolTreasury: protocolTreasury,
                tokenMint: tokenMint,
                feeAuthority: feeAuthority.publicKey,
                tokenProgram: anchor.web3.TokenProgram.programId,
            })
            .signers([feeAuthority])
            .rpc();

        const state = await program.account.economicsState.fetch(economics);
        expect(state.totalFeesCollected.toNumber()).to.equal(amount.toNumber());
    });

    it('Creates lock', async () => {
        const amount = new anchor.BN(1000 * 10^9);
        const duration = new anchor.BN(365 * 24 * 60 * 60);

        await program.methods
            .createLock(amount, duration)
            .accounts({
                lock: lock.publicKey,
                owner: provider.wallet.publicKey,
                ownerTokenAccount: ownerTokenAccount,
                lockTokenAccount: lockTokenAccount,
                tokenProgram: anchor.web3.TokenProgram.programId,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([lock])
            .rpc();

        const lockAccount = await program.account.lockAccount.fetch(lock.publicKey);
        expect(lockAccount.amount.toNumber()).to.equal(amount.toNumber());
    });
});

// Save as: scripts/deploy-economics.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { NexusEconomics } from '../target/types/nexus_economics';

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.NexusEconomics as Program<NexusEconomics>;

    console.log("Deploying Economics System...");

    const config = {
        minLockDuration: new anchor.BN(7 * 24 * 60 * 60),
        maxLockDuration: new anchor.BN(4 * 365 * 24 * 60 * 60),
        rewardRate: new anchor.BN(10),
        boostFactor: new anchor.BN(2),
        minStake: new anchor.BN(1000 * 10^9),
    };

    const economics = anchor.web3.Keypair.generate();

    try {
        const tx = await program.methods
            .initializeEconomics(config)
            .accounts({
                economics: economics.publicKey,
                authority: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([economics])
            .rpc();

        console.log("Economics system deployed at:", economics.publicKey.toString());
        console.log("Transaction signature:", tx);
    } catch (error) {
        console.error("Deployment failed:", error);
    }
}

main().then(
    () => process.exit(),
    (err) => {
        console.error(err);
        process.exit(-1);
    }
);
