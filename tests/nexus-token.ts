// Save as: tests/nexus-token.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { NexusToken } from '../target/types/nexus_token';
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount,
  getAccount,
  getMint
} from '@solana/spl-token';
import { expect } from 'chai';

describe('nexus-token', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NexusToken as Program<NexusToken>;

  let mintPda: anchor.web3.PublicKey;
  let mintBump: number;
  let tokenAuthority: anchor.web3.Keypair;
  let vestingAccount: anchor.web3.Keypair;
  let beneficiaryToken: anchor.web3.PublicKey;

  before(async () => {
    tokenAuthority = anchor.web3.Keypair.generate();
    vestingAccount = anchor.web3.Keypair.generate();

    [mintPda, mintBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("token_mint")],
      program.programId
    );

    // Create beneficiary token account
    beneficiaryToken = await createAccount(
      provider.connection,
      await provider.wallet.payer,
      mintPda,
      provider.wallet.publicKey
    );
  });

  it("Initializes the token", async () => {
    await program.methods
      .initialize()
      .accounts({
        tokenMint: mintPda,
        tokenAuthority: tokenAuthority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([tokenAuthority])
      .rpc();

    const mint = await getMint(provider.connection, mintPda);
    expect(mint.decimals).to.equal(9);
    expect(mint.mintAuthority.toString()).to.equal(tokenAuthority.publicKey.toString());
  });

  it("Creates a vesting schedule", async () => {
    const amount = new anchor.BN(1000000000); // 1 token
    const startTs = new anchor.BN(Math.floor(Date.now() / 1000));
    const duration = new anchor.BN(365 * 24 * 60 * 60); // 1 year
    const cliff = new anchor.BN(90 * 24 * 60 * 60); // 90 days

    await program.methods
      .createVestingSchedule(
        amount,
        startTs,
        duration,
        cliff
      )
      .accounts({
        vestingAccount: vestingAccount.publicKey,
        beneficiary: provider.wallet.publicKey,
        from: tokenAuthority.publicKey,
        authority: tokenAuthority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([vestingAccount, tokenAuthority])
      .rpc();

    const account = await program.account.vestingAccount.fetch(vestingAccount.publicKey);
    expect(account.totalAmount.toNumber()).to.equal(amount.toNumber());
    expect(account.beneficiary.toString()).to.equal(provider.wallet.publicKey.toString());
  });
});

// Save as: tests/nexus-dao.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { NexusDao } from '../target/types/nexus_dao';
import { expect } from 'chai';

describe('nexus-dao', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NexusDao as Program<NexusDao>;

  let proposal: anchor.web3.Keypair;
  let voteAccount: anchor.web3.Keypair;

  beforeEach(async () => {
    proposal = anchor.web3.Keypair.generate();
    voteAccount = anchor.web3.Keypair.generate();
  });

  it("Creates a proposal", async () => {
    const title = "Test Proposal";
    const description = "This is a test proposal";
    const votingDelay = new anchor.BN(60); // 1 minute
    const votingPeriod = new anchor.BN(24 * 60 * 60); // 1 day

    await program.methods
      .createProposal(
        title,
        description,
        votingDelay,
        votingPeriod
      )
      .accounts({
        proposal: proposal.publicKey,
        proposer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([proposal])
      .rpc();

    const proposalAccount = await program.account.proposal.fetch(proposal.publicKey);
    expect(proposalAccount.title).to.equal(title);
    expect(proposalAccount.description).to.equal(description);
    expect(proposalAccount.executed).to.be.false;
  });

  it("Casts a vote", async () => {
    const support = true;

    await program.methods
      .castVote(support)
      .accounts({
        proposal: proposal.publicKey,
        voteAccount: voteAccount.publicKey,
        voter: provider.wallet.publicKey,
        voterTokenAccount: provider.wallet.publicKey, // Replace with actual token account
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voteAccount])
      .rpc();

    const vote = await program.account.vote.fetch(voteAccount.publicKey);
    expect(vote.support).to.equal(support);
    expect(vote.voter.toString()).to.equal(provider.wallet.publicKey.toString());
  });
});

// Save as: migrations/deploy.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { NexusToken } from '../target/types/nexus_token';
import { NexusDao } from '../target/types/nexus_dao';
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount 
} from '@solana/spl-token';

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Deploy Token Program
  const tokenProgram = anchor.workspace.NexusToken as Program<NexusToken>;
  const tokenAuthority = anchor.web3.Keypair.generate();

  const [mintPda, mintBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("token_mint")],
    tokenProgram.programId
  );

  console.log("Deploying Token Program...");
  await tokenProgram.methods
    .initialize()
    .accounts({
      tokenMint: mintPda,
      tokenAuthority: tokenAuthority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([tokenAuthority])
    .rpc();

  // Deploy DAO Program
  console.log("Deploying DAO Program...");
  const daoProgram = anchor.workspace.NexusDao as Program<NexusDao>;

  // Setup initial governance parameters
  const votingDelay = new anchor.BN(60 * 60); // 1 hour
  const votingPeriod = new anchor.BN(7 * 24 * 60 * 60); // 1 week
  const quorum = new anchor.BN(1_000_000); // 1M tokens

  console.log("Deployment Complete!");
  console.log("Token Program ID:", tokenProgram.programId.toString());
  console.log("DAO Program ID:", daoProgram.programId.toString());
  console.log("Token Mint:", mintPda.toString());
  console.log("Token Authority:", tokenAuthority.publicKey.toString());
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);

// Save as: .env
ANCHOR_PROVIDER_URL=http://localhost:8899
ANCHOR_WALLET=~/.config/solana/id.json
