use std::{env, str::FromStr};

use anyhow::{bail, Context, Result};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Extension, Json, Router,
};
use axum_login::{
    secrecy::{ExposeSecret, SecretString, SecretVec},
    AuthUser, PostgresStore, RequireAuthorizationLayer,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{postgres::PgRow, FromRow, PgPool, Row};

use crate::{
    error::OvenauthError,
    options::{StreamOptions, UpdateStreamOptions},
};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserWrapper<T: std::fmt::Debug + Serialize> {
    user: T,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterCreds {
    username: String,
    password: String,
    password_confirmation: String,
    secret_code: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    #[serde(skip)]
    pub password: SecretString,
    pub hidden: bool,
}

impl<'r> FromRow<'r, PgRow> for User {
    fn from_row(row: &'r PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            username: row.try_get("username")?,
            password: SecretString::from_str(row.try_get("password")?).expect("Infallible"),
            hidden: row.try_get("hidden")?,
        })
    }
}

impl User {
    pub async fn from_token(token: &str, pool: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select u.username, u.id, u.password, u.hidden from users u, options o where u.id = o.user_id and o.token = $1",
            token
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    pub async fn from_creds(creds: &LoginCredentials, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select id, username, password, hidden from users where username = $1",
            &creds.username
        )
        .fetch_one(db)
        .await?;

        let verified =
            argon2::verify_encoded(&user.password.expose_secret(), creds.password.as_bytes())?;

        if verified {
            Ok(user)
        } else {
            bail!("Invalid credentials")
        }
    }

    pub async fn create_from_creds(creds: &RegisterCreds, db: &PgPool) -> Result<User> {
        let salt = rand::thread_rng().gen::<[u8; 16]>();
        let password =
            argon2::hash_encoded(creds.password.as_bytes(), &salt, &argon2::Config::default())?;

        let user = sqlx::query_as!(
            User,
            "insert into users (username, password) values ($1, $2) returning id, username, password, hidden",
            &creds.username,
            &password
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    pub async fn all(db: &PgPool, show_all: bool) -> Result<Vec<User>> {
        let users = sqlx::query_as!(
            User,
            r#"
                select * from users
                where hidden = false
                and ($1 or id in (select user_id from options where public))
                "#,
            show_all
        )
        .fetch_all(db)
        .await?;

        Ok(users)
    }
}

impl AuthUser<i32> for User {
    fn get_id(&self) -> i32 {
        self.id
    }

    fn get_password_hash(&self) -> axum_login::secrecy::SecretVec<u8> {
        SecretVec::new(self.password.expose_secret().clone().into())
    }
}

// ROUTES
pub type AuthContext = axum_login::extractors::AuthContext<i32, User, PostgresStore<User>>;

async fn register(
    mut auth: AuthContext,
    State(db): State<PgPool>,
    Json(creds): Json<RegisterCreds>,
) -> Result<Response, OvenauthError> {
    let secret = env::var("SECRET_CODE").context("SECRET_CODE missing")?;
    if creds.secret_code != secret {
        // TODO: make it json type
        return Ok((StatusCode::UNAUTHORIZED, "Invalid secret code").into_response());
    }
    let user = User::create_from_creds(&creds, &db).await?;
    auth.login(&user).await?;
    Ok(Json(json!({ "user": user })).into_response())
}

pub async fn logout(mut auth: AuthContext) -> impl IntoResponse {
    auth.logout().await;
}
async fn login(
    mut auth: AuthContext,
    State(db): State<PgPool>,
    Json(creds): Json<LoginCredentials>,
) -> Result<impl IntoResponse, OvenauthError> {
    let user = User::from_creds(&creds, &db).await?;
    auth.login(&user).await?;
    Ok(Json(json!({ "user": user })))
}

async fn index(
    State(db): State<PgPool>,
    user: Option<Extension<User>>,
) -> Result<impl IntoResponse, OvenauthError> {
    let users = User::all(&db, user.is_some()).await?;
    Ok(Json(json!({ "users": users })))
}

async fn me(Extension(user): Extension<User>) -> impl IntoResponse {
    Json(json!({ "user": user }))
}

async fn options(
    Extension(user): Extension<User>,
    State(db): State<PgPool>,
) -> Result<impl IntoResponse, OvenauthError> {
    let options = StreamOptions::from_user_id(user.id, &db).await?;
    Ok(Json(json!({ "options": options })))
}

async fn update_options(
    Extension(user): Extension<User>,
    State(db): State<PgPool>,
    Json(options): Json<UpdateStreamOptions>,
) -> Result<impl IntoResponse, OvenauthError> {
    Ok(Json(options.update(user.id, &db).await?))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/options", get(options).put(update_options))
        .route("/me", get(me))
        .route("/logout", post(logout))
        .route_layer(RequireAuthorizationLayer::<i32, User>::login())
        .route("/users", get(index))
        .route("/login", post(login))
        .route("/register", post(register))
}
