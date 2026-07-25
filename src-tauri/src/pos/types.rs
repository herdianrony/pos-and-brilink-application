// ── POS & Agent Transaction Types ──────────────────────────────────

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::common::record_app_log;
use crate::session::PublicUser;

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
    pub user_id: Option<i64>,
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
    pub dummy: Option<String>,
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

// ── Shared helpers ─────────────────────────────────────────────────

/// Map a SQLite row to TransactionDetailRow (reused across many queries).
pub fn row_to_detail(row: &rusqlite::Row, mask_profit: bool) -> rusqlite::Result<TransactionDetailRow> {
    let profit = row.get::<_, f64>(5)?;
    Ok(TransactionDetailRow {
        id: row.get(0)?,
        invoice_no: row.get(1)?,
        transaction_type: row.get(2)?,
        customer_name: row.get(3)?,
        total_amount: row.get(4)?,
        profit: if mask_profit { 0.0 } else { profit },
        payment_method: row.get(6)?,
        status: row.get(7)?,
        notes: row.get(8)?,
        created_at: row.get(9)?,
        user_id: row.get(10)?,
    })
}

/// Read a setting value from the settings table.
pub fn get_setting(conn: &Connection, key: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |r| r.get::<_, String>(0),
    )
    .map_err(|e| {
        record_app_log(conn, "error", "get_setting", &format!("Failed to query setting {}: {}", key, e));
        format!("Gagal membaca pengaturan {}: {}", key, e)
    })
}

/// Standard SELECT columns for transactions table.
pub const TRANSACTION_COLUMNS: &str =
    "id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at, user_id";
