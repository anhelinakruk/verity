use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub blockchain: BlockchainConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub namespace: String,
    pub database: String,
    pub user: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BlockchainConfig {
    pub rpc_url: String,
    pub chain_id: u64,
    pub contract_address: String,
    pub admin_private_key: String,
}

impl Config {
    pub fn from_env() -> Result<Self, anyhow::Error> {
        dotenv::dotenv().ok();

        Ok(Config {
            server: ServerConfig {
                host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
                port: env::var("SERVER_PORT")
                    .unwrap_or_else(|_| "3000".to_string())
                    .parse()?,
            },
            database: DatabaseConfig {
                url: env::var("SURREALDB_URL")?,
                namespace: env::var("SURREALDB_NAMESPACE")?,
                database: env::var("SURREALDB_DATABASE")?,
                user: env::var("SURREALDB_USER")?,
                password: env::var("SURREALDB_PASSWORD")?,
            },
            blockchain: BlockchainConfig {
                rpc_url: env::var("ETH_RPC_URL")?,
                chain_id: env::var("CHAIN_ID")?.parse()?,
                contract_address: env::var("VOTING_CONTRACT_ADDRESS")?,
                admin_private_key: env::var("ADMIN_PRIVATE_KEY")?,
            },
        })
    }
}
