use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use redis::Client;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub user_name: String,
    pub password: String,
    pub secret_value: String,
    pub salt_key: String,
    pub redis_client: Option<redis::Client>,
}
