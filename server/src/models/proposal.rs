use serde::{Deserialize, Serialize};
use surrealdb::sql::Thing;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: Option<Thing>,
    pub proposal_id: u64,
    pub title: String,
    pub description: String,
    pub creator: String,
    pub options: Vec<String>,
    pub votes_count: Vec<u64>,
    pub deadline: u64,
    pub is_active: bool,
    pub created_at: u64,
    pub tx_hash: String,
    pub block_number: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProposalRequest {
    pub title: String,
    pub description: String,
    pub options: Vec<String>,
    pub duration_days: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalResponse {
    pub proposal_id: u64,
    pub title: String,
    pub description: String,
    pub creator: String,
    pub options: Vec<String>,
    pub votes_count: Vec<u64>,
    pub deadline: u64,
    pub is_active: bool,
    pub total_votes: u64,
}

impl From<Proposal> for ProposalResponse {
    fn from(proposal: Proposal) -> Self {
        let total_votes = proposal.votes_count.iter().sum();
        ProposalResponse {
            proposal_id: proposal.proposal_id,
            title: proposal.title,
            description: proposal.description,
            creator: proposal.creator,
            options: proposal.options,
            votes_count: proposal.votes_count,
            deadline: proposal.deadline,
            is_active: proposal.is_active,
            total_votes,
        }
    }
}
