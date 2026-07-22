use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::{auth::require_admin, common::init_schema, session::SessionState};

#[derive(Debug, Serialize)]
pub struct WhatsAppSidecarStatus {
    pub status: String,
    pub qr_data_url: Option<String>,
    pub last_error: Option<String>,
    pub has_client: bool,
    pub enabled: bool,
    pub auto_notify_owner: bool,
    pub owner_number: Option<String>,
}

pub struct WaSidecarState {
    pub child: Mutex<Option<std::process::Child>>,
    pub status: Mutex<String>,
    pub qr_data_url: Mutex<Option<String>>,
    pub last_error: Mutex<Option<String>>,
}

impl WaSidecarState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            status: Mutex::new("idle".into()),
            qr_data_url: Mutex::new(None),
            last_error: Mutex::new(None),
        }
    }
}

fn get_whatsapp_settings(conn: &rusqlite::Connection) -> (bool, bool, String) {
    let mut stmt = conn.prepare("SELECT key, value FROM settings").ok();
    let mut enabled = false;
    let mut auto_notify = false;
    let mut owner_number = String::new();
    if let Some(ref mut s) = stmt {
        let rows = s.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)));
        if let Ok(rows) = rows {
            for row in rows.flatten() {
                match row.0.as_str() {
                    "whatsapp_enabled" => enabled = row.1 == "true",
                    "whatsapp_auto_notify_owner" => auto_notify = row.1 == "true",
                    "whatsapp_owner_number" => owner_number = row.1,
                    _ => {}
                }
            }
        }
    }
    (enabled, auto_notify, owner_number)
}

#[tauri::command]
pub fn whatsapp_status(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    let conn = init_schema(&app)?;
    let (enabled, auto_notify, owner_number) = get_whatsapp_settings(&conn);
    let status = sc.status.lock().map(|s| s.clone()).unwrap_or_default();
    let qr = sc.qr_data_url.lock().ok().and_then(|q| q.clone());
    let err = sc.last_error.lock().ok().and_then(|e| e.clone());
    let has_client = sc.child.lock().ok().map(|c| c.is_some()).unwrap_or(false);
    Ok(WhatsAppSidecarStatus {
        status,
        qr_data_url: qr,
        last_error: err,
        has_client,
        enabled,
        auto_notify_owner: auto_notify,
        owner_number: if owner_number.is_empty() { None } else { Some(owner_number) },
    })
}

#[tauri::command]
pub fn whatsapp_start(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    // TODO: Spawn Baileys sidecar via tauri shell-sidecar
    // Command::new_sidecar("wa-service").spawn()
    *sc.status.lock().map_err(|_| "lock error".to_string())? = "initializing".into();
    *sc.last_error.lock().map_err(|_| "lock error".to_string())? = Some("WhatsApp sidecar belum dikonfigurasi. Perlu build wa-service binary.".into());
    whatsapp_status(app, session)
}

#[tauri::command]
pub fn whatsapp_restart(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    // Stop existing if any
    if let Ok(mut child) = sc.child.lock() {
        if let Some(ref mut c) = *child {
            let _ = c.kill();
        }
        *child = None;
    }
    *sc.status.lock().map_err(|_| "lock error".to_string())? = "idle".into();
    *sc.qr_data_url.lock().map_err(|_| "lock error".to_string())? = None;
    *sc.last_error.lock().map_err(|_| "lock error".to_string())? = None;
    // TODO: Re-spawn sidecar
    whatsapp_status(app, session)
}

#[tauri::command]
pub fn whatsapp_logout(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    if let Ok(mut child) = sc.child.lock() {
        if let Some(ref mut c) = *child {
            let _ = c.kill();
        }
        *child = None;
    }
    *sc.status.lock().map_err(|_| "lock error".to_string())? = "disconnected".into();
    *sc.qr_data_url.lock().map_err(|_| "lock error".to_string())? = None;
    *sc.last_error.lock().map_err(|_| "lock error".to_string())? = None;
    Ok(true)
}

#[tauri::command]
pub fn whatsapp_notify(
    app: AppHandle,
    session: State<'_, SessionState>,
    transaction_id: i64,
) -> Result<serde_json::Value, String> {
    let _user = require_admin(&session)?;
    let conn = init_schema(&app)?;
    let (enabled, auto_notify, owner_number) = get_whatsapp_settings(&conn);
    if !enabled || !auto_notify {
        return Ok(serde_json::json!({"sent": false, "reason": "disabled"}));
    }
    if owner_number.is_empty() {
        return Ok(serde_json::json!({"sent": false, "reason": "missing_owner_number"}));
    }
    // TODO: Send notification via sidecar IPC
    // For now, build the message and return prepared
    let trx = conn.query_row(
        "SELECT invoice_no, type, total_amount, customer_name, status, created_at FROM transactions WHERE id = ?1",
        params![transaction_id],
        |row| Ok((
            row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?,
            row.get::<_, Option<String>>(3)?, row.get::<_, String>(4)?, row.get::<_, String>(5)?,
        )),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    let message = format!(
        "[NOTIFIKASI TRANSAKSI]\n\nInvoice: {}\nTipe: {}\nNominal: Rp{:.0}\nPelanggan: {}\nStatus: {}\nTanggal: {}\n\nCatatan: aplikasi hanya mencatat transaksi.",
        trx.0, trx.1, trx.2, trx.3.unwrap_or_else(|| "-".into()), trx.4, trx.5
    );

    Ok(serde_json::json!({
        "sent": false,
        "reason": "sidecar_not_configured",
        "prepared_message": message,
        "to": format!("{}@s.whatsapp.net", owner_number)
    }))
}
