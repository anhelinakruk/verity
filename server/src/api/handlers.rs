use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use alloy::primitives::U256;

use crate::api::state::AppState;
use crate::auth::Claims;
use crate::models::{Proposal, ProposalResponse, VoteResponse};
use crate::models::proposal::CreateProposalRequest;
use crate::models::vote::VoteRequest;

// Custom error type that returns JSON responses
#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    pub fn internal_server_error(message: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    pub fn not_implemented(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_IMPLEMENTED, message)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        tracing::error!("API error: {} - {}", self.status, self.message);
        (
            self.status,
            Json(serde_json::json!({
                "error": self.message
            })),
        )
            .into_response()
    }
}


pub async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "verity-server"
    }))
}

pub async fn get_proposals(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProposalResponse>>, ApiError> {
    let proposals = state
        .db
        .get_all_proposals()
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?;

    let responses: Vec<ProposalResponse> = proposals
        .into_iter()
        .map(|p| p.into())
        .collect();

    Ok(Json(responses))
}

pub async fn get_proposal(
    State(state): State<AppState>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<ProposalResponse>, ApiError> {
    let proposal = state
        .db
        .get_proposal(proposal_id)
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?
        .ok_or_else(|| ApiError::not_found("Proposal not found"))?;

    Ok(Json(proposal.into()))
}

pub async fn get_proposal_votes(
    State(state): State<AppState>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<Vec<VoteResponse>>, ApiError> {
    let votes = state
        .db
        .get_votes_for_proposal(proposal_id)
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?;

    let responses: Vec<VoteResponse> = votes
        .into_iter()
        .map(|v| v.into())
        .collect();

    Ok(Json(responses))
}

// Get proposal results (aggregated vote counts)
pub async fn get_proposal_results(
    State(state): State<AppState>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let proposal = state
        .db
        .get_proposal(proposal_id)
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?
        .ok_or_else(|| ApiError::not_found("Proposal not found"))?;

    let total_votes: u64 = proposal.votes_count.iter().sum();

    let results: Vec<serde_json::Value> = proposal
        .options
        .iter()
        .enumerate()
        .map(|(i, option)| {
            let votes = proposal.votes_count.get(i).copied().unwrap_or(0);
            let percentage = if total_votes > 0 {
                (votes as f64 / total_votes as f64) * 100.0
            } else {
                0.0
            };

            serde_json::json!({
                "option": option,
                "votes": votes,
                "percentage": percentage
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "proposal_id": proposal.proposal_id,
        "title": proposal.title,
        "total_votes": total_votes,
        "results": results,
        "is_active": proposal.is_active,
        "deadline": proposal.deadline
    })))
}

pub async fn get_blockchain_info(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let block_number = state
        .blockchain
        .get_block_number()
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "current_block": block_number,
        "contract_address": state.blockchain.contract_address().to_string()
    })))
}

pub async fn request_faucet(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    tracing::info!("Faucet request for address: {}", address);

    // Parse address
    let to_address = address.parse::<alloy::primitives::Address>()
        .map_err(|e| ApiError::bad_request(format!("Invalid address: {}", e)))?;

    // Send ETH using blockchain client's admin wallet
    let tx_hash = state
        .blockchain
        .send_eth(to_address, "10.0") // 10 ETH
        .await
        .map_err(|e| ApiError::internal_server_error(format!("Failed to send ETH: {}", e)))?;

    tracing::info!("Sent 10 ETH to {} in tx {}", address, tx_hash);

    Ok(Json(serde_json::json!({
        "success": true,
        "address": address,
        "amount": "10.0",
        "tx_hash": tx_hash.to_string()
    })))
}

pub async fn check_user_voted(
    State(state): State<AppState>,
    Path((proposal_id, address)): Path<(u64, String)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let voter_address = address.parse::<alloy::primitives::Address>()
        .map_err(|e| ApiError::bad_request(format!("Invalid address: {}", e)))?;

    let has_voted = state
        .blockchain
        .has_user_voted(U256::from(proposal_id), voter_address)
        .await
        .map_err(|e| ApiError::internal_server_error(format!("Blockchain error: {}", e)))?;

    Ok(Json(serde_json::json!({
        "proposal_id": proposal_id,
        "address": address,
        "has_voted": has_voted
    })))
}

pub async fn create_proposal(
    State(state): State<AppState>,
    Json(request): Json<CreateProposalRequest>,
) -> Result<Json<ProposalResponse>, ApiError> {
    let (proposal_id, tx_hash) = state
        .blockchain
        .create_proposal(
            request.title.clone(),
            request.description.clone(),
            request.options.clone(),
            U256::from(request.duration_days),
        )
        .await
        .map_err(|e| ApiError::internal_server_error(format!("Blockchain error: {}", e)))?;

    let blockchain_proposal = state
        .blockchain
        .get_proposal(proposal_id)
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?;

    let block_number = state.blockchain.get_block_number().await.unwrap_or(0);

    // Save to database
    let proposal = Proposal {
        id: None,
        proposal_id: proposal_id.to::<u64>(),
        title: blockchain_proposal.title,
        description: blockchain_proposal.description,
        creator: blockchain_proposal.creator.to_string(),
        options: blockchain_proposal.options,
        votes_count: blockchain_proposal.votesCount.iter().map(|v| v.to::<u64>()).collect(),
        deadline: blockchain_proposal.deadline.to::<u64>(),
        is_active: blockchain_proposal.isActive,
        created_at: blockchain_proposal.createdAt.to::<u64>(),
        tx_hash: tx_hash.to_string(),
        block_number,
    };

    let saved_proposal = state
        .db
        .create_proposal(&proposal)
        .await
        .map_err(|e| ApiError::internal_server_error(format!("Database error: {}", e)))?;

    tracing::info!("Proposal saved to database: {:?}", saved_proposal.id);

    Ok(Json(saved_proposal.into()))
}

// Cast a vote
pub async fn cast_vote(
    _claims: Claims,
    State(state): State<AppState>,
    Path(proposal_id): Path<u64>,
    Json(request): Json<VoteRequest>,
) -> Result<Json<VoteResponse>, ApiError> {
    tracing::info!("Casting vote on proposal {}", proposal_id);

    // Validate proposal exists and is active
    let proposal = state
        .db
        .get_proposal(proposal_id)
        .await
        .map_err(|e| ApiError::internal_server_error(e.to_string()))?
        .ok_or_else(|| ApiError::not_found("Proposal not found"))?;

    if !proposal.is_active {
        return Err(ApiError::bad_request("Proposal is not active"));
    }

    // Check if option index is valid
    if request.option_index as usize >= proposal.options.len() {
        return Err(ApiError::bad_request("Invalid option index"));
    }

    // TODO: Here we would need the user's private key to sign the transaction
    // For now, this is a limitation - we can't sign transactions on behalf of users
    // In a real app, the mobile client would sign and send the transaction directly
    // and we would only index the result

    tracing::error!("Vote casting requires user wallet signature - not implemented yet");
    Err(ApiError::not_implemented(
        "Vote casting must be done client-side with wallet signature"
    ))
}
