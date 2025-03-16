use crate::infrastructure::middleware::auth_middleware::AuthMiddleware;
use actix_files::Files;
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

    info!("Starting MQ Usage Viewer (Demo) on http://localhost:8888");

    let user_name = std::env::var("USER_NAME").expect("USER_NAME must be set");
    let password = std::env::var("PASSWORD").expect("PASSWORD must be set");
    let secret_value = std::env::var("SECRET_VALUE").expect("SECRET_VALUE must be set");
    let salt_key = std::env::var("SALT_KEY").expect("SALT_KEY must be set");

    let connection = rusqlite::Connection::open("datasets/mqdata.db")?;
    let app_state = infrastructure::app_state::AppState {
        db: Arc::new(Mutex::new(connection)),
        user_name,
        password,
        secret_value,
        salt_key,
    };
    HttpServer::new(move || {
        App::new()
            .wrap(actix_web::middleware::Logger::default())
            .app_data(web::Data::new(app_state.clone()))
            .service(interface::api::login_handler::login)
            .service(
                web::scope("/api/v1")
                    .wrap(AuthMiddleware::new(web::Data::new(app_state.clone())))
                    .service(interface::api::mq_log_handler::mq_search)
                    .service(interface::api::mq_log_handler::mq_functions)
                    .service(interface::api::mq_log_handler::mq_tps_summary)
                    .service(interface::api::mq_log_handler::mq_function_systems),
            )
            .service(Files::new("/", "./statics").index_file("index.html"))
    })
    .bind(("0.0.0.0", 8888))?
    .run()
    .await?;

    Ok(())
}
