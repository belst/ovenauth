use axum::{http::StatusCode, response::IntoResponse};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OvenauthError {
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl IntoResponse for OvenauthError {
    fn into_response(self) -> axum::response::Response {
        match self {
            // Technically not correct, but easy.
            Self::Sqlx(sqlx::Error::RowNotFound) => (StatusCode::NOT_FOUND, "Not Found").into_response(),
            _ => {
                tracing::error!("{}", self);
                (StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong").into_response()
            }
        }
    }
}
