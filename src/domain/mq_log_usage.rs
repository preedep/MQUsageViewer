use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone,Serialize,Deserialize)]
pub struct MQLogUsage {
    date_time: DateTime<Local>,
    date: String,
    minute: String,
    system_name: String,
    mq_function: String,
    work_total: f64,
    trans_per_sec: f64,
}