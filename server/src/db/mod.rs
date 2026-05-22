use anyhow::Result;
use serde::{Deserialize, Serialize};
use surrealdb::engine::remote::http::{Client, Http};
use surrealdb::opt::auth::Root;
use surrealdb::sql::Thing;
use surrealdb::Surreal;

use crate::config::DatabaseConfig;
use crate::models::{Proposal, Vote};

#[derive(Clone)]
pub struct Database {
    pub client: Surreal<Client>,
}

// Auth & Wallet models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: Option<Thing>,
    pub address: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Wallet {
    pub id: Option<Thing>,
    pub user_id: String,
    pub address: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Nonce {
    pub id: Option<Thing>,
    pub value: String,
    pub exp: Option<String>,
    pub iat: Option<String>,
}

impl Database {
    pub async fn new(config: &DatabaseConfig) -> Result<Self> {
        let client = Surreal::new::<Http>(&config.url).await?;

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

    // ============================================
    // Auth & User operations
    // ============================================

    pub async fn create_user(&self, address: &str) -> Result<User> {
        let user: Option<User> = self
            .client
            .create("user")
            .content(User {
                id: None,
                address: address.to_lowercase(),
                created_at: None,
            })
            .await?;

        user.ok_or_else(|| anyhow::anyhow!("Failed to create user"))
    }

    pub async fn get_user_by_address(&self, address: &str) -> Result<Option<User>> {
        let mut result = self
            .client
            .query("SELECT * FROM user WHERE address = type::string(string::lowercase($address))")
            .bind(("address", address.to_string()))
            .await?;

        let users: Vec<User> = result.take(0)?;
        Ok(users.into_iter().next())
    }

    pub async fn save_nonce(&self, value: &str) -> Result<()> {
        self.client
            .query(
                "
                DELETE nonce WHERE exp < time::now() RETURN BEFORE;
                CREATE ONLY nonce SET value = type::string($value), exp = time::now() + 5m, iat = time::now();
                ",
            )
            .bind(("value", value.to_string()))
            .await?;

        Ok(())
    }

    pub async fn get_nonce(&self, value: &str) -> Result<Option<Nonce>> {
        let mut result = self
            .client
            .query(
                "
                DELETE nonce WHERE exp < time::now() RETURN BEFORE;
                SELECT * FROM nonce WHERE value = type::string($value);
                ",
            )
            .bind(("value", value.to_string()))
            .await?;

        let nonces: Vec<Nonce> = result.take(1)?;
        Ok(nonces.into_iter().next())
    }

    // ============================================
    // Wallet operations
    // ============================================

    pub async fn create_wallet(&self, user_id: &str, address: &str) -> Result<Wallet> {
        let wallet: Option<Wallet> = self
            .client
            .create("wallets")
            .content(Wallet {
                id: None,
                user_id: user_id.to_string(),
                address: address.to_string(),
                created_at: None,
            })
            .await?;

        Ok(wallet.unwrap())
    }

    pub async fn get_wallet_by_address(&self, address: String) -> Result<Option<Wallet>> {
        let mut result = self
            .client
            .query("SELECT * FROM wallets WHERE address = $address")
            .bind(("address", address))
            .await?;

        let wallets: Vec<Wallet> = result.take(0)?;
        Ok(wallets.into_iter().next())
    }
}
