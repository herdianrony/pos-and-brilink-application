use rusqlite::params;
use serde::Deserialize;
use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::{auth::require_admin, auth::require_auth, common::init_schema, session::SessionState};

#[derive(Debug, Deserialize)]
pub struct SettingsUpdatePayload {
    pub settings: HashMap<String, String>,
}

#[tauri::command]
pub fn get_settings(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<HashMap<String, String>, String> {
    let _user = require_auth(&session)?;
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        if key == "discount_admin_pin" {
            map.insert(
                "discount_admin_pin_set".to_string(),
                if value.is_empty() { "false" } else { "true" }.to_string(),
            );
        } else {
            map.insert(key, value);
        }
    }
    Ok(map)
}

#[tauri::command]
pub fn update_settings(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: SettingsUpdatePayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let mut conn = init_schema(&app)?;
    let now = chrono::Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (key, value) in &payload.settings {
        if key == "discount_admin_pin" && (value == "****" || value.is_empty()) {
            continue;
        }
        let processed_value = if key == "discount_admin_pin" {
            bcrypt::hash(value, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?
        } else {
            value.clone()
        };
        let exists: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists > 0 {
            tx.execute(
                "UPDATE settings SET value = ?1, updated_at = ?2 WHERE key = ?3",
                params![processed_value, now, key],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
                params![key, processed_value, now],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}
