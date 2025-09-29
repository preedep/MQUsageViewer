use crate::application::mq_log_usage_service::{get_all_mq_log_tps_summary, get_mq_function_list, get_mq_log_tps_summary, get_mq_log_usage, get_system_name_list};
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{ApiResponse, SearchMqLogRequest, SearchMqLogResponse};
use actix_web::http::StatusCode;
use actix_web::{get, post, web};
use log::{debug, error};
use redis;
use serde_json;

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
    // สร้าง key สำหรับ cache
    let cache_key = "mq_functions";
    // ถ้ามี redis client ให้ลองดึงจาก cache ก่อน
    if let Some(ref redis_client) = app_state.redis_client {
        if let Ok(mut con) = redis_client.get_connection() {
            let cached: redis::RedisResult<String> = redis::cmd("GET").arg(cache_key).query(&mut con);
            if let Ok(json_str) = cached {
                if let Ok(result) = serde_json::from_str::<Vec<String>>(&json_str) {
                    debug!("Cache hit: {}", cache_key);
                    return ApiResponse::<Vec<String>>::success("Success (cache)", Some(result));
                }else {
                    error!("Error: {}", json_str);
                }
            }else{
                error!("Redis error: {}", cached.unwrap_err());
            }
        }else {
            error!("Redis not available. Continue without cache.");
        }
    }
    // ถ้าไม่มีใน cache หรือ redis error ให้ query db แล้ว cache ผลลัพธ์
    let connection = app_state.db.lock().unwrap();
    match get_mq_function_list(&connection).await {
        Ok(result) => {
            // cache ลง redis ถ้าใช้ได้
            if let Some(ref redis_client) = app_state.redis_client {
                if let Ok(mut con) = redis_client.get_connection() {
                    let _ = redis::cmd("SET").arg(cache_key).arg(serde_json::to_string(&result).unwrap_or_default()).query::<()>(&mut con);
                }
            }
            ApiResponse::<Vec<String>>::success("Success", Some(result))
        },
        Err(e) => ApiResponse::<Vec<String>>::error(
            &format!("Error: {}", e),
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
    }
}

#[post("/mq/tps/summary")]
pub async fn mq_tps_summary(
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

    let result = get_mq_log_tps_summary(
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

#[post("/mq/tps/all_summary")]
pub async fn all_mq_tps_summary(
    app_state: web::Data<AppState>,
    data: web::Json<SearchMqLogRequest>,
) -> impl actix_web::Responder {
    let connection = app_state.db.lock().unwrap();
    debug!(
        "all_mq_tps_summary: start_date: {}, end_date: {}",
        data.0.from_datetime,
        data.0.to_datetime
    );

    let start_date = data.0.from_datetime;
    let end_date = data.0.to_datetime;

    let result = get_all_mq_log_tps_summary(
        &connection,
        &start_date,
        &end_date,
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
                "all_mq_tps_summary: Error: {}",
                e.to_string()
            );

            ApiResponse::<Vec<SearchMqLogResponse>>::error(
                &message,
                StatusCode::INTERNAL_SERVER_ERROR,
            )
        }
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
