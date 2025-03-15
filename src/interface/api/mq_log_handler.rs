use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{ApiResponse, SearchMqLogRequest, SearchMqLogResponse};
use actix_web::http::StatusCode;
use actix_web::{post, web};
use rusqlite::fallible_iterator::FallibleIterator;

#[post("/mq/search")]
pub async fn search_mq_log(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    let start_date = data.0.from_datetime;
    let end_date = data.0.to_datetime;
    let mq_function = &data.0.mq_function_name;

    let system_name = match &data.0.system_name {
        Some(name) => Some(name.as_str()),
        None => None,
    };
    let result = crate::application::mq_log_usage_service::get_mq_log_usage(
        &connection,
        &start_date,
        &end_date,
        mq_function,
        system_name,
    )
    .await;

    match result {
        Ok(result) => {
            let result = result
                .into_iter()
                .map(SearchMqLogResponse::from)
                .collect::<Vec<_>>();
            ApiResponse::<Vec<SearchMqLogResponse>>::success("Success", Some(result))
        }
        Err(e) => {
            let message = format!("Error: {}", e.to_string());
            ApiResponse::<Vec<SearchMqLogResponse>>::error(&message, StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
