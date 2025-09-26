use crate::domain::model::MQLogUsage;
use actix_web::http::StatusCode;
use actix_web::{HttpResponse, Responder};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct ApiResponse<T>
where
    T: Serialize,
{
    pub data: Option<T>,
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing)]
    pub status_code: StatusCode,
}

impl<T> ApiResponse<T>
where
    T: Serialize,
{
    pub fn success(message: &str, data: Option<T>) -> Self {
        Self {
            success: true,
            message: message.to_string(),
            data,
            status_code: StatusCode::OK,
        }
    }
    pub fn error(message: &str, status_code: StatusCode) -> Self {
        Self {
            success: false,
            message: message.to_string(),
            data: None,
            status_code,
        }
    }
}

impl<T: Serialize> Into<HttpResponse> for ApiResponse<T> {
    fn into(self) -> HttpResponse {
        HttpResponse::build(self.status_code).json(self)
    }
}
impl<T: Serialize> Responder for ApiResponse<T> {
    type Body = actix_web::body::BoxBody;

    fn respond_to(self, _: &actix_web::HttpRequest) -> HttpResponse<Self::Body> {
        // Serialize the ApiResponse to JSON and return it with a 200 OK status
        HttpResponse::Ok()
            .content_type("application/json")
            .json(self)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMqLogRequest {
    pub from_datetime: DateTime<Local>,
    pub to_datetime: DateTime<Local>,
    pub mq_function_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMqLogResponse {
    pub date_time: DateTime<Local>,
    pub system_name: String,
    pub mq_function: String,
    pub work_total: f64,
    pub trans_per_sec: f64,
}

// ✅ Implement conversion
impl From<MQLogUsage> for SearchMqLogResponse {
    fn from(item: MQLogUsage) -> Self {
        SearchMqLogResponse {
            date_time: item.date_time,
            system_name: item.system_name,
            mq_function: item.mq_function,
            work_total: item.work_total,
            trans_per_sec: item.trans_per_sec,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}
