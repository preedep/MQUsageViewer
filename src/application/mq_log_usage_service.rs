use crate::domain::model::MQLogUsage;

const MQ_USAGE_TABLE: &str = "mqdata";

pub async fn get_mq_log_usage(
    connection: &rusqlite::Connection,
    mq_function: &str,
    system_name: Option<&str>,
) -> Result<Vec<MQLogUsage>, Box<dyn std::error::Error>> {
    let mut params = vec![mq_function];
    let mut sql = format!("SELECT * FROM {} WHERE mq_function = ?1", MQ_USAGE_TABLE);

    if let Some(system_name) = system_name {
        sql.push_str(" AND system_name = ?2");
        params.push(system_name);
    }

    let mut stmt = connection.prepare(&sql)?;
    let mut rows = stmt.query(params.as_slice())?;
    let mut mq_log_usage_list = Vec::new();

    while let Some(row) = rows.next()? {
        mq_log_usage_list.push(MQLogUsage {
            date_time: Default::default(),
            date: "".to_string(),
            minute: "".to_string(),
            system_name: "".to_string(),
            mq_function: "".to_string(),
            work_total: 0.0,
            trans_per_sec: 0.0,
        });
    }
    Ok(mq_log_usage_list)
}
