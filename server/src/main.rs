mod api;
mod auth;
mod blockchain;
mod config;
mod db;
mod indexer;
mod models;

use anyhow::Result;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::api::{create_router, AppState};
use crate::blockchain::BlockchainClient;
use crate::config::Config;
use crate::db::Database;
use crate::indexer::Indexer;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "verity_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let db = Database::new(&config.database).await?;
    let blockchain = BlockchainClient::new(&config.blockchain).await?;
    let app_state = AppState::new(db.clone(), blockchain.clone());

    let indexer = Indexer::new(blockchain.clone(), db.clone());
    tokio::spawn(async move {
        if let Err(e) = indexer.start().await {
            tracing::error!("Indexer error: {}", e);
        }
    });

    let app = create_router(app_state);
    let addr = format!("{}:{}", config.server.host, config.server.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("Server listening on {}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}
