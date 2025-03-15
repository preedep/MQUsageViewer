use crate::domain::auth::Claims;
use crate::infrastructure::app_state::AppState;
use actix_web::{
    body::{BoxBody, MessageBody}, dev::{forward_ready, ServiceRequest, ServiceResponse, Transform},
    http::header::AUTHORIZATION,
    web,
    Error,
    HttpResponse,
};
use futures_util::future::{ready, LocalBoxFuture, Ready};
use jsonwebtoken::{decode, DecodingKey, Validation};

#[derive(Clone)]
pub struct AuthMiddleware {
    app_state: web::Data<AppState>,
}

impl AuthMiddleware {
    pub fn new(app_state: web::Data<AppState>) -> Self {
        Self { app_state }
    }
}

impl<S> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: actix_service::Service<ServiceRequest, Response=ServiceResponse<BoxBody>, Error=Error>
    + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Transform = AuthMiddlewareMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareMiddleware {
            service,
            app_state: self.app_state.clone(),
        }))
    }
}

pub struct AuthMiddlewareMiddleware<S> {
    service: S,
    app_state: web::Data<AppState>,
}

impl<S> actix_service::Service<ServiceRequest> for AuthMiddlewareMiddleware<S>
where
    S: actix_service::Service<ServiceRequest, Response=ServiceResponse<BoxBody>, Error=Error>
    + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let auth_header = req
            .headers()
            .get(AUTHORIZATION)
            .and_then(|h| h.to_str().ok());
        let app_state = self.app_state.clone(); // ✅ ใช้ app_state ได้ตรงนี้

        let is_valid = if let Some(header_value) = auth_header {
            if header_value.starts_with("Bearer ") {
                let token = header_value.trim_start_matches("Bearer ").trim();
                let decoding_result = decode::<Claims>(
                    token,
                    &DecodingKey::from_secret(self.app_state.secret_value.as_bytes()), // สามารถเปลี่ยนมาอ่านจาก app_state ก็ได้
                    &Validation::default(),
                );
                decoding_result.is_ok()
            } else {
                false
            }
        } else {
            false
        };

        if is_valid {
            let fut = self.service.call(req);
            Box::pin(async move { fut.await })
        } else {
            Box::pin(async move {
                Ok(req.into_response(
                    HttpResponse::Unauthorized()
                        .body("Unauthorized")
                        .map_into_boxed_body(),
                ))
            })
        }
    }
}
