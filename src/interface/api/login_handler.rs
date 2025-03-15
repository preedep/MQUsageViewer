use crate::application::auth_service;
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{ApiResponse, LoginRequest, LoginResponse};
use actix_web::{post, web};

#[post("/auth/login")]
pub async fn login(
    app_state: web::Data<AppState>,
    req: web::Json<LoginRequest>,
) -> impl actix_web::Responder {
    match auth_service::login_user(req.into_inner(), &app_state) {
        Some(resp) => ApiResponse::<LoginResponse>::success("Success", Some(resp)),
        None => {
            ApiResponse::<LoginResponse>::error(
                "Invalid credentials",
                actix_web::http::StatusCode::UNAUTHORIZED,
            )
        }
    }
}
