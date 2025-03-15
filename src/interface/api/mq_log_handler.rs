use std::error::Error;
use actix_web::{post, web, HttpResponse};
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::SearchMqLogRequest;

#[post("/mq/search")]
pub async fn search_mq_log(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> Result<HttpResponse, Box<dyn Error>> {
   Ok(HttpResponse::Ok().finish())
}