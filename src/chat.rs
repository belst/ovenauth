use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Extension, Router};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tokio::sync::{broadcast, Mutex, RwLock};
use ulid::Ulid;

use crate::user::User;

#[derive(Debug)]
struct Room {
    users: HashSet<i32>,
    tx: broadcast::Sender<MessageType>,
    messagebuffer: Arc<RwLock<VecDeque<OutgoingMessage>>>,
}

const BUFFERSIZE: usize = 50;

impl Room {
    fn new(tx: broadcast::Sender<MessageType>) -> Self {
        Room {
            users: HashSet::new(),
            tx,
            messagebuffer: Arc::new(RwLock::new(VecDeque::with_capacity(BUFFERSIZE))),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
enum MessageType {
    Join(String),
    Leave(String),
    Msg(OutgoingMessage),
    Connect(HashSet<i32>),
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

async fn handle_socket(socket: WebSocket, room: String, state: ChatState, user: Option<User>) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, messagebuffer) = {
        let mut rooms = state.lock().await;

        let room = rooms
            .entry(room.clone())
            .or_insert_with(|| Room::new(broadcast::channel(100).0));
        if let Some(ref user) = user {
            room.users.insert(user.id);
        }
        let mut err = false;
        let userlistmsg = serde_json::to_string(&MessageType::Connect(room.users.clone()))
            .expect("serialization to work");
        err = err || sender.send(Message::Text(userlistmsg)).await.is_err();
        for m in room.messagebuffer.read().await.iter() {
            let txt =
                serde_json::to_string(&MessageType::Msg(m.clone())).expect("serialization to work");
            err = err || sender.send(Message::Text(txt)).await.is_err();
            if err {
                break;
            }
        }

        if err {
            if let Some(ref user) = user {
                room.users.remove(&user.id);
            }
            // return here since this happens before we start any tasks
            return;
        }
        (room.tx.clone(), room.messagebuffer.clone())
    };

    let mut rx = tx.subscribe();
    if let Some(ref u) = user {
        let _ = tx.send(MessageType::Join(u.username.clone()));
    }
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
    let tx_p = tx.clone();
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
                {
                    let mut msgbuff = messagebuffer.write().await;
                    while msgbuff.len() >= BUFFERSIZE {
                        msgbuff.pop_front();
                    }
                    msgbuff.push_back(outgoing.clone());
                }
                let _ = tx_p.send(MessageType::Msg(outgoing));
            }
        } else {
            // Need to poll to handle PING
            while let Some(Ok(_)) = receiver.next().await {
                // ignore incoming message from anonymous users
            }
        }
    });

    // if anything fails, abort
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
    if let Some(u) = user {
        let _ = tx.send(MessageType::Leave(u.username));
        let mut rooms = state.lock().await;
        let room = rooms.get_mut(&room).expect("Room to exist");
        room.users.remove(&u.id);
    }
}
async fn handler(
    ws: WebSocketUpgrade,
    Path(room): Path<String>,
    Extension(state): Extension<ChatState>,
    State(pool): State<PgPool>,
    user: Option<Extension<User>>,
) -> Response {
    let valid = sqlx::query_scalar!(
        r#"select count(*) = 1 as "f!" from users where username = $1"#,
        &room
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(false);
    if valid {
        ws.on_upgrade(|socket| handle_socket(socket, room, state, user.map(|e| e.0)))
    } else {
        (StatusCode::NOT_FOUND, "Chatroom not found").into_response()
    }
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/:room", get(handler))
        .layer(Extension(Arc::new(Mutex::new(
            HashMap::<String, Room>::new(),
        ))))
}
