use std::env;

use actix_identity::Identity;
use actix_web::{post, web, HttpResponse, Responder};
use anyhow::{bail, Result};
use log::error;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterCreds {
    username: String,
    password: String,
    secret_code: String,
}

#[derive(FromRow, Debug, Serialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    #[serde(skip)]
    pub password: String,
}

#[derive(FromRow, Debug, Serialize)]
pub struct Token {
    pub token: String,
    pub user_id: i32,
    pub name: String,
}

impl Token {
    pub async fn get_user_from_token(token: &str, pool: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select u.* from users u, tokens t where u.id = t.user_id and t.token = $1",
            token
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}

impl User {
    pub async fn from_id(id: i32, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(User, "select * from users where id = $1", id)
            .fetch_one(db)
            .await?;

        Ok(user)
    }

    pub async fn from_username(username: &str, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(User, "select * from users where username = $1", username)
            .fetch_one(db)
            .await?;

        Ok(user)
    }

    pub async fn from_creds(creds: &LoginCredentials, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select * from users where username = $1",
            &creds.username
        )
        .fetch_one(db)
        .await?;

        let verified = argon2::verify_encoded(&user.password, creds.password.as_bytes())?;

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
            "insert into users (username, password) values ($1, $2) returning *",
            &creds.username,
            &password
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    pub async fn get_tokens(&self, db: &PgPool) -> Result<Vec<Token>> {
        let tokens = sqlx::query_as!(Token, "select * from tokens where user_id = $1", self.id)
            .fetch_all(db)
            .await?;

        Ok(tokens)
    }
}

// ROUTES

#[post("/register")]
pub async fn register(
    id: Identity,
    db: web::Data<PgPool>,
    creds: web::Json<RegisterCreds>,
) -> impl Responder {
    let creds = creds.into_inner();
    let secret = match env::var("SECRET_CODE") {
        Ok(secret) => secret,
        Err(e) => {
            error!("{}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };
    if creds.secret_code != secret {
        return HttpResponse::Unauthorized().json("Invalid secret code");
    }
    match User::create_from_creds(&creds, &db).await {
        Ok(user) => {
            id.remember(user.id.to_string());
            HttpResponse::Ok().json(user)
        }
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[post("/logout")]
pub async fn logout(id: Identity) -> impl Responder {
    id.forget();

    HttpResponse::Ok().json("Logged out")
}

#[post("/login")]
async fn login(
    id: Identity,
    creds: web::Json<LoginCredentials>,
    db: web::Data<PgPool>,
) -> impl Responder {
    if id.identity().is_some() {
        return HttpResponse::Ok().json("Already logged in");
    }

    if let Ok(user) = User::from_creds(&creds, &db).await {
        id.remember(user.id.to_string());
        HttpResponse::Ok().json(user)
    } else {
        HttpResponse::Unauthorized().json("Invalid username or password")
    }
}
