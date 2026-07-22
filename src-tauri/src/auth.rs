use base64::{engine::general_purpose, Engine as _};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager, State};

use crate::common::{init_schema, record_app_log};
use crate::session::PublicUser;
use crate::session::SessionState;

#[derive(Debug, Serialize)]
pub struct HealthCheck {
    pub ok: bool,
    pub app: &'static str,
    pub backend: &'static str,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct DbStatus {
    pub ok: bool,
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct SetupStatus {
    pub setup_needed: bool,
    pub user_count: i64,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub ok: bool,
    pub user: PublicUser,
}

#[derive(Debug, Deserialize)]
pub struct CreateAdminPayload {
    pub name: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserPayload {
    pub name: String,
    pub username: String,
    pub password: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}

pub fn require_auth(session: &State<'_, SessionState>) -> Result<PublicUser, String> {
    session
        .0
        .lock()
        .map_err(|_| "Session tidak valid".to_string())?
        .clone()
        .ok_or_else(|| "Sesi login tidak aktif. Silakan login ulang.".to_string())
}

pub fn require_admin(session: &State<'_, SessionState>) -> Result<PublicUser, String> {
    let user = require_auth(session)?;
    if user.role != "admin" {
        return Err("Aksi ini hanya boleh dilakukan Administrator".into());
    }
    Ok(user)
}

#[tauri::command]
pub fn health_check() -> HealthCheck {
    HealthCheck {
        ok: true,
        app: "CatatAgen Local",
        backend: "tauri-rust",
        timestamp: Utc::now().to_rfc3339(),
    }
}

#[tauri::command]
pub fn db_init(app: AppHandle) -> Result<DbStatus, String> {
    let path = crate::common::db_path(&app)?;
    let conn = crate::common::open_db(&app)?;
    crate::common::migrate(&conn)?;
    crate::common::seed_defaults(&conn)?;
    Ok(DbStatus {
        ok: true,
        path: path.display().to_string(),
    })
}

#[tauri::command]
pub fn setup_status(app: AppHandle) -> Result<SetupStatus, String> {
    let conn = init_schema(&app)?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(SetupStatus {
        setup_needed: count == 0,
        user_count: count,
    })
}

#[tauri::command]
pub fn create_admin(
    app: AppHandle,
    payload: CreateAdminPayload,
    session: State<'_, SessionState>,
) -> Result<PublicUser, String> {
    let conn = init_schema(&app)?;
    let existing: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if existing > 0 {
        return Err("Setup sudah selesai".into());
    }
    if payload.username.trim().is_empty() || payload.password.len() < 8 {
        return Err("Username wajib diisi dan password minimal 8 karakter".into());
    }
    let name = payload.name.trim().to_string();
    let username = payload.username.trim().to_string();
    let now = Utc::now().to_rfc3339();
    let password_hash = hash(payload.password, DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 'admin', 1, ?4, ?4)",
        params![name, username, password_hash, now],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let user = PublicUser {
        id,
        name,
        username,
        role: "admin".into(),
    };
    *session
        .0
        .lock()
        .map_err(|_| "Session tidak valid".to_string())? = Some(user.clone());
    Ok(user)
}

#[tauri::command]
pub fn list_users(
    app: AppHandle,
    session: State<'_, SessionState>,
) -> Result<Vec<PublicUser>, String> {
    let _user = require_admin(&session)?;
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, username, role FROM users WHERE is_active = 1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(PublicUser {
                id: row.get(0)?,
                name: row.get(1)?,
                username: row.get(2)?,
                role: row.get(3)?,
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
pub fn create_user(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: CreateUserPayload,
) -> Result<PublicUser, String> {
    let _user = require_admin(&session)?;
    let conn = init_schema(&app)?;
    let name = payload.name.trim().to_string();
    let username = payload.username.trim().to_string();
    let role = payload.role.trim().to_lowercase();
    if name.is_empty() || username.is_empty() || payload.password.len() < 8 {
        return Err("Nama, username, dan password minimal 8 karakter wajib diisi".into());
    }
    if !matches!(role.as_str(), "admin" | "kasir") {
        return Err("Role harus admin atau kasir".into());
    }
    let existing_username: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE username = ?1",
            params![&username],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if existing_username > 0 {
        return Err("Username sudah digunakan".into());
    }
    let now = Utc::now().to_rfc3339();
    let password_hash = hash(payload.password, DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5)",
        params![name, username, password_hash, role, now],
    )
    .map_err(|e| format!("Gagal membuat user: {e}"))?;
    record_app_log(&conn, "INFO", "users", &format!("User dibuat: {username}"));
    Ok(PublicUser {
        id: conn.last_insert_rowid(),
        name,
        username,
        role,
    })
}

#[tauri::command]
pub fn login(
    app: AppHandle,
    payload: LoginPayload,
    session: State<'_, SessionState>,
) -> Result<LoginResponse, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, username, password_hash, role FROM users WHERE username = ?1 AND is_active = 1 LIMIT 1")
        .map_err(|e| e.to_string())?;
    let user = stmt
        .query_row(params![payload.username.trim()], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|_| "Username atau password salah".to_string())?;

    if !verify(payload.password, &user.3).map_err(|e| e.to_string())? {
        return Err("Username atau password salah".into());
    }

    let public_user = PublicUser {
        id: user.0,
        name: user.1,
        username: user.2,
        role: user.4,
    };
    *session
        .0
        .lock()
        .map_err(|_| "Session tidak valid".to_string())? = Some(public_user.clone());
    Ok(LoginResponse {
        ok: true,
        user: public_user,
    })
}

#[tauri::command]
pub fn logout(session: State<'_, SessionState>) -> Result<bool, String> {
    *session
        .0
        .lock()
        .map_err(|_| "Session tidak valid".to_string())? = None;
    Ok(true)
}
