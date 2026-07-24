// ── Agent Transaction ──────────────────────────────────────────────

use rusqlite::params;
use tauri::{AppHandle, State};

use crate::{
    auth::require_auth, common::get_db, common::round_money, common::trim_optional,
    common::DbConn, common::record_app_log, session::SessionState,
};

use super::types::*;

#[tauri::command]
pub fn create_agent_transaction(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: AgentTransactionPayload,
) -> Result<TransactionDetailRow, String> {
    let user = require_auth(&session)?;
    let service_name = payload.service_name.trim().to_string();
    if service_name.is_empty() || service_name.len() > 200 {
        return Err("Nama layanan wajib diisi (maks 200 karakter)".into());
    }
    let mut conn = get_db(&db)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let invoice_no = format!(
        "BRK-{}-{}",
        chrono::Utc::now().format("%Y%m%d%H%M%S"),
        chrono::Utc::now().timestamp_subsec_millis()
    );

    // Auto-calculate fee from tiers if frontend sends fee=0
    let (fee, provider_cost) = if payload.fee == 0.0 {
        if let Some((tier_fee, tier_pc)) = crate::agent_services::lookup_fee(&tx, &service_name, payload.amount) {
            (round_money(tier_fee), round_money(tier_pc))
        } else {
            (round_money(payload.fee), round_money(payload.provider_cost.unwrap_or(0.0)))
        }
    } else {
        (round_money(payload.fee), round_money(payload.provider_cost.unwrap_or(0.0)))
    };
    let profit = round_money(fee - provider_cost);

    tx.execute(
        "INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at, user_id) VALUES (?1, 'brilink', ?2, ?3, ?4, 'cash', 'completed', ?5, ?6, ?7)",
        params![invoice_no, payload.customer_name, fee, profit, trim_optional(payload.notes), now, user.id],
    ).map_err(|e| e.to_string())?;
    let trx_id = tx.last_insert_rowid();

    // Cash effect (atomic balance update)
    if payload.cash_effect != 0.0 {
        if let Some(cid) = tx.query_row("SELECT id FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1", [], |r| r.get::<_, i64>(0)).ok() {
            let mtype = if payload.cash_effect > 0.0 { "brilink_in" } else { "brilink_out" };
            let min_balance = if payload.cash_effect < 0.0 { 0.0 } else { f64::MIN };
            if tx.execute("UPDATE accounts SET balance = balance + ?1, updated_at = ?2 WHERE id = ?3 AND is_active = 1 AND balance + ?1 >= ?4", params![payload.cash_effect, now, cid, min_balance]).map_err(|e| e.to_string())? > 0 {
                let nb: f64 = tx.query_row("SELECT balance FROM accounts WHERE id = ?1", params![cid], |r| r.get(0)).map_err(|e| e.to_string())?;
                tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", params![cid, mtype, payload.cash_effect, nb, format!("{} {}", service_name, invoice_no), trx_id, now]).map_err(|e| e.to_string())?;
            }
        }
    }

    // Bank effect (atomic balance update)
    if payload.bank_effect != 0.0 {
        if let Some(aid) = payload.account_id {
            if tx.execute("UPDATE accounts SET balance = balance + ?1, updated_at = ?2 WHERE id = ?3 AND is_active = 1", params![payload.bank_effect, now, aid]).map_err(|e| e.to_string())? > 0 {
                let nb: f64 = tx.query_row("SELECT balance FROM accounts WHERE id = ?1", params![aid], |r| r.get(0)).map_err(|e| e.to_string())?;
                tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'agent_bank_effect', ?2, ?3, ?4, ?5, ?6)", params![aid, payload.bank_effect, nb, format!("{} {}", service_name, invoice_no), trx_id, now]).map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    record_app_log(&conn, "INFO", "brilink", &format!("Agent trx {} Rp{:.0}", invoice_no, fee));

    let conn = get_db(&db)?;
    let is_admin = user.role == "admin";
    conn.query_row(
        &format!("SELECT {} FROM transactions WHERE id = ?1", TRANSACTION_COLUMNS),
        params![trx_id],
        |row| row_to_detail(row, !is_admin),
    ).map_err(|e| e.to_string())
}
