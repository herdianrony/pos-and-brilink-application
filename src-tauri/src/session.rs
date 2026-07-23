use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize)]
pub struct PublicUser {
    pub id: i64,
    pub name: String,
    pub username: String,
    pub role: String,
}

pub struct SessionState(pub Mutex<Option<PublicUser>>);

fn session_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal membaca app data dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat dir: {e}"))?;
    Ok(dir.join(".session"))
}

/// Persist session to disk so it survives app restarts.
pub fn persist_session(app: &AppHandle, user: &Option<PublicUser>) -> Result<(), String> {
    let path = session_file_path(app)?;
    match user {
        Some(u) => {
            let json = serde_json::to_string(u).map_err(|e| e.to_string())?;
            std::fs::write(&path, json).map_err(|e| format!("Gagal menyimpan session: {e}"))
        }
        None => {
            let _ = std::fs::remove_file(&path);
            Ok(())
        }
    }
}

/// Load persisted session from disk.
pub fn load_persisted_session(app: &AppHandle) -> Option<PublicUser> {
    let path = session_file_path(app).ok()?;
    let data = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&data).ok()
}
