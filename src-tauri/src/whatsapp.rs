use serde::Serialize;
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::{
    auth::require_admin, common::get_db, common::DbConn, common::record_app_log, session::SessionState,
};
use rusqlite::params;

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

#[derive(Debug, Serialize)]
pub struct WaNotifyResponse {
    pub sent: bool,
    pub reason: Option<String>,
    pub id: Option<String>,
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
        let rows = s.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        });
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

/// Kill the existing sidecar process if running
fn kill_sidecar(sc: &WaSidecarState) {
    if let Ok(mut child) = sc.child.lock() {
        if let Some(ref mut c) = *child {
            let _ = c.kill();
            let _ = c.wait();
        }
        *child = None;
    }
}

/// Send a JSONL command to the sidecar's stdin
fn send_sidecar_command(
    sc: &WaSidecarState,
    command: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    let mut child_guard = sc.child.lock().map_err(|_| "lock error".to_string())?;
    let child = child_guard
        .as_mut()
        .ok_or("Sidecar tidak berjalan".to_string())?;
    let stdin = child
        .stdin
        .as_mut()
        .ok_or("Stdin sidecar tidak tersedia".to_string())?;

    let mut msg = serde_json::Map::new();
    msg.insert("cmd".into(), serde_json::Value::String(command.into()));
    if let Some(obj) = payload.as_object() {
        for (k, v) in obj {
            msg.insert(k.clone(), v.clone());
        }
    }
    let line = serde_json::to_string(&msg).map_err(|e| format!("Gagal serialisasi: {e}"))?;
    writeln!(stdin, "{}", line).map_err(|e| format!("Gagal kirim ke sidecar: {e}"))?;
    stdin
        .flush()
        .map_err(|e| format!("Gagal flush sidecar: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn whatsapp_status(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    let conn = get_db(&db)?;
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
        owner_number: if owner_number.is_empty() {
            None
        } else {
            Some(owner_number)
        },
    })
}

#[tauri::command]
pub fn whatsapp_start(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();

    // Kill existing sidecar if any
    kill_sidecar(&sc);
    *sc.status.lock().map_err(|_| "lock error".to_string())? = "initializing".into();
    *sc.qr_data_url
        .lock()
        .map_err(|_| "lock error".to_string())? = None;
    *sc.last_error.lock().map_err(|_| "lock error".to_string())? = None;

    // Determine wa-service path: try bundled sidecar first, then local dev
    let child = match app
        .path()
        .resource_dir()
        .ok()
        .map(|dir| dir.join("wa-service"))
        .filter(|p| p.exists())
    {
        Some(path) => {
            // Bundled sidecar binary
            std::process::Command::new(path)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| format!("Gagal spawn sidecar: {e}"))?
        }
        None => {
            // Fallback: run via node from local wa-service/ directory
            let project_root = std::env::current_dir()
                .ok()
                .and_then(|d| d.parent().map(|p| p.to_path_buf()))
                .unwrap_or_default();
            let wa_dir = project_root.join("wa-service");
            let wa_entry = wa_dir.join("index.mjs");

            if !wa_entry.exists() {
                *sc.status.lock().map_err(|_| "lock error".to_string())? = "error".into();
                *sc.last_error.lock().map_err(|_| "lock error".to_string())? = Some(
                    "wa-service tidak ditemukan. Pastikan folder wa-service/index.mjs ada.".into(),
                );
                return whatsapp_status(app, session, db);
            }

            std::process::Command::new("node")
                .arg(&wa_entry)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| format!("Gagal spawn wa-service: {e}"))?
        }
    };

    *sc.child.lock().map_err(|_| "lock error".to_string())? = Some(child);
    let conn = get_db(&db)?;
    record_app_log(
        &conn,
        "INFO",
        "whatsapp",
        "WhatsApp sidecar dimulai",
    );

    whatsapp_status(app, session, db)
}

#[tauri::command]
pub fn whatsapp_restart(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    kill_sidecar(&sc);
    *sc.status.lock().map_err(|_| "lock error".to_string())? = "idle".into();
    *sc.qr_data_url
        .lock()
        .map_err(|_| "lock error".to_string())? = None;
    *sc.last_error.lock().map_err(|_| "lock error".to_string())? = None;
    let conn = get_db(&db)?;
    record_app_log(
        &conn,
        "INFO",
        "whatsapp",
        "WhatsApp sidecar di-restart",
    );
    whatsapp_status(app, session, db)
}

