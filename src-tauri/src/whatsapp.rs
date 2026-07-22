use serde::Serialize;
use tauri::State;

use crate::{auth::require_auth, session::SessionState};

#[derive(Debug, Serialize)]
pub struct WhatsAppStatus {
    pub enabled: bool,
    pub connected: bool,
    pub phone_number: Option<String>,
    pub qr_code: Option<String>,
    pub last_activity: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn whatsapp_status(_session: State<'_, SessionState>) -> Result<WhatsAppStatus, String> {
    Ok(WhatsAppStatus {
        enabled: false,
        connected: false,
        phone_number: None,
        qr_code: None,
        last_activity: None,
        error: Some("WhatsApp integration memerlukan konfigurasi tambahan".into()),
    })
}

#[tauri::command]
pub fn whatsapp_start(_session: State<'_, SessionState>) -> Result<WhatsAppStatus, String> {
    Ok(WhatsAppStatus {
        enabled: false,
        connected: false,
        phone_number: None,
        qr_code: None,
        last_activity: None,
        error: Some("WhatsApp integration memerlukan konfigurasi tambahan".into()),
    })
}

#[tauri::command]
pub fn whatsapp_restart(_session: State<'_, SessionState>) -> Result<WhatsAppStatus, String> {
    Ok(WhatsAppStatus {
        enabled: false,
        connected: false,
        phone_number: None,
        qr_code: None,
        last_activity: None,
        error: Some("WhatsApp integration memerlukan konfigurasi tambahan".into()),
    })
}

#[tauri::command]
pub fn whatsapp_logout(_session: State<'_, SessionState>) -> Result<bool, String> {
    Ok(true)
}
