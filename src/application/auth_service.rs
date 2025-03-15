use crate::domain::auth::Claims;
use crate::infrastructure::app_state::AppState;
use crate::interface::dto::{LoginRequest, LoginResponse};
use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};

pub fn login_user(req: LoginRequest, app_state: &AppState) -> Option<LoginResponse> {
    if req.username == app_state.user_name && req.password == app_state.password {
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