#[tauri::command]
pub fn whatsapp_logout(app: AppHandle, session: State<'_, SessionState>, db: State<'_, DbConn>) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();

    // Send logout command before killing
    let _ = send_sidecar_command(&sc, "logout", &serde_json::json!({}));

    kill_sidecar(&sc);
    *sc.status.lock().map_err(|_| "lock error".to_string())? = "disconnected".into();
    *sc.qr_data_url
        .lock()
        .map_err(|_| "lock error".to_string())? = None;
    *sc.last_error.lock().map_err(|_| "lock error".to_string())? = None;
    let conn = get_db(&db)?;
    record_app_log(&conn, "INFO", "whatsapp", "WhatsApp logout");
    Ok(true)
}

#[tauri::command]
pub fn whatsapp_notify(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    transaction_id: i64,
) -> Result<WaNotifyResponse, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<WaSidecarState>();
    let conn = get_db(&db)?;
    let (enabled, auto_notify, owner_number) = get_whatsapp_settings(&conn);

    if !enabled || !auto_notify {
        return Ok(WaNotifyResponse {
            sent: false,
            reason: Some("disabled".into()),
            id: None,
        });
    }
    if owner_number.is_empty() {
        return Ok(WaNotifyResponse {
            sent: false,
            reason: Some("missing_owner_number".into()),
            id: None,
        });
    }

    // Build notification message based on transaction type
    let trx = conn
        .query_row(
            "SELECT invoice_no, type, total_amount, customer_name, status, created_at FROM transactions WHERE id = ?1",
            params![transaction_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    let message = build_notification_message(&trx.1, &trx.0, trx.2, &trx.3, &trx.4, &trx.5);
    let to = format!("{}@s.whatsapp.net", owner_number);

    // Check if sidecar is running and connected
    let has_child = sc.child.lock().ok().map(|c| c.is_some()).unwrap_or(false);
    let status = sc.status.lock().map(|s| s.clone()).unwrap_or_default();

    if !has_child || status != "connected" {
        return Ok(WaNotifyResponse {
            sent: false,
            reason: Some(format!(
                "sidecar_{}",
                if !has_child {
                    "not_running"
                } else {
                    "not_connected"
                }
            )),
            id: None,
        });
    }

    // Send via sidecar IPC
    let payload = serde_json::json!({
        "to": to,
        "message": message,
    });
    send_sidecar_command(&sc, "send", &payload)?;

    record_app_log(
        &conn,
        "INFO",
        "whatsapp",
        &format!("WA notif dikirim untuk trx #{}", transaction_id),
    );
    Ok(WaNotifyResponse {
        sent: true,
        reason: None,
        id: None,
    })
}

fn build_notification_message(
    trx_type: &str,
    invoice_no: &str,
    amount: f64,
    customer: &Option<String>,
    status: &str,
    created_at: &str,
) -> String {
    let customer_str = customer.as_deref().unwrap_or("-");
    match trx_type {
        "pos" => format!(
            "[NOTIFIKASI TRANSAKSI POS]\n\nInvoice: {}\nTipe: Penjualan POS\nNominal: Rp{:.0}\nPelanggan: {}\nStatus: {}\nTanggal: {}\n\nTercatat otomatis oleh CatatAgen Local",
            invoice_no, amount, customer_str, status, created_at
        ),
        "brilink" => format!(
            "[NOTIFIKASI TRANSAKSI BRILINK]\n\nInvoice: {}\nTipe: Layanan Agen\nNominal: Rp{:.0}\nPelanggan: {}\nStatus: {}\nTanggal: {}\n\nTercatat otomatis oleh CatatAgen Local",
            invoice_no, amount, customer_str, status, created_at
        ),
        _ => format!(
            "[NOTIFIKASI TRANSAKSI]\n\nInvoice: {}\nTipe: {}\nNominal: Rp{:.0}\nPelanggan: {}\nStatus: {}\nTanggal: {}\n\nTercatat otomatis oleh CatatAgen Local",
            invoice_no, trx_type, amount, customer_str, status, created_at
        ),
    }
}
