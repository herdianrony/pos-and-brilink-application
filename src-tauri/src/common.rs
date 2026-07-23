use base64::Engine;
use chrono::Utc;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// Shared database connection, initialized once at startup.
pub struct DbConn(pub Mutex<Connection>);

impl DbConn {
    /// Get a lock on the shared connection.
    /// Returns a MutexGuard — drop it ASAP to avoid blocking other commands.
    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.0.lock().map_err(|_| "Database lock poisoned".to_string())
    }
}

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal membaca app data dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat app data dir: {e}"))?;
    Ok(dir)
}

pub fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("catatagen-local.db"))
}

pub fn backup_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("backups");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat folder backup: {e}"))?;
    Ok(dir)
}

pub fn safe_file_name(path: &std::path::Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("backup.db")
        .to_string()
}

pub fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| format!("Gagal membuka database: {e}"))?;
    conn.pragma_update(None, "journal_mode", "WAL").ok();
    conn.pragma_update(None, "foreign_keys", "ON").map_err(|e| format!("Failed to enable foreign keys: {e}"))?;
    Ok(conn)
}

/// Initialize database once at startup: open, migrate, seed.
pub fn init_db(app: &AppHandle) -> Result<DbConn, String> {
    let conn = open_db(app)?;
    migrate(&conn)?;
    seed_defaults(&conn)?;
    Ok(DbConn(Mutex::new(conn)))
}

/// Get the shared database connection from Tauri state.
/// This is the preferred way for commands to access the DB.
pub fn get_db(db: &State<'_, DbConn>) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
    db.lock()
}

pub fn migrate(conn: &Connection) -> Result<(), String> {
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
          updated_at TEXT NOT NULL,
          FOREIGN KEY(category_id) REFERENCES product_categories(id)
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

        CREATE TABLE IF NOT EXISTS agent_service_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          category TEXT,
          default_fee REAL NOT NULL DEFAULT 0,
          provider_cost REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_fee_tiers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service_id INTEGER NOT NULL,
          min_amount REAL NOT NULL DEFAULT 0,
          max_amount REAL,
          fee REAL NOT NULL DEFAULT 0,
          provider_cost REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY(service_id) REFERENCES agent_service_templates(id) ON DELETE CASCADE
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
          FOREIGN KEY(transaction_id) REFERENCES transactions(id),
          FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          phone TEXT,
          amount REAL NOT NULL,
          paid_amount REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'open',
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS debt_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debt_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL
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
    conn.execute("ALTER TABLE products ADD COLUMN image_path TEXT", [])
        .ok();
    // Add foreign key for debt_payments.debt_id → debts(id)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id)", [])
        .ok();
    // Add secondary indexes for frequently queried columns
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)", [])
        .ok();
    conn.execute("CREATE INDEX IF NOT EXISTS idx_account_mutations_account_created ON account_mutations(account_id, created_at)", [])
        .ok();
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)", [])
        .ok();
    conn.execute("CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at)", [])
        .ok();
    Ok(())
}

pub fn seed_defaults(conn: &Connection) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
        params!["app_name", "CatatAgen Local", now],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 0, 0, 1, ?5, ?5)",
        params!["cash", "Kas Tunai", "banknote", "#22c55e", Utc::now().to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;
    for (name, category, fee) in [
        ("Tarik Tunai", "Tunai", 5000.0),
        ("Setor Tunai", "Tunai", 5000.0),
        ("Transfer", "Transfer", 5000.0),
        ("Payment/Topup", "Payment", 2500.0),
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO agent_service_templates (name, category, default_fee, provider_cost, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 0, 1, ?4, ?4)",
            params![name, category, fee, Utc::now().to_rfc3339()],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn trim_optional(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

pub fn product_images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("product-images");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Gagal membuat folder gambar produk: {e}"))?;
    Ok(dir)
}

pub fn record_app_log(conn: &Connection, level: &str, source: &str, message: &str) {
    let _ = conn.execute(
        "INSERT INTO app_logs (level, source, message, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![level, source, message, Utc::now().to_rfc3339()],
    );
}

pub fn normalize_code(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

pub fn product_image_data_url(
    app: &AppHandle,
    image_path: Option<String>,
) -> Result<Option<String>, String> {
    let Some(image_path) = image_path else {
        return Ok(None);
    };
    let safe_name = safe_file_name(std::path::Path::new(&image_path));
    let path = product_images_dir(app)?.join(&safe_name);
    if !path.exists() {
        return Ok(None);
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("Gagal membaca gambar produk: {e}"))?;
    let mime = match path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg")
    {
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "image/jpeg",
    };
    Ok(Some(format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )))
}

pub fn bounded_limit(payload: Option<&i64>, default_limit: i64, max_limit: i64) -> i64 {
    payload
        .copied()
        .unwrap_or(default_limit)
        .clamp(1, max_limit)
}
