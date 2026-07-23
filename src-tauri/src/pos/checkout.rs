// ── POS Checkout ───────────────────────────────────────────────────

use rusqlite::params;
use tauri::{AppHandle, State};

use crate::{
    auth::require_auth, common::get_db, common::round_money, common::trim_optional,
    common::DbConn, common::record_app_log, session::SessionState,
};

use super::types::*;

fn enforce_discount_policy(
    conn: &rusqlite::Connection,
    discount: f64,
    total_amount: f64,
    reason: &Option<String>,
    pin: &Option<String>,
) -> Result<f64, String> {
    if discount <= 0.0 {
        return Ok(0.0);
    }
    let max_pct: f64 = get_setting(conn, "max_discount_percent")?
        .parse()
        .unwrap_or(10.0);
    let max_amt: f64 = get_setting(conn, "max_discount_amount")?
        .parse()
        .unwrap_or(100_000.0);
    let max_disc = (total_amount * max_pct / 100.0).min(max_amt);

    if discount > max_disc + 0.01 {
        let stored_pin = get_setting(conn, "discount_admin_pin")?;
        if stored_pin.is_empty() {
            return Err(format!(
                "Diskon melebihi batas Rp{:.0}. Hubungi admin untuk mengatur PIN diskon.",
                max_disc
            ));
        }
        let _pin_val = reason
            .as_ref()
            .filter(|r| !r.is_empty())
            .ok_or("Alasan diskon wajib diisi jika melebihi batas")?;
        let provided_pin = pin
            .as_deref()
            .filter(|p| !p.is_empty())
            .ok_or("PIN admin diperlukan untuk diskon melebihi batas")?;
        let pin_valid = bcrypt::verify(provided_pin, &stored_pin)
            .map_err(|_| "Gagal verifikasi PIN".to_string())?;
        if !pin_valid {
            return Err("PIN admin salah".into());
        }
        return Ok(round_money(discount));
    }
    Ok(round_money(discount.min(max_disc)))
}

