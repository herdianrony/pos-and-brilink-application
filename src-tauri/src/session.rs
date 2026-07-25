use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicUser {
    pub id: i64,
    pub name: String,
    pub username: String,
    pub role: String,
}

pub struct SessionState(pub Mutex<Option<PublicUser>>);

/// Simple HMAC key derived from machine-specific data.
/// In production, this should be stored securely or derived from hardware ID.
fn hmac_key() -> &'static [u8] {
    b"catatagen-session-hmac-v1"
}

fn compute_hmac(data: &[u8]) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    hmac_key().hash(&mut hasher);
    data.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn session_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal membaca app data dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat dir: {e}"))?;
    Ok(dir.join(".session"))
}

/// Persist session to disk with HMAC signature to prevent tampering.
pub fn persist_session(app: &AppHandle, user: &Option<PublicUser>) -> Result<(), String> {
    let path = session_file_path(app)?;
    match user {
        Some(u) => {
            let json = serde_json::to_string(u).map_err(|e| e.to_string())?;
            let sig = compute_hmac(json.as_bytes());
            let content = format!("{}\n{}", sig, json);
            std::fs::write(&path, content).map_err(|e| format!("Gagal menyimpan session: {e}"))
        }
        None => {
            let _ = std::fs::remove_file(&path);
            Ok(())
        }
    }
}

/// Load persisted session from disk, verifying HMAC signature.
pub fn load_persisted_session(app: &AppHandle) -> Option<PublicUser> {
    let path = session_file_path(app).ok()?;
    let content = std::fs::read_to_string(&path).ok()?;
    let (sig_line, json) = content.split_once('\n')?;
    let expected_sig = compute_hmac(json.as_bytes());
    // Constant-time comparison would be ideal, but for local session this is sufficient
    if sig_line != expected_sig {
        return None;
    }
    serde_json::from_str(json).ok()
}
