use anyhow::Result;
use tokio::time::{interval, Duration};

use crate::blockchain::BlockchainClient;
use crate::db::Database;

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
        // TODO: Po dodaniu smart kontraktu:
        // 1. Pobierz ostatni zindeksowany blok z bazy danych
        // 2. Pobierz nowe bloki od ostatniego zindeksowanego do najnowszego
        // 3. Filtruj wydarzenia (ProposalCreated, VoteCast) z nowych bloków
        // 4. Zapisz wydarzenia do bazy danych
        // 5. Zaktualizuj stan propozycji (votes_count)

        let current_block = self.blockchain.get_block_number().await?;
        tracing::debug!("Current block: {}", current_block);

        Ok(())
    }

    // Helper function to process ProposalCreated events
    async fn process_proposal_created(&self, _event: ()) -> Result<()> {
        // TODO: Implement after smart contract is ready
        Ok(())
    }

    // Helper function to process VoteCast events
    async fn process_vote_cast(&self, _event: ()) -> Result<()> {
        // TODO: Implement after smart contract is ready
        Ok(())
    }
}
