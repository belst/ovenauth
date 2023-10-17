use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, State};
use axum::response::Response;
use axum::routing::get;
use axum::{Router, Extension};
use chrono::Utc;
use futures_util::future::join_all;
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, RwLock};
use ulid::Ulid;

use crate::error::OvenauthError;
use crate::user::User;

#[derive(Debug, Default)]
struct Room {
    listeners: Arc<Mutex<Vec<SplitSink<WebSocket, Message>>>>,
}

#[derive(Debug, Clone, Serialize)]
struct OutgoingMessage {
    message_id: Ulid,
    content: String,
    author: String,
    timestamp: chrono::DateTime<Utc>,
    reply_to: Option<Ulid>,
}

#[derive(Debug, Clone, Deserialize)]
struct IncomingMessage {
    content: String,
    reply_to: Option<Ulid>,
}

type ChatState = Arc<RwLock<HashMap<String, Room>>>;

async fn handle_socket(socket: WebSocket, room: String, state: ChatState, user: User) {
    let (sender, mut receiver) = socket.split();
    let room = {
        let mut rooms = state.write().await;

        let room = rooms.entry(room).or_insert_with(Default::default);
        room.listeners.lock().await.push(sender); // does this release the lock immediatly again?
        room.listeners.clone()
    };

    tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            let msg = match msg {
                Message::Text(msg) => msg,
                Message::Binary(_) | Message::Ping(_) | Message::Pong(_) | Message::Close(_) => {
                    break
                }
            };
            let msg: IncomingMessage = serde_json::from_str(&msg)?;
            let outgoing = OutgoingMessage {
                message_id: Ulid::new(),
                content: msg.content,
                author: user.username.clone(),
                timestamp: Utc::now(),
                reply_to: msg.reply_to,
            };
            let json = serde_json::to_string(&outgoing)?;
            let mut lock = room.lock().await;
            join_all(
                lock.iter_mut()
                    .map(move |l| l.send(Message::Text(json.clone()))),
            )
            .await;
        }
        Ok::<_, OvenauthError>(())
    });
}

async fn handler(
    ws: WebSocketUpgrade,
    Path(room): Path<String>,
    State(state): State<ChatState>,
    Extension(user): Extension<User>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, room, state, user))
}

pub fn routes<S>() -> Router<S> {
    Router::new()
        .route("/:room", get(handler))
        .with_state(Arc::new(RwLock::new(HashMap::new())))
}
