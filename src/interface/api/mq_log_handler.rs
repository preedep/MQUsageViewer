use crate::application::mq_log_usage_service::{get_all_mq_log_tps_summary, get_mq_function_list, get_mq_log_tps_summary, get_mq_log_usage, get_system_name_list};
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{ApiResponse, SearchMqLogRequest, SearchMqLogResponse};
use actix_web::http::StatusCode;
use actix_web::{get, post, web};
use log::{debug, error};
use redis;
use serde_json;

// Helper functions to reduce code duplication

// Helper functions for common patterns
fn handle_service_result<T>(
    result: Result<Vec<T>, Box<dyn std::error::Error>>,
    operation_name: &str,
) -> ApiResponse<Vec<SearchMqLogResponse>>
where
    T: Into<SearchMqLogResponse>,
{
    match result {
        Ok(data) => {
            let response_data = data.into_iter().map(|item| item.into()).collect::<Vec<_>>();
            ApiResponse::<Vec<SearchMqLogResponse>>::success("Success", Some(response_data))
        }
        Err(e) => {
            let message = format!("Error in {}: {}", operation_name, e);
            error!("{}", message);
            ApiResponse::<Vec<SearchMqLogResponse>>::error(&message, StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

fn handle_string_list_result(
    result: Result<Vec<String>, Box<dyn std::error::Error>>,
    operation_name: &str,
) -> ApiResponse<Vec<String>> {
    match result {
        Ok(data) => ApiResponse::<Vec<String>>::success("Success", Some(data)),
        Err(e) => {
            let message = format!("Error in {}: {}", operation_name, e);
            error!("{}", message);
            ApiResponse::<Vec<String>>::error(&message, StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

fn try_get_from_cache(redis_client: &redis::Client, cache_key: &str) -> Option<Vec<String>> {
    if let Ok(mut con) = redis_client.get_connection() {
        let cached: redis::RedisResult<String> = redis::cmd("GET").arg(cache_key).query(&mut con);
        if let Ok(json_str) = cached {
            if let Ok(result) = serde_json::from_str::<Vec<String>>(&json_str) {
                debug!("Cache hit: {}", cache_key);
                return Some(result);
            } else {
                error!("Failed to deserialize cached data for key: {}", cache_key);
            }
        } else {
            debug!("Cache miss for key: {}", cache_key);
        }
    } else {
        error!("Redis connection failed");
    }
    None
}

fn try_set_cache(redis_client: &redis::Client, cache_key: &str, data: &Vec<String>) {
    if let Ok(mut con) = redis_client.get_connection() {
        let json_data = serde_json::to_string(data).unwrap_or_default();
        let _: Result<(), redis::RedisError> = redis::cmd("SET")
            .arg(cache_key)
            .arg(json_data)
            .query(&mut con);
    }
}

fn extract_system_name_option(request: &SearchMqLogRequest) -> Option<&str> {
    request.system_name.as_ref().map(|s| s.as_str())
}

#[get("/mq/{function}/systems")]
pub async fn mq_function_systems(
    app_state: web::Data<AppState>,
    path: web::Path<(String,)>
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    let function = &path.0;
    let result = get_system_name_list(&connection, function).await;
    handle_string_list_result(result, "get_system_name_list")
}

#[get("/mq/functions")]
pub async fn mq_functions(app_state: web::Data<AppState>) -> impl actix_web::Responder {
    let cache_key = "mq_functions";
    
    // Try to get from cache first
    if let Some(ref redis_client) = app_state.redis_client {
        if let Some(cached_result) = try_get_from_cache(redis_client, cache_key) {
            return ApiResponse::<Vec<String>>::success("Success (cache)", Some(cached_result));
        }
    }
    
    // If not in cache, query database
    let connection = app_state.db.lock().unwrap();
    let result = get_mq_function_list(&connection).await;
    
    match &result {
        Ok(data) => {
            // Cache the result if Redis is available
            if let Some(ref redis_client) = app_state.redis_client {
                try_set_cache(redis_client, cache_key, data);
            }
        }
        Err(_) => {} // Error will be handled by handle_string_list_result
    }
    
    handle_string_list_result(result, "get_mq_function_list")
}

#[post("/mq/tps/summary")]
pub async fn mq_tps_summary(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    debug!(
        "mq_tps_summary: start_date: {}, end_date: {}, mq_function: {}",
        data.from_datetime, data.to_datetime, data.mq_function_name
    );

    let system_name = extract_system_name_option(&data);
    let result = get_mq_log_tps_summary(
        &connection,
        &data.from_datetime,
        &data.to_datetime,
        &data.mq_function_name,
        system_name,
    ).await;

    handle_service_result(result, "mq_tps_summary")
}

#[post("/mq/tps/all_summary")]
pub async fn all_mq_tps_summary(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    debug!(
        "all_mq_tps_summary: start_date: {}, end_date: {}",
        data.from_datetime, data.to_datetime
    );

    let result = get_all_mq_log_tps_summary(
        &connection,
        &data.from_datetime,
        &data.to_datetime,
    ).await;

    handle_service_result(result, "all_mq_tps_summary")
}
#[post("/mq/search")]
pub async fn mq_search(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    debug!(
        "mq_search: start_date: {}, end_date: {}, mq_function: {}",
        data.from_datetime, data.to_datetime, data.mq_function_name
    );

    let system_name = extract_system_name_option(&data);
    let result = get_mq_log_usage(
        &connection,
        &data.from_datetime,
        &data.to_datetime,
        &data.mq_function_name,
        system_name,
    ).await;

    handle_service_result(result, "mq_search")
}
