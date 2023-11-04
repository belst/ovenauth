use axum::extract::ws::{Message, WebSocket};
use axum::extract::{State, WebSocketUpgrade};
use axum::response::Response;
use axum::routing::get;
use axum::{Extension, Router};
use futures_util::{pin_mut, Future, SinkExt, Stream, StreamExt};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use std::ops::{Deref, DerefMut};
use std::sync::Arc;
use std::task::Poll;
use tokio::sync::broadcast::{channel, Sender};
use tokio::sync::Mutex;
use tokio_stream::wrappers::errors::BroadcastStreamRecvError;
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

#[derive(Debug)]
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
// not possible atm, since unsubscribe takes ownership
//impl Drop for Subscription {
//    fn drop(&mut self) {
//        self.unsubscribe();
//    }
//}

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

#[derive(Debug, Default, Clone)]
struct Subscriptions(Arc<Mutex<HashMap<String, Subscription>>>);

impl Stream for Subscriptions {
    type Item = Result<OutgoingMessage, BroadcastStreamRecvError>;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        let lock = self.0.lock();
        pin_mut!(lock);
        let mut guard = match lock.poll(cx) {
            Poll::Ready(g) => g,
            Poll::Pending => return Poll::Pending,
        };

        let item = guard
            .iter_mut()
            .find_map(|(k, v)| match v.poll_next_unpin(cx) {
                Poll::Ready(o) => Some(o.map(|r| {
                    r.map(|s| OutgoingMessage {
                        channel_name: k.to_owned(),
                        msg: s,
                    })
                })),
                Poll::Pending => None,
            });

        match item {
            Some(v) => Poll::Ready(v),
            None => Poll::Pending,
        }
    }
}

async fn ws_connection(s: WebSocket, pool: PgPool, user: Option<User>, pubsub: PubSub) {
    let (mut tx, mut rx) = s.split();

    let mut subscriptions: Subscriptions = Default::default();
    let s = subscriptions.clone();
    let mut recv_task = tokio::spawn(async move {
        // TODO Ping Pong
        while let Some(Ok(Message::Text(msg))) = rx.next().await {
            let Ok(msg) = serde_json::from_str::<IncomingMessage>(&msg) else {
                break;
            };
            match msg {
                IncomingMessage::Subscribe { channel_name } => {
                    let mut l = s.0.lock().await;
                    if !l.contains_key(&channel_name) {
                        let sub = pubsub.subscribe(&channel_name).await;
                        l.insert(channel_name, sub);
                    }
                }
                IncomingMessage::Unsubscribe { channel_name } => {
                    if let Some(s) = s.0.lock().await.remove(&channel_name) {
                        s.unsubscribe().await;
                    }
                }
            }
        }
    });

    let mut send_task = tokio::spawn(async move {
        while let Some(v) = subscriptions.next().await {
            match v {
                Ok(v) => {
                    tx.send(Message::Text(
                        serde_json::to_string(&v).expect("serialization to work"),
                    ))
                    .await
                    .ok();
                }
                Err(e) => {}
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

