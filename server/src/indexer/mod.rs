use anyhow::Result;
use alloy::primitives::U256;
use tokio::time::{interval, Duration};

use crate::blockchain::BlockchainClient;
use crate::db::Database;
use crate::models::Proposal;

pub struct Indexer {
    blockchain: BlockchainClient,
    database: Database,
    poll_interval: Duration,
}

impl Indexer {
    pub fn new(blockchain: BlockchainClient, database: Database) -> Self {
        Self {
            blockchain,
            database,
            poll_interval: Duration::from_secs(12), // ~Ethereum block time
        }
    }

    pub async fn start(&self) -> Result<()> {
        tracing::info!("Starting blockchain indexer...");

        let mut ticker = interval(self.poll_interval);

        loop {
            ticker.tick().await;

            if let Err(e) = self.index_new_events().await {
                tracing::error!("Error indexing events: {}", e);
            }
        }
    }

    async fn index_new_events(&self) -> Result<()> {
        let current_block = self.blockchain.get_block_number().await?;
        
        // For now, just sync proposals by checking blockchain state
        // In production, we'd track events and last synced block
        let proposal_count = self.blockchain.get_proposal_count().await?.to::<u64>();
        
        for proposal_id in 0..proposal_count {
            // Check if proposal exists in database
            let existing = self.database.get_proposal(proposal_id).await;
            
            if existing.is_err() || existing.unwrap().is_none() {
                // Fetch from blockchain and save
                let blockchain_proposal = self.blockchain.get_proposal(U256::from(proposal_id)).await?;
                
                let proposal = Proposal {
                    id: None,
                    proposal_id,
                    title: blockchain_proposal.title.clone(),
                    description: blockchain_proposal.description.clone(),
                    creator: blockchain_proposal.creator.to_string(),
                    options: blockchain_proposal.options.clone(),
                    votes_count: blockchain_proposal.votesCount.iter().map(|v| v.to::<u64>()).collect(),
                    deadline: blockchain_proposal.deadline.to::<u64>(),
                    is_active: blockchain_proposal.isActive,
                    created_at: blockchain_proposal.createdAt.to::<u64>(),
                    tx_hash: String::new(), // We don't have the original tx hash here
                    block_number: current_block,
                };
                
                self.database.create_proposal(&proposal).await?;
                tracing::info!("Indexed proposal {}: {}", proposal_id, proposal.title);
            } else {
                // Update existing proposal with latest vote counts
                let blockchain_proposal = self.blockchain.get_proposal(U256::from(proposal_id)).await?;
                
                if let Ok(Some(mut db_proposal)) = self.database.get_proposal(proposal_id).await {
                    let new_votes: Vec<u64> = blockchain_proposal.votesCount.iter().map(|v| v.to::<u64>()).collect();
                    
                    if db_proposal.votes_count != new_votes || db_proposal.is_active != blockchain_proposal.isActive {
                        db_proposal.votes_count = new_votes;
                        db_proposal.is_active = blockchain_proposal.isActive;
                        self.database.update_proposal(&db_proposal).await?;
                        tracing::debug!("Updated proposal {} vote counts", proposal_id);
                    }
                }
            }
        }
        
        Ok(())
    }
}
