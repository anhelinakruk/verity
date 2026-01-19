mod api;
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
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "verity_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Verity Server...");

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Configuration loaded successfully");

    // Connect to database
    let db = Database::new(&config.database).await?;
    tracing::info!("Database connection established");

    // Connect to blockchain
    let blockchain = BlockchainClient::new(&config.blockchain).await?;
    tracing::info!("Blockchain connection established");

    // Create application state
    let app_state = AppState::new(db.clone(), blockchain.clone());

    // Start blockchain indexer in background
    let indexer = Indexer::new(blockchain.clone(), db.clone());
    tokio::spawn(async move {
        if let Err(e) = indexer.start().await {
            tracing::error!("Indexer error: {}", e);
        }
    });

    // Create router
    let app = create_router(app_state);

    // Start server
    let addr = format!("{}:{}", config.server.host, config.server.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("Server listening on {}", addr);
    tracing::info!("Health check available at http://{}/health", addr);
    tracing::info!("API documentation:");
    tracing::info!("  GET  /health");
    tracing::info!("  GET  /api/blockchain");
    tracing::info!("  GET  /api/proposals");
    tracing::info!("  GET  /api/proposals/:id");
    tracing::info!("  GET  /api/proposals/:id/votes");
    tracing::info!("  GET  /api/proposals/:id/results");

    axum::serve(listener, app).await?;

    Ok(())
}