#[tauri::command]
pub fn checkout_pos_cash(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: PosCheckoutPayload,
) -> Result<PosCheckoutResponse, String> {
    let user = require_auth(&session)?;
    let is_admin = user.role == "admin";
    if payload.items.is_empty() && payload.agent_items.is_empty() {
        return Err("Keranjang masih kosong".into());
    }
    if payload.items.iter().any(|i| i.quantity <= 0) {
        return Err("Jumlah produk harus lebih dari 0".into());
    }

    let payment_method = trim_optional(payload.payment_method)
        .unwrap_or_else(|| "cash".to_string())
        .to_lowercase();
    if !matches!(payment_method.as_str(), "cash" | "transfer" | "qris") {
        return Err("Metode pembayaran tidak valid".into());
    }

    let mut conn = get_db(&db)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let invoice_no = format!(
        "POS-{}-{}",
        chrono::Utc::now().format("%Y%m%d%H%M%S"),
        chrono::Utc::now().timestamp_subsec_millis()
    );
    let mut total_amount = 0.0;
    let mut total_profit = 0.0;
    let mut product_subtotal = 0.0;

    // ── Product items ──
    for item in &payload.items {
        let product = tx
            .query_row(
                "SELECT name, buy_price, sell_price, stock FROM products WHERE id = ?1 AND is_active = 1",
                params![item.product_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?, row.get::<_, i64>(3)?)),
            )
            .map_err(|_| format!("Produk ID {} tidak ditemukan", item.product_id))?;
        let subtotal = round_money(product.2 * item.quantity as f64);
        let profit = round_money((product.2 - product.1) * item.quantity as f64);
        product_subtotal += subtotal;
        total_amount += subtotal;
        total_profit += profit;

        tx.execute(
            "UPDATE products SET stock = stock - ?1, updated_at = ?2 WHERE id = ?3 AND stock >= ?1",
            params![item.quantity as i64, now, item.product_id],
        )
        .map_err(|_| format!("Stok {} tidak cukup", product.0))?;
    }

    // ── Discount (only on product subtotal, NOT agent fees) ──
    let discount_amount = if payload.discount.unwrap_or(0.0) > 0.0 {
        enforce_discount_policy(
            &tx,
            payload.discount.unwrap_or(0.0),
            product_subtotal, // ← only product subtotal
            &payload.discount_reason,
            &payload.discount_admin_pin,
        )?
    } else {
        0.0
    };
    product_subtotal = round_money(product_subtotal - discount_amount).max(0.0);
    total_amount = product_subtotal;

    // ── Agent items (added AFTER discount, not affected by discount) ──
    for agent in &payload.agent_items {
        let fee = round_money(agent.fee);
        let provider_cost = round_money(agent.provider_cost.unwrap_or(0.0));
        total_amount += fee;
        total_profit += round_money(fee - provider_cost);
    }

    total_amount = round_money(total_amount);
    let total_profit = round_money(total_profit);

    // ── Create transaction ──
    tx.execute(
        "INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at, user_id) VALUES (?1, 'pos', NULL, ?2, ?3, ?4, 'completed', ?5, ?6, ?7)",
        params![invoice_no, total_amount, total_profit, payment_method, trim_optional(payload.notes).unwrap_or_default(), now, user.id],
    ).map_err(|e| e.to_string())?;
    let trx_id = tx.last_insert_rowid();

    // ── Transaction items ──
    for item in &payload.items {
        let product_name: String = tx
            .query_row("SELECT name FROM products WHERE id = ?1", params![item.product_id], |r| r.get(0))
            .map_err(|_| format!("Produk ID {} tidak ditemukan", item.product_id))?;
        let unit_price: f64 = tx
            .query_row("SELECT sell_price FROM products WHERE id = ?1", params![item.product_id], |r| r.get(0))
            .map_err(|_| format!("Harga produk ID {} tidak ditemukan", item.product_id))?;
        tx.execute(
            "INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![trx_id, item.product_id, product_name, item.quantity, unit_price, unit_price * item.quantity as f64],
        ).map_err(|e| e.to_string())?;
    }

    // ── Payment → account mutation (atomic balance update) ──
    let (target_account_id, mut_type) = match payment_method.as_str() {
        "transfer" | "qris" => {
            let settlement_id = payload.settlement_account_id.ok_or_else(|| {
                "Akun settlement wajib dipilih untuk pembayaran transfer/QRIS".to_string()
            })?;
            let exists: i64 = tx
                .query_row(
                    "SELECT COUNT(*) FROM accounts WHERE id = ?1 AND is_active = 1",
                    params![settlement_id],
                    |r| r.get(0),
                )
                .map_err(|_| format!("Akun settlement ID {} tidak ditemukan", settlement_id))?;
            if exists == 0 {
                return Err(format!("Akun settlement ID {} tidak ditemukan", settlement_id));
            }
            let mtype = if payment_method == "transfer" { "pos_transfer_in" } else { "pos_qris_in" };
            (settlement_id, mtype.to_string())
        }
        _ => {
            let cash_id: i64 = tx
                .query_row("SELECT id FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1", [], |r| r.get(0))
                .map_err(|_| "Akun Kas tidak ditemukan".to_string())?;
            (cash_id, "pos_in".to_string())
        }
    };

    let affected = tx.execute(
        "UPDATE accounts SET balance = balance + ?1, updated_at = ?2 WHERE id = ?3 AND is_active = 1",
        params![total_amount, now, target_account_id],
    ).map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Gagal update saldo akun".to_string());
    }
    let new_bal: f64 = tx
        .query_row("SELECT balance FROM accounts WHERE id = ?1", params![target_account_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![target_account_id, mut_type, total_amount, new_bal, format!("POS {}", invoice_no), trx_id, now],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    record_app_log(
        &conn,
        "INFO",
        "pos",
        &format!("POS checkout {} Rp{:.0} ({})", invoice_no, total_amount, payment_method),
    );

    Ok(PosCheckoutResponse {
        ok: true,
        transaction_id: trx_id,
        invoice_no,
        total_amount,
        profit: if is_admin { total_profit } else { 0.0 },
        discount_amount,
        settlement_account_id: Some(target_account_id),
        settlement_balance: Some(new_bal),
    })
}
