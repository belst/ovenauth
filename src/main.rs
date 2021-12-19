use actix_cors::Cors;
use actix_web::{web, Responder, post, HttpServer, App, HttpResponse};
use actix_identity::{IdentityService, CookieIdentityPolicy, Identity};
use anyhow::bail;
use chrono::Utc;
use rand::Rng;
use serde::{Deserialize, Serialize};
use dotenv::dotenv;
use sqlx::{postgres::PgPoolOptions, Pool, Postgres, FromRow};
use url::Url;
use std::{env, collections::HashMap};


#[derive(Debug, Serialize, Deserialize)]
struct Config {
    client: Client,
    request: Request,
}

#[derive(Debug, Serialize, Deserialize)]
struct Client {
    address: String,
    port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
struct Request {
    direction: Direction,
    protocol: Protocol,
    url: String,
    time: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Direction {
    Incoming,
    Outgoing,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Protocol {
    WebRTC,
    Rtmp,
    Srt,
    Hls,
    Dash,
    LLDash,
}


#[derive(Debug, Serialize, Deserialize, Default)]
struct Response {
    allowed: bool,
    new_url: Option<String>,
    lifetime: Option<u64>,
    reason: Option<String>,
}

impl Response {
    fn new(allowed: bool, new_url: Option<String>, lifetime: Option<u64>, reason: Option<String>) -> Self {
        Self {
            allowed,
            new_url,
            lifetime,
            reason,
        }
    }

    fn allowed() -> Self {
        Self::new(true, None, None, None)
    }
}

// TODO: verify X-OME-Signature
#[post("/webhook")]
async fn webhook(body: web::Json<Config>, db: web::Data<PgPool>) -> impl Responder {
    if let Direction::Outgoing = body.request.direction {
        return HttpResponse::Ok().json(Response::allowed());
    }
    let url = match Url::parse(&body.request.url) {
        Ok(url) => url,
        Err(e) => {
            println!("{}", e);
            return HttpResponse::Unauthorized().json(Response::new(false, None, None, Some(format!("{}", e))));
        }
    };
    let creds = url.query_pairs()
        .map(|(l, r)| (l.to_string(), r.to_string()))
        .collect::<HashMap<String, String>>();

    if let (Some(username), Some(password)) = (creds.get("username"), creds.get("password")) {
        let creds = LoginCredentials {
            username: username.to_string(),
            password: password.to_string(),
        };

        if let Ok(_user) = creds.verify(&db).await {
            return HttpResponse::Ok().json(Response::allowed());
        }
    }
    HttpResponse::Unauthorized().json(Response::new(false, None, None, Some("Missing credentials".to_string())))
}

#[derive(Debug, Serialize, Deserialize)]
struct LoginCredentials {
    username: String,
    password: String,
}

impl LoginCredentials {
    async fn verify(&self, db: &PgPool) -> anyhow::Result<User> {
        let user = sqlx::query_as!(
            User,
            "select * from users where username = $1",
            self.username
        ).fetch_one(db).await?;
    
        let verified = argon2::verify_encoded(&user.password, self.password.as_bytes())?;

        if verified {
            Ok(user)
        } else {
            bail!("Invalid credentials")
        }
    }
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
struct User {
    id: i32,
    username: String,
    #[serde(skip)]
    password: String,
}

#[post("/login")]
async fn login(id: Identity, creds: web::Json<LoginCredentials>, db: web::Data<PgPool>) -> impl Responder {
    if let Some(_) = id.identity() {
        return HttpResponse::Ok().json("Already logged in");
    }

    let creds = creds.into_inner();
    if let Ok(user) = creds.verify(&db).await {
        id.remember(user.id.to_string());
        HttpResponse::Ok().json(user)
    } else {
        HttpResponse::Unauthorized().json("Invalid username or password")
    }
}

#[post("/logout")]
async fn logout(id: Identity) -> impl Responder {
    id.forget();

    HttpResponse::Ok().json("Logged out")
}

type PgPool = Pool<Postgres>;

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL is not set");
    let db_pool: PgPool = PgPoolOptions::new().connect(&db_url).await?;


    let secret: [u8; 32] = rand::thread_rng().gen();
    HttpServer::new(move || {
        App::new()
            .wrap(Cors::permissive())
            .wrap(
                IdentityService::new(
                    CookieIdentityPolicy::new(&secret)
                        .name("auth")
                        .secure(true),
                )
            )
            .app_data(web::Data::new(db_pool.clone()))
            .service(webhook)
            .service(login)
            .service(logout)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await?;

    Ok(())
}
