use axum::{routing::{get, post}, Router};
use tower_http::cors::CorsLayer;

use crate::api::handlers;
use crate::api::state::AppState;
use crate::auth;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health_check))

        // Blockchain info
        .route("/api/blockchain", get(handlers::get_blockchain_info))

        // Auth endpoints (SIWE)
        .route("/api/auth/nonce", get(auth::get_nonce))
        .route("/api/auth/verify", post(auth::verify_and_login))

        // Proposals endpoints
        .route("/api/proposals", get(handlers::get_proposals).post(handlers::create_proposal))
        .route("/api/proposals/:id", get(handlers::get_proposal))
        .route("/api/proposals/:id/vote", post(handlers::cast_vote))
        .route("/api/proposals/:id/votes", get(handlers::get_proposal_votes))
        .route("/api/proposals/:id/results", get(handlers::get_proposal_results))
        .route("/api/proposals/:id/voted/:address", get(handlers::check_user_voted))
        
        // Faucet endpoint for development
        .route("/api/faucet/:address", post(handlers::request_faucet))

        // Add CORS middleware
        .layer(CorsLayer::permissive())

        // Add shared state
        .with_state(state)
}
