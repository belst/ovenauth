use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, State};
use axum::response::Response;
use axum::routing::get;
use axum::{Extension, Router};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, Mutex};
use ulid::Ulid;

use crate::user::User;

#[derive(Debug)]
struct Room {
    users: HashSet<i32>,
    tx: broadcast::Sender<OutgoingMessage>,
}

impl Room {
    fn new(tx: broadcast::Sender<OutgoingMessage>) -> Self {
        Room {
            users: HashSet::new(),
            tx,
        }
    }
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

type ChatState = Arc<Mutex<HashMap<String, Room>>>;

/// TODO: add more message types. eg: Join/Leave/Commands...
async fn handle_socket(socket: WebSocket, room: String, state: ChatState, user: Option<User>) {
    let (mut sender, mut receiver) = socket.split();
    let tx = {
        let mut rooms = state.lock().await;

        if let Some(ref user) = user {
            let room = rooms
                .entry(room.clone())
                .or_insert_with(|| Room::new(broadcast::channel(100).0));
            room.users.insert(user.id);
            room.tx.clone()
        } else {
            let Some(room) = rooms.get(&room) else {
                // anonymous cannot create rooms
                // implement reconnect logic clientside to check if people joined
                return;
            };
            room.tx.clone()
        }
    };

    let mut rx = tx.subscribe();
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let Ok(msg) = serde_json::to_string(&msg) else {
                break;
            };
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });
    let user_p = user.clone();
    let mut recv_task = tokio::spawn(async move {
        if let Some(user) = user_p {
            while let Some(Ok(Message::Text(msg))) = receiver.next().await {
                let Ok(msg) = serde_json::from_str::<IncomingMessage>(&msg) else {
                    break;
                };
                let outgoing = OutgoingMessage {
                    message_id: Ulid::new(),
                    content: msg.content,
                    author: user.username.clone(),
                    timestamp: Utc::now(),
                    reply_to: msg.reply_to,
                };
                let _ = tx.send(outgoing);
            }
        } else {
            // Need to poll to handle PING
            while let Some(Ok(_)) = receiver.next().await {
                // ignore incoming message from anonymous users
                // noop
            }
        }
    });

    // if anything fails, abort
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
    if let Some(user) = user {
        let mut rooms = state.lock().await;
        let users = &mut rooms.get_mut(&room).expect("room to exist").users;
        users.remove(&user.id);
        if users.is_empty() {
            rooms.remove(&room);
        }
    }
}
async fn handler(
    ws: WebSocketUpgrade,
    Path(room): Path<String>,
    State(state): State<ChatState>,
    user: Option<Extension<User>>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, room, state, user.map(|e| e.0)))
}

pub fn routes<S>() -> Router<S> {
    Router::new()
        .route("/:room", get(handler))
        .with_state(Arc::new(Mutex::new(HashMap::new())))
}
