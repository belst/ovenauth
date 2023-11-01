use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;

use crate::{error::OvenauthError, options::PublicOptions};

async fn stream_options(
    Path(stream): Path<String>,
    State(pool): State<PgPool>,
) -> Result<Json<PublicOptions>, OvenauthError> {
    Ok(Json(PublicOptions::from_username(&stream, &pool).await?))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/:stream", get(stream_options))
}
