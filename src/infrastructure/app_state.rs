
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,

}