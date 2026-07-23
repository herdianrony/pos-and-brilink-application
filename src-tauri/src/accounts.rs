use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::auth::require_admin;
use crate::common::{get_db, round_money, validate_money, DbConn};
use crate::session::SessionState;

#[derive(Debug, Serialize)]
pub struct AccountRow {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub balance: f64,
    pub min_balance: f64,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct AccountPayload {
    pub code: String,
    pub name: String,
    pub initial_balance: Option<f64>,
    pub min_balance: Option<f64>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BalanceAdjustmentPayload {
    pub account_id: i64,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountTransferPayload {
    pub from_account_id: i64,
    pub to_account_id: i64,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountExpensePayload {
    pub account_id: i64,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountPayload {
    pub id: i64,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub min_balance: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct AccountMutationRow {
    pub id: i64,
    pub account_id: i64,
    pub account_name: String,
    pub mutation_type: String,
    pub amount: f64,
    pub balance_after: f64,
    pub notes: Option<String>,
    pub reference_id: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct AccountMutationSummary {
    pub total_in: f64,
    pub total_out: f64,
    pub net: f64,
    pub count: i64,
    pub opening_balance: f64,
    pub closing_balance: f64,
}

#[derive(Debug, Deserialize)]
pub struct ListMutationsPayload {
    pub account_id: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct MutationSummaryPayload {
    pub account_id: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[tauri::command]
pub fn list_accounts(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<Vec<AccountRow>, String> {
    let _user = crate::auth::require_auth(&session)?;
    let conn = get_db(&db)?;
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
pub fn create_account(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: AccountPayload,
) -> Result<AccountRow, String> {
    let _user = require_admin(&session)?;
    let mut conn = get_db(&db)?;
    let code = crate::common::normalize_code(&payload.code);
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
    let icon = crate::common::trim_optional(payload.icon).or_else(|| Some("bank".to_string()));
    let color = crate::common::trim_optional(payload.color).or_else(|| Some("#2563eb".to_string()));
    let now = chrono::Utc::now().to_rfc3339();
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
    Ok(AccountRow {
        id,
        code,
        name,
        icon,
        color,
        balance: initial_balance,
        min_balance,
        is_active: true,
    })
}

#[tauri::command]
pub fn adjust_account_balance(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: BalanceAdjustmentPayload,
) -> Result<AccountRow, String> {
    let _user = require_admin(&session)?;
    let amount = round_money(payload.amount);
    if amount == 0.0 {
        return Err("Nominal penyesuaian tidak boleh 0".into());
    }
    let mut conn = get_db(&db)?;
    let now = chrono::Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let account = tx
        .query_row(
            "SELECT id, code, name, icon, color, balance, min_balance, is_active FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
            params![payload.account_id],
            |row| Ok((
                row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?, row.get::<_, Option<String>>(4)?, row.get::<_, f64>(5)?,
                row.get::<_, f64>(6)?, row.get::<_, i64>(7)?,
            )),
        )
        .map_err(|_| "Rekening tidak ditemukan".to_string())?;
    // Race-safe: use conditional WHERE to prevent TOCTOU
    let affected = tx.execute(
        "UPDATE accounts SET balance = balance + ?1, updated_at = ?2 WHERE id = ?3 AND balance + ?1 >= 0 AND is_active = 1",
        params![amount, now, account.0],
    )
    .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Saldo tidak cukup".into());
    }
    let next_balance = round_money(account.5 + amount);
    tx.execute(
        "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'adjustment', ?2, ?3, ?4, NULL, ?5)",
        params![account.0, amount, next_balance, crate::common::trim_optional(payload.notes).unwrap_or_else(|| "Penyesuaian saldo".to_string()), now],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(account_row_from_tuple(account, next_balance))
}

#[tauri::command]
pub fn transfer_accounts(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: AccountTransferPayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    if payload.from_account_id == payload.to_account_id {
        return Err("Rekening asal dan tujuan tidak boleh sama".into());
    }
    let amount = round_money(payload.amount);
    if amount <= 0.0 {
        return Err("Nominal transfer harus lebih dari 0".into());
    }
    let mut conn = get_db(&db)?;
    let now = chrono::Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let from = tx
        .query_row(
            "SELECT id, name, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
            params![payload.from_account_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            },
        )
        .map_err(|_| "Rekening asal tidak ditemukan".to_string())?;
    let to = tx
        .query_row(
            "SELECT id, name, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
            params![payload.to_account_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            },
        )
        .map_err(|_| "Rekening tujuan tidak ditemukan".to_string())?;
    // Race-safe: conditional WHERE ensures balance can't go negative
    let from_affected = tx.execute(
        "UPDATE accounts SET balance = balance - ?1, updated_at = ?2 WHERE id = ?3 AND balance >= ?1 AND is_active = 1",
        params![amount, now, from.0],
    )
    .map_err(|e| e.to_string())?;
    if from_affected == 0 {
        return Err("Saldo rekening asal tidak cukup atau akun tidak aktif".into());
    }
    let _to_affected = tx.execute(
        "UPDATE accounts SET balance = balance + ?1, updated_at = ?2 WHERE id = ?3 AND is_active = 1",
        params![amount, now, to.0],
    )
    .map_err(|e| e.to_string())?;
    // Recalculate balances for mutations
    let from_balance = round_money(from.2 - amount);
    let to_balance = round_money(to.2 + amount);
    let note = crate::common::trim_optional(payload.notes)
        .unwrap_or_else(|| format!("Transfer {} ke {}", from.1, to.1));
    tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'transfer_out', ?2, ?3, ?4, NULL, ?5)", params![from.0, -amount, from_balance, note, now]).map_err(|e| e.to_string())?;
    let note_in = format!("Transfer dari {}", from.1);
    tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'transfer_in', ?2, ?3, ?4, NULL, ?5)", params![to.0, amount, to_balance, note_in, now]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn owner_draw(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: AccountExpensePayload,
) -> Result<AccountRow, String> {
    let _user = require_admin(&session)?;
    account_expense(app, &db, payload, "owner_draw", "Prive Owner")
}

#[tauri::command]
pub fn bank_fee(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: AccountExpensePayload,
) -> Result<AccountRow, String> {
    let _user = require_admin(&session)?;
    account_expense(app, &db, payload, "bank_fee", "Biaya Bank / MDR")
}

#[tauri::command]
pub fn list_account_mutations(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: Option<ListMutationsPayload>,
) -> Result<Vec<AccountMutationRow>, String> {
    let _user = require_admin(&session)?;
    let limit = payload
        .as_ref()
        .and_then(|p| p.limit)
        .unwrap_or(80)
        .clamp(1, 500);
    let conn = get_db(&db)?;

    let mut sql = String::from(
        r#"SELECT m.id, m.account_id, a.name, m.type, m.amount, m.balance_after, m.notes, m.reference_id, m.created_at
        FROM account_mutations m
        JOIN accounts a ON a.id = m.account_id
        WHERE 1=1"#,
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref p) = payload {
        if let Some(aid) = p.account_id {
            sql.push_str(" AND m.account_id = ?");
            params_vec.push(Box::new(aid));
        }
        if let Some(ref start) = p.start_date {
            if !start.is_empty() {
                sql.push_str(" AND m.created_at >= ?");
                params_vec.push(Box::new(format!("{}T00:00:00", start.trim())));
            }
        }
        if let Some(ref end) = p.end_date {
            if !end.is_empty() {
                sql.push_str(" AND m.created_at <= ?");
                params_vec.push(Box::new(format!("{}T23:59:59", end.trim())));
            }
        }
    }

    sql.push_str(" ORDER BY m.id DESC LIMIT ?");
    params_vec.push(Box::new(limit));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|b| b.as_ref()).collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(AccountMutationRow {
                id: row.get(0)?,
                account_id: row.get(1)?,
                account_name: row.get(2)?,
                mutation_type: row.get(3)?,
                amount: row.get(4)?,
                balance_after: row.get(5)?,
                notes: row.get(6)?,
                reference_id: row.get(7)?,
                created_at: row.get(8)?,
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
pub fn get_mutation_summary(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: Option<MutationSummaryPayload>,
) -> Result<AccountMutationSummary, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;

    let mut sql = String::from(
        "SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0), COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END),0), COUNT(*) FROM account_mutations WHERE 1=1",
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref p) = payload {
        if let Some(aid) = p.account_id {
            sql.push_str(" AND account_id = ?");
            params_vec.push(Box::new(aid));
        }
        if let Some(ref start) = p.start_date {
            if !start.is_empty() {
                sql.push_str(" AND created_at >= ?");
                params_vec.push(Box::new(format!("{}T00:00:00", start.trim())));
            }
        }
        if let Some(ref end) = p.end_date {
            if !end.is_empty() {
                sql.push_str(" AND created_at <= ?");
                params_vec.push(Box::new(format!("{}T23:59:59", end.trim())));
            }
        }
    }

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|b| b.as_ref()).collect();

    // Compute opening balance: sum of all mutations BEFORE the filtered period
    let mut opening_sql =
        String::from("SELECT COALESCE(SUM(amount), 0) FROM account_mutations WHERE 1=1");
    let mut opening_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref p) = payload {
        if let Some(aid) = p.account_id {
            opening_sql.push_str(" AND account_id = ?");
            opening_params.push(Box::new(aid));
        }
        if let Some(ref start) = p.start_date {
            if !start.is_empty() {
                opening_sql.push_str(" AND created_at < ?");
                opening_params.push(Box::new(format!("{}T00:00:00", start.trim())));
            }
        }
        // No end_date filter for opening — we want everything BEFORE start_date
    }
    let opening_refs: Vec<&dyn rusqlite::types::ToSql> =
        opening_params.iter().map(|b| b.as_ref()).collect();
    let opening_balance: f64 = conn
        .query_row(&opening_sql, opening_refs.as_slice(), |row| row.get(0))
        .unwrap_or(0.0);

    let summary = conn
        .query_row(&sql, param_refs.as_slice(), |row| {
            let total_in: f64 = row.get(0)?;
            let total_out: f64 = row.get(1)?;
            let count: i64 = row.get(2)?;
            Ok(AccountMutationSummary {
                total_in,
                total_out,
                net: total_in - total_out,
                count,
                closing_balance: opening_balance + total_in - total_out,
                opening_balance,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(summary)
}

fn account_expense(
    app: AppHandle,
    db: &State<'_, DbConn>,
    payload: AccountExpensePayload,
    mutation_type: &str,
    default_note: &str,
) -> Result<AccountRow, String> {
    let amount = round_money(payload.amount);
    if amount <= 0.0 {
        return Err("Nominal harus lebih dari 0".into());
    }
    let mut conn = get_db(db)?;
    let now = chrono::Utc::now().to_rfc3339();
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
    // Race-safe: use conditional WHERE to prevent TOCTOU
    let affected = tx.execute(
        "UPDATE accounts SET balance = balance - ?1, updated_at = ?2 WHERE id = ?3 AND balance >= ?1 AND is_active = 1",
        params![amount, now, account.0],
    )
    .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Saldo tidak cukup".into());
    }
    let next_balance = round_money(account.5 - amount);
    tx.execute(
        "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)",
        params![account.0, mutation_type, -amount, next_balance, crate::common::trim_optional(payload.notes).unwrap_or_else(|| default_note.to_string()), now],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(account_row_from_tuple(account, next_balance))
}

fn account_row_from_tuple(
    account: (
        i64,
        String,
        String,
        Option<String>,
        Option<String>,
        f64,
        f64,
        i64,
    ),
    balance: f64,
) -> AccountRow {
    AccountRow {
        id: account.0,
        code: account.1,
        name: account.2,
        icon: account.3,
        color: account.4,
        balance,
        min_balance: account.6,
        is_active: account.7 == 1,
    }
}

#[tauri::command]
pub fn update_account(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: UpdateAccountPayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let mut sets = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(ref n) = payload.name {
        let n = n.trim();
        if n.is_empty() {
            return Err("Nama akun wajib diisi".into());
        }
        sets.push("name = ?");
        params_vec.push(Box::new(n.to_string()));
    }
    if let Some(ref i) = payload.icon {
        sets.push("icon = ?");
        params_vec.push(Box::new(i.clone()));
    }
    if let Some(ref c) = payload.color {
        sets.push("color = ?");
        params_vec.push(Box::new(c.clone()));
    }
    if let Some(m) = payload.min_balance {
        sets.push("min_balance = ?");
        params_vec.push(Box::new(m));
    }
    if let Some(a) = payload.is_active {
        sets.push("is_active = ?");
        params_vec.push(Box::new(if a { 1i64 } else { 0i64 }));
    }
    if sets.is_empty() {
        return Err("Tidak ada field yang diubah".into());
    }
    sets.push("updated_at = ?");
    params_vec.push(Box::new(now));
    params_vec.push(Box::new(payload.id));
    let sql = format!("UPDATE accounts SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn deactivate_account(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    account_id: i64,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let code: String = conn
        .query_row(
            "SELECT code FROM accounts WHERE id = ?1 AND is_active = 1",
            params![account_id],
            |r| r.get(0),
        )
        .map_err(|_| format!("Akun ID {} tidak ditemukan atau sudah nonaktif", account_id))?;
    if code == "cash" {
        return Err("Akun Kas tidak bisa dinonaktifkan".into());
    }
    // Atomic check: only deactivate if balance is effectively zero
    let affected = conn
        .execute(
            "UPDATE accounts SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND is_active = 1 AND ABS(balance) <= 0.01",
            params![chrono::Utc::now().to_rfc3339(), account_id],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Akun dengan saldo tidak bisa dinonaktifkan, atau sudah nonaktif".into());
    }
    Ok(true)
}
