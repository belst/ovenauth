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

use crate::error::OvenauthError;
use crate::user::User;

#[derive(Debug)]
struct Room {
    users: HashMap<String, usize>,
    tx: broadcast::Sender<MessageType>,
    messagebuffer: Arc<RwLock<VecDeque<OutgoingMessage>>>,
}

const BUFFERSIZE: usize = 50;

impl Room {
    fn new(tx: broadcast::Sender<MessageType>) -> Self {
        Room {
            users: HashMap::new(),
            tx,
            messagebuffer: Arc::new(RwLock::new(VecDeque::with_capacity(BUFFERSIZE))),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
enum MessageType {
    Join(String),
    Leave(String),
    Msg(OutgoingMessage),
    Connect(HashSet<String>),
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

//#[tracing::instrument]
async fn handle_socket(socket: WebSocket, room: String, state: ChatState, user: Option<User>) {
    tracing::info!(%room, ?user, "New Websocket connection");
    let (mut sender, mut receiver) = socket.split();
    let (tx, messagebuffer, count) = {
        let mut rooms = state.lock().await;

        let room = rooms
            .entry(room.clone())
            .or_insert_with(|| Room::new(broadcast::channel(100).0));
        //tracing::info!(room = ?room.users, "we got a room");
        let mut c = None;
        if let Some(ref user) = user {
            c = Some(
                *room
                    .users
                    .entry(user.username.clone())
                    .and_modify(|c| *c += 1)
                    .or_insert(1),
            );
        }
        let mut err = false;
        let userlistmsg =
            serde_json::to_string(&MessageType::Connect(room.users.keys().cloned().collect()))
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
                let c = room
                    .users
                    .get_mut(&user.username)
                    .expect("User to exist in room");
                *c -= 1;
                if *c == 0 {
                    room.users.remove(&user.username);
                }
            }
            // return here since this happens before we start any tasks
            return;
        }
        (room.tx.clone(), room.messagebuffer.clone(), c)
    };

    let mut rx = tx.subscribe();
    if let Some(ref u) = user {
        // Only send join message on first connection
        if count.expect("Count to exists, since we are a user") == 1 {
            let _ = tx.send(MessageType::Join(u.username.clone()));
        }
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
            let e: Option<OvenauthError> = loop {
                match receiver.next().await {
                    Some(msg) => {
                        let msg = match msg {
                            Ok(Message::Text(msg)) => msg,
                            Ok(_) => continue, // invalid msg type
                            Err(e) => break Some(e.into()),
                        };
                        let msg = match serde_json::from_str::<IncomingMessage>(&msg) {
                            Ok(m) => m,
                            Err(e) => break Some(e.into()),
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
                    None => {}
                }
            };
            if let Some(err) = e {
                tracing::error!(?err, "Recv Loop Error");
            }
        } else {
            // Need to poll to handle PING
            while let Some(Ok(_)) = receiver.next().await {
                // ignore incoming message from anonymous users
            }
        }
    });

    // if anything fails, abort
    let error = tokio::select! {
        res = (&mut send_task) => {recv_task.abort(); res},
        res = (&mut recv_task) => {send_task.abort(); res},
    };
    tracing::error!(?error, "Task Join Error");
    if let Some(u) = user {
        let mut rooms = state.lock().await;
        let room = rooms.get_mut(&room).expect("Room to exist");
        let c = room
            .users
            .get_mut(&u.username)
            .expect("User to exist in room before he leaves");
        *c -= 1;
        if *c == 0 {
            room.users.remove(&u.username);
            let _ = tx.send(MessageType::Leave(u.username));
        }
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
