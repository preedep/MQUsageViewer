use actix_web::{App, HttpServer, web};
use log::info;
use std::sync::{Arc, Mutex};

mod application;
mod domain;
mod infrastructure;
mod interface;

#[actix_web::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    pretty_env_logger::init();
    dotenv::dotenv().ok();

    info!("Starting MQ Usage Viewer (Demo) on http://localhost:8080");

    let connection = rusqlite::Connection::open("datasets/mqdata.db")?;
    let app_state = infrastructure::app_state::AppState {
        db: Arc::new(Mutex::new(connection)),
    };
    HttpServer::new(move || {
        App::new()
            .wrap(actix_web::middleware::Logger::default())
            .app_data(web::Data::new(app_state.clone()))
            .service(web::scope("/api/v1").service(interface::api::mq_log_handler::search_mq_log))
    })
    .bind(("0.0.0.0", 8888))?
    .run()
    .await?;

    Ok(())
}
