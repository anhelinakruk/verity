use anyhow::Result;
use surrealdb::engine::remote::ws::{Client, Ws};
use surrealdb::opt::auth::Root;
use surrealdb::Surreal;

use crate::config::DatabaseConfig;
use crate::models::{Proposal, Vote};

#[derive(Clone)]
pub struct Database {
    pub client: Surreal<Client>,
}

impl Database {
    pub async fn new(config: &DatabaseConfig) -> Result<Self> {
        let client = Surreal::new::<Ws>(&config.url).await?;

        client
            .signin(Root {
                username: &config.user,
                password: &config.password,
            })
            .await?;

        client.use_ns(&config.namespace).use_db(&config.database).await?;

        tracing::info!("Connected to SurrealDB at {}", config.url);

        Ok(Database { client })
    }

    // Proposal operations
    pub async fn create_proposal(&self, proposal: &Proposal) -> Result<Proposal> {
        let proposal_clone = proposal.clone();
        let created: Option<Proposal> = self
            .client
            .create("proposals")
            .content(proposal_clone)
            .await?;

        Ok(created.expect("Failed to create proposal"))
    }

    pub async fn get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>> {
        let mut result = self
            .client
            .query("SELECT * FROM proposals WHERE proposal_id = $proposal_id")
            .bind(("proposal_id", proposal_id))
            .await?;

        let proposals: Vec<Proposal> = result.take(0)?;
        Ok(proposals.into_iter().next())
    }

    pub async fn get_all_proposals(&self) -> Result<Vec<Proposal>> {
        let proposals: Vec<Proposal> = self
            .client
            .select("proposals")
            .await?;

        Ok(proposals)
    }

    pub async fn update_proposal(&self, proposal: &Proposal) -> Result<Proposal> {
        let votes_count = proposal.votes_count.clone();
        let is_active = proposal.is_active;
        let proposal_id = proposal.proposal_id;

        let mut result = self
            .client
            .query("UPDATE proposals SET votes_count = $votes_count, is_active = $is_active WHERE proposal_id = $proposal_id RETURN AFTER")
            .bind(("proposal_id", proposal_id))
            .bind(("votes_count", votes_count))
            .bind(("is_active", is_active))
            .await?;

        let updated: Vec<Proposal> = result.take(0)?;
        Ok(updated.into_iter().next().unwrap())
    }

    // Vote operations
    pub async fn create_vote(&self, vote: &Vote) -> Result<Vote> {
        let vote_clone = vote.clone();
        let created: Option<Vote> = self
            .client
            .create("votes")
            .content(vote_clone)
            .await?;

        Ok(created.expect("Failed to create vote"))
    }

    pub async fn get_votes_for_proposal(&self, proposal_id: u64) -> Result<Vec<Vote>> {
        let mut result = self
            .client
            .query("SELECT * FROM votes WHERE proposal_id = $proposal_id ORDER BY timestamp DESC")
            .bind(("proposal_id", proposal_id))
            .await?;

        let votes: Vec<Vote> = result.take(0)?;
        Ok(votes)
    }

    pub async fn has_voted(&self, proposal_id: u64, voter: &str) -> Result<bool> {
        let voter_str = voter.to_string();

        let mut result = self
            .client
            .query("SELECT * FROM votes WHERE proposal_id = $proposal_id AND voter = $voter")
            .bind(("proposal_id", proposal_id))
            .bind(("voter", voter_str))
            .await?;

        let votes: Vec<Vote> = result.take(0)?;
        Ok(!votes.is_empty())
    }
}
