use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::{
    auth::require_admin, auth::require_auth, common::init_schema, common::record_app_log,
    session::SessionState,
};

#[derive(Debug, Serialize)]
pub struct TransactionRow {
    pub id: i64,
    pub invoice_no: String,
    pub transaction_type: String,
    pub customer_name: Option<String>,
    pub total_amount: f64,
    pub profit: f64,
    pub payment_method: String,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TransactionItemRow {
    pub id: i64,
    pub transaction_id: i64,
    pub product_id: Option<i64>,
    pub product_name: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Deserialize)]
pub struct TransactionIdPayload {
    pub transaction_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct ListLimitPayload {
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ListTransactionsPayload {
    pub limit: Option<i64>,
    pub transaction_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BackupRow {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct AppLogRow {
    pub id: i64,
    pub level: String,
    pub source: String,
    pub message: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RestoreBackupPayload {
    pub path: String,
}

fn bounded_limit(payload: Option<&i64>, default_limit: i64, max_limit: i64) -> i64 {
    payload
        .copied()
        .unwrap_or(default_limit)
        .clamp(1, max_limit)
}

#[tauri::command]
pub fn list_transactions(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: Option<ListTransactionsPayload>,
) -> Result<Vec<TransactionRow>, String> {
    let user = require_auth(&session)?;
    let limit = payload.as_ref().and_then(|p| p.limit).unwrap_or(50).clamp(1, 500);
    let is_admin = user.role == "admin";
    let conn = init_schema(&app)?;

    let mut sql = String::from(
        r#"SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at
        FROM transactions
        WHERE status NOT IN ('void', 'reversed')"#,
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref p) = payload {
        if let Some(ref t) = p.transaction_type {
            let t = t.trim().to_lowercase();
            if !t.is_empty() {
                sql.push_str(" AND type = ?");
                params_vec.push(Box::new(t));
            }
        }
        if let Some(ref start) = p.start_date {
            if !start.is_empty() {
                sql.push_str(" AND created_at >= ?");
                params_vec.push(Box::new(format!("{}T00:00:00", start.trim())));
            }
        }
        if let Some(ref end) = p.end_date {
            if !end.is_empty() {
                sql.push_str(" AND created_at <= ?");
                params_vec.push(Box::new(format!("{}T23:59:59", end.trim())));
            }
        }
    }

    sql.push_str(" ORDER BY id DESC LIMIT ?");
    params_vec.push(Box::new(limit));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            let profit = row.get::<_, f64>(5)?;
            Ok(TransactionRow {
                id: row.get(0)?,
                invoice_no: row.get(1)?,
                transaction_type: row.get(2)?,
                customer_name: row.get(3)?,
                total_amount: row.get(4)?,
                profit: if is_admin { profit } else { 0.0 },
                payment_method: row.get(6)?,
                status: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn list_transaction_items(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: TransactionIdPayload,
) -> Result<Vec<TransactionItemRow>, String> {
    let _user = require_auth(&session)?;
    let conn = init_schema(&app)?;
    let mut stmt = conn.prepare("SELECT id, transaction_id, product_id, product_name, quantity, unit_price, subtotal FROM transaction_items WHERE transaction_id = ?1 ORDER BY id ASC").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![payload.transaction_id], |row| {
            Ok(TransactionItemRow {
                id: row.get(0)?,
                transaction_id: row.get(1)?,
                product_id: row.get(2)?,
                product_name: row.get(3)?,
                quantity: row.get(4)?,
                unit_price: row.get(5)?,
                subtotal: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn list_app_logs(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: Option<i64>,
) -> Result<Vec<AppLogRow>, String> {
    let _user = require_admin(&session)?;
    let limit = bounded_limit(payload.as_ref(), 80, 500);
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, level, source, message, created_at FROM app_logs ORDER BY id DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(AppLogRow {
                id: row.get(0)?,
                level: row.get(1)?,
                source: row.get(2)?,
                message: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn create_database_backup(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<BackupRow, String> {
    let _user = require_admin(&session)?;
    let conn = init_schema(&app)?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").ok();
    drop(conn);

    let source = crate::common::db_path(&app)?;
    if !source.exists() {
        return Err("Database belum ditemukan".into());
    }
    let dir = crate::common::backup_dir(&app)?;
    let name = format!(
        "catatagen-backup-{}.db",
        chrono::Utc::now().format("%Y%m%d-%H%M%S")
    );
    let target = dir.join(&name);
    std::fs::copy(&source, &target).map_err(|e| format!("Gagal membuat backup: {e}"))?;
    let metadata = std::fs::metadata(&target).map_err(|e| e.to_string())?;
    let conn = init_schema(&app)?;
    record_app_log(&conn, "INFO", "backup", &format!("Backup dibuat: {name}"));
    Ok(BackupRow {
        name,
        path: target.display().to_string(),
        size: metadata.len(),
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn list_database_backups(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<Vec<BackupRow>, String> {
    let _user = require_admin(&session)?;
    let dir = crate::common::backup_dir(&app)?;
    let mut backups = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("db") {
            continue;
        }
        let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
        let created_at = metadata
            .modified()
            .ok()
            .map(|time| chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339())
            .unwrap_or_else(|| "-".into());
        backups.push(BackupRow {
            name: crate::common::safe_file_name(&path),
            path: path.display().to_string(),
            size: metadata.len(),
            created_at,
        });
    }
    backups.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(backups)
}

#[tauri::command]
pub fn restore_database_backup(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: RestoreBackupPayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let backup_path = std::path::PathBuf::from(payload.path);
    if !backup_path.exists() {
        return Err("File backup tidak ditemukan".into());
    }
    let allowed_dir = crate::common::backup_dir(&app)?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let canonical_backup = backup_path.canonicalize().map_err(|e| e.to_string())?;
    if !canonical_backup.starts_with(&allowed_dir) {
        return Err("File backup tidak valid".into());
    }

    let target = crate::common::db_path(&app)?;
    if target.exists() {
        let pre_restore = crate::common::backup_dir(&app)?.join(format!(
            "pre-restore-{}.db",
            chrono::Utc::now().format("%Y%m%d-%H%M%S")
        ));
        std::fs::copy(&target, pre_restore)
            .map_err(|e| format!("Gagal membuat backup sebelum restore: {e}"))?;
    }
    let wal = target.with_extension("db-wal");
    let shm = target.with_extension("db-shm");
    let _ = std::fs::remove_file(&wal);
    let _ = std::fs::remove_file(&shm);
    std::fs::copy(&canonical_backup, &target)
        .map_err(|e| format!("Gagal restore database: {e}"))?;
    let conn = init_schema(&app)?;
    record_app_log(
        &conn,
        "WARN",
        "backup",
        &format!(
            "Database direstore dari {}",
            crate::common::safe_file_name(&canonical_backup)
        ),
    );
    Ok(true)
}
