// ── Dashboard & POS Report ─────────────────────────────────────────

use rusqlite::params;
use tauri::{AppHandle, State};

use crate::{auth::require_admin, auth::require_auth, common::get_db, common::DbConn, session::SessionState};

use super::types::*;

#[tauri::command]
pub fn get_dashboard(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    _payload: Option<DashboardPayload>,
) -> Result<DashboardResponse, String> {
    let user = require_auth(&session)?;
    let is_admin = user.role == "admin";
    let conn = get_db(&db)?;
    let today = chrono::Local::now().date_naive().and_hms_opt(0, 0, 0).unwrap();
    let today_str = today.format("%Y-%m-%dT%H:%M:%S").to_string();

    // Today stats — parameterized, no SQL injection
    macro_rules! today_stats {
        ($type_filter:expr) => {{
            let filter_type: &str = $type_filter;
            conn.query_row(
                "SELECT COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE created_at >= ?1 AND status NOT IN ('void','reversed') AND (?2 = '' OR type = ?2)",
                params![today_str, filter_type],
                |r| Ok(TodayStats {
                    count: r.get(0)?,
                    revenue: r.get(1)?,
                    profit: if is_admin { r.get(2)? } else { 0.0 },
                }),
            ).unwrap_or(TodayStats { count: 0, revenue: 0.0, profit: 0.0 })
        }};
    }

    let today_all = today_stats!("");
    let today_pos = today_stats!("pos");
    let today_brilink = today_stats!("brilink");

    // Low stock
    let mut stmt = conn
        .prepare("SELECT id, name, stock, min_stock FROM products WHERE is_active = 1 AND stock <= min_stock ORDER BY stock ASC LIMIT 10")
        .map_err(|e| e.to_string())?;
    let low_stock: Vec<LowStockRow> = stmt
        .query_map([], |row| Ok(LowStockRow { id: row.get(0)?, name: row.get(1)?, stock: row.get(2)?, min_stock: row.get(3)? }))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Recent transactions
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM transactions WHERE status NOT IN ('void','reversed') ORDER BY id DESC LIMIT 8", TRANSACTION_COLUMNS))
        .map_err(|e| e.to_string())?;
    let recent: Vec<TransactionDetailRow> = stmt
        .query_map([], |row| row_to_detail(row, !is_admin))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Last 7 days
    let mut last_7 = Vec::new();
    let mut daily_map = std::collections::HashMap::new();
    let mut stmt = conn
        .prepare("SELECT date(created_at) as d, COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE created_at >= datetime('now', '-7 days') AND status NOT IN ('void','reversed') GROUP BY d ORDER BY d")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?)))
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (d, rev, prof) = row.map_err(|e| e.to_string())?;
        daily_map.insert(d, (rev, if is_admin { prof } else { 0.0 }));
    }
    for i in (0..7).rev() {
        let day = (today - chrono::Duration::days(i)).format("%Y-%m-%d").to_string();
        let (rev, prof) = daily_map.get(&day).copied().unwrap_or((0.0, 0.0));
        last_7.push(DayRow { date: day, revenue: rev, profit: prof });
    }

    // Accounts
    let mut stmt = conn.prepare("SELECT id, name, balance FROM accounts WHERE is_active = 1 ORDER BY id ASC").map_err(|e| e.to_string())?;
    let accounts: Vec<AccountSummary> = stmt
        .query_map([], |row| Ok(AccountSummary { id: row.get(0)?, name: row.get(1)?, balance: row.get(2)? }))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let pending = conn.query_row("SELECT COUNT(*) FROM transactions WHERE status = 'pending'", [], |r| r.get(0)).unwrap_or(0);

    Ok(DashboardResponse { today_all, today_pos, today_brilink, low_stock, recent_transactions: recent, last_7_days: last_7, accounts, pending_count: pending })
}

#[tauri::command]
pub fn get_pos_report(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: Option<PosReportPayload>,
) -> Result<PosReportResponse, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let now = chrono::Local::now();
    let start = payload.as_ref().and_then(|p| p.start.as_deref()).unwrap_or("");
    let end = payload.as_ref().and_then(|p| p.end.as_deref()).unwrap_or("");
    let start_date = if start.is_empty() { format!("{}-01T00:00:00", now.format("%Y-%m")) } else { start.to_string() };
    let end_date = if end.is_empty() { now.format("%Y-%m-%dT23:59:59").to_string() } else { format!("{}T23:59:59", end) };

    let summary = conn.query_row(
        "SELECT COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0), COALESCE(AVG(total_amount),0) FROM transactions WHERE type = 'pos' AND status NOT IN ('void','reversed') AND created_at >= ?1 AND created_at <= ?2",
        params![start_date, end_date],
        |row| Ok(ReportSummary { count: row.get(0)?, revenue: row.get(1)?, profit: row.get(2)?, cogs: row.get::<_, f64>(1)? - row.get::<_, f64>(2)?, average: row.get(3)? }),
    ).unwrap_or(ReportSummary { count: 0, revenue: 0.0, profit: 0.0, cogs: 0.0, average: 0.0 });

    let mut stmt = conn.prepare("SELECT payment_method, COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE type = 'pos' AND status NOT IN ('void','reversed') AND created_at >= ?1 AND created_at <= ?2 GROUP BY payment_method ORDER BY COUNT(*) DESC").map_err(|e| e.to_string())?;
    let by_payment: Vec<PaymentBreakdown> = stmt.query_map(params![start_date, end_date], |row| Ok(PaymentBreakdown { payment_method: row.get(0)?, count: row.get(1)?, revenue: row.get(2)?, profit: row.get(3)? })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT ti.product_name, SUM(ti.quantity), SUM(ti.subtotal), SUM(ti.subtotal - ti.quantity * (SELECT p.buy_price FROM products p WHERE p.id = ti.product_id)) FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE t.type = 'pos' AND t.status NOT IN ('void','reversed') AND t.created_at >= ?1 AND t.created_at <= ?2 GROUP BY ti.product_id ORDER BY SUM(ti.subtotal) DESC LIMIT 50").map_err(|e| e.to_string())?;
    let products: Vec<ProductRanking> = stmt.query_map(params![start_date, end_date], |row| Ok(ProductRanking { product_name: row.get(0)?, quantity: row.get(1)?, revenue: row.get(2)?, profit: row.get(3)? })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT date(created_at) as d, COALESCE(SUM(total_amount),0), COALESCE(SUM(profit),0) FROM transactions WHERE type = 'pos' AND status NOT IN ('void','reversed') AND created_at >= ?1 AND created_at <= ?2 GROUP BY d ORDER BY d").map_err(|e| e.to_string())?;
    let daily: Vec<DayRow> = stmt.query_map(params![start_date, end_date], |row| Ok(DayRow { date: row.get(0)?, revenue: row.get(1)?, profit: row.get(2)? })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(PosReportResponse { summary, by_payment, products, daily })
}
