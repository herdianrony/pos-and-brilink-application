use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
struct HealthCheck {
    ok: bool,
    app: &'static str,
    backend: &'static str,
    timestamp: String,
}

#[derive(Debug, Serialize)]
struct DbStatus {
    ok: bool,
    path: String,
}

#[derive(Debug, Serialize)]
struct SetupStatus {
    setup_needed: bool,
    user_count: i64,
}

#[derive(Debug, Serialize)]
struct LoginResponse {
    ok: bool,
    user: PublicUser,
}

#[derive(Debug, Serialize)]
struct PublicUser {
    id: i64,
    name: String,
    username: String,
    role: String,
}

#[derive(Debug, Deserialize)]
struct CreateAdminPayload {
    name: String,
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct LoginPayload {
    username: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct AccountRow {
    id: i64,
    code: String,
    name: String,
    balance: f64,
    is_active: bool,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal membaca app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat app data dir: {e}"))?;
    Ok(dir)
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("brilink-pos-lite.db"))
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| format!("Gagal membuka database: {e}"))?;
    conn.pragma_update(None, "journal_mode", "WAL").ok();
    conn.pragma_update(None, "foreign_keys", "ON").ok();
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'kasir',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          balance REAL NOT NULL DEFAULT 0,
          min_balance REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS product_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          barcode TEXT,
          category_id INTEGER,
          buy_price REAL NOT NULL DEFAULT 0,
          sell_price REAL NOT NULL DEFAULT 0,
          stock INTEGER NOT NULL DEFAULT 0,
          min_stock INTEGER NOT NULL DEFAULT 5,
          unit TEXT DEFAULT 'pcs',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS account_mutations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          notes TEXT,
          reference_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(account_id) REFERENCES accounts(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_no TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          customer_name TEXT,
          total_amount REAL NOT NULL,
          profit REAL NOT NULL DEFAULT 0,
          payment_method TEXT NOT NULL DEFAULT 'cash',
          status TEXT NOT NULL DEFAULT 'completed',
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transaction_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          product_id INTEGER,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        );

        CREATE TABLE IF NOT EXISTS app_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL,
          source TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        "#,
    )
    .map_err(|e| format!("Gagal migrasi database: {e}"))?;
    Ok(())
}

fn seed_defaults(conn: &Connection) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
        params!["app_name", "BRILink POS Lite", now],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 0, 0, 1, ?5, ?5)",
        params!["cash", "Kas Tunai", "banknote", "#22c55e", Utc::now().to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn health_check() -> HealthCheck {
    HealthCheck {
        ok: true,
        app: "BRILink POS Lite",
        backend: "tauri-rust",
        timestamp: Utc::now().to_rfc3339(),
    }
}

#[tauri::command]
fn db_init(app: AppHandle) -> Result<DbStatus, String> {
    let path = db_path(&app)?;
    let conn = open_db(&app)?;
    migrate(&conn)?;
    seed_defaults(&conn)?;
    Ok(DbStatus {
        ok: true,
        path: path.display().to_string(),
    })
}

#[tauri::command]
fn setup_status(app: AppHandle) -> Result<SetupStatus, String> {
    let conn = open_db(&app)?;
    migrate(&conn)?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(SetupStatus {
        setup_needed: count == 0,
        user_count: count,
    })
}

#[tauri::command]
fn create_admin(app: AppHandle, payload: CreateAdminPayload) -> Result<PublicUser, String> {
    let conn = open_db(&app)?;
    migrate(&conn)?;
    let existing: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if existing > 0 {
        return Err("Setup sudah selesai".into());
    }
    if payload.username.trim().is_empty() || payload.password.len() < 8 {
        return Err("Username wajib diisi dan password minimal 8 karakter".into());
    }
    let now = Utc::now().to_rfc3339();
    let password_hash = hash(payload.password, DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 'admin', 1, ?4, ?4)",
        params![payload.name.trim(), payload.username.trim(), password_hash, now],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(PublicUser {
        id,
        name: payload.name,
        username: payload.username,
        role: "admin".into(),
    })
}

#[tauri::command]
fn login(app: AppHandle, payload: LoginPayload) -> Result<LoginResponse, String> {
    let conn = open_db(&app)?;
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

    Ok(LoginResponse {
        ok: true,
        user: PublicUser {
            id: user.0,
            name: user.1,
            username: user.2,
            role: user.4,
        },
    })
}

#[tauri::command]
fn list_accounts(app: AppHandle) -> Result<Vec<AccountRow>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, code, name, balance, is_active FROM accounts ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AccountRow {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                balance: row.get(3)?,
                is_active: row.get::<_, i64>(4)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").map(|window| {
                let _ = window.set_focus();
            });
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            health_check,
            db_init,
            setup_status,
            create_admin,
            login,
            list_accounts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
