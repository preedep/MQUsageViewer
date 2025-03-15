use log::info;

mod application;
mod domain;

#[actix_web::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    pretty_env_logger::init();
    info!("Starting MQ Usage Viewer (Demo) on http://localhost:8080");

    let connection = rusqlite::Connection::open("mqdata.db")?;


    Ok(())
}
