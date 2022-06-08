use std::env;

use actix_identity::Identity;
use actix_web::{get, post, put, web, HttpResponse, Responder, HttpRequest};
use anyhow::{bail, Result};
use log::error;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

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
    pub public: bool,
}

#[derive(FromRow, Debug, Serialize)]
pub struct StreamOption {
    pub token: String,
    pub user_id: i32,
    pub name: String,
}

#[derive(FromRow, Debug, Serialize)]
pub struct WebAuthToken {
    pub token: String,
}

pub struct StreamViewerAuthentication {

}

pub struct AccessToken {

}

impl StreamOption {

    pub async fn get_user_from_token(token: &str, pool: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select u.username, u.id, u.password, u.hidden, u.public from users u, options o where u.id = o.user_id and o.token = $1",
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

impl StreamViewerAuthentication {
    pub async fn get_allowed_viewers(userid: i32, pool: &PgPool) -> Result<Vec<User>> {
        let allowed_users = sqlx::query_as!(
            User,
            "select * from users where users.id in (select viewer from vieweraccess where vieweraccess.id = $1);",
            userid
        ).fetch_all(pool)
            .await?;

        Ok(allowed_users)
    }

    pub async fn add_allowed_viewer(userid: i32, viewer: i32, pool: &PgPool) -> Result<()> {
        let _ = sqlx::query_as!(
            User,
            "insert into vieweraccess (id, viewer) VALUES ($1,$2);",
            userid,
            viewer
        ).fetch_all(pool)
            .await?;

        Ok(())
    }

    pub async fn delete_allowed_viewer(userid: i32, viewer: i32, pool: &PgPool) -> Result<()> {
        let _ = sqlx::query_as!(
            User,
            "delete from vieweraccess where id = $1 and viewer = $2;",
            userid,
            viewer
        ).fetch_all(pool)
            .await?;

        Ok(())
    }
}

impl AccessToken {
    pub async fn put_webauth_token(id: i32, token: &str, db: &PgPool) -> Result<()> {

        let _ = sqlx::query_as!(
            WebAuthToken,
            "insert into webauthtokens (id, token)
            values ($1, $2)
            on CONFLICT (id)
            do
                update set token = $2
            ",
            id,
            &token
        )
            .fetch_optional(db)
            .await?;

        Ok(())
    }

    pub async fn from_webauth_token(username: &str, db: &PgPool) -> Result<WebAuthToken> {

        let token = sqlx::query_as!(
            WebAuthToken,
            "select token from webauthtokens where id = (select id from users where username = $1)",
            username
        )
            .fetch_one(db)
            .await?;

        Ok(token)
    }

}

impl User {
    pub async fn from_id(id: i32, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select id, username, password, hidden, public from users where id = $1",
            id
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    pub async fn from_username(username: &str, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select id, username, password, hidden, public from users where username = $1",
            username
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    pub async fn from_creds(creds: &LoginCredentials, db: &PgPool) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            "select id, username, password, hidden, public from users where username = $1",
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
            "insert into users (username, password) values ($1, $2) returning id, username, password, hidden, public",
            &creds.username,
            &password
        )
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    #[allow(dead_code)]
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
        let users = sqlx::query_as!(User, "select * from users where hidden = false order by id")
            .fetch_all(db)
            .await?;

        Ok(users)
    }

    pub async fn set_public(db: &PgPool, is_public: bool, id: i32) -> Result<()> {
        sqlx::query!("update users set public = $1 where users.id = $2 ", is_public, id)
            .execute(db)
            .await?;
        Ok(())
    }
}

// ROUTES

#[post("/register")]
pub async fn register(
    id: Identity,
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
            id.remember(user.id.to_string());
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
    id.forget();

    HttpResponse::Ok().json(json!({}))
}

#[post("/login")]
async fn login(
    id: Identity,
    creds: web::Json<UserWrapper<LoginCredentials>>,
    db: web::Data<PgPool>,
) -> impl Responder {
    // if id.identity().is_some() {
    //     return HttpResponse::Ok().json("Already logged in");
    // }

    if let Ok(user) = User::from_creds(&creds.user, &db).await {
        id.remember(user.id.to_string());
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

#[get("/allowedViewers")]
pub async fn get_allowed_viewers(id: Identity, db: web::Data<PgPool>) -> impl Responder {

    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

    match StreamViewerAuthentication::get_allowed_viewers(id, &db).await {
        Ok(users) => HttpResponse::Ok().json(json!({ "users": users })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct AllowedDTO {
    stream: String,
}

#[get("/allowedToWatch")]
pub async fn allowed_to_watch(id: Identity, db: web::Data<PgPool>, web::Query(info): web::Query<AllowedDTO>) -> impl Responder {

    let streamer = User::from_username(&info.stream, &db).await.unwrap();

    if streamer.public {
        return HttpResponse::Ok().json(json!({ "whitelisted": "true" }))
    }

    let user_id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

    match StreamViewerAuthentication::get_allowed_viewers(streamer.id, &db).await.and_then(|users| {
        return Ok(users.is_empty() || users.into_iter().filter(|user| user.id == user_id).count() > 0);
    }) {
        Ok(allowed) => HttpResponse::Ok().json(json!({ "whitelisted": allowed })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct PermissionDTO {
    username: String,
    allowed: bool
}

#[get("/setViewerPermission")]
pub async fn set_viewer_permission(id: Identity, web::Query(info): web::Query<PermissionDTO>, db: web::Data<PgPool>) -> impl Responder {

    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

    let user_id = User::from_username(&info.username, &db).await.unwrap();

    if info.allowed {
        match StreamViewerAuthentication::add_allowed_viewer(id, user_id.id, &db).await {
            Ok(_) => HttpResponse::Ok().json(json!({ "ok" : "ok" })),
            Err(e) => {
                error!("{}", e);
                HttpResponse::InternalServerError().finish()
            }
        }
    } else {
        match StreamViewerAuthentication::delete_allowed_viewer(id, user_id.id, &db).await {
            Ok(_) => HttpResponse::Ok().json(json!({ "ok" : "ok" })),
            Err(e) => {
                error!("{}", e);
                HttpResponse::InternalServerError().finish()
            }
        }
    }
}

#[get("/submitHeaderToken")]
pub async fn submit_header_token(request: HttpRequest, db: web::Data<PgPool>) -> impl Responder {

    let headers = request.headers();
    let username = headers.get("username").expect("username").to_str().unwrap();
    let token = headers.get("token").expect("token").to_str().unwrap();

    match AccessToken::from_webauth_token(&username, &db).await {
        Ok(db_token) => {
            if db_token.token.eq(&token) {
                HttpResponse::Ok().finish()
            }  else {
                HttpResponse::InternalServerError().finish()
            }
        }
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct TokenInfo {
    username: String,
    token: String,
    streamname: String
}

#[get("/submitToken")]
pub async fn submit_token(db: web::Data<PgPool>, web::Query(info): web::Query<TokenInfo>) -> impl Responder {


    let username = info.username;
    let token = info.token;
    let stream = info.streamname;

    match AccessToken::from_webauth_token(&username, &db).await {
        Ok(db_token) => {
            if db_token.token.eq(&token) {
                let streamer_id = User::from_username(&stream, &db).await.expect("expected existing account");

                let allowed = StreamViewerAuthentication::get_allowed_viewers(streamer_id.id, &db).await.expect("expected whitelisted users");
                if allowed.len() == 0 {
                    return HttpResponse::Ok().finish();
                }
                if allowed.iter().filter(|entry| entry.username.eq(&username)).count() == 0 {
                    return HttpResponse::Unauthorized().json(json!({ "errors": ["You are not whitelisted"] }))
                }
                HttpResponse::Ok().finish()
                //TODO maybe drop token
            }  else {
                HttpResponse::InternalServerError().finish()
            }
        }
        Err(e) => {
            error!("{}", e);

            let streamer_id = User::from_username(&stream, &db).await.expect("expected existing account");
            if streamer_id.public {
                HttpResponse::Ok().finish()
            } else {
                HttpResponse::InternalServerError().finish()
            }
        }
    }
}

#[derive(Deserialize)]
pub struct IsPublic {
    is_public: bool
}

#[get("/setPublic")]
pub async fn set_public(db: web::Data<PgPool>, id: Identity, web::Query(info): web::Query<IsPublic>) -> impl Responder {
    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

    match User::set_public(&db, info.is_public, id).await {
        Ok(_) => HttpResponse::Ok().json(json!({ "ok" : "ok" })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/user")]
pub async fn me(id: Identity, db: web::Data<PgPool>) -> impl Responder {
    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

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
    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

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
    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

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

#[put("/generateToken")]
pub async fn generate_token(id: Identity, db: web::Data<PgPool>) -> impl Responder {

    let id = match id.identity() {
        Some(id) => id.parse::<i32>().unwrap(),
        None => return HttpResponse::Unauthorized().json(json!({ "errors": ["Not logged in"] })),
    };

    let token = Uuid::new_v4().to_string();

    match AccessToken::put_webauth_token(id, &token, &db).await {
        Ok(_) => HttpResponse::Ok().json(json!({ "token": token })),
        Err(e) => {
            error!("{}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
