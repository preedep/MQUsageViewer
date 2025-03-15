use crate::domain::auth::Claims;
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{LoginRequest, LoginResponse};
use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use log::debug;

pub fn login_user(req: LoginRequest, app_state: &AppState) -> Option<LoginResponse> {
    debug!(
        "Login request: username: {}, password: {}",
        req.username, req.password);

    if req.username.eq(app_state.user_name.as_str()) && req.password.eq(app_state.password.as_str()) {
        let exp = Utc::now() + Duration::hours(24);
        let claims = Claims {
            sub: req.username,
            exp: exp.timestamp() as usize,
        };
        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(app_state.secret_value.as_bytes()),
        )
        .unwrap();
        Some(LoginResponse { token })
    } else {
        None
    }
}
