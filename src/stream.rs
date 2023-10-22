use axum::{
    extract::{Path, State},
    routing::get,
    Router, Json,
};
use serde::Serialize;
use sqlx::PgPool;

use crate::error::OvenauthError;

#[derive(Debug, Serialize)]
struct PublicStreamOptions {
    name: String,
    username: String,
}

async fn stream_options(
    Path(stream): Path<String>,
    State(pool): State<PgPool>,
) ->  Result<Json<PublicStreamOptions>, OvenauthError> {
    Ok(Json(sqlx::query_as!(
        PublicStreamOptions,
        r#"
            select o.name, u.username
            from options o, users u
            where o.user_id = u.id
            and u.username = $1
        "#,
        &stream
    )
    .fetch_one(&pool)
    .await?))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/:stream", get(stream_options))
}
