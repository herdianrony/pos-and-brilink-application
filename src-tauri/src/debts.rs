use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{auth::require_auth, common::bounded_limit, common::get_db, common::DbConn, session::SessionState};

#[derive(Debug, Serialize)]
pub struct DebtRow {
    pub id: i64,
    pub customer_name: String,
    pub phone: Option<String>,
    pub amount: f64,
    pub paid_amount: f64,
    pub outstanding: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct DebtPayload {
    pub customer_name: String,
    pub phone: Option<String>,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DebtPaymentPayload {
    pub debt_id: i64,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DebtIdPayload {
    pub debt_id: i64,
}



#[tauri::command]
pub fn list_debts(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: Option<i64>,
) -> Result<Vec<DebtRow>, String> {
    let _user = require_auth(&session)?;
    let limit = bounded_limit(payload.as_ref(), 100, 500);
    let conn = get_db(&db)?;
    let mut stmt = conn.prepare("SELECT id, customer_name, phone, amount, paid_amount, status, notes, created_at, updated_at FROM debts ORDER BY status ASC, id DESC LIMIT ?1").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit], |row| {
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
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn create_debt(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: DebtPayload,
) -> Result<DebtRow, String> {
    let _user = require_auth(&session)?;
    let conn = get_db(&db)?;
    let customer_name = payload.customer_name.trim().to_string();
    if customer_name.is_empty() {
        return Err("Nama pelanggan wajib diisi".into());
    }
    if payload.amount <= 0.0 {
        return Err("Nominal utang harus lebih dari 0".into());
    }
    let now = chrono::Utc::now().to_rfc3339();
    let phone = crate::common::trim_optional(payload.phone);
    let notes = crate::common::trim_optional(payload.notes);
    conn.execute(
        "INSERT INTO debts (customer_name, phone, amount, paid_amount, status, notes, created_at, updated_at) VALUES (?1, ?2, ?3, 0, 'open', ?4, ?5, ?5)",
        params![customer_name, phone, payload.amount, notes, now],
    ).map_err(|e| e.to_string())?;
    Ok(DebtRow {
        id: conn.last_insert_rowid(),
        customer_name,
        phone,
        amount: payload.amount,
        paid_amount: 0.0,
        outstanding: payload.amount,
        status: "open".into(),
        notes,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn add_debt_payment(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: DebtPaymentPayload,
) -> Result<DebtRow, String> {
    let _user = require_auth(&session)?;
    if payload.amount <= 0.0 {
        return Err("Nominal pembayaran harus lebih dari 0".into());
    }
    let mut conn = get_db(&db)?;
    let now = chrono::Utc::now().to_rfc3339();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let debt = tx.query_row(
        "SELECT id, customer_name, phone, amount, paid_amount, status, notes, created_at FROM debts WHERE id = ?1 LIMIT 1",
        params![payload.debt_id],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<String>>(2)?, row.get::<_, f64>(3)?, row.get::<_, f64>(4)?, row.get::<_, String>(5)?, row.get::<_, Option<String>>(6)?, row.get::<_, String>(7)?)),
    ).map_err(|_| "Data utang tidak ditemukan".to_string())?;
    if debt.5 == "paid" {
        return Err("Utang sudah lunas".into());
    }
    let paid_amount = (debt.4 + payload.amount).min(debt.3);
    let status = if paid_amount >= debt.3 {
        "paid"
    } else {
        "open"
    };
    tx.execute(
        "UPDATE debts SET paid_amount = ?1, status = ?2, updated_at = ?3 WHERE id = ?4",
        params![paid_amount, status, now, debt.0],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO debt_payments (debt_id, amount, notes, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![
            debt.0,
            payload.amount,
            crate::common::trim_optional(payload.notes),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(DebtRow {
        id: debt.0,
        customer_name: debt.1,
        phone: debt.2,
        amount: debt.3,
        paid_amount,
        outstanding: (debt.3 - paid_amount).max(0.0),
        status: status.into(),
        notes: debt.6,
        created_at: debt.7,
        updated_at: now,
    })
}

#[tauri::command]
pub fn build_debt_reminder(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: DebtIdPayload,
) -> Result<String, String> {
    let _user = require_auth(&session)?;
    let conn = get_db(&db)?;
    let debt = conn
        .query_row(
            "SELECT customer_name, amount, paid_amount, notes FROM debts WHERE id = ?1 LIMIT 1",
            params![payload.debt_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            },
        )
        .map_err(|_| "Data utang tidak ditemukan".to_string())?;
    let outstanding = (debt.1 - debt.2).max(0.0);
    Ok(format!(
        "Halo {}, kami ingin mengingatkan sisa utang sebesar Rp{:.0}. Mohon dibayarkan jika sudah memungkinkan. Catatan: {}. Terima kasih.",
        debt.0,
        outstanding,
        debt.3.unwrap_or_else(|| "-".into())
    ))
}
