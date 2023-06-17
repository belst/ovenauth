use actix_cors::Cors;
use actix_identity::IdentityMiddleware;
use actix_session::{storage::CookieSessionStore, SessionMiddleware};
use actix_web::{
    body::BoxBody, cookie::Key, middleware::Logger, post, web, App, HttpRequest, HttpResponse,
    HttpServer, Responder,
};
use chrono::Utc;
use dotenvy::dotenv;
use env_logger::Env;
use log::{error, info};
use serde::{de::Visitor, Deserialize, Serialize};
use sqlx::PgPool;
use std::env;
use url::Url;

mod user;

use crate::user::StreamOption;

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    client: Client,
    request: Request,
}

#[derive(Debug, Serialize, Deserialize)]
struct Client {
    address: String,
    port: u16,
    user_agent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Request {
    direction: Direction,
    protocol: Protocol,
    url: String,
    time: chrono::DateTime<Utc>,
    new_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Direction {
    Incoming,
    Outgoing,
}

#[derive(Debug, Serialize)]
enum Protocol {
    WebRTC,
    Rtmp,
    Srt,
    Llhls,
    Thumbnail,
}

impl<'de> Deserialize<'de> for Protocol {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct StrVisitor;

        impl<'de> Visitor<'de> for StrVisitor {
            type Value = Protocol;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                write!(formatter, "a string")
            }

            fn visit_str<E>(self, s: &str) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                use Protocol::*;
                let p = match s.to_lowercase().as_str() {
                    "webrtc" => WebRTC,
                    "rtmp" => Rtmp,
                    "srt" => Srt,
                    "llhls" => Llhls,
                    "thumbnail" => Thumbnail,
                    _ => return Err(E::custom("Unknown protocol")),
                };
                Ok(p)
            }
        }

        deserializer.deserialize_str(StrVisitor)
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct Response {
    allowed: bool,
    new_url: Option<String>,
    lifetime: Option<u64>,
    reason: Option<String>,
}

impl Response {
    fn new(
        allowed: bool,
        new_url: Option<String>,
        lifetime: Option<u64>,
        reason: Option<String>,
    ) -> Self {
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

    fn redirect(new_url: String) -> Self {
        Self::new(true, Some(new_url), None, None)
    }

    fn denied(reason: String) -> Self {
        Self::new(false, None, None, Some(reason))
    }
}

impl Responder for Response {
    type Body = BoxBody;
    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        HttpResponse::Ok().json(&self)
    }
}

// TODO: verify X-OME-Signature
#[post("/webhook")]
async fn webhook(body: web::Json<Config>, db: web::Data<PgPool>) -> Response {
    if let Direction::Outgoing = body.request.direction {
        // TODO Implement correct redirects
        return Response::allowed();
    }
    let mut url = match Url::parse(&body.request.url) {
        Ok(url) => url,
        Err(e) => {
            error!("{}", e);
            return Response::denied(format!("{}", e));
        }
    };

    let creds: Option<Vec<&str>> = url.path_segments().map(|s| s.collect());

    if creds.is_none() {
        return Response::denied("Invalid URL".to_string());
    }

    let creds = creds.unwrap();

    if creds.len() != 2 || creds[0] != "app" {
        return Response::denied("Unknown Application".to_string());
    }

    let token = creds[1];

    let user = match StreamOption::get_user_from_token(token, &db).await {
        Ok(user) => user,
        Err(e) => {
            error!("{}", e);
            return Response::denied(format!("{}", e));
        }
    };
    url.set_path(&format!("app/{}", user.username));
    Response::redirect(url.to_string())
}

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL is not set");
    let host = env::var("HOST").expect("HOST is not set");
    let port = env::var("PORT").expect("PORT is not set");

    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

    let db_pool = PgPool::connect(&db_url).await?;

    sqlx::migrate!("./migrations").run(&db_pool).await?;

    let secret = Key::generate();

    info!("Starting server on {}:{}", host, port);
    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(Cors::permissive())
            .wrap(IdentityMiddleware::default())
            .wrap(
                SessionMiddleware::builder(CookieSessionStore::default(), secret.clone())
                    .cookie_content_security(actix_session::config::CookieContentSecurity::Private)
                    .cookie_name("auth".to_string())
                    .build(),
            )
            .app_data(web::Data::new(db_pool.clone()))
            .service(webhook)
            .service(user::login)
            .service(user::logout)
            .service(user::register)
            .service(user::index)
            .service(user::me)
            .service(user::options)
            .service(user::reset)
    })
    .bind(format!("{}:{}", host, port))?
    .run()
    .await?;

    Ok(())
}
