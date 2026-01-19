use serde::{Deserialize, Serialize};
use surrealdb::sql::Thing;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    pub id: Option<Thing>,
    pub proposal_id: u64,
    pub voter: String,
    pub option_index: u64,
    pub timestamp: u64,
    pub tx_hash: String,
    pub block_number: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteRequest {
    pub proposal_id: u64,
    pub option_index: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteResponse {
    pub proposal_id: u64,
    pub voter: String,
    pub option_index: u64,
    pub timestamp: u64,
}

impl From<Vote> for VoteResponse {
    fn from(vote: Vote) -> Self {
        VoteResponse {
            proposal_id: vote.proposal_id,
            voter: vote.voter,
            option_index: vote.option_index,
            timestamp: vote.timestamp,
        }
    }
}
