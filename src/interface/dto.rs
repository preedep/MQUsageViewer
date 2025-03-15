use chrono::{DateTime, Local, Utc};
use serde::{Deserialize, Serialize};
use crate::domain::model::MQLogUsage;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMqLogRequest {
    pub from_datetime: DateTime<Utc>,
    pub to_datetime: DateTime<Utc>,
    pub mq_function_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMqLogResponse {
    pub date_time: DateTime<Local>,
    pub system_name: String,
    pub mq_function: String,
    pub trans_per_sec: f64,
}

// ✅ Implement conversion
impl From<MQLogUsage> for SearchMqLogResponse {
    fn from(item: MQLogUsage) -> Self {
        SearchMqLogResponse {
            date_time: item.date_time,
            system_name: item.system_name,
            mq_function: item.mq_function,
            trans_per_sec: item.trans_per_sec,
        }
    }
}