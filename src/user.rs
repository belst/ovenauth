use std::env;

use actix_identity::Identity;
use actix_web::{get, post, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use anyhow::{bail, Result};
use log::error;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};

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

#[derive(FromRow, Debug, Serialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    #[serde(skip)]
    pub password: String,
    pub hidden: bool,
}

#[derive(FromRow, Debug, Serialize)]
pub struct StreamOption {
    pub token: String,
    pub user_id: i32,
    pub name: String,
}

impl StreamOption {
    pub async fn get_user_from_token(token: &str, pool: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select u.username, u.id, u.password, u.hidden from users u, options o where u.id = o.user_id and o.token = $1",
            token
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    pub async fn from_user_id(user_id: i32, pool: &PgPool) -> Result<Option<Self>> {
        let ooptions = sqlx::query_as!(
            Self,
            "select o.token, o.user_id, o.name from options o where o.user_id = $1",
            user_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(ooptions)
    }
}

impl User {
    pub async fn from_id(id: i32, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select id, username, password, hidden from users where id = $1",
            id
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    pub async fn from_username(username: &str, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select id, username, password, hidden from users where username = $1",
            username
        )
        .fetch_one(db)
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
            "insert into users (username, password) values ($1, $2) returning id, username, password, hidden",
            &creds.username,
            &password
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    pub async fn get_tokens(&self, db: &PgPool) -> Result<StreamOption> {
        let tokens = sqlx::query_as!(
            StreamOption,
            "select token, user_id, name from options where user_id = $1",
            self.id
        )
        .fetch_one(db)
        .await?;

        Ok(tokens)
    }

    pub async fn all(db: &PgPool) -> Result<Vec<User>> {
        let users = sqlx::query_as!(User, "select * from users where hidden = false")
            .fetch_all(db)
            .await?;

        Ok(users)
    }
}

// ROUTES

#[post("/register")]
pub async fn register(
    req: HttpRequest,
    db: web::Data<PgPool>,
    creds: web::Json<UserWrapper<RegisterCreds>>,
) -> impl Responder {
    let creds = creds.into_inner().user;
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
            Identity::login(&req.extensions(), user.id.to_string()).unwrap();
            HttpResponse::Ok().json(json!({ "user": user }))
        }
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[post("/logout")]
pub async fn logout(id: Identity) -> impl Responder {
    id.logout();

    HttpResponse::Ok().json(json!({}))
}

#[post("/login")]
async fn login(
    req: HttpRequest,
    creds: web::Json<UserWrapper<LoginCredentials>>,
    db: web::Data<PgPool>,
) -> impl Responder {
    if let Ok(user) = User::from_creds(&creds.user, &db).await {
        Identity::login(&req.extensions(), user.id.to_string()).unwrap();
        HttpResponse::Ok().json(json!({ "user": user }))
    } else {
        HttpResponse::Unauthorized().json("Invalid username or password")
    }
}

#[get("/users")]
pub async fn index(db: web::Data<PgPool>) -> impl Responder {
    match User::all(&db).await {
        Ok(users) => HttpResponse::Ok().json(json!({ "users": users })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/user")]
pub async fn me(id: Identity, db: web::Data<PgPool>) -> impl Responder {
    let id = id.id().unwrap().parse::<i32>().unwrap();

    match User::from_id(id, &db).await {
        Ok(user) => HttpResponse::Ok().json(json!({ "user": user })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/options")]
pub async fn options(id: Identity, db: web::Data<PgPool>) -> impl Responder {
    let id = id.id().unwrap().parse::<i32>().unwrap();

    match StreamOption::from_user_id(id, &db).await {
        Ok(options) => HttpResponse::Ok().json(json!({ "options": options })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[post("/reset")]
pub async fn reset(id: Identity, db: web::Data<PgPool>) -> impl Responder {
    let id = id.id().unwrap().parse::<i32>().unwrap();

    let q = sqlx::query!(
        "
        insert into options
            (name, user_id, token)
        values
            ('Stream Token', $1, MD5(random()::text))
        on conflict (user_id) do update
        set token = MD5(random()::text)",
        id
    );

    match q.execute(&**db).await {
        Ok(_) => HttpResponse::Ok().json(json!({})),
        Err(e) => {
            error!("{}", e);
            return HttpResponse::InternalServerError().finish();
        }
    }
}
