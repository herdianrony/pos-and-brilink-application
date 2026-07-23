// ── Transaction Lifecycle (void, reverse, complete) + get_transaction ──

use rusqlite::{params, Transaction};
use tauri::{AppHandle, State};

use crate::{
    auth::require_admin, auth::require_auth, common::get_db, common::DbConn,
    common::record_app_log, session::SessionState,
};

use super::types::*;

/// Shared logic for void and reverse: counter-mutations + stock restore.
fn undo_transaction(
    tx: &Transaction,
    trx_id: i64,
    trx_type: &str,
    action_label: &str, // "void" or "reversal"
    reason: &str,
    now: &str,
) -> Result<(), String> {
    // Counter-mutations for all account mutations linked to this transaction
    let mut stmt = tx
        .prepare("SELECT account_id, amount, type FROM account_mutations WHERE reference_id = ?1")
        .map_err(|e| e.to_string())?;
    let muts: Vec<(i64, f64, String)> = stmt
        .query_map(params![trx_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    for (acc_id, amt, mtype) in &muts {
        let neg_amt = -amt;
        tx.execute(
            "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, (SELECT balance FROM accounts WHERE id = ?1) + ?3, ?4, ?5, ?6)",
            params![acc_id, format!("{}_{}", mtype, action_label), neg_amt, format!("{}: {}", action_label, reason), trx_id, now],
        ).map_err(|e| e.to_string())?;
        tx.execute("UPDATE accounts SET balance = balance + ?1 WHERE id = ?2", params![neg_amt, acc_id])
            .map_err(|e| e.to_string())?;
    }

    // Restore stock for POS transactions
    if trx_type == "pos" {
        let mut istmt = tx
            .prepare("SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?1")
            .map_err(|e| e.to_string())?;
        let items: Vec<(i64, i64)> = istmt
            .query_map(params![trx_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (pid, qty) in &items {
            tx.execute(
                "UPDATE products SET stock = stock + ?1, updated_at = ?2 WHERE id = ?3",
                params![qty, now, pid],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn transaction_action(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: TransactionActionPayload,
) -> Result<TransactionDetailRow, String> {
    let _user = require_admin(&session)?;
    let reason = payload
        .reason
        .as_ref()
        .filter(|r| !r.is_empty())
        .ok_or("Alasan wajib diisi (minimal 3 karakter)")?;
    if reason.trim().len() < 3 {
        return Err("Alasan minimal 3 karakter".into());
    }

    let mut conn = get_db(&db)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let trx: (String, String) = tx
        .query_row("SELECT type, status FROM transactions WHERE id = ?1", params![payload.id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    match payload.action.as_str() {
        "void" => {
            if trx.1 != "pending" {
                return Err("Hanya transaksi pending yang bisa dibatalkan".into());
            }
            tx.execute("UPDATE transactions SET status = 'void' WHERE id = ?1", params![payload.id])
                .map_err(|e| e.to_string())?;
            undo_transaction(&tx, payload.id, &trx.0, "void", reason.trim(), &now)?;
        }
        "reverse" => {
            if trx.1 != "completed" {
                return Err("Hanya transaksi completed yang bisa di-reverse".into());
            }
            tx.execute("UPDATE transactions SET status = 'reversed' WHERE id = ?1", params![payload.id])
                .map_err(|e| e.to_string())?;
            undo_transaction(&tx, payload.id, &trx.0, "reversal", reason.trim(), &now)?;
        }
        "complete" => {
            if trx.1 != "pending" {
                return Err("Hanya transaksi pending yang bisa diselesaikan".into());
            }
            if let Some(ref rno) = payload.reference_no {
                tx.execute(
                    "UPDATE transactions SET status = 'completed', notes = COALESCE(notes || ' | ', '') || ?1 WHERE id = ?2",
                    params![format!("Ref: {}", rno), payload.id],
                ).map_err(|e| e.to_string())?;
            } else {
                tx.execute("UPDATE transactions SET status = 'completed' WHERE id = ?1", params![payload.id])
                    .map_err(|e| e.to_string())?;
            }
        }
        _ => return Err(format!("Aksi tidak dikenal: {}", payload.action)),
    }

    tx.commit().map_err(|e| e.to_string())?;
    let conn = get_db(&db)?;
    let row = conn.query_row(
        &format!("SELECT {} FROM transactions WHERE id = ?1", TRANSACTION_COLUMNS),
        params![payload.id],
        |row| row_to_detail(row, false),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())?;
    record_app_log(&conn, "WARN", "transactions", &format!("Transaction #{} {}", payload.id, payload.action));
    Ok(row)
}

#[tauri::command]
pub fn get_transaction(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    id: i64,
) -> Result<TransactionDetailRow, String> {
    let user = require_auth(&session)?;
    let conn = get_db(&db)?;
    let is_admin = user.role == "admin";
    conn.query_row(
        &format!("SELECT {} FROM transactions WHERE id = ?1", TRANSACTION_COLUMNS),
        params![id],
        |row| row_to_detail(row, !is_admin),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())
}
