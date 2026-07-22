use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::common::{init_schema, record_app_log};
use crate::session::PublicUser;
use crate::session::SessionState;

/// In-memory rate limiter: username -> (attempt_count, first_attempt_timestamp)
pub struct LoginRateLimiter(pub Mutex<HashMap<String, (u32, i64)>>);

impl LoginRateLimiter {
    pub fn new() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

/// Max login attempts before lockout, and lockout duration in seconds
const MAX_LOGIN_ATTEMPTS: u32 = 5;
const LOCKOUT_SECONDS: i64 = 300; // 5 minutes

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
    rate_limiter: State<'_, LoginRateLimiter>,
) -> Result<LoginResponse, String> {
    let username = payload.username.trim().to_string();
    if username.is_empty() || payload.password.is_empty() {
        return Err("Username dan password wajib diisi".into());
    }

    // ── Rate limiting check ──
    let now_ts = Utc::now().timestamp();
    {
        let mut map = rate_limiter.0.lock().map_err(|_| "Rate limiter error".to_string())?;
        if let Some((attempts, first_ts)) = map.get(&username) {
            if *attempts >= MAX_LOGIN_ATTEMPTS {
                let elapsed = now_ts - first_ts;
                if elapsed < LOCKOUT_SECONDS {
                    let remaining = LOCKOUT_SECONDS - elapsed;
                    return Err(format!(
                        "Terlalu banyak percobaan login. Coba lagi dalam {} detik.",
                        remaining
                    ));
                }
                // Lockout expired — reset
                map.remove(&username);
            }
        }
    }

    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, username, password_hash, role FROM users WHERE username = ?1 AND is_active = 1 LIMIT 1")
        .map_err(|e| e.to_string())?;
    let user = stmt
        .query_row(params![&username], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|_| {
            // Record failed attempt
            record_failed_attempt(&rate_limiter, &username, now_ts);
            "Username atau password salah".to_string()
        })?;

    if !verify(payload.password, &user.3).map_err(|e| e.to_string())? {
        record_failed_attempt(&rate_limiter, &username, now_ts);
        record_app_log(
            &conn,
            "WARN",
            "auth",
            &format!("Gagal login: {} (percobaan)", username),
        );
        return Err("Username atau password salah".into());
    }

    // Login success — clear rate limit
    {
        let mut map = rate_limiter.0.lock().map_err(|_| "Rate limiter error".to_string())?;
        map.remove(&username);
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
    record_app_log(
        &conn,
        "INFO",
        "auth",
        &format!("Login berhasil: {} ({})", username, public_user.role),
    );
    Ok(LoginResponse {
        ok: true,
        user: public_user,
    })
}

fn record_failed_attempt(rate_limiter: &State<'_, LoginRateLimiter>, username: &str, now_ts: i64) {
    if let Ok(mut map) = rate_limiter.0.lock() {
        let entry = map.entry(username.to_string()).or_insert((0, now_ts));
        entry.0 += 1;
        // Reset timestamp if first attempt was long ago (stale entry)
        if now_ts - entry.1 > LOCKOUT_SECONDS {
            *entry = (1, now_ts);
        }
    }
}

#[tauri::command]
pub fn logout(session: State<'_, SessionState>) -> Result<bool, String> {
    *session
        .0
        .lock()
        .map_err(|_| "Session tidak valid".to_string())? = None;
    Ok(true)
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserPayload {
    pub id: i64,
    pub name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
    pub password: Option<String>,
}

#[tauri::command]
pub fn update_user(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: UpdateUserPayload,
) -> Result<PublicUser, String> {
    let me = require_admin(&session)?;
    if me.id == payload.id {
        return Err("Tidak bisa mengubah data diri sendiri".into());
    }
    let conn = init_schema(&app)?;
    if let Some(ref r) = payload.role {
        if !matches!(r.as_str(), "admin" | "kasir") {
            return Err("Role harus admin atau kasir".into());
        }
    }
    let mut sets = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref n) = payload.name {
        let n = n.trim();
        if n.is_empty() || n.len() > 100 {
            return Err("Nama wajib diisi (maks 100 karakter)".into());
        }
        sets.push("name = ?");
        params_vec.push(Box::new(n.to_string()));
    }
    if let Some(ref r) = payload.role {
        sets.push("role = ?");
        params_vec.push(Box::new(r.clone()));
    }
    if let Some(a) = payload.is_active {
        sets.push("is_active = ?");
        params_vec.push(Box::new(if a { 1i64 } else { 0i64 }));
    }
    if let Some(ref p) = payload.password {
        if !p.is_empty() {
            validate_password(p)?;
            let h = hash(p, DEFAULT_COST).map_err(|e| e.to_string())?;
            sets.push("password_hash = ?");
            params_vec.push(Box::new(h));
        }
    }
    if sets.is_empty() {
        return Err("Tidak ada field yang diubah".into());
    }
    let now = Utc::now().to_rfc3339();
    sets.push("updated_at = ?");
    params_vec.push(Box::new(now));
    params_vec.push(Box::new(payload.id));
    let sql = format!("UPDATE users SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    let user = conn
        .query_row(
            "SELECT id, name, username, role FROM users WHERE id = ?1",
            params![payload.id],
            |row| Ok(PublicUser { id: row.get(0)?, name: row.get(1)?, username: row.get(2)?, role: row.get(3)? }),
        )
        .map_err(|_| "User tidak ditemukan".to_string())?;
    record_app_log(&conn, "INFO", "users", &format!("User diubah: {}", user.username));
    Ok(user)
}

#[tauri::command]
pub fn deactivate_user(
    app: AppHandle,
    session: State<'_, SessionState>,
    user_id: i64,
) -> Result<bool, String> {
    let me = require_admin(&session)?;
    if me.id == user_id {
        return Err("Tidak bisa menonaktifkan diri sendiri".into());
    }
    let conn = init_schema(&app)?;
    let now = Utc::now().to_rfc3339();
    conn.execute("UPDATE users SET is_active = 0, updated_at = ?1 WHERE id = ?2", params![now, user_id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_me(session: State<'_, SessionState>) -> Result<PublicUser, String> {
    require_auth(&session)
}

fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 || password.len() > 128 {
        return Err("Password 8-128 karakter, minimal 2 kategori (huruf besar/kecil/angka/simbol)".into());
    }
    let categories = password.chars().filter(|c| c.is_ascii_uppercase()).count() as u8
        + password.chars().filter(|c| c.is_ascii_lowercase()).count() as u8
        + password.chars().filter(|c| c.is_ascii_digit()).count() as u8
        + password.chars().filter(|c| !c.is_alphanumeric()).count() as u8;
    if categories < 2 {
        return Err("Password 8-128 karakter, minimal 2 kategori (huruf besar/kecil/angka/simbol)".into());
    }
    Ok(())
}
