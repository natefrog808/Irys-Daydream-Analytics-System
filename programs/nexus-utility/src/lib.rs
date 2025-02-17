// Save as: programs/nexus-utility/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("NEXUSUTILxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod nexus_utility {
    use super::*;

    // Service tiers
    const TIER1_TOKENS: u64 = 1_000;      // 1,000 NEXUS
    const TIER2_TOKENS: u64 = 10_000;     // 10,000 NEXUS
    const TIER3_TOKENS: u64 = 100_000;    // 100,000 NEXUS

    // Service fees (in NEXUS tokens)
    const BASE_STREAM_FEE: u64 = 100;     // 100 NEXUS per stream
    const BASE_AI_FEE: u64 = 500;         // 500 NEXUS for AI agent deployment
    const BASE_STORAGE_FEE: u64 = 50;     // 50 NEXUS per GB

    pub fn initialize_service(ctx: Context<InitializeService>, config: ServiceConfig) -> Result<()> {
        let service = &mut ctx.accounts.service;
        service.authority = ctx.accounts.authority.key();
        service.config = config;
        service.total_streams = 0;
        service.total_agents = 0;
        service.total_storage = 0;
        Ok(())
    }

    pub fn create_stream(ctx: Context<CreateStream>, stream_config: StreamConfig) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let user = &mut ctx.accounts.user;
        let user_tokens = ctx.accounts.user_token_account.amount;

        // Calculate fee based on tier
        let fee = calculate_stream_fee(user_tokens, BASE_STREAM_FEE);

        // Transfer fee
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.fee_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            fee,
        )?;

        // Create stream
        let stream = &mut ctx.accounts.stream;
        stream.owner = user.key();
        stream.config = stream_config;
        stream.created_at = Clock::get()?.unix_timestamp;
        stream.active = true;

        service.total_streams += 1;

        Ok(())
    }

    pub fn deploy_ai_agent(ctx: Context<DeployAgent>, agent_config: AgentConfig) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let user = &mut ctx.accounts.user;
        let user_tokens = ctx.accounts.user_token_account.amount;

        // Calculate fee based on tier
        let fee = calculate_ai_fee(user_tokens, BASE_AI_FEE);

        // Transfer fee
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.fee_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            fee,
        )?;

        // Deploy agent
        let agent = &mut ctx.accounts.agent;
        agent.owner = user.key();
        agent.config = agent_config;
        agent.deployed_at = Clock::get()?.unix_timestamp;
        agent.active = true;

        service.total_agents += 1;

        Ok(())
    }

    pub fn store_data(ctx: Context<StoreData>, size: u64, data_config: DataConfig) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let user = &mut ctx.accounts.user;
        let user_tokens = ctx.accounts.user_token_account.amount;

        // Calculate fee based on tier and size
        let fee = calculate_storage_fee(user_tokens, BASE_STORAGE_FEE, size);

        // Transfer fee
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.fee_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            fee,
        )?;

        // Store data metadata
        let storage = &mut ctx.accounts.storage;
        storage.owner = user.key();
        storage.size = size;
        storage.config = data_config;
        storage.stored_at = Clock::get()?.unix_timestamp;

        service.total_storage += size;

        Ok(())
    }

    // Helper functions
    fn calculate_stream_fee(tokens: u64, base_fee: u64) -> u64 {
        if tokens >= TIER3_TOKENS {
            base_fee / 2  // 50% discount
        } else if tokens >= TIER2_TOKENS {
            (base_fee * 7) / 10  // 30% discount
        } else if tokens >= TIER1_TOKENS {
            (base_fee * 9) / 10  // 10% discount
        } else {
            base_fee
        }
    }

    fn calculate_ai_fee(tokens: u64, base_fee: u64) -> u64 {
        if tokens >= TIER3_TOKENS {
            base_fee / 2  // 50% discount
        } else if tokens >= TIER2_TOKENS {
            (base_fee * 7) / 10  // 30% discount
        } else if tokens >= TIER1_TOKENS {
            (base_fee * 9) / 10  // 10% discount
        } else {
            base_fee
        }
    }

    fn calculate_storage_fee(tokens: u64, base_fee: u64, size: u64) -> u64 {
        let base = base_fee * size;
        if tokens >= TIER3_TOKENS {
            base / 2  // 50% discount
        } else if tokens >= TIER2_TOKENS {
            (base * 7) / 10  // 30% discount
        } else if tokens >= TIER1_TOKENS {
            (base * 9) / 10  // 10% discount
        } else {
            base
        }
    }
}

#[derive(Accounts)]
pub struct InitializeService<'info> {
    #[account(init, payer = authority, space = 8 + size_of::<ServiceState>())]
    pub service: Account<'info, ServiceState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateStream<'info> {
    #[account(mut)]
    pub service: Account<'info, ServiceState>,
    #[account(init, payer = user, space = 8 + size_of::<StreamAccount>())]
    pub stream: Account<'info, StreamAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeployAgent<'info> {
    #[account(mut)]
    pub service: Account<'info, ServiceState>,
    #[account(init, payer = user, space = 8 + size_of::<AgentAccount>())]
    pub agent: Account<'info, AgentAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StoreData<'info> {
    #[account(mut)]
    pub service: Account<'info, ServiceState>,
    #[account(init, payer = user, space = 8 + size_of::<StorageAccount>())]
    pub storage: Account<'info, StorageAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ServiceState {
    pub authority: Pubkey,
    pub config: ServiceConfig,
    pub total_streams: u64,
    pub total_agents: u64,
    pub total_storage: u64,
}

#[account]
pub struct StreamAccount {
    pub owner: Pubkey,
    pub config: StreamConfig,
    pub created_at: i64,
    pub active: bool,
}

#[account]
pub struct AgentAccount {
    pub owner: Pubkey,
    pub config: AgentConfig,
    pub deployed_at: i64,
    pub active: bool,
}

#[account]
pub struct StorageAccount {
    pub owner: Pubkey,
    pub size: u64,
    pub config: DataConfig,
    pub stored_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServiceConfig {
    pub max_streams_per_user: u64,
    pub max_agents_per_user: u64,
    pub max_storage_per_user: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StreamConfig {
    pub stream_type: StreamType,
    pub data_rate: u64,
    pub retention_period: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentConfig {
    pub agent_type: AgentType,
    pub model: String,
    pub parameters: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DataConfig {
    pub data_type: DataType,
    pub encryption: bool,
    pub compression: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum StreamType {
    Financial,
    Analytics,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum AgentType {
    Pattern,
    Prediction,
    Anomaly,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DataType {
    Raw,
    Processed,
    Model,
    Custom,
}

#[error_code]
pub enum UtilityError {
    #[msg("Invalid service configuration")]
    InvalidServiceConfig,
    #[msg("Stream limit exceeded")]
    StreamLimitExceeded,
    #[msg("Agent limit exceeded")]
    AgentLimitExceeded,
    #[msg("Storage limit exceeded")]
    StorageLimitExceeded,
    #[msg("Insufficient tokens")]
    InsufficientTokens,
}
