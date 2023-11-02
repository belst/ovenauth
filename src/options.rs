use serde::Serialize;
use sqlx::{PgPool, Result};

#[derive(Debug, Serialize, Default)]
pub struct PublicOptions {
    pub name: Option<String>,
    pub emote_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PrivateOptions {
    pub token: String,
    pub public: bool,
}

#[derive(Debug, Serialize)]
pub struct StreamOptions {
    name: Option<String>,
    emote_id: Option<String>,
    token: String,
    public: bool,
}

impl StreamOptions {
    pub async fn from_user_id(user_id: i32, pool: &PgPool) -> Result<Self> {
        Ok(
           sqlx::query_as!(
               Self,
               r#"--sql
                select
                    name,
                    emote_id,
                    token,
                    public
                from options where user_id = $1
               "#,
               user_id
            )
           .fetch_one(pool)
           .await?
        )
    }
}

impl PrivateOptions {
    pub async fn from_user_id(user_id: i32, pool: &PgPool) -> Result<Option<Self>> {
        let ooptions = sqlx::query_as!(
            Self,
            "select o.token, o.public from options o where o.user_id = $1",
            user_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(ooptions)
    }
}

impl PublicOptions {
    pub async fn from_username(username: &str, pool: &PgPool) -> Result<Self> {
        Ok(sqlx::query_as!(
            Self,
            r#"--sql
                select
                    name,
                    emote_id
                from options
                where user_id = (select id from users where username = $1) 
                "#,
            username
        )
        .fetch_one(pool)
        .await?)
    }
}

