use axum::{extract::State, response::IntoResponse, routing::post, Json, Router};
use chrono::Utc;
use serde::{de::Visitor, Deserialize, Serialize};
use sqlx::PgPool;
use url::Url;

use crate::user::User;

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
pub struct WebhookResponse {
    allowed: bool,
    new_url: Option<String>,
    lifetime: Option<u64>,
    reason: Option<String>,
}

impl WebhookResponse {
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

impl IntoResponse for WebhookResponse {
    fn into_response(self) -> axum::response::Response {
        Json(self).into_response()
    }
}

// TODO: verify X-OME-Signature
async fn webhook(State(db): State<PgPool>, Json(body): Json<Config>) -> WebhookResponse {
    if let Direction::Outgoing = body.request.direction {
        // TODO Implement correct redirects
        return WebhookResponse::allowed();
    }
    let mut url = match Url::parse(&body.request.url) {
        Ok(url) => url,
        Err(e) => {
            tracing::error!("{}", e);
            return WebhookResponse::denied(format!("{}", e));
        }
    };

    let creds: Option<Vec<&str>> = url.path_segments().map(|s| s.collect());

    if creds.is_none() {
        return WebhookResponse::denied("Invalid URL".to_string());
    }

    let creds = creds.unwrap();

    if creds.len() != 2 || creds[0] != "app" {
        return WebhookResponse::denied("Unknown Application".to_string());
    }

    let token = creds[1];

    let user = match User::from_token(token, &db).await {
        Ok(user) => user,
        Err(e) => {
            tracing::error!("{}", e);
            return WebhookResponse::denied(format!("{}", e));
        }
    };
    url.set_path(&format!("app/{}", user.username));
    WebhookResponse::redirect(url.to_string())
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/webhook", post(webhook))
}
