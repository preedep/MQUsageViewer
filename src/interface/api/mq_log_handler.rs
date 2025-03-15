use crate::application::mq_log_usage_service::{get_mq_function_list, get_mq_log_usage, get_system_name_list};
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{ApiResponse, SearchMqLogRequest, SearchMqLogResponse};
use actix_web::http::StatusCode;
use actix_web::{get, post, web};
use log::{debug, error};
use rusqlite::fallible_iterator::FallibleIterator;

#[get("/mq/{function}/systems")]
pub async fn mq_function_systems(app_state: web::Data<AppState>,
                                 path: web::Path<(String,)>) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    let function = &path.0;
    match get_system_name_list(&connection, function).await {
        Ok(result) => ApiResponse::<Vec<String>>::success("Success", Some(result)),
        Err(e) => ApiResponse::<Vec<String>>::error(
            &format!("Error: {}", e),
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
    }
}
#[get("/mq/functions")]
pub async fn mq_functions(app_state: web::Data<AppState>) -> impl actix_web::Responder {
    // Lock the database mutex to get a Connection
    let connection = app_state.db.lock().unwrap();

    // Call the correct get_mq_functions function (disambiguated)
    match get_mq_function_list(&connection).await {
        Ok(result) => ApiResponse::<Vec<String>>::success("Success", Some(result)),
        Err(e) => ApiResponse::<Vec<String>>::error(
            &format!("Error: {}", e),
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
    }
}
#[post("/mq/search")]
pub async fn mq_search(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    debug!(
        "mq_search: start_date: {}, end_date: {}, mq_function: {}",
        data.0.from_datetime,
        data.0.to_datetime,
        data.0.mq_function_name);


    let start_date = data.0.from_datetime;
    let end_date = data.0.to_datetime;
    let mq_function = &data.0.mq_function_name;

    let system_name = match &data.0.system_name {
        Some(name) => Some(name.as_str()),
        None => None,
    };
    let result = get_mq_log_usage(
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
            error!(
                "mq_search: Error: {}",
                e.to_string());

            ApiResponse::<Vec<SearchMqLogResponse>>::error(
                &message,
                StatusCode::INTERNAL_SERVER_ERROR,
            )
        }
    }
}
