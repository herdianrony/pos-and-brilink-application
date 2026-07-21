use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
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
struct CreateUserPayload {
    name: String,
    username: String,
    password: String,
    role: String,
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
    icon: Option<String>,
    color: Option<String>,
    balance: f64,
    min_balance: f64,
    is_active: bool,
}

#[derive(Debug, Deserialize)]
struct AccountPayload {
    code: String,
    name: String,
    initial_balance: Option<f64>,
    min_balance: Option<f64>,
    icon: Option<String>,
    color: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BalanceAdjustmentPayload {
    account_id: i64,
    amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AccountTransferPayload {
    from_account_id: i64,
    to_account_id: i64,
    amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AccountExpensePayload {
    account_id: i64,
    amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
struct AccountMutationRow {
    id: i64,
    account_id: i64,
    account_name: String,
    mutation_type: String,
    amount: f64,
    balance_after: f64,
    notes: Option<String>,
    reference_id: Option<i64>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct CategoryRow {
    id: i64,
    name: String,
    icon: Option<String>,
    color: Option<String>,
    is_active: bool,
}

#[derive(Debug, Deserialize)]
struct CategoryPayload {
    name: String,
    icon: Option<String>,
    color: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProductRow {
    id: i64,
    name: String,
    barcode: Option<String>,
    category_id: Option<i64>,
    category_name: Option<String>,
    buy_price: f64,
    sell_price: f64,
    stock: i64,
    min_stock: i64,
    unit: String,
    is_active: bool,
}

#[derive(Debug, Deserialize)]
struct ProductPayload {
    name: String,
    barcode: Option<String>,
    category_id: Option<i64>,
    buy_price: f64,
    sell_price: f64,
    stock: i64,
    min_stock: i64,
    unit: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProductUpdatePayload {
    id: i64,
    name: String,
    barcode: Option<String>,
    category_id: Option<i64>,
    buy_price: f64,
    sell_price: f64,
    stock: i64,
    min_stock: i64,
    unit: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProductIdPayload {
    id: i64,
}

#[derive(Debug, Deserialize)]
struct PosCheckoutItemPayload {
    product_id: i64,
    quantity: i64,
}

#[derive(Debug, Deserialize)]
struct PosCheckoutAgentItemPayload {
    service_name: String,
    customer_name: Option<String>,
    amount: f64,
    fee: f64,
    provider_cost: Option<f64>,
    account_id: Option<i64>,
    cash_effect: Option<f64>,
    bank_effect: Option<f64>,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PosCheckoutPayload {
    customer_name: Option<String>,
    notes: Option<String>,
    payment_method: Option<String>,
    settlement_account_id: Option<i64>,
    #[serde(default)]
    items: Vec<PosCheckoutItemPayload>,
    #[serde(default)]
    agent_items: Vec<PosCheckoutAgentItemPayload>,
}

#[derive(Debug, Serialize)]
struct PosCheckoutResponse {
    ok: bool,
    transaction_id: i64,
    invoice_no: String,
    total_amount: f64,
    profit: f64,
    settlement_account_id: i64,
    settlement_balance: f64,
}

#[derive(Debug, Serialize)]
struct TransactionRow {
    id: i64,
    invoice_no: String,
    transaction_type: String,
    customer_name: Option<String>,
    total_amount: f64,
    profit: f64,
    payment_method: String,
    status: String,
    notes: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct TransactionItemRow {
    id: i64,
    transaction_id: i64,
    product_id: Option<i64>,
    product_name: String,
    quantity: i64,
    unit_price: f64,
    subtotal: f64,
}

#[derive(Debug, Deserialize)]
struct TransactionIdPayload {
    transaction_id: i64,
}

#[derive(Debug, Deserialize)]
struct AgentTransactionPayload {
    service_name: String,
    customer_name: Option<String>,
    amount: f64,
    fee: f64,
    provider_cost: Option<f64>,
    account_id: Option<i64>,
    cash_effect: f64,
    bank_effect: f64,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
struct DebtRow {
    id: i64,
    customer_name: String,
    phone: Option<String>,
    amount: f64,
    paid_amount: f64,
    outstanding: f64,
    status: String,
    notes: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct DebtPayload {
    customer_name: String,
    phone: Option<String>,
    amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DebtPaymentPayload {
    debt_id: i64,
    amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DebtIdPayload {
    debt_id: i64,
}

#[derive(Debug, Serialize)]
struct BackupRow {
    name: String,
    path: String,
    size: u64,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct AppLogRow {
    id: i64,
    level: String,
    source: String,
    message: String,
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct RestoreBackupPayload {
    path: String,
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
    Ok(app_data_dir(app)?.join("catatagen-local.db"))
}

fn backup_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("backups");
    fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat folder backup: {e}"))?;
    Ok(dir)
}

fn safe_file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("backup.db")
        .to_string()
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
          created_at TEXT NOT NULL,
          FOREIGN KEY(debt_id) REFERENCES debts(id)
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
        params!["app_name", "CatatAgen Local", now],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 0, 0, 1, ?5, ?5)",
        params!["cash", "Kas Tunai", "banknote", "#22c55e", Utc::now().to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn init_schema(app: &AppHandle) -> Result<Connection, String> {
    let conn = open_db(app)?;
    migrate(&conn)?;
    seed_defaults(&conn)?;
    Ok(conn)
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}

fn normalize_code(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

fn record_app_log(conn: &Connection, level: &str, source: &str, message: &str) {
    let _ = conn.execute(
        "INSERT INTO app_logs (level, source, message, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![level, source, message, Utc::now().to_rfc3339()],
    );
}

#[tauri::command]
fn health_check() -> HealthCheck {
    HealthCheck {
        ok: true,
        app: "CatatAgen Local",
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
fn create_admin(app: AppHandle, payload: CreateAdminPayload) -> Result<PublicUser, String> {
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
    Ok(PublicUser {
        id,
        name,
        username,
        role: "admin".into(),
    })
}


#[tauri::command]
fn list_users(app: AppHandle) -> Result<Vec<PublicUser>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, username, role FROM users WHERE is_active = 1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(PublicUser { id: row.get(0)?, name: row.get(1)?, username: row.get(2)?, role: row.get(3)? })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn create_user(app: AppHandle, payload: CreateUserPayload) -> Result<PublicUser, String> {
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
    let now = Utc::now().to_rfc3339();
    let password_hash = hash(payload.password, DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5)",
        params![name, username, password_hash, role, now],
    )
    .map_err(|e| format!("Gagal membuat user: {e}"))?;
    record_app_log(&conn, "INFO", "users", &format!("User dibuat: {username}"));
    Ok(PublicUser { id: conn.last_insert_rowid(), name, username, role })
}

#[tauri::command]
fn login(app: AppHandle, payload: LoginPayload) -> Result<LoginResponse, String> {
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
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, code, name, icon, color, balance, min_balance, is_active FROM accounts WHERE is_active = 1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AccountRow {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                balance: row.get(5)?,
                min_balance: row.get(6)?,
                is_active: row.get::<_, i64>(7)? == 1,
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
fn create_account(app: AppHandle, payload: AccountPayload) -> Result<AccountRow, String> {
    let mut conn = init_schema(&app)?;
    let code = normalize_code(&payload.code);
    let name = payload.name.trim().to_string();
    let initial_balance = payload.initial_balance.unwrap_or(0.0);
    let min_balance = payload.min_balance.unwrap_or(0.0);
    if code.is_empty() || name.is_empty() {
        return Err("Kode dan nama rekening wajib diisi".into());
    }
    if code == "cash" {
        return Err("Kode cash sudah dipakai untuk Kas Tunai".into());
    }
    if initial_balance < 0.0 || min_balance < 0.0 {
        return Err("Saldo awal dan saldo minimum tidak boleh minus".into());
    }
    let icon = trim_optional(payload.icon).or_else(|| Some("bank".to_string()));
    let color = trim_optional(payload.color).or_else(|| Some("#2563eb".to_string()));
    let now = Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)",
        params![code, name, icon, color, initial_balance, min_balance, now],
    )
    .map_err(|e| format!("Gagal membuat rekening: {e}"))?;
    let id = tx.last_insert_rowid();
    if initial_balance > 0.0 {
        tx.execute(
            "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'initial_balance', ?2, ?2, 'Saldo awal', NULL, ?3)",
            params![id, initial_balance, now],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(AccountRow { id, code, name, icon, color, balance: initial_balance, min_balance, is_active: true })
}

#[tauri::command]
fn adjust_account_balance(app: AppHandle, payload: BalanceAdjustmentPayload) -> Result<AccountRow, String> {
    if payload.amount == 0.0 {
        return Err("Nominal penyesuaian tidak boleh 0".into());
    }
    let mut conn = init_schema(&app)?;
    let now = Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let account = tx
        .query_row(
            "SELECT id, code, name, icon, color, balance, min_balance, is_active FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
            params![payload.account_id],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, f64>(5)?,
                row.get::<_, f64>(6)?,
                row.get::<_, i64>(7)?,
            )),
        )
        .map_err(|_| "Rekening tidak ditemukan".to_string())?;
    let next_balance = account.5 + payload.amount;
    if next_balance < 0.0 {
        return Err("Saldo tidak cukup".into());
    }
    tx.execute(
        "UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3",
        params![next_balance, now, account.0],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'adjustment', ?2, ?3, ?4, NULL, ?5)",
        params![account.0, payload.amount, next_balance, trim_optional(payload.notes).unwrap_or_else(|| "Penyesuaian saldo".to_string()), now],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(AccountRow { id: account.0, code: account.1, name: account.2, icon: account.3, color: account.4, balance: next_balance, min_balance: account.6, is_active: account.7 == 1 })
}


#[tauri::command]
fn transfer_accounts(app: AppHandle, payload: AccountTransferPayload) -> Result<bool, String> {
    if payload.from_account_id == payload.to_account_id {
        return Err("Rekening asal dan tujuan tidak boleh sama".into());
    }
    if payload.amount <= 0.0 {
        return Err("Nominal transfer harus lebih dari 0".into());
    }
    let mut conn = init_schema(&app)?;
    let now = Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let from = tx.query_row(
        "SELECT id, name, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
        params![payload.from_account_id],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?)),
    ).map_err(|_| "Rekening asal tidak ditemukan".to_string())?;
    let to = tx.query_row(
        "SELECT id, name, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
        params![payload.to_account_id],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?)),
    ).map_err(|_| "Rekening tujuan tidak ditemukan".to_string())?;
    let from_balance = from.2 - payload.amount;
    if from_balance < 0.0 {
        return Err("Saldo rekening asal tidak cukup".into());
    }
    let to_balance = to.2 + payload.amount;
    tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![from_balance, now, from.0]).map_err(|e| e.to_string())?;
    tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![to_balance, now, to.0]).map_err(|e| e.to_string())?;
    let note = trim_optional(payload.notes).unwrap_or_else(|| format!("Transfer {} ke {}", from.1, to.1));
    tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'transfer_out', ?2, ?3, ?4, NULL, ?5)", params![from.0, -payload.amount, from_balance, note, now]).map_err(|e| e.to_string())?;
    let note_in = format!("Transfer dari {}", from.1);
    tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'transfer_in', ?2, ?3, ?4, NULL, ?5)", params![to.0, payload.amount, to_balance, note_in, now]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

fn account_expense(app: AppHandle, payload: AccountExpensePayload, mutation_type: &str, default_note: &str) -> Result<AccountRow, String> {
    if payload.amount <= 0.0 {
        return Err("Nominal harus lebih dari 0".into());
    }
    let mut conn = init_schema(&app)?;
    let now = Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let account = tx.query_row(
        "SELECT id, code, name, icon, color, balance, min_balance, is_active FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
        params![payload.account_id],
        |row| Ok((
            row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?, row.get::<_, Option<String>>(4)?, row.get::<_, f64>(5)?,
            row.get::<_, f64>(6)?, row.get::<_, i64>(7)?,
        )),
    ).map_err(|_| "Rekening tidak ditemukan".to_string())?;
    let next_balance = account.5 - payload.amount;
    if next_balance < 0.0 {
        return Err("Saldo tidak cukup".into());
    }
    tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![next_balance, now, account.0]).map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)",
        params![account.0, mutation_type, -payload.amount, next_balance, trim_optional(payload.notes).unwrap_or_else(|| default_note.to_string()), now],
    ).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(AccountRow { id: account.0, code: account.1, name: account.2, icon: account.3, color: account.4, balance: next_balance, min_balance: account.6, is_active: account.7 == 1 })
}

#[tauri::command]
fn owner_draw(app: AppHandle, payload: AccountExpensePayload) -> Result<AccountRow, String> {
    account_expense(app, payload, "owner_draw", "Prive Owner")
}

#[tauri::command]
fn bank_fee(app: AppHandle, payload: AccountExpensePayload) -> Result<AccountRow, String> {
    account_expense(app, payload, "bank_fee", "Biaya Bank / MDR")
}

#[tauri::command]
fn list_account_mutations(app: AppHandle) -> Result<Vec<AccountMutationRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT m.id, m.account_id, a.name, m.type, m.amount, m.balance_after, m.notes, m.reference_id, m.created_at
            FROM account_mutations m
            JOIN accounts a ON a.id = m.account_id
            ORDER BY m.id DESC
            LIMIT 100
            "#,
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AccountMutationRow {
                id: row.get(0)?, account_id: row.get(1)?, account_name: row.get(2)?, mutation_type: row.get(3)?, amount: row.get(4)?, balance_after: row.get(5)?, notes: row.get(6)?, reference_id: row.get(7)?, created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(out)
}
#[tauri::command]
fn list_categories(app: AppHandle) -> Result<Vec<CategoryRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, icon, color, is_active FROM product_categories WHERE is_active = 1 ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(CategoryRow {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
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

#[tauri::command]
fn create_category(app: AppHandle, payload: CategoryPayload) -> Result<CategoryRow, String> {
    let conn = init_schema(&app)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama kategori wajib diisi".into());
    }
    let icon = trim_optional(payload.icon);
    let color = trim_optional(payload.color).or_else(|| Some("#059669".to_string()));
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO product_categories (name, icon, color, is_active, created_at) VALUES (?1, ?2, ?3, 1, ?4)",
        params![name, icon, color, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(CategoryRow {
        id: conn.last_insert_rowid(),
        name,
        icon,
        color,
        is_active: true,
    })
}

#[tauri::command]
fn list_products(app: AppHandle) -> Result<Vec<ProductRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT p.id, p.name, p.barcode, p.category_id, c.name, p.buy_price, p.sell_price,
                   p.stock, p.min_stock, COALESCE(p.unit, 'pcs'), p.is_active
            FROM products p
            LEFT JOIN product_categories c ON c.id = p.category_id
            WHERE p.is_active = 1
            ORDER BY p.name ASC
            "#,
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ProductRow {
                id: row.get(0)?,
                name: row.get(1)?,
                barcode: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
                buy_price: row.get(5)?,
                sell_price: row.get(6)?,
                stock: row.get(7)?,
                min_stock: row.get(8)?,
                unit: row.get(9)?,
                is_active: row.get::<_, i64>(10)? == 1,
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
fn create_product(app: AppHandle, payload: ProductPayload) -> Result<ProductRow, String> {
    let conn = init_schema(&app)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama produk wajib diisi".into());
    }
    if payload.buy_price < 0.0 || payload.sell_price < 0.0 || payload.stock < 0 || payload.min_stock < 0 {
        return Err("Harga dan stok tidak boleh minus".into());
    }
    let barcode = trim_optional(payload.barcode);
    let unit = trim_optional(payload.unit).unwrap_or_else(|| "pcs".to_string());
    let now = Utc::now().to_rfc3339();
    conn.execute(
        r#"
        INSERT INTO products (name, barcode, category_id, buy_price, sell_price, stock, min_stock, unit, is_active, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?9)
        "#,
        params![
            name,
            barcode,
            payload.category_id,
            payload.buy_price,
            payload.sell_price,
            payload.stock,
            payload.min_stock,
            unit,
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let category_name = if let Some(category_id) = payload.category_id {
        conn.query_row(
            "SELECT name FROM product_categories WHERE id = ?1",
            params![category_id],
            |row| row.get::<_, String>(0),
        )
        .ok()
    } else {
        None
    };
    Ok(ProductRow {
        id,
        name,
        barcode,
        category_id: payload.category_id,
        category_name,
        buy_price: payload.buy_price,
        sell_price: payload.sell_price,
        stock: payload.stock,
        min_stock: payload.min_stock,
        unit,
        is_active: true,
    })
}


#[tauri::command]
fn update_product(app: AppHandle, payload: ProductUpdatePayload) -> Result<ProductRow, String> {
    let conn = init_schema(&app)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama produk wajib diisi".into());
    }
    if payload.buy_price < 0.0 || payload.sell_price < 0.0 || payload.stock < 0 || payload.min_stock < 0 {
        return Err("Harga dan stok tidak boleh minus".into());
    }
    let barcode = trim_optional(payload.barcode);
    let unit = trim_optional(payload.unit).unwrap_or_else(|| "pcs".to_string());
    let now = Utc::now().to_rfc3339();
    conn.execute(
        r#"
        UPDATE products
        SET name = ?1, barcode = ?2, category_id = ?3, buy_price = ?4, sell_price = ?5,
            stock = ?6, min_stock = ?7, unit = ?8, updated_at = ?9
        WHERE id = ?10 AND is_active = 1
        "#,
        params![name, barcode, payload.category_id, payload.buy_price, payload.sell_price, payload.stock, payload.min_stock, unit, now, payload.id],
    )
    .map_err(|e| e.to_string())?;
    if conn.changes() == 0 {
        return Err("Produk tidak ditemukan".into());
    }
    let category_name = if let Some(category_id) = payload.category_id {
        conn.query_row("SELECT name FROM product_categories WHERE id = ?1", params![category_id], |row| row.get::<_, String>(0)).ok()
    } else { None };
    Ok(ProductRow { id: payload.id, name, barcode, category_id: payload.category_id, category_name, buy_price: payload.buy_price, sell_price: payload.sell_price, stock: payload.stock, min_stock: payload.min_stock, unit, is_active: true })
}

#[tauri::command]
fn deactivate_product(app: AppHandle, payload: ProductIdPayload) -> Result<bool, String> {
    let conn = init_schema(&app)?;
    let now = Utc::now().to_rfc3339();
    conn.execute("UPDATE products SET is_active = 0, updated_at = ?1 WHERE id = ?2", params![now, payload.id])
        .map_err(|e| e.to_string())?;
    Ok(conn.changes() > 0)
}

#[tauri::command]
fn list_transactions(app: AppHandle) -> Result<Vec<TransactionRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at
            FROM transactions
            ORDER BY id DESC
            LIMIT 100
            "#,
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TransactionRow {
                id: row.get(0)?,
                invoice_no: row.get(1)?,
                transaction_type: row.get(2)?,
                customer_name: row.get(3)?,
                total_amount: row.get(4)?,
                profit: row.get(5)?,
                payment_method: row.get(6)?,
                status: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
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
fn list_transaction_items(app: AppHandle, payload: TransactionIdPayload) -> Result<Vec<TransactionItemRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, transaction_id, product_id, product_name, quantity, unit_price, subtotal FROM transaction_items WHERE transaction_id = ?1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![payload.transaction_id], |row| {
            Ok(TransactionItemRow {
                id: row.get(0)?,
                transaction_id: row.get(1)?,
                product_id: row.get(2)?,
                product_name: row.get(3)?,
                quantity: row.get(4)?,
                unit_price: row.get(5)?,
                subtotal: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(out)
}





#[tauri::command]
fn list_app_logs(app: AppHandle) -> Result<Vec<AppLogRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, level, source, message, created_at FROM app_logs ORDER BY id DESC LIMIT 300")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AppLogRow {
                id: row.get(0)?,
                level: row.get(1)?,
                source: row.get(2)?,
                message: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn create_database_backup(app: AppHandle) -> Result<BackupRow, String> {
    let conn = init_schema(&app)?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").ok();
    drop(conn);

    let source = db_path(&app)?;
    if !source.exists() {
        return Err("Database belum ditemukan".into());
    }
    let dir = backup_dir(&app)?;
    let name = format!("catatagen-backup-{}.db", Utc::now().format("%Y%m%d-%H%M%S"));
    let target = dir.join(&name);
    fs::copy(&source, &target).map_err(|e| format!("Gagal membuat backup: {e}"))?;
    let metadata = fs::metadata(&target).map_err(|e| e.to_string())?;
    let conn = init_schema(&app)?;
    record_app_log(&conn, "INFO", "backup", &format!("Backup dibuat: {name}"));
    Ok(BackupRow {
        name,
        path: target.display().to_string(),
        size: metadata.len(),
        created_at: Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
fn list_database_backups(app: AppHandle) -> Result<Vec<BackupRow>, String> {
    let dir = backup_dir(&app)?;
    let mut backups = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("db") {
            continue;
        }
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
        let created_at = metadata
            .modified()
            .ok()
            .map(|time| DateTime::<Utc>::from(time).to_rfc3339())
            .unwrap_or_else(|| "-".to_string());
        backups.push(BackupRow {
            name: safe_file_name(&path),
            path: path.display().to_string(),
            size: metadata.len(),
            created_at,
        });
    }
    backups.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(backups)
}

#[tauri::command]
fn restore_database_backup(app: AppHandle, payload: RestoreBackupPayload) -> Result<bool, String> {
    let backup_path = PathBuf::from(payload.path);
    if !backup_path.exists() {
        return Err("File backup tidak ditemukan".into());
    }
    let allowed_dir = backup_dir(&app)?.canonicalize().map_err(|e| e.to_string())?;
    let canonical_backup = backup_path.canonicalize().map_err(|e| e.to_string())?;
    if !canonical_backup.starts_with(&allowed_dir) {
        return Err("File backup tidak valid".into());
    }

    let target = db_path(&app)?;
    if target.exists() {
        let pre_restore = backup_dir(&app)?.join(format!("pre-restore-{}.db", Utc::now().format("%Y%m%d-%H%M%S")));
        fs::copy(&target, pre_restore).map_err(|e| format!("Gagal membuat backup sebelum restore: {e}"))?;
    }
    let wal = target.with_extension("db-wal");
    let shm = target.with_extension("db-shm");
    let _ = fs::remove_file(&wal);
    let _ = fs::remove_file(&shm);
    fs::copy(&canonical_backup, &target).map_err(|e| format!("Gagal restore database: {e}"))?;
    let conn = init_schema(&app)?;
    record_app_log(&conn, "WARN", "backup", &format!("Database direstore dari {}", safe_file_name(&canonical_backup)));
    Ok(true)
}

#[tauri::command]
fn list_debts(app: AppHandle) -> Result<Vec<DebtRow>, String> {
    let conn = init_schema(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, customer_name, phone, amount, paid_amount, status, notes, created_at, updated_at FROM debts ORDER BY status ASC, id DESC LIMIT 200")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let amount = row.get::<_, f64>(3)?;
            let paid_amount = row.get::<_, f64>(4)?;
            Ok(DebtRow {
                id: row.get(0)?,
                customer_name: row.get(1)?,
                phone: row.get(2)?,
                amount,
                paid_amount,
                outstanding: (amount - paid_amount).max(0.0),
                status: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn create_debt(app: AppHandle, payload: DebtPayload) -> Result<DebtRow, String> {
    let conn = init_schema(&app)?;
    let customer_name = payload.customer_name.trim().to_string();
    if customer_name.is_empty() { return Err("Nama pelanggan wajib diisi".into()); }
    if payload.amount <= 0.0 { return Err("Nominal utang harus lebih dari 0".into()); }
    let now = Utc::now().to_rfc3339();
    let phone = trim_optional(payload.phone);
    let notes = trim_optional(payload.notes);
    conn.execute(
        "INSERT INTO debts (customer_name, phone, amount, paid_amount, status, notes, created_at, updated_at) VALUES (?1, ?2, ?3, 0, 'open', ?4, ?5, ?5)",
        params![customer_name, phone, payload.amount, notes, now],
    ).map_err(|e| e.to_string())?;
    Ok(DebtRow { id: conn.last_insert_rowid(), customer_name, phone, amount: payload.amount, paid_amount: 0.0, outstanding: payload.amount, status: "open".into(), notes, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
fn add_debt_payment(app: AppHandle, payload: DebtPaymentPayload) -> Result<DebtRow, String> {
    if payload.amount <= 0.0 { return Err("Nominal pembayaran harus lebih dari 0".into()); }
    let mut conn = init_schema(&app)?;
    let now = Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let debt = tx.query_row(
        "SELECT id, customer_name, phone, amount, paid_amount, status, notes, created_at FROM debts WHERE id = ?1 LIMIT 1",
        params![payload.debt_id],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<String>>(2)?, row.get::<_, f64>(3)?, row.get::<_, f64>(4)?, row.get::<_, String>(5)?, row.get::<_, Option<String>>(6)?, row.get::<_, String>(7)?)),
    ).map_err(|_| "Data utang tidak ditemukan".to_string())?;
    if debt.5 == "paid" { return Err("Utang sudah lunas".into()); }
    let paid_amount = (debt.4 + payload.amount).min(debt.3);
    let status = if paid_amount >= debt.3 { "paid" } else { "open" };
    tx.execute("UPDATE debts SET paid_amount = ?1, status = ?2, updated_at = ?3 WHERE id = ?4", params![paid_amount, status, now, debt.0]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO debt_payments (debt_id, amount, notes, created_at) VALUES (?1, ?2, ?3, ?4)", params![debt.0, payload.amount, trim_optional(payload.notes), now]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(DebtRow { id: debt.0, customer_name: debt.1, phone: debt.2, amount: debt.3, paid_amount, outstanding: (debt.3 - paid_amount).max(0.0), status: status.into(), notes: debt.6, created_at: debt.7, updated_at: now })
}

#[tauri::command]
fn build_debt_reminder(app: AppHandle, payload: DebtIdPayload) -> Result<String, String> {
    let conn = init_schema(&app)?;
    let debt = conn.query_row(
        "SELECT customer_name, amount, paid_amount, notes FROM debts WHERE id = ?1 LIMIT 1",
        params![payload.debt_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?, row.get::<_, Option<String>>(3)?)),
    ).map_err(|_| "Data utang tidak ditemukan".to_string())?;
    let outstanding = (debt.1 - debt.2).max(0.0);
    Ok(format!("Halo {}, kami ingin mengingatkan sisa utang sebesar Rp{:.0}. Mohon dibayarkan jika sudah memungkinkan. Catatan: {}. Terima kasih.", debt.0, outstanding, debt.3.unwrap_or_else(|| "-".into())))
}

#[tauri::command]
fn create_agent_transaction(app: AppHandle, payload: AgentTransactionPayload) -> Result<TransactionRow, String> {
    let service_name = payload.service_name.trim().to_string();
    if service_name.is_empty() { return Err("Nama layanan wajib diisi".into()); }
    let provider_cost = payload.provider_cost.unwrap_or(0.0);
    if payload.amount < 0.0 || payload.fee < 0.0 || provider_cost < 0.0 { return Err("Nominal, admin, dan biaya modal provider tidak boleh minus".into()); }
    let profit = payload.fee - provider_cost;
    let mut conn = init_schema(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let invoice_no = format!("AGN-{}-{}", Utc::now().format("%Y%m%d%H%M%S"), Utc::now().timestamp_subsec_millis());
    let total_amount = payload.amount + payload.fee;
    tx.execute(
        r#"INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at)
           VALUES (?1, 'agent', ?2, ?3, ?4, 'mixed', 'completed', ?5, ?6)"#,
        params![invoice_no, trim_optional(payload.customer_name), total_amount, profit, trim_optional(payload.notes).unwrap_or_else(|| service_name.clone()), now],
    ).map_err(|e| e.to_string())?;
    let transaction_id = tx.last_insert_rowid();

    if payload.cash_effect != 0.0 {
        let cash = tx.query_row("SELECT id, balance FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1", [], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))).map_err(|_| "Akun Kas Tunai tidak ditemukan".to_string())?;
        let next_balance = cash.1 + payload.cash_effect;
        if next_balance < 0.0 { return Err("Saldo Kas Tunai tidak cukup".into()); }
        tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![next_balance, now, cash.0]).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'agent_cash_effect', ?2, ?3, ?4, ?5, ?6)", params![cash.0, payload.cash_effect, next_balance, service_name, transaction_id, now]).map_err(|e| e.to_string())?;
    }

    if payload.bank_effect != 0.0 {
        let account_id = payload.account_id.ok_or_else(|| "Rekening layanan wajib dipilih jika efek rekening tidak 0".to_string())?;
        let account = tx.query_row("SELECT id, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1", params![account_id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))).map_err(|_| "Rekening layanan tidak ditemukan".to_string())?;
        let next_balance = account.1 + payload.bank_effect;
        if next_balance < 0.0 { return Err("Saldo rekening layanan tidak cukup".into()); }
        tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![next_balance, now, account.0]).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'agent_bank_effect', ?2, ?3, ?4, ?5, ?6)", params![account.0, payload.bank_effect, next_balance, service_name, transaction_id, now]).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(TransactionRow { id: transaction_id, invoice_no, transaction_type: "agent".into(), customer_name: None, total_amount, profit, payment_method: "mixed".into(), status: "completed".into(), notes: Some(service_name), created_at: now })
}

#[tauri::command]
fn checkout_pos_cash(app: AppHandle, payload: PosCheckoutPayload) -> Result<PosCheckoutResponse, String> {
    if payload.items.is_empty() && payload.agent_items.is_empty() { return Err("Keranjang masih kosong".into()); }
    if payload.items.iter().any(|item| item.quantity <= 0) { return Err("Jumlah produk harus lebih dari 0".into()); }

    let payment_method = trim_optional(payload.payment_method).unwrap_or_else(|| "cash".to_string()).to_lowercase();
    if !matches!(payment_method.as_str(), "cash" | "transfer" | "qris") { return Err("Metode pembayaran tidak valid".into()); }

    let mut conn = init_schema(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let invoice_no = format!("POS-{}-{}", Utc::now().format("%Y%m%d%H%M%S"), Utc::now().timestamp_subsec_millis());
    let mut total_amount = 0.0;
    let mut total_profit = 0.0;
    let mut prepared_items: Vec<(Option<i64>, String, i64, f64, f64, bool)> = Vec::new();
    let mut prepared_agent_effects: Vec<(String, Option<i64>, f64, f64)> = Vec::new();

    for item in &payload.items {
        let product = tx.query_row(
            "SELECT name, buy_price, sell_price, stock FROM products WHERE id = ?1 AND is_active = 1",
            params![item.product_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?, row.get::<_, i64>(3)?)),
        ).map_err(|_| format!("Produk ID {} tidak ditemukan", item.product_id))?;
        if product.3 < item.quantity { return Err(format!("Stok {} tidak cukup", product.0)); }
        let subtotal = product.2 * item.quantity as f64;
        let profit = (product.2 - product.1) * item.quantity as f64;
        total_amount += subtotal;
        total_profit += profit;
        prepared_items.push((Some(item.product_id), product.0, item.quantity, product.2, subtotal, true));
    }

    for service in &payload.agent_items {
        let service_name = service.service_name.trim().to_string();
        if service_name.is_empty() { return Err("Nama layanan wajib diisi".into()); }
        let provider_cost = service.provider_cost.unwrap_or(0.0);
        let cash_effect = service.cash_effect.unwrap_or(0.0);
        let bank_effect = service.bank_effect.unwrap_or(0.0);
        if service.amount < 0.0 || service.fee < 0.0 || provider_cost < 0.0 { return Err("Nominal, admin, dan biaya modal provider tidak boleh minus".into()); }
        let subtotal = service.amount + service.fee;
        let profit = service.fee - provider_cost;
        total_amount += subtotal;
        total_profit += profit;
        let label = match (trim_optional(service.customer_name.clone()), trim_optional(service.notes.clone())) {
            (Some(customer), Some(notes)) => format!("Layanan: {service_name} ({customer}) - {notes}"),
            (Some(customer), None) => format!("Layanan: {service_name} ({customer})"),
            (None, Some(notes)) => format!("Layanan: {service_name} - {notes}"),
            (None, None) => format!("Layanan: {service_name}"),
        };
        prepared_items.push((None, label, 1, subtotal, subtotal, false));
        prepared_agent_effects.push((service_name, service.account_id, cash_effect, bank_effect));
    }

    let settlement_account = if payment_method == "cash" {
        tx.query_row("SELECT id, code, name, balance FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1", [], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, f64>(3)?))).map_err(|_| "Akun Kas Tunai tidak ditemukan".to_string())?
    } else {
        let account_id = payload.settlement_account_id.ok_or_else(|| "Rekening penerima wajib dipilih untuk transfer/QRIS".to_string())?;
        let account = tx.query_row("SELECT id, code, name, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1", params![account_id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, f64>(3)?))).map_err(|_| "Rekening penerima tidak ditemukan".to_string())?;
        if account.1 == "cash" { return Err("Transfer/QRIS harus masuk ke rekening non-tunai".into()); }
        account
    };

    tx.execute(
        r#"INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at)
           VALUES (?1, 'pos', ?2, ?3, ?4, ?5, 'completed', ?6, ?7)"#,
        params![invoice_no, trim_optional(payload.customer_name), total_amount, total_profit, payment_method, trim_optional(payload.notes), now],
    ).map_err(|e| e.to_string())?;
    let transaction_id = tx.last_insert_rowid();

    for item in prepared_items {
        tx.execute("INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![transaction_id, item.0, item.1, item.2, item.3, item.4]).map_err(|e| e.to_string())?;
        if item.5 {
            if let Some(product_id) = item.0 {
                tx.execute("UPDATE products SET stock = stock - ?1, updated_at = ?2 WHERE id = ?3", params![item.2, now, product_id]).map_err(|e| e.to_string())?;
            }
        }
    }

    let settlement_balance = settlement_account.3 + total_amount;
    tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![settlement_balance, now, settlement_account.0]).map_err(|e| e.to_string())?;
    let mutation_type = match payment_method.as_str() { "transfer" => "pos_transfer_in", "qris" => "pos_qris_in", _ => "pos_in" };
    let mutation_label = match payment_method.as_str() { "transfer" => "POS Transfer", "qris" => "POS QRIS", _ => "POS Tunai" };
    tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", params![settlement_account.0, mutation_type, total_amount, settlement_balance, format!("{mutation_label} {invoice_no}"), transaction_id, now]).map_err(|e| e.to_string())?;

    for (service_name, account_id, cash_effect, bank_effect) in prepared_agent_effects {
        if cash_effect != 0.0 {
            let cash = tx.query_row("SELECT id, balance FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1", [], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))).map_err(|_| "Akun Kas Tunai tidak ditemukan".to_string())?;
            let next_balance = cash.1 + cash_effect;
            if next_balance < 0.0 { return Err("Saldo Kas Tunai tidak cukup untuk efek layanan".into()); }
            tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![next_balance, now, cash.0]).map_err(|e| e.to_string())?;
            tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'pos_agent_cash_effect', ?2, ?3, ?4, ?5, ?6)", params![cash.0, cash_effect, next_balance, service_name, transaction_id, now]).map_err(|e| e.to_string())?;
        }
        if bank_effect != 0.0 {
            let selected_account_id = account_id.ok_or_else(|| "Rekening layanan wajib dipilih jika efek rekening tidak 0".to_string())?;
            let account = tx.query_row("SELECT id, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1", params![selected_account_id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))).map_err(|_| "Rekening layanan tidak ditemukan".to_string())?;
            let next_balance = account.1 + bank_effect;
            if next_balance < 0.0 { return Err("Saldo rekening layanan tidak cukup".into()); }
            tx.execute("UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3", params![next_balance, now, account.0]).map_err(|e| e.to_string())?;
            tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'pos_agent_bank_effect', ?2, ?3, ?4, ?5, ?6)", params![account.0, bank_effect, next_balance, service_name, transaction_id, now]).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    record_app_log(&conn, "INFO", "pos", &format!("Checkout POS berhasil: {invoice_no}"));

    Ok(PosCheckoutResponse { ok: true, transaction_id, invoice_no, total_amount, profit: total_profit, settlement_account_id: settlement_account.0, settlement_balance })
}

pub fn run() {
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
            list_users,
            create_user,
            login,
            list_accounts,
            create_account,
            adjust_account_balance,
            transfer_accounts,
            owner_draw,
            bank_fee,
            list_account_mutations,
            list_categories,
            create_category,
            list_products,
            create_product,
            update_product,
            deactivate_product,
            list_transactions,
            list_transaction_items,
            list_app_logs,
            create_database_backup,
            list_database_backups,
            restore_database_backup,
            list_debts,
            create_debt,
            add_debt_payment,
            build_debt_reminder,
            create_agent_transaction,
            checkout_pos_cash,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

