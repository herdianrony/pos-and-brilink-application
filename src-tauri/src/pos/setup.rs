// ── Setup Complete ──────────────────────────────────────────────────

use rusqlite::params;
use tauri::{AppHandle, State};

use crate::{
    common::get_db, common::round_money, common::validate_password, common::DbConn,
    common::record_app_log, session::PublicUser, session::SessionState,
};

use super::types::*;

#[tauri::command]
pub fn setup_complete(
    _app: AppHandle,
    payload: SetupCompletePayload,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<SetupCompleteResponse, String> {
    let mut conn = get_db(&db)?;
    let existing: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if existing > 0 {
        return Err("Setup sudah selesai".into());
    }

    let admin_name = payload.admin_name.trim().to_string();
    let admin_username = payload.admin_username.trim().to_string();
    if admin_name.is_empty() || admin_username.len() < 3 {
        return Err("Nama admin (min 3 karakter) dan username wajib diisi".into());
    }
    validate_password(&payload.admin_password)?;

    let now = chrono::Utc::now().to_rfc3339();
    let password_hash =
        bcrypt::hash(&payload.admin_password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    let kas_only = payload.kas_only.unwrap_or(false);

    // Wrap all DB operations in a transaction for atomicity
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 'admin', 1, ?4, ?4)",
        params![admin_name, admin_username, password_hash, now],
    ).map_err(|e| e.to_string())?;
    let user_id = tx.last_insert_rowid();

    if let Some(ref name) = payload.store_name {
        let _ = tx.execute("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('store_name', ?1, ?2)", params![name.trim(), now]);
    }
    if let Some(ref owner) = payload.store_owner_name {
        let _ = tx.execute("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('store_owner_name', ?1, ?2)", params![owner.trim(), now]);
    }

    let cash_opening = round_money(payload.cash_opening_balance.unwrap_or(0.0).max(0.0));
    if cash_opening > 0.0 {
        let cash_account_id: i64 = tx
            .query_row("SELECT id FROM accounts WHERE code = 'cash' LIMIT 1", [], |r| r.get(0))
            .map_err(|e| format!("Cash account not found: {e}"))?;
        tx.execute("UPDATE accounts SET balance = balance + ?1, updated_at = ?2 WHERE id = ?3", params![cash_opening, now, cash_account_id])
            .map_err(|e| e.to_string())?;
        let new_bal: f64 = tx.query_row("SELECT balance FROM accounts WHERE id = ?1", params![cash_account_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?1, 'opening', ?2, ?3, 'Saldo awal dari Setup Wizard', ?4)", params![cash_account_id, cash_opening, new_bal, now])
            .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    let public_user = PublicUser {
        id: user_id,
        name: admin_name,
        username: admin_username,
        role: "admin".into(),
    };
    *session.0.lock().map_err(|_| "Session error".to_string())? = Some(public_user.clone());

    record_app_log(&conn, "INFO", "setup", "Setup wizard selesai");
    Ok(SetupCompleteResponse {
        ok: true,
        user: public_user,
        cash_opening_balance: cash_opening,
        kas_only,
    })
}
