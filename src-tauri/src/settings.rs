use rusqlite::params;
use serde::Deserialize;
use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::{
    auth::require_admin, auth::require_auth, common::get_db, common::DbConn, session::SessionState,
};

/// Whitelist of allowed settings keys that can be updated via the API.
const ALLOWED_KEYS: &[&str] = &[
    "app_name",
    "store_name",
    "store_owner_name",
    "store_phone",
    "store_address",
    "business_type",
    "max_discount_percent",
    "max_discount_amount",
    "discount_admin_pin",
    "printer_host",
    "printer_port",
    "printer_paper_width",
    "receipt_footer",
    "whatsapp_owner_number",
    "kas_only",
];

#[derive(Debug, Deserialize)]
pub struct SettingsUpdatePayload {
    pub settings: HashMap<String, String>,
}

#[tauri::command]
pub fn get_settings(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<HashMap<String, String>, String> {
    let _user = require_auth(&session)?;
    let conn = get_db(&db)?;
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
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: SettingsUpdatePayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    // Validate all keys against whitelist
    for key in payload.settings.keys() {
        if !ALLOWED_KEYS.contains(&key.as_str()) {
            return Err(format!("Pengaturan '{}' tidak diizinkan", key));
        }
    }
    let mut conn = get_db(&db)?;
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
