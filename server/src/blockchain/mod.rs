use alloy::primitives::{Address, U256};
use alloy::providers::{Provider, ProviderBuilder, RootProvider};
use alloy::sol;
use alloy::transports::http::{Client, Http};
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
}

impl BlockchainClient {
    pub async fn new(config: &BlockchainConfig) -> Result<Self> {
        let rpc_url = config.rpc_url.parse()?;
        let provider = ProviderBuilder::new().on_http(rpc_url);

        let contract_address = Address::from_str(&config.contract_address)?;

        tracing::info!("Connected to blockchain at {}", config.rpc_url);
        tracing::info!("Contract address: {}", contract_address);

        Ok(BlockchainClient {
            provider,
            contract_address,
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
}
