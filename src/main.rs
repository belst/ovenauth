use axum::Router;
use axum_login::{AuthManagerLayerBuilder, tower_sessions::SessionManagerLayer};
use dotenvy::dotenv;
use rand::RngExt;
use sqlx::PgPool;
use std::{env, net::IpAddr};
use tower_http::{
    cors::CorsLayer,
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tower_sessions::cookie::time::Duration;
use tower_sessions::{MemoryStore, cookie::Key};
use tracing::Level;
use tracing_subscriber::prelude::*;

use crate::user::Backend;

mod chat;
mod error;
mod options;
mod stream;
mod user;
mod webhook;

async fn connect_to_db(db_url: &str) -> sqlx::Result<PgPool> {
    let db_pool = PgPool::connect(db_url).await?;
    sqlx::migrate!("./migrations").run(&db_pool).await?;
    Ok(db_pool)
}

fn setup_tracing() {
    let console_layer = console_subscriber::spawn();
    tracing_subscriber::registry()
        .with(console_layer)
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                "ovenauth=debug,tower_http=info,axum::rejection=trace,tokio=trace,runtime=trace"
                    .into()
            }),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(false)
                .compact(),
        )
        .init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    setup_tracing();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL is not set");
    let host = env::var("LISTEN").expect("LISTEN is not set");
    let port = env::var("PORT").expect("PORT is not set");
    let secret = env::var("SECRET")
        .and_then(|s| {
            if s.len() == 64 {
                Ok(s.into_bytes())
            } else {
                Err(env::VarError::NotPresent)
            }
        })
        .unwrap_or(rand::rng().random::<[u8; 64]>().into());
    let db_pool = connect_to_db(&db_url).await?;
    let backend = Backend {
        db: db_pool.clone(),
    };

    let session_store = MemoryStore::default();
    let key = Key::from(&secret);
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(tower_sessions::Expiry::OnInactivity(Duration::days(1)))
        .with_signed(key);
    let auth_layer = AuthManagerLayerBuilder::new(backend, session_layer).build();
    let cors = CorsLayer::very_permissive();

    tracing::info!("Starting server on {}:{}", host, port);
    let app: Router = Router::new()
        .merge(webhook::routes())
        .nest("/user", user::routes())
        .nest("/stream", stream::routes())
        .nest("/chat", chat::routes())
        .layer(auth_layer)
        .layer(cors)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .with_state(db_pool);

    let listener =
        tokio::net::TcpListener::bind(&(host.parse::<IpAddr>()?, port.parse::<u16>()?)).await?;

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
