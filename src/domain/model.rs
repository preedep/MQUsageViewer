use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MQLogUsage {
    pub date_time: DateTime<Local>,
    pub date: String,
    pub minute: String,
    pub system_name: String,
    pub mq_function: String,
    pub work_total: f64,
    pub trans_per_sec: f64,
}
