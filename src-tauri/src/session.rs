use std::sync::Mutex;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct PublicUser {
    pub id: i64,
    pub name: String,
    pub username: String,
    pub role: String,
}

pub struct SessionState(pub Mutex<Option<PublicUser>>);
