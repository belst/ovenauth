use axum::Router;
use axum_login::{
    axum_sessions::{async_session::MemoryStore, SessionLayer},
    AuthLayer, PostgresStore,
};
use dotenvy::dotenv;
use rand::Rng;
use sqlx::PgPool;
use std::{env, net::IpAddr};
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::Level;
use tracing_subscriber::prelude::*;
use user::User;

mod chat;
mod error;
mod user;
mod webhook;

async fn connect_to_db(db_url: &str) -> sqlx::Result<PgPool> {
    let db_pool = PgPool::connect(db_url).await?;
    sqlx::migrate!("./migrations").run(&db_pool).await?;
    Ok(db_pool)
}

fn setup_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ovenauth=debug,tower_http=info,axum::rejection=trace".into()),
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
        .unwrap_or(rand::thread_rng().gen::<[u8; 64]>().into());
    let db_pool = connect_to_db(&db_url).await?;
    let user_store = PostgresStore::<User>::new(db_pool.clone());

    let session_store = MemoryStore::new();
    let session_layer = SessionLayer::new(session_store, &secret).with_secure(false);
    let auth_layer = AuthLayer::new(user_store, &secret);
    let cors = CorsLayer::very_permissive();

    tracing::info!("Starting server on {}:{}", host, port);
    let app: Router = Router::new()
        .merge(webhook::routes())
        .nest("/user", user::routes())
        .nest("/chat", chat::routes())
        .fallback_service(ServeDir::new(".").not_found_service(ServeFile::new("index.html")))
        .layer(auth_layer)
        .layer(session_layer)
        .layer(cors)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .with_state(db_pool);

    axum::Server::bind(&(host.parse::<IpAddr>()?, port.parse()?).into())
        .serve(app.into_make_service())
        .await?;

    Ok(())
}
