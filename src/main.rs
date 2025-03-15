use log::info;

mod application;
mod domain;

#[actix_web::main]
async fn main() -> Result<(), std::io::Error> {
    pretty_env_logger::init();
    info!("Starting MQ Usage Viewer (Demo) on http://localhost:8080");

    Ok(())
}
