use serde::{Serialize, Deserialize};
use sqlx::{PgPool, Result};

#[derive(Debug, Serialize, Default)]
pub struct PublicOptions {
    pub name: Option<String>,
    pub emote_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct StreamOptions {
    name: Option<String>,
    emote_id: Option<String>,
    token: String,
    public: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStreamOptions {
    name: Option<String>,
    emote_id: Option<String>,
    #[serde(default)]
    token: bool,
    public: Option<bool>,
}

impl UpdateStreamOptions {
    pub async fn update(&self, user_id: i32, pool: &PgPool) -> Result<StreamOptions> {
        let so = sqlx::query_as!(
            StreamOptions,
            r#"--sql
            update options
            set name = coalesce($1, name),
                emote_id = coalesce($2, emote_id),
                public = coalesce($3, public),
                token = case when $4
                    then MD5(random()::text)
                    else token
                    end
            where user_id = $5
            returning name, emote_id, public, token
            "#,
            self.name,
            self.emote_id,
            self.public,
            self.token,
            user_id
        )
        .fetch_one(pool)
        .await?;
        Ok(so)
    }
}

impl StreamOptions {
    pub async fn from_user_id(user_id: i32, pool: &PgPool) -> Result<Self> {
        Ok(sqlx::query_as!(
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
        .await?)
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
