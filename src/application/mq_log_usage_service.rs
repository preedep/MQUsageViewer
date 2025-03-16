use crate::domain::model::MQLogUsage;
use chrono::{DateTime, Local};
use log::debug;
use rusqlite::ToSql;

const MQ_USAGE_TABLE: &str = "mq_data";

pub async fn get_system_name_list(
    connection: &rusqlite::Connection,
    mq_function: &str,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {

    let sql = format!(
        "SELECT DISTINCT system_name FROM {} WHERE mq_function = ? ORDER BY system_name",
        MQ_USAGE_TABLE
    );

    let mut stmt = connection.prepare(&sql)?;

    let rows = stmt.query_map([mq_function], |row| row.get(0))?;
    let mut system_names = Vec::new();
    for system_name in rows {
        system_names.push(system_name?);
    }
    Ok(system_names)
}

pub async fn get_mq_function_list(
    connection: &rusqlite::Connection,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut stmt = connection.prepare(
        format!(
            "SELECT DISTINCT mq_function FROM {} order by mq_function ",
            MQ_USAGE_TABLE
        )
            .as_str(),
    )?;
    let rows = stmt.query_map([], |row| row.get(0))?;
    let mut mq_functions = Vec::new();
    for mq_function in rows {
        mq_functions.push(mq_function?);
    }
    Ok(mq_functions)
}
pub async fn get_mq_log_tps_summary(
    connection: &rusqlite::Connection,
    start_date: &DateTime<Local>,
    end_date: &DateTime<Local>,
    mq_function: &str,
    system_name: Option<&str>,
) -> Result<Vec<MQLogUsage>, Box<dyn std::error::Error>> {
    debug!(
        "get_mq_log_tps_summary : start_date: {}, end_date: {}, mq_function: {}",
        start_date, end_date, mq_function
    );

    let mut params = vec![mq_function];
    let mut sql = format!("SELECT date_time , SUM(trans_per_sec) AS total_trans_per_sec FROM {} WHERE mq_function = ?1", MQ_USAGE_TABLE);

    sql.push_str(" AND (date_time BETWEEN ?2 AND ?3)");

    let start_date_str = start_date.to_rfc3339();
    let end_date_str = end_date.to_rfc3339();

    params.push(&start_date_str);
    params.push(&end_date_str);

    if let Some(system_name) = system_name {
        sql.push_str(" AND system_name = ?4");
        params.push(system_name);
    }

    sql.push_str(" GROUP BY date_time");

    let params: Vec<&dyn ToSql> = params.iter().map(|s| s as &dyn ToSql).collect();

    let mut stmt = connection.prepare(&sql)?;
    let mut rows = stmt.query(params.as_slice())?;
    let mut mq_log_usage_list = Vec::new();

    while let Some(row) = rows.next()? {
        // idx = 0 , id
        let date_time: DateTime<Local> = row.get(0)?;
        let trans_per_sec: f64 = row.get(1)?;
        mq_log_usage_list.push(MQLogUsage {
            date_time,
            date: "".to_string(),
            minute: "".to_string(),
            system_name: "".to_string(),
            mq_function: "".to_string(),
            work_total: 0.0,
            trans_per_sec,
        });
    }
    //debug!("get_mq_log_tps_summary : mq_log_usage_list: {:?}", mq_log_usage_list);
    Ok(mq_log_usage_list)
}
pub async fn get_mq_log_usage(
    connection: &rusqlite::Connection,
    start_date: &DateTime<Local>,
    end_date: &DateTime<Local>,
    mq_function: &str,
    system_name: Option<&str>,
) -> Result<Vec<MQLogUsage>, Box<dyn std::error::Error>> {
    debug!(
        "get_mq_log_usage: start_date: {}, end_date: {}, mq_function: {}",
        start_date, end_date, mq_function
    );
    let mut params = vec![mq_function];
    let mut sql = format!("SELECT * FROM {} WHERE mq_function = ?1", MQ_USAGE_TABLE);

    sql.push_str(" AND (date_time BETWEEN ?2 AND ?3) ");

    let start_date_str = start_date.to_rfc3339();
    let end_date_str = end_date.to_rfc3339();

    params.push(&start_date_str);
    params.push(&end_date_str);

    if let Some(system_name) = system_name {
        sql.push_str(" AND system_name = ?4");
        params.push(system_name);
    }

    let params: Vec<&dyn ToSql> = params.iter().map(|s| s as &dyn ToSql).collect();

    let mut stmt = connection.prepare(&sql)?;
    let mut rows = stmt.query(params.as_slice())?;
    let mut mq_log_usage_list = Vec::new();

    while let Some(row) = rows.next()? {
        // idx = 0 , id
        let date_time: DateTime<Local> = row.get(1)?;
        let date: String = row.get(2)?;
        let minute: String = row.get(3)?;
        let system_name: String = row.get(4)?;
        let mq_function: String = row.get(5)?;
        let work_total: f64 = row.get(6)?;
        let trans_per_sec: f64 = row.get(7)?;
        mq_log_usage_list.push(MQLogUsage {
            date_time,
            date,
            minute,
            system_name,
            mq_function,
            work_total,
            trans_per_sec,
        });
    }
    Ok(mq_log_usage_list)
}
