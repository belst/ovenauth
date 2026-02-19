use std::env;

use anyhow::{Context, Result};
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use axum_login::{AuthUser, AuthnBackend, login_required};
use rand::RngExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool, Row, postgres::PgRow};

use crate::{
    error::OvenauthError,
    options::{StreamOptions, UpdateStreamOptions},
};

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
    // TODO SecretString
    pub password: String,
    pub hidden: bool,
}

#[derive(Clone)]
pub struct Backend {
    pub db: PgPool,
}

impl AuthnBackend for Backend {
    type User = User;

    type Credentials = LoginCredentials;

    type Error = sqlx::Error;

    fn authenticate(
        &self,
        creds: Self::Credentials,
    ) -> impl Future<Output = std::result::Result<Option<Self::User>, Self::Error>> + Send {
        User::from_creds(creds, &self.db)
    }

    fn get_user(
        &self,
        user_id: &axum_login::UserId<Self>,
    ) -> impl Future<Output = std::result::Result<Option<Self::User>, Self::Error>> + Send {
        User::from_id(*user_id, &self.db)
    }
}

impl<'r> FromRow<'r, PgRow> for User {
    fn from_row(row: &'r PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            username: row.try_get("username")?,
            // password: SecretString::from_str(row.try_get("password")?).expect("Infallible"),
            password: row.try_get("password")?,
            hidden: row.try_get("hidden")?,
        })
    }
}

impl User {
    pub async fn from_token(token: &str, pool: &PgPool) -> sqlx::Result<Option<User>> {
        let user = sqlx::query_as!(
                User,
                "select u.username, u.id, u.password, u.hidden from users u, options o where u.id = o.user_id and o.token = $1",
                token
            )
            .fetch_optional(pool)
            .await?;

        Ok(user)
    }

    pub async fn from_id(id: i32, pool: &PgPool) -> sqlx::Result<Option<User>> {
        let Some(user) = sqlx::query_as!(
            User,
            "select id, username, password, hidden from users where id = $1",
            id
        )
        .fetch_optional(pool)
        .await?
        else {
            return Ok(None);
        };

        Ok(Some(user))
    }

    pub async fn from_creds(creds: LoginCredentials, db: &PgPool) -> sqlx::Result<Option<User>> {
        let Some(user) = sqlx::query_as!(
            User,
            "select id, username, password, hidden from users where username = $1",
            &creds.username
        )
        .fetch_optional(db)
        .await?
        else {
            return Ok(None);
        };

        let verified =
            argon2::verify_encoded(&user.password, creds.password.as_bytes()).expect("Infallible");

        if verified { Ok(Some(user)) } else { Ok(None) }
    }

    pub async fn create_from_creds(creds: &RegisterCreds, db: &PgPool) -> Result<User> {
        let salt = rand::rng().random::<[u8; 16]>();
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

        let _ = StreamOptions::create(user.id, db).await?;

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

impl AuthUser for User {
    type Id = i32;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}

pub type AuthSession = axum_login::AuthSession<Backend>;

// ROUTES
async fn register(
    mut auth: AuthSession,
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

pub async fn logout(mut auth: AuthSession) -> impl IntoResponse {
    _ = auth.logout().await;
}
async fn login(
    mut auth: AuthSession,
    Json(creds): Json<LoginCredentials>,
) -> Result<impl IntoResponse, OvenauthError> {
    let user = auth.authenticate(creds).await?;
    if let Some(user) = user {
        auth.login(&user).await?;
        Ok(Json(json!({ "user": user })))
    } else {
        Err(OvenauthError::Other(anyhow::anyhow!("Invalid credentials")))
    }
}

async fn index(
    State(db): State<PgPool>,
    auth: AuthSession,
) -> Result<impl IntoResponse, OvenauthError> {
    let users = User::all(&db, auth.user.is_some()).await?;
    Ok(Json(json!({ "users": users })))
}

async fn me(auth: AuthSession) -> impl IntoResponse {
    let Some(user) = auth.user else {
        return Err(OvenauthError::Other(anyhow::anyhow!("Not logged in")));
    };
    Ok(Json(json!({ "user": user })))
}

async fn options(
    auth: AuthSession,
    State(db): State<PgPool>,
) -> Result<impl IntoResponse, OvenauthError> {
    let Some(user) = auth.user else {
        return Err(OvenauthError::Other(anyhow::anyhow!("Not logged in")));
    };
    let options = StreamOptions::from_user_id(user.id, &db).await?;
    Ok(Json(json!({ "options": options })))
}

async fn update_options(
    auth: AuthSession,
    State(db): State<PgPool>,
    Json(options): Json<UpdateStreamOptions>,
) -> Result<impl IntoResponse, OvenauthError> {
    let Some(user) = auth.user else {
        return Err(OvenauthError::Other(anyhow::anyhow!("Not logged in")));
    };
    Ok(Json(options.update(user.id, &db).await?))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/options", get(options).put(update_options))
        .route("/me", get(me))
        .route("/logout", post(logout))
        .route_layer(login_required!(Backend))
        .route("/users", get(index))
        .route("/login", post(login))
        .route("/register", post(register))
}
