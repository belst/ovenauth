use axum::extract::ws::{Message, WebSocket};
use axum::extract::{State, WebSocketUpgrade};
use axum::response::Response;
use axum::routing::get;
use axum::{Extension, Router};
use futures_util::{StreamExt, SinkExt};
use futures_util::future::select_all;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use std::ops::{Deref, DerefMut};
use std::sync::Arc;
use tokio::sync::broadcast::{channel, Sender};
use tokio::sync::{Mutex, Semaphore};
use tokio_stream::wrappers::BroadcastStream;

use crate::user::User;

#[derive(Debug, Default)]
pub struct PubSubImpl {
    inner: Mutex<HashMap<String, Sender<String>>>,
}

#[derive(Debug, Default, Clone)]
pub struct PubSub(Arc<PubSubImpl>);
impl Deref for PubSub {
    type Target = PubSubImpl;

    fn deref(&self) -> &Self::Target {
        &*self.0
    }
}

pub struct Subscription {
    recv: BroadcastStream<String>,
    channel_name: String,
    pubsub: PubSub,
}

impl PubSub {
    pub async fn send(&self, channel: &str, msg: String) {
        let l = self.inner.lock().await;
        if let Some(sender) = l.get(channel) {
            let _ = sender.send(msg);
        }
    }

    pub async fn subscribe(&self, channel_name: &str) -> Subscription {
        let mut l = self.inner.lock().await;
        let sender = l
            .entry(channel_name.into())
            .or_insert_with(|| channel(100).0);
        Subscription {
            channel_name: channel_name.into(),
            recv: BroadcastStream::new(sender.subscribe()),
            pubsub: self.clone(),
        }
    }
}

impl Deref for Subscription {
    type Target = BroadcastStream<String>;

    fn deref(&self) -> &Self::Target {
        &self.recv
    }
}

impl DerefMut for Subscription {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.recv
    }
}

impl Subscription {
    pub async fn unsubscribe(self) {
        // dont care if this is not a matching recevier to the channel,
        // could check by creating a new receiver and then using .is_same
        // if channel has 0 receiver we remove the channel from the map
        drop(self.recv);
        let mut l = self.pubsub.inner.lock().await;
        let delete = if let Some(sender) = l.get(&self.channel_name) {
            sender.receiver_count() == 0
        } else {
            false
        };
        if delete {
            l.remove(&self.channel_name);
        }
    }
}

#[derive(Debug, Deserialize)]
enum IncomingMessage {
    Subscribe { channel_name: String },
    Unsubscribe { channel_name: String },
}

#[derive(Debug, Serialize)]
struct OutgoingMessage {
    channel_name: String,
    msg: String,
}

async fn ws_connection(s: WebSocket, pool: PgPool, user: Option<User>, pubsub: PubSub) {
    let (mut tx, mut rx) = s.split();

    let subscriptions: Arc<Mutex<HashMap<String, Subscription>>> =
        Arc::new(Mutex::new(HashMap::new()));
    let s = subscriptions.clone();
    let sem = Arc::new(Semaphore::new(0));
    let sem_prime = sem.clone();
    let mut recv_task = tokio::spawn(async move {
        // TODO Ping Pong
        while let Some(Ok(Message::Text(msg))) = rx.next().await {
            let Ok(msg) = serde_json::from_str::<IncomingMessage>(&msg) else {
                break;
            };
            match msg {
                IncomingMessage::Subscribe { channel_name } => {
                    let mut l = s.lock().await;
                    if !l.contains_key(&channel_name) {
                        let sub = pubsub.subscribe(&channel_name).await;
                        l.insert(channel_name, sub);
                        sem.add_permits(1);
                    }
                }
                IncomingMessage::Unsubscribe { channel_name } => {
                    if let Some(s) = s.lock().await.remove(&channel_name) {
                        s.unsubscribe().await;
                        sem.acquire().await.expect("semaphore not to be closed").forget();
                    }
                }
            }
        }
    });

    let mut send_task = tokio::spawn(async move {
        loop {
            // Make sure we have at least 1 subscription
            let _acq = sem_prime.acquire().await.expect("semaphore not to be closed");
            let (val, n, v) = select_all(subscriptions.lock().await.values_mut().map(|s| s.next())).await;

            match val {
                Some(Ok(v)) => { tx.send(Message::Text(v)).await.ok(); },
                Some(Err(e)) => {},
                None => { break; }
            }
        }
    });

    tokio::select! {
        _ = (&mut recv_task) => send_task.abort(),
        _ = (&mut send_task) => recv_task.abort(),
    };

}

async fn handler(
    ws: WebSocketUpgrade,
    State(pool): State<PgPool>,
    user: Option<Extension<User>>,
    Extension(pubsub): Extension<PubSub>,
) -> Response {
    ws.on_upgrade(|s| ws_connection(s, pool, user.map(|e| e.0), pubsub))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/", get(handler))
}
