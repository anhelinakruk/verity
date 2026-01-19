use crate::blockchain::BlockchainClient;
use crate::db::Database;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub blockchain: BlockchainClient,
}

impl AppState {
    pub fn new(db: Database, blockchain: BlockchainClient) -> Self {
        Self { db, blockchain }
    }
}
