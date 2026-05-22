use alloy::primitives::{Address, U256};
use alloy::providers::{Provider, ProviderBuilder, RootProvider};
use alloy::sol;
use alloy::transports::http::{Client, Http};
use alloy::network::EthereumWallet;
use alloy::signers::local::PrivateKeySigner;
use anyhow::Result;
use std::str::FromStr;

use crate::config::BlockchainConfig;

sol!(
    #[allow(missing_docs)]
    #[sol(rpc)]
    VotingSystem,
    "abi/VotingSystem.json"
);

#[derive(Clone)]
pub struct BlockchainClient {
    provider: RootProvider<Http<Client>>,
    contract_address: Address,
    admin_wallet: EthereumWallet,
}

impl BlockchainClient {
    pub async fn new(config: &BlockchainConfig) -> Result<Self> {
        let rpc_url = config.rpc_url.parse()?;
        let provider = ProviderBuilder::new().on_http(rpc_url);

        let contract_address = Address::from_str(&config.contract_address)?;

        // Setup admin signer
        let signer: PrivateKeySigner = config.admin_private_key.parse()?;
        let admin_wallet = EthereumWallet::from(signer);

        tracing::info!("Connected to blockchain at {}", config.rpc_url);
        tracing::info!("Contract address: {}", contract_address);

        Ok(BlockchainClient {
            provider,
            contract_address,
            admin_wallet,
        })
    }

    pub async fn get_block_number(&self) -> Result<u64> {
        let block_number = self.provider.get_block_number().await?;
        Ok(block_number)
    }

    pub fn contract_address(&self) -> Address {
        self.contract_address
    }

    pub fn provider(&self) -> &RootProvider<Http<Client>> {
        &self.provider
    }

    pub async fn get_proposal_count(&self) -> Result<U256> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let count = contract.proposalCount().call().await?._0;
        Ok(count)
    }
    pub async fn get_proposal(&self, proposal_id: U256) -> Result<VotingSystem::Proposal> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let proposal = contract.getProposal(proposal_id).call().await?._0;
        Ok(proposal)
    }

    pub async fn get_proposal_options(&self, proposal_id: U256) -> Result<Vec<String>> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let options = contract.getProposalOptions(proposal_id).call().await?._0;
        Ok(options)
    }

    pub async fn get_proposal_votes_count(&self, proposal_id: U256) -> Result<Vec<U256>> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let votes = contract.getProposalVotesCount(proposal_id).call().await?._0;
        Ok(votes)
    }

    /// Get total votes for a proposal
    pub async fn get_total_votes(&self, proposal_id: U256) -> Result<U256> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let total = contract.getTotalVotes(proposal_id).call().await?._0;
        Ok(total)
    }

    /// Check if proposal is active
    pub async fn is_proposal_active(&self, proposal_id: U256) -> Result<bool> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let is_active = contract.isProposalActive(proposal_id).call().await?._0;
        Ok(is_active)
    }

    /// Check if user has voted
    pub async fn has_user_voted(&self, proposal_id: U256, voter: Address) -> Result<bool> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let has_voted = contract.hasUserVoted(proposal_id, voter).call().await?._0;
        Ok(has_voted)
    }

    /// Get winning option
    pub async fn get_winning_option(&self, proposal_id: U256) -> Result<(U256, U256)> {
        let contract = VotingSystem::new(self.contract_address, &self.provider);
        let result = contract.getWinningOption(proposal_id).call().await?;
        Ok((result.winningOption, result.winningVoteCount))
    }

    /// Create a new proposal (sends transaction)
    pub async fn create_proposal(
        &self,
        title: String,
        description: String,
        options: Vec<String>,
        duration_days: U256,
    ) -> Result<(U256, alloy::primitives::TxHash)> {
        // Get current proposal count (next proposal will have this ID)
        let proposal_id = self.get_proposal_count().await?;

        // Create provider with wallet for signing
        let rpc_url = self.provider.client().transport().url().to_string().parse()?;
        let provider_with_wallet = ProviderBuilder::new()
            .with_recommended_fillers()
            .wallet(self.admin_wallet.clone())
            .on_http(rpc_url);

        let contract = VotingSystem::new(self.contract_address, provider_with_wallet);

        // Call createProposal and wait for receipt
        let tx = contract.createProposal(title, description, options, duration_days).send().await?;
        let receipt = tx.get_receipt().await?;

        Ok((proposal_id, receipt.transaction_hash))
    }

    /// Cast a vote (sends transaction)
    pub async fn cast_vote(
        &self,
        proposal_id: U256,
        option_index: U256,
        voter_wallet: EthereumWallet,
    ) -> Result<alloy::primitives::TxHash> {
        let rpc_url = self.provider.client().transport().url().to_string().parse()?;
        let provider_with_wallet = ProviderBuilder::new()
            .with_recommended_fillers()
            .wallet(voter_wallet)
            .on_http(rpc_url);

        let contract = VotingSystem::new(self.contract_address, provider_with_wallet);
        let tx = contract.vote(proposal_id, option_index).send().await?;
        let receipt = tx.get_receipt().await?;

        Ok(receipt.transaction_hash)
    }

    /// Send ETH from admin wallet to an address (for testing/faucet)
    pub async fn send_eth(
        &self,
        to: Address,
        amount_eth: &str,
    ) -> Result<alloy::primitives::TxHash> {
        use alloy::primitives::utils::parse_ether;
        use alloy::rpc::types::TransactionRequest;

        let amount = parse_ether(amount_eth)?;

        // Create provider with wallet for signing
        let rpc_url = self.provider.client().transport().url().to_string().parse()?;
        let provider_with_wallet = ProviderBuilder::new()
            .with_recommended_fillers()
            .wallet(self.admin_wallet.clone())
            .on_http(rpc_url);

        // Create and send transaction
        let tx = TransactionRequest::default()
            .to(to)
            .value(amount);

        let pending = provider_with_wallet.send_transaction(tx).await?;
        let receipt = pending.get_receipt().await?;

        Ok(receipt.transaction_hash)
    }
}
