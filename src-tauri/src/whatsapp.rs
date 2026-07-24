use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

use crate::{
    auth::require_admin, common::get_db, common::DbConn, common::record_app_log, session::SessionState,
};
use rusqlite::params;

const SIDECAR_PORT: u16 = 17532;

#[derive(Debug, Serialize, Deserialize)]
pub struct WhatsAppSidecarStatus {
    pub status: String,
    pub qr_data_url: Option<String>,
    pub last_error: Option<String>,
    pub has_client: bool,
    pub enabled: bool,
    pub auto_notify_owner: bool,
    pub owner_number: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WaNotifyResponse {
    pub sent: bool,
    pub reason: Option<String>,
    pub id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SidecarStatus {
    status: String,
    has_client: Option<bool>,
    last_error: Option<String>,
    uptime: Option<u64>,
    memory_mb: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct SidecarQr {
    qr: Option<String>,
}

pub struct WaSidecarState {
    pub child: Mutex<Option<std::process::Child>>,
}

pub type SharedWaState = Arc<WaSidecarState>;

impl WaSidecarState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

fn sidecar_base_url() -> String {
    format!("http://127.0.0.1:{}", SIDECAR_PORT)
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

/// Make an HTTP GET request to the sidecar
fn http_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let url = format!("{}{}", sidecar_base_url(), path);
    let resp = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .call()
        .map_err(|e| format!("Sidecar GET {} gagal: {}", path, e))?;
    resp.body_json::<T>()
        .map_err(|e| format!("Parse response gagal: {}", e))
}

/// Make an HTTP POST request to the sidecar
fn http_post<T: for<'de> Deserialize<'de>>(path: &str, body: &serde_json::Value) -> Result<T, String> {
    let url = format!("{}{}", sidecar_base_url(), path);
    let resp = ureq::post(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send_json(body)
        .map_err(|e| format!("Sidecar POST {} gagal: {}", path, e))?;
    resp.body_json::<T>()
        .map_err(|e| format!("Parse response gagal: {}", e))
}

/// Kill the sidecar process
fn kill_sidecar(sc: &WaSidecarState) {
    if let Ok(mut child) = sc.child.lock() {
        if let Some(ref mut c) = *child {
            let _ = c.kill();
            let _ = c.wait();
        }
        *child = None;
    }
}

/// Check if sidecar process is running
fn is_sidecar_running(sc: &WaSidecarState) -> bool {
    sc.child.lock().ok().map(|c| c.is_some()).unwrap_or(false)
}

#[tauri::command]
pub fn whatsapp_status(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<SharedWaState>();
    let conn = get_db(&db)?;
    let (enabled, auto_notify, owner_number) = get_whatsapp_settings(&conn);

    // Poll sidecar HTTP status
    let (sidecar_status, has_client, last_error) = if is_sidecar_running(&sc) {
        match http_get::<SidecarStatus>("/status") {
            Ok(s) => (s.status, s.has_client.unwrap_or(true), s.last_error),
            Err(_) => ("unreachable".into(), false, Some("Sidecar tidak merespon".into())),
        }
    } else {
        ("stopped".into(), false, None)
    };

    // Try to get QR if in qr state
    let qr_data_url = if sidecar_status == "qr" {
        http_get::<SidecarQr>("/qr").ok().and_then(|q| q.qr)
    } else {
        None
    };

    Ok(WhatsAppSidecarStatus {
        status: sidecar_status,
        qr_data_url,
        last_error,
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
    db: State<'_, DbConn>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<SharedWaState>();

    // Kill existing sidecar if any
    kill_sidecar(&sc);

    let session_dir = crate::common::app_data_dir(&app)?
        .join("whatsapp-session")
        .to_string_lossy()
        .to_string();

    // Spawn sidecar process
    let child = match app
        .path()
        .resource_dir()
        .ok()
        .map(|dir| dir.join("wa-service"))
        .filter(|p| p.exists())
    {
        Some(path) => {
            // Bundled sidecar (production)
            std::process::Command::new(path)
                .env("WA_SESSION_DIR", &session_dir)
                .spawn()
                .map_err(|e| format!("Gagal spawn sidecar: {e}"))?
        }
        None => {
            // Dev fallback: node wa-service/index.mjs
            let project_root = std::env::current_dir()
                .ok()
                .and_then(|d| d.parent().map(|p| p.to_path_buf()))
                .unwrap_or_default();
            let wa_entry = project_root.join("wa-service").join("index.mjs");
            if !wa_entry.exists() {
                return Err("wa-service/index.mjs tidak ditemukan".into());
            }
            std::process::Command::new("node")
                .arg(&wa_entry)
                .env("WA_SESSION_DIR", &session_dir)
                .spawn()
                .map_err(|e| format!("Gagal spawn wa-service: {e}"))?
        }
    };

    *sc.child.lock().map_err(|_| "lock error".to_string())? = Some(child);

    // Wait briefly for sidecar to start
    std::thread::sleep(std::time::Duration::from_millis(500));

    let conn = get_db(&db)?;
    record_app_log(&conn, "INFO", "whatsapp", "WhatsApp sidecar dimulai");
    drop(conn);

    whatsapp_status(app, session, db)
}

#[tauri::command]
pub fn whatsapp_restart(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<WhatsAppSidecarStatus, String> {
    let _user = require_admin(&session)?;

    // Tell sidecar to restart via HTTP
    let _ = http_post::<serde_json::Value>("/restart", &serde_json::json!({}));

    let conn = get_db(&db)?;
    record_app_log(&conn, "INFO", "whatsapp", "WhatsApp sidecar di-restart");
    drop(conn);

    whatsapp_status(app, session, db)
}

#[tauri::command]
pub fn whatsapp_logout(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let sc = app.state::<SharedWaState>();

    // Tell sidecar to logout via HTTP
    let _ = http_post::<serde_json::Value>("/logout", &serde_json::json!({}));

    // Kill the process
    kill_sidecar(&sc);

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
    let sc = app.state::<SharedWaState>();
    let conn = get_db(&db)?;
    let (enabled, auto_notify, owner_number) = get_whatsapp_settings(&conn);

    if !enabled || !auto_notify {
        return Ok(WaNotifyResponse { sent: false, reason: Some("disabled".into()), id: None });
    }
    if owner_number.is_empty() {
        return Ok(WaNotifyResponse { sent: false, reason: Some("missing_owner_number".into()), id: None });
    }

    // Check sidecar is running
    if !is_sidecar_running(&sc) {
        return Ok(WaNotifyResponse { sent: false, reason: Some("sidecar_not_running".into()), id: None });
    }

    // Check sidecar status via HTTP
    let sidecar_ok = http_get::<SidecarStatus>("/status")
        .map(|s| s.status == "ready")
        .unwrap_or(false);

    if !sidecar_ok {
        return Ok(WaNotifyResponse { sent: false, reason: Some("sidecar_not_ready".into()), id: None });
    }

    // Build notification message
    let trx = conn
        .query_row(
            "SELECT invoice_no, type, total_amount, customer_name, status, created_at FROM transactions WHERE id = ?1",
            params![transaction_id],
            |row| Ok((
                row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?,
                row.get::<_, Option<String>>(3)?, row.get::<_, String>(4)?, row.get::<_, String>(5)?,
            )),
        )
        .map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    let message = build_notification_message(&trx.1, &trx.0, trx.2, &trx.3, &trx.4, &trx.5);

    // Send via sidecar HTTP API
    match http_post::<serde_json::Value>(
        "/send",
        &serde_json::json!({ "phone": owner_number, "message": message }),
    ) {
        Ok(_) => {
            record_app_log(&conn, "INFO", "whatsapp", &format!("WA notif dikirim untuk trx #{}", transaction_id));
            Ok(WaNotifyResponse { sent: true, reason: None, id: None })
        }
        Err(e) => Ok(WaNotifyResponse { sent: false, reason: Some(format!("send_failed: {}", e)), id: None }),
    }
}

/// Set up WhatsApp sidecar lifecycle management.
pub fn setup_whatsapp_lifecycle(app: &AppHandle) {
    // Kill sidecar on window close
    let sc_close: SharedWaState = app.state::<SharedWaState>().inner().clone();
    if let Some(window) = app.get_webview_window("main") {
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                kill_sidecar(&sc_close);
            }
        });
    }

    // Periodic health check via HTTP every 30 seconds
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_secs(30));
        let _ = http_get::<serde_json::Value>("/health");
    });
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
