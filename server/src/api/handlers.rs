use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};

use crate::api::state::AppState;
use crate::models::{ProposalResponse, VoteResponse};

// Health check endpoint
pub async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "verity-server"
    }))
}

// Get all proposals
pub async fn get_proposals(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProposalResponse>>, (StatusCode, String)> {
    let proposals = state
        .db
        .get_all_proposals()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let responses: Vec<ProposalResponse> = proposals
        .into_iter()
        .map(|p| p.into())
        .collect();

    Ok(Json(responses))
}

// Get specific proposal by ID
pub async fn get_proposal(
    State(state): State<AppState>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<ProposalResponse>, (StatusCode, String)> {
    let proposal = state
        .db
        .get_proposal(proposal_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Proposal not found".to_string()))?;

    Ok(Json(proposal.into()))
}

// Get votes for a specific proposal
pub async fn get_proposal_votes(
    State(state): State<AppState>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<Vec<VoteResponse>>, (StatusCode, String)> {
    let votes = state
        .db
        .get_votes_for_proposal(proposal_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let proposal = state
        .db
        .get_proposal(proposal_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Proposal not found".to_string()))?;

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

// Get blockchain info
pub async fn get_blockchain_info(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let block_number = state
        .blockchain
        .get_block_number()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "current_block": block_number,
        "contract_address": state.blockchain.contract_address().to_string()
    })))
}
