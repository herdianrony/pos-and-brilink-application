use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{
    auth::require_admin, auth::require_auth, common::init_schema, common::record_app_log,
    common::trim_optional, session::PublicUser, session::SessionState,
};

// ── Payloads ──────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PosItemPayload {
    pub product_id: i64,
    pub quantity: i64,
}

#[derive(Debug, Deserialize)]
pub struct AgentItemPayload {
    pub service_name: String,
    pub fee: f64,
    pub provider_cost: Option<f64>,
    pub account_id: Option<i64>,
    pub cash_effect: f64,
    pub bank_effect: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PosCheckoutPayload {
    pub items: Vec<PosItemPayload>,
    pub agent_items: Vec<AgentItemPayload>,
    pub payment_method: Option<String>,
    pub settlement_account_id: Option<i64>,
    pub discount: Option<f64>,
    pub discount_reason: Option<String>,
    pub discount_admin_pin: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PosCheckoutResponse {
    pub ok: bool,
    pub transaction_id: i64,
    pub invoice_no: String,
    pub total_amount: f64,
    pub profit: f64,
    pub discount_amount: f64,
    pub settlement_account_id: Option<i64>,
    pub settlement_balance: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct AgentTransactionPayload {
    pub service_name: String,
    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,
    pub amount: f64,
    pub fee: f64,
    pub provider_cost: Option<f64>,
    pub account_id: Option<i64>,
    pub cash_effect: f64,
    pub bank_effect: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionDetailRow {
    pub id: i64,
    pub invoice_no: String,
    pub transaction_type: String,
    pub customer_name: Option<String>,
    pub total_amount: f64,
    pub profit: f64,
    pub payment_method: String,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct TransactionActionPayload {
    pub id: i64,
    pub action: String,
    pub reason: Option<String>,
    pub reference_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DashboardPayload {
    pub dummy: Option<String>, // placeholder, Tauri requires at least one field if using Option payload
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub today_all: TodayStats,
    pub today_pos: TodayStats,
    pub today_brilink: TodayStats,
    pub low_stock: Vec<LowStockRow>,
    pub recent_transactions: Vec<TransactionDetailRow>,
    pub last_7_days: Vec<DayRow>,
    pub accounts: Vec<AccountSummary>,
    pub pending_count: i64,
}

#[derive(Debug, Serialize)]
pub struct TodayStats {
    pub count: i64,
    pub revenue: f64,
    pub profit: f64,
}

#[derive(Debug, Serialize)]
pub struct LowStockRow {
    pub id: i64,
    pub name: String,
    pub stock: i64,
    pub min_stock: i64,
}

#[derive(Debug, Serialize)]
pub struct DayRow {
    pub date: String,
    pub revenue: f64,
    pub profit: f64,
}

#[derive(Debug, Serialize)]
pub struct AccountSummary {
    pub id: i64,
    pub name: String,
    pub balance: f64,
}

#[derive(Debug, Deserialize)]
pub struct PosReportPayload {
    pub start: Option<String>,
    pub end: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PosReportResponse {
    pub summary: ReportSummary,
    pub by_payment: Vec<PaymentBreakdown>,
    pub products: Vec<ProductRanking>,
    pub daily: Vec<DayRow>,
}

#[derive(Debug, Serialize)]
pub struct ReportSummary {
    pub count: i64,
    pub revenue: f64,
    pub profit: f64,
    pub cogs: f64,
    pub average: f64,
}

#[derive(Debug, Serialize)]
pub struct PaymentBreakdown {
    pub payment_method: String,
    pub count: i64,
    pub revenue: f64,
    pub profit: f64,
}

#[derive(Debug, Serialize)]
pub struct ProductRanking {
    pub product_name: String,
    pub quantity: i64,
    pub revenue: f64,
    pub profit: f64,
}

#[derive(Debug, Deserialize)]
pub struct SetupCompletePayload {
    pub store_name: Option<String>,
    pub store_owner_name: Option<String>,
    pub store_phone: Option<String>,
    pub store_address: Option<String>,
    pub admin_name: String,
    pub admin_username: String,
    pub admin_password: String,
    pub cash_opening_balance: Option<f64>,
    pub kas_only: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct SetupCompleteResponse {
    pub ok: bool,
    pub user: PublicUser,
    pub cash_opening_balance: f64,
    pub kas_only: bool,
}

// ── Helpers ─────────────────────────────────────────────────────────

fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 || password.len() > 128 {
        return Err(
            "Password 8-128 karakter, minimal 2 kategori (huruf besar/kecil/angka/simbol)".into(),
        );
    }
    let categories = password.chars().filter(|c| c.is_ascii_uppercase()).count() as u8
        + password.chars().filter(|c| c.is_ascii_lowercase()).count() as u8
        + password.chars().filter(|c| c.is_ascii_digit()).count() as u8
        + password.chars().filter(|c| !c.is_alphanumeric()).count() as u8;
    if categories < 2 {
        return Err(
            "Password 8-128 karakter, minimal 2 kategori (huruf besar/kecil/angka/simbol)".into(),
        );
    }
    Ok(())
}

fn get_setting(conn: &Connection, key: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |r| r.get::<_, String>(0),
    )
    .map_err(|e| {
        record_app_log(conn, "error", "get_setting", &format!("Failed to query setting {}: {}", key, e));
        format!("Gagal membaca pengaturan {}: {}", key, e)
    })
}

fn enforce_discount_policy(
    conn: &Connection,
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
        // Exceeded cap — require admin PIN
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
        bcrypt::verify(provided_pin, &stored_pin)
            .map_err(|_| "Gagal verifikasi PIN".to_string())?
            .then_some(())
            .ok_or("PIN admin salah")?;
    }
    Ok(discount.min(max_disc))
}

// ── POS Checkout ───────────────────────────────────────────────────

#[tauri::command]
pub fn checkout_pos_cash(
    app: AppHandle,
    session: State<'_, SessionState>,
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

    let mut conn = init_schema(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let invoice_no = format!(
        "POS-{}-{}",
        chrono::Utc::now().format("%Y%m%d%H%M%S"),
        chrono::Utc::now().timestamp_subsec_millis()
    );
    let mut total_amount = 0.0;
    let mut total_profit = 0.0;

    // ── Product items ──
    for item in &payload.items {
        let product = tx
            .query_row(
                "SELECT name, buy_price, sell_price, stock FROM products WHERE id = ?1 AND is_active = 1",
                params![item.product_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?, row.get::<_, i64>(3)?)),
            )
            .map_err(|_| format!("Produk ID {} tidak ditemukan", item.product_id))?;
        let subtotal = product.2 * item.quantity as f64;
        let profit = (product.2 - product.1) * item.quantity as f64;
        total_amount += subtotal;
        total_profit += profit;

        tx.execute(
            "UPDATE products SET stock = stock - ?1, updated_at = ?2 WHERE id = ?3 AND stock >= ?1",
            params![item.quantity as i64, now, item.product_id],
        )
        .map_err(|_| format!("Stok {} tidak cukup", product.0))?;
    }

    // ── Agent items ──
    for agent in &payload.agent_items {
        let fee = agent.fee;
        let provider_cost = agent.provider_cost.unwrap_or(0.0);
        total_amount += fee;
        total_profit += fee - provider_cost;
    }

    // ── Discount ──
    let discount_amount = if payload.discount.unwrap_or(0.0) > 0.0 {
        let disc = enforce_discount_policy(
            &tx,
            payload.discount.unwrap_or(0.0),
            total_amount,
            &payload.discount_reason,
            &payload.discount_admin_pin,
        )?;
        disc
    } else {
        0.0
    };
    total_amount -= discount_amount;
    if total_amount < 0.0 {
        total_amount = 0.0;
    }

    // ── Create transaction ──
    let status = "completed";
    tx.execute(
        "INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at) VALUES (?1, 'pos', NULL, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![invoice_no, total_amount, total_profit, payment_method, status, trim_optional(payload.notes).unwrap_or_default(), now],
    )
    .map_err(|e| e.to_string())?;
    let trx_id = tx.last_insert_rowid();

    // ── Transaction items ──
    for item in &payload.items {
        let product_name: String = tx
            .query_row(
                "SELECT name FROM products WHERE id = ?1",
                params![item.product_id],
                |r| r.get(0),
            )
            .map_err(|_| format!("Produk ID {} tidak ditemukan", item.product_id))?;
        let unit_price: f64 = tx
            .query_row(
                "SELECT sell_price FROM products WHERE id = ?1",
                params![item.product_id],
                |r| r.get(0),
            )
            .map_err(|_| format!("Harga produk ID {} tidak ditemukan", item.product_id))?;
        tx.execute(
            "INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![trx_id, item.product_id, product_name, item.quantity, unit_price, unit_price * item.quantity as f64],
        ).map_err(|e| e.to_string())?;
    }

    // ── Payment → account mutation ──
    // Determine target account: for cash use cash account, for transfer/qris use settlement account
    let (target_account_id, target_account_balance, mut_type) =
        match payment_method.as_str() {
            "transfer" | "qris" => {
                // Use the settlement_account_id provided by frontend
                let settlement_id = payload.settlement_account_id.ok_or_else(|| {
                    "Akun settlement wajib dipilih untuk pembayaran transfer/QRIS".to_string()
                })?;
                let acc: (i64, f64) = tx
                    .query_row(
                        "SELECT id, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
                        params![settlement_id],
                        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, f64>(1)?)),
                    )
                    .map_err(|_| format!("Akun settlement ID {} tidak ditemukan", settlement_id))?;
                let mtype = if payment_method == "transfer" {
                    "pos_transfer_in"
                } else {
                    "pos_qris_in"
                };
                (acc.0, acc.1, mtype.to_string())
            }
            _ => {
                // Cash payment → use cash account
                let cash_acc: (i64, f64) = tx
                    .query_row(
                        "SELECT id, balance FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1",
                        [],
                        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, f64>(1)?)),
                    )
                    .map_err(|_| "Akun Kas tidak ditemukan".to_string())?;
                (cash_acc.0, cash_acc.1, "pos_in".to_string())
            }
        };

    let new_bal = target_account_balance + total_amount;
    tx.execute(
        "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![target_account_id, mut_type, total_amount, new_bal, format!("POS {}", invoice_no), trx_id, now],
    ).map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_bal, now, target_account_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    record_app_log(
        &init_schema(&app)?,
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

// ── Agent Transaction ──────────────────────────────────────────────

#[tauri::command]
pub fn create_agent_transaction(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: AgentTransactionPayload,
) -> Result<TransactionDetailRow, String> {
    let user = require_auth(&session)?;
    let _is_admin = user.role == "admin";
    let service_name = payload.service_name.trim().to_string();
    if service_name.is_empty() {
        return Err("Nama layanan wajib diisi".into());
    }
    let mut conn = init_schema(&app)?;
    let now = chrono::Utc::now().to_rfc3339();
    let invoice_no = format!(
        "BRK-{}-{}",
        chrono::Utc::now().format("%Y%m%d%H%M%S"),
        chrono::Utc::now().timestamp_subsec_millis()
    );
    let provider_cost = payload.provider_cost.unwrap_or(0.0);
    let profit = payload.fee - provider_cost;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at) VALUES (?1, 'brilink', ?2, ?3, ?4, 'cash', 'completed', ?5, ?6)",
        params![invoice_no, payload.customer_name, payload.fee, profit, trim_optional(payload.notes), now],
    ).map_err(|e| e.to_string())?;
    let trx_id = tx.last_insert_rowid();

    // Cash effect
    if payload.cash_effect != 0.0 {
        let cash_acc: Option<(i64, f64)> = tx
            .query_row(
                "SELECT id, balance FROM accounts WHERE code = 'cash' AND is_active = 1 LIMIT 1",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        if let Some((cid, cbal)) = cash_acc {
            let nb = cbal + payload.cash_effect;
            let mtype = if payload.cash_effect > 0.0 {
                "brilink_in"
            } else {
                "brilink_out"
            };
            tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![cid, mtype, payload.cash_effect, nb, format!("{} {}", service_name, invoice_no), trx_id, now]).map_err(|e| e.to_string())?;
            tx.execute(
                "UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3",
                params![nb, now, cid],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Bank effect
    if payload.bank_effect != 0.0 {
        if let Some(aid) = payload.account_id {
            let bank_acc: Option<(i64, f64)> = tx
                .query_row(
                    "SELECT id, balance FROM accounts WHERE id = ?1 AND is_active = 1 LIMIT 1",
                    params![aid],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .ok();
            if let Some((bid, bbal)) = bank_acc {
                let nb = bbal + payload.bank_effect;
                tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, 'agent_bank_effect', ?2, ?3, ?4, ?5, ?6)",
                    params![bid, payload.bank_effect, nb, format!("{} {}", service_name, invoice_no), trx_id, now]).map_err(|e| e.to_string())?;
                tx.execute(
                    "UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3",
                    params![nb, now, bid],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    record_app_log(
        &init_schema(&app)?,
        "INFO",
        "brilink",
        &format!("Agent trx {} Rp{:.0}", invoice_no, payload.fee),
    );

    let conn = init_schema(&app)?;
    conn.query_row(
        "SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at FROM transactions WHERE id = ?1",
        params![trx_id],
        |row| Ok(TransactionDetailRow {
            id: row.get(0)?, invoice_no: row.get(1)?, transaction_type: row.get(2)?,
            customer_name: row.get(3)?, total_amount: row.get(4)?, profit: row.get(5)?,
            payment_method: row.get(6)?, status: row.get(7)?, notes: row.get(8)?, created_at: row.get(9)?,
        }),
    ).map_err(|e| e.to_string())
}

// ── Transaction Lifecycle ────────────────────────────────────────────

#[tauri::command]
pub fn transaction_action(
    app: AppHandle,
    session: State<'_, SessionState>,
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

    let mut conn = init_schema(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let trx: (String, String) = tx
        .query_row(
            "SELECT type, status FROM transactions WHERE id = ?1",
            params![payload.id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    match payload.action.as_str() {
        "void" => {
            if trx.1 != "pending" {
                return Err("Hanya transaksi pending yang bisa dibatalkan".into());
            }
            tx.execute(
                "UPDATE transactions SET status = 'void' WHERE id = ?1",
                params![payload.id],
            )
            .map_err(|e| e.to_string())?;
            // Counter-mutations
            let mut stmt = tx.prepare("SELECT account_id, amount, type FROM account_mutations WHERE reference_id = ?1").map_err(|e| e.to_string())?;
            let muts: Vec<(i64, f64, String)> = stmt
                .query_map(params![payload.id], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            for (acc_id, amt, mtype) in &muts {
                let neg_amt = -amt;
                tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, (SELECT balance FROM accounts WHERE id = ?1) + ?3, ?4, ?5, ?6)",
                    params![acc_id, format!("{}_void", mtype), neg_amt, format!("Void: {}", reason.trim()), payload.id, now]).map_err(|e| e.to_string())?;
                tx.execute(
                    "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
                    params![neg_amt, acc_id],
                )
                .map_err(|e| e.to_string())?;
            }
            // Restore stock for POS
            if trx.0 == "pos" {
                let mut istmt = tx.prepare("SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?1").map_err(|e| e.to_string())?;
                let items: Vec<(i64, i64)> = istmt
                    .query_map(params![payload.id], |row| Ok((row.get(0)?, row.get(1)?)))
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
        }
        "reverse" => {
            if trx.1 != "completed" {
                return Err("Hanya transaksi completed yang bisa di-reverse".into());
            }
            tx.execute(
                "UPDATE transactions SET status = 'reversed' WHERE id = ?1",
                params![payload.id],
            )
            .map_err(|e| e.to_string())?;
            let mut stmt = tx.prepare("SELECT account_id, amount, type FROM account_mutations WHERE reference_id = ?1").map_err(|e| e.to_string())?;
            let muts: Vec<(i64, f64, String)> = stmt
                .query_map(params![payload.id], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            for (acc_id, amt, mtype) in &muts {
                let neg_amt = -amt;
                tx.execute("INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?1, ?2, ?3, (SELECT balance FROM accounts WHERE id = ?1) + ?3, ?4, ?5, ?6)",
                    params![acc_id, format!("{}_reversal", mtype), neg_amt, format!("Reverse: {}", reason.trim()), payload.id, now]).map_err(|e| e.to_string())?;
                tx.execute(
                    "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
                    params![neg_amt, acc_id],
                )
                .map_err(|e| e.to_string())?;
            }
            if trx.0 == "pos" {
                let mut istmt = tx.prepare("SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?1").map_err(|e| e.to_string())?;
                let items: Vec<(i64, i64)> = istmt
                    .query_map(params![payload.id], |row| Ok((row.get(0)?, row.get(1)?)))
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
        }
        "complete" => {
            if trx.1 != "pending" {
                return Err("Hanya transaksi pending yang bisa diselesaikan".into());
            }
            if let Some(ref rno) = payload.reference_no {
                tx.execute("UPDATE transactions SET status = 'completed', notes = COALESCE(notes || ' | ', '') || ?1 WHERE id = ?2", params![format!("Ref: {}", rno), payload.id]).map_err(|e| e.to_string())?;
            } else {
                tx.execute(
                    "UPDATE transactions SET status = 'completed' WHERE id = ?1",
                    params![payload.id],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        _ => return Err(format!("Aksi tidak dikenal: {}", payload.action)),
    }

    tx.commit().map_err(|e| e.to_string())?;
    let conn = init_schema(&app)?;
    let row = conn.query_row(
        "SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at FROM transactions WHERE id = ?1",
        params![payload.id],
        |row| Ok(TransactionDetailRow {
            id: row.get(0)?, invoice_no: row.get(1)?, transaction_type: row.get(2)?,
            customer_name: row.get(3)?, total_amount: row.get(4)?, profit: row.get(5)?,
            payment_method: row.get(6)?, status: row.get(7)?, notes: row.get(8)?, created_at: row.get(9)?,
        }),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())?;
    record_app_log(
        &conn,
        "WARN",
        "transactions",
        &format!("Transaction #{} {}", payload.id, payload.action),
    );
    Ok(row)
}

// ── Get Single Transaction ─────────────────────────────────────────

#[tauri::command]
pub fn get_transaction(
    app: AppHandle,
    session: State<'_, SessionState>,
    id: i64,
) -> Result<TransactionDetailRow, String> {
    let user = require_auth(&session)?;
    let conn = init_schema(&app)?;
    let is_admin = user.role == "admin";
    conn.query_row(
        "SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at FROM transactions WHERE id = ?1",
        params![id],
        |row| {
            let profit = row.get::<_, f64>(5)?;
            Ok(TransactionDetailRow {
                id: row.get(0)?, invoice_no: row.get(1)?, transaction_type: row.get(2)?,
                customer_name: row.get(3)?, total_amount: row.get(4)?,
                profit: if is_admin { profit } else { 0.0 },
                payment_method: row.get(6)?, status: row.get(7)?, notes: row.get(8)?, created_at: row.get(9)?,
            })
        },
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())
}

// ── Dashboard ───────────────────────────────────────────────────────

#[tauri::command]
pub fn get_dashboard(
    app: AppHandle,
    session: State<'_, SessionState>,
    _payload: Option<DashboardPayload>,
) -> Result<DashboardResponse, String> {
    let user = require_auth(&session)?;
    let is_admin = user.role == "admin";
    let conn = init_schema(&app)?;
    let today = chrono::Local::now()
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap();

    let today_str = today.format("%Y-%m-%dT%H:%M:%S").to_string();

    macro_rules! today_stats {
        ($type_filter:expr) => {{
            let sql = "SELECT COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE created_at >= ?1 AND status NOT IN ('void','reversed') AND (?2 = '' OR type = ?2)";
            let filter_type: &str = $type_filter;
            conn.query_row(sql, params![today_str, filter_type], |r| {
                Ok(TodayStats {
                    count: r.get(0)?,
                    revenue: r.get(1)?,
                    profit: if is_admin { r.get(2)? } else { 0.0 },
                })
            }).unwrap_or(TodayStats { count: 0, revenue: 0.0, profit: 0.0 })
        }};
    }

    let today_all = today_stats!("");
    let today_pos = today_stats!("pos");
    let today_brilink = today_stats!("brilink");

    // Low stock
    let mut stmt = conn.prepare("SELECT id, name, stock, min_stock FROM products WHERE is_active = 1 AND stock <= min_stock ORDER BY stock ASC LIMIT 10").map_err(|e| e.to_string())?;
    let low_stock: Vec<LowStockRow> = stmt
        .query_map([], |row| {
            Ok(LowStockRow {
                id: row.get(0)?,
                name: row.get(1)?,
                stock: row.get(2)?,
                min_stock: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Recent transactions
    let mut stmt = conn.prepare(
        "SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at FROM transactions WHERE status NOT IN ('void','reversed') ORDER BY id DESC LIMIT 8"
    ).map_err(|e| e.to_string())?;
    let recent: Vec<TransactionDetailRow> = stmt
        .query_map([], |row| {
            let profit = row.get::<_, f64>(5)?;
            Ok(TransactionDetailRow {
                id: row.get(0)?,
                invoice_no: row.get(1)?,
                transaction_type: row.get(2)?,
                customer_name: row.get(3)?,
                total_amount: row.get(4)?,
                profit: if is_admin { profit } else { 0.0 },
                payment_method: row.get(6)?,
                status: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Last 7 days
    let mut last_7: Vec<DayRow> = Vec::new();
    let mut daily_map: std::collections::HashMap<String, (f64, f64)> =
        std::collections::HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT date(created_at) as d, COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE created_at >= datetime('now', '-7 days') AND status NOT IN ('void','reversed') GROUP BY d ORDER BY d"
    ).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, f64>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (d, rev, prof) = row.map_err(|e| e.to_string())?;
        daily_map.insert(d, (rev, if is_admin { prof } else { 0.0 }));
    }
    for i in (0..7).rev() {
        let day = (today - chrono::Duration::days(i))
            .format("%Y-%m-%d")
            .to_string();
        let (rev, prof) = daily_map.get(&day).copied().unwrap_or((0.0, 0.0));
        last_7.push(DayRow {
            date: day,
            revenue: rev,
            profit: prof,
        });
    }

    // Accounts
    let mut stmt = conn
        .prepare("SELECT id, name, balance FROM accounts WHERE is_active = 1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let accounts: Vec<AccountSummary> = stmt
        .query_map([], |row| {
            Ok(AccountSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                balance: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Pending count
    let pending: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE status = 'pending'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    Ok(DashboardResponse {
        today_all,
        today_pos,
        today_brilink,
        low_stock,
        recent_transactions: recent,
        last_7_days: last_7,
        accounts,
        pending_count: pending,
    })
}

// ── POS Report ─────────────────────────────────────────────────────

#[tauri::command]
pub fn get_pos_report(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: Option<PosReportPayload>,
) -> Result<PosReportResponse, String> {
    let _user = require_admin(&session)?;
    let conn = init_schema(&app)?;
    let now = chrono::Local::now();
    let start = payload
        .as_ref()
        .and_then(|p| p.start.as_deref())
        .unwrap_or(&"");
    let end = payload
        .as_ref()
        .and_then(|p| p.end.as_deref())
        .unwrap_or(&"");
    let start_date = if start.is_empty() {
        format!("{}-01T00:00:00", now.format("%Y-%m"))
    } else {
        start.to_string()
    };
    let end_date = if end.is_empty() {
        now.format("%Y-%m-%dT23:59:59").to_string()
    } else {
        format!("{}T23:59:59", end)
    };

    // Summary
    let summary = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0), COALESCE(AVG(total_amount),0) FROM transactions WHERE type = 'pos' AND status NOT IN ('void','reversed') AND created_at >= ?1 AND created_at <= ?2",
        params![start_date, end_date],
        |row| Ok(ReportSummary {
            count: row.get(0)?, revenue: row.get(1)?, profit: row.get(2)?,
            cogs: row.get::<_, f64>(1)? - row.get::<_, f64>(2)?, average: row.get(3)?,
        }),
    ).unwrap_or(ReportSummary { count: 0, revenue: 0.0, profit: 0.0, cogs: 0.0, average: 0.0 });

    // By payment
    let mut stmt = conn.prepare(
        "SELECT payment_method, COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE type = 'pos' AND status NOT IN ('void','reversed') AND created_at >= ?1 AND created_at <= ?2 GROUP BY payment_method ORDER BY COUNT(*) DESC"
    ).map_err(|e| e.to_string())?;
    let by_payment: Vec<PaymentBreakdown> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(PaymentBreakdown {
                payment_method: row.get(0)?,
                count: row.get(1)?,
                revenue: row.get(2)?,
                profit: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // By product (top 50)
    let mut stmt = conn.prepare(
        "SELECT ti.product_name, SUM(ti.quantity), SUM(ti.subtotal), SUM(ti.subtotal - ti.quantity * (SELECT p.buy_price FROM products p WHERE p.id = ti.product_id)) FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE t.type = 'pos' AND t.status NOT IN ('void','reversed') AND t.created_at >= ?1 AND t.created_at <= ?2 GROUP BY ti.product_id ORDER BY SUM(ti.subtotal) DESC LIMIT 50"
    ).map_err(|e| e.to_string())?;
    let products: Vec<ProductRanking> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(ProductRanking {
                product_name: row.get(0)?,
                quantity: row.get(1)?,
                revenue: row.get(2)?,
                profit: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Daily
    let mut stmt = conn.prepare(
        "SELECT date(created_at) as d, COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE type = 'pos' AND status NOT IN ('void','reversed') AND created_at >= ?1 AND created_at <= ?2 GROUP BY d ORDER BY d"
    ).map_err(|e| e.to_string())?;
    let daily: Vec<DayRow> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DayRow {
                date: row.get(0)?,
                revenue: row.get(1)?,
                profit: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(PosReportResponse {
        summary,
        by_payment,
        products,
        daily,
    })
}

// ── Setup Complete ──────────────────────────────────────────────────

#[tauri::command]
pub fn setup_complete(
    app: AppHandle,
    payload: SetupCompletePayload,
    session: State<'_, SessionState>,
) -> Result<SetupCompleteResponse, String> {
    let conn = init_schema(&app)?;
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

    // Insert admin
    conn.execute(
        "INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 'admin', 1, ?4, ?4)",
        params![admin_name, admin_username, password_hash, now],
    ).map_err(|e| e.to_string())?;
    let user_id = conn.last_insert_rowid();

    // Store settings
    if let Some(ref name) = payload.store_name {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('store_name', ?1, ?2)",
            params![name.trim(), now],
        );
    }
    if let Some(ref owner) = payload.store_owner_name {
        let _ = conn.execute("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('store_owner_name', ?1, ?2)", params![owner.trim(), now]);
    }

    // Cash opening balance
    let cash_opening = payload.cash_opening_balance.unwrap_or(0.0).max(0.0);
    if cash_opening > 0.0 {
        let cash_account_id: i64 = conn.query_row(
            "SELECT id FROM accounts WHERE code = 'cash' LIMIT 1",
            [],
            |r| r.get(0),
        ).map_err(|e| format!("Cash account not found: {e}"))?;
        conn.execute(
            "INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?1, 'opening', ?2, ?2, 'Saldo awal dari Setup Wizard', ?3)",
            params![cash_account_id, cash_opening, now],
        ).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE code = 'cash'",
            params![cash_opening, now],
        )
        .map_err(|e| e.to_string())?;
    }

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
