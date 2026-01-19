use axum::{
    routing::get,
    Router,
};
use tower_http::cors::CorsLayer;

use crate::api::handlers;
use crate::api::state::AppState;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health_check))

        // Blockchain info
        .route("/api/blockchain", get(handlers::get_blockchain_info))

        // Proposals endpoints
        .route("/api/proposals", get(handlers::get_proposals))
        .route("/api/proposals/:id", get(handlers::get_proposal))
        .route("/api/proposals/:id/votes", get(handlers::get_proposal_votes))
        .route("/api/proposals/:id/results", get(handlers::get_proposal_results))

        // Add CORS middleware
        .layer(CorsLayer::permissive())

        // Add shared state
        .with_state(state)
}
