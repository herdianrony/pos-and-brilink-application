use rusqlite::params;
use serde::Serialize;
use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::{
    auth::require_admin, common::get_db, common::record_app_log, common::DbConn,
    session::SessionState,
};

#[derive(Debug, Serialize)]
pub struct SeedResult {
    pub message: String,
    pub stats: HashMap<String, i64>,
    pub note: String,
}

#[derive(Debug, Serialize)]
pub struct SetupTemplatesResponse {
    pub templates: Vec<AccountTemplateRow>,
    pub cash_account: Option<AccountTemplateRow>,
}

#[derive(Debug, Serialize)]
pub struct AccountTemplateRow {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_active: bool,
    pub balance: f64,
}

#[derive(Debug, Serialize)]
pub struct DemoResult {
    pub message: String,
    pub stats: HashMap<String, i64>,
}

// ── Seed System Templates ──────────────────────────────────────────

#[tauri::command]
pub fn seed_system(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<SeedResult, String> {
    // Seed dapat dipanggil tanpa auth jika belum ada user (first-run)
    let conn = get_db(&db)?;
    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    // Jika sudah ada user, wajib admin
    if user_count > 0 {
        let _user = require_admin(&session)?;
    }

    let mut stats = HashMap::new();

    // ── 1. SETTINGS ──
    let existing: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM settings WHERE key = 'app_mode'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if existing == 0 {
        let now = chrono::Utc::now().to_rfc3339();
        let settings: Vec<(&str, &str)> = vec![
            ("app_mode", "recording_only"),
            ("currency", "IDR"),
            ("timezone", "Asia/Jakarta"),
            ("max_discount_amount", "100000"),
            ("max_discount_percent", "10"),
            ("discount_admin_pin", ""),
            ("require_transaction_reference", "false"),
            ("require_cash_confirmation", "true"),
            ("default_service_status", "recorded"),
            ("whatsapp_enabled", "false"),
            ("whatsapp_auto_notify_owner", "false"),
            ("whatsapp_owner_number", ""),
            ("store_name", ""),
            ("store_address", ""),
            ("agent_id", ""),
            ("owner_name", ""),
            ("phone", ""),
            ("opening_balance", "0"),
            ("app_name", "POS & Agen Bisnis"),
            ("business_type", "Agen Bisnis"),
            ("services_label", "Layanan Agen"),
        ];
        for (key, value) in &settings {
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
                params![*key, *value, now],
            )
            .map_err(|e| e.to_string())?;
        }
        stats.insert("settings".into(), settings.len() as i64);
    } else {
        stats.insert("settings".into(), 0);
    }

    // ── 2. ACCOUNTS ──
    let existing_accounts: i64 = conn
        .query_row("SELECT COUNT(*) FROM accounts", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    if existing_accounts == 0 {
        let now = chrono::Utc::now().to_rfc3339();
        let accounts: Vec<(&str, &str, &str, &str, f64)> = vec![
            ("cash", "Kas Tunai (Laci)", "banknote", "#22c55e", 0.0),
            ("bank_bri", "M-Banking BRI", "bri", "#00529B", 0.0),
            (
                "bank_mandiri",
                "M-Banking Mandiri",
                "mandiri",
                "#003A79",
                0.0,
            ),
            ("bank_bca", "M-Banking BCA", "bca", "#0060AF", 0.0),
            ("bank_bni", "M-Banking BNI", "bni", "#F37021", 0.0),
            ("bank_btn", "M-Banking BTN", "btn", "#005F6B", 0.0),
            ("bank_bsi", "M-Banking BSI", "landmark", "#00A04A", 0.0),
            ("bank_cimb", "M-Banking CIMB", "cimb-niaga", "#7B2D8E", 0.0),
            (
                "bank_danamon",
                "M-Banking Danamon",
                "danamon",
                "#003D7C",
                0.0,
            ),
            (
                "bank_permata",
                "M-Banking Permata",
                "permata",
                "#003D7C",
                0.0,
            ),
            ("bank_jago", "Jago", "landmark", "#FF6B00", 0.0),
            ("ewallet_dana", "DANA", "dana", "#00A0DE", 0.0),
            ("ewallet_ovo", "OVO", "ovo", "#4C2A86", 0.0),
            ("ewallet_gopay", "GoPay", "gopay", "#00AED6", 0.0),
            ("ewallet_linkaja", "LinkAja", "linkaja", "#E11931", 0.0),
        ];

        for (i, (code, name, icon, color, _bal)) in accounts.iter().enumerate() {
            let is_active = if i == 0 { 1 } else { 0 };
            conn.execute(
                "INSERT OR IGNORE INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6, ?6)",
                params![code, name, icon, color, is_active, now],
            ).map_err(|e| e.to_string())?;
        }
        stats.insert("accounts".into(), accounts.len() as i64);
    } else {
        stats.insert("accounts".into(), 0);
    }

    let total_seeded: i64 = stats.values().sum();
    let message: String = if total_seeded == 0 {
        "Already seeded (all templates populated)".to_string()
    } else {
        "System templates created".to_string()
    };

    record_app_log(&conn, "INFO", "seed", &message);

    Ok(SeedResult {
        message,
        stats,
        note:
            "Seed berisi template sistem saja. Saldo, fee, dan data bisnis diisi via Setup Wizard."
                .into(),
    })
}

// ── Setup Templates (first-run only) ──────────────────────────────

#[tauri::command]
pub fn setup_templates(
    _app: AppHandle,
    db: State<'_, DbConn>,
) -> Result<SetupTemplatesResponse, String> {
    let conn = get_db(&db)?;

    // Security: hanya accessible jika belum ada user
    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if user_count > 0 {
        return Err("Setup sudah selesai. Endpoint ini tidak tersedia.".into());
    }

    // Return bank/e-wallet templates (exclude cash)
    let mut stmt = conn
        .prepare(
            "SELECT id, code, name, icon, color, is_active, balance FROM accounts WHERE code != 'cash' ORDER BY id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AccountTemplateRow {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                is_active: row.get::<_, i64>(5)? == 1,
                balance: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut templates = Vec::new();
    for row in rows {
        templates.push(row.map_err(|e| e.to_string())?);
    }

    // Cash account info
    let cash_account = conn
        .query_row(
            "SELECT id, code, name, icon, color, is_active, balance FROM accounts WHERE code = 'cash' LIMIT 1",
            [],
            |row| {
                Ok(AccountTemplateRow {
                    id: row.get(0)?,
                    code: row.get(1)?,
                    name: row.get(2)?,
                    icon: row.get(3)?,
                    color: row.get(4)?,
                    is_active: row.get::<_, i64>(5)? == 1,
                    balance: row.get(6)?,
                })
            },
        )
        .ok();

    Ok(SetupTemplatesResponse {
        templates,
        cash_account,
    })
}

// ── Seed Demo Data ─────────────────────────────────────────────────

#[tauri::command]
pub fn seed_demo(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<DemoResult, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut stats = HashMap::new();

    const DEMO: &str = "[DEMO]";

    // ── Product Categories ──
    let existing_demo_cats: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM product_categories WHERE name LIKE ? || '%'",
            [DEMO],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if existing_demo_cats == 0 {
        let cats: Vec<(&str, &str, &str)> = vec![
            ("Makanan", "utensils", "#ef4444"),
            ("Minuman", "cup-soda", "#3b82f6"),
            ("Rokok", "package", "#6b7280"),
            ("Sembako", "shopping-cart", "#22c55e"),
            ("Snack", "cookie", "#f59e0b"),
            ("ATK", "pencil", "#8b5cf6"),
            ("Toiletries", "spray-can", "#ec4899"),
            ("Aksesoris HP", "smartphone", "#06b6d4"),
            ("Pulsa & Voucher", "sim-card", "#f97316"),
            ("Gas & Listrik", "zap", "#eab308"),
        ];
        for (name, icon, color) in &cats {
            conn.execute(
                "INSERT INTO product_categories (name, icon, color, is_active, created_at) VALUES (?1, ?2, ?3, 1, ?4)",
                params![format!("{DEMO} {name}"), *icon, *color, now],
            )
            .map_err(|e| e.to_string())?;
        }
        stats.insert("categories".into(), cats.len() as i64);
    } else {
        stats.insert("categories".into(), 0);
    }

    // ── Demo Products ──
    let existing_demo_products: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE name LIKE ? || '%'",
            [DEMO],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if existing_demo_products == 0 {
        // First get category IDs for demo categories
        let mut cat_stmt = conn
            .prepare(
                "SELECT id, name FROM product_categories WHERE name LIKE ? || '%' ORDER BY id ASC",
            )
            .map_err(|e| e.to_string())?;
        let cat_rows: Vec<(i64, String)> = cat_stmt
            .query_map(params![DEMO], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // Helper: find cat id by name suffix
        let find_cat_id = |name_suffix: &str| -> Option<i64> {
            cat_rows
                .iter()
                .find(|(_, n)| n.ends_with(name_suffix))
                .map(|(id, _)| *id)
        };

        // Demo products: (name, cat_suffix, buy, sell, stock, min_stock, unit)
        let products: Vec<(&str, &str, f64, f64, i64, i64, &str)> = vec![
            // Makanan
            ("Indomie Goreng", "Makanan", 3000.0, 5000.0, 48, 10, "pcs"),
            (
                "Indomie Kuah Soto",
                "Makanan",
                3000.0,
                5000.0,
                36,
                10,
                "pcs",
            ),
            (
                "Indomie Kuah Ayam Spesial",
                "Makanan",
                3000.0,
                5000.0,
                24,
                10,
                "pcs",
            ),
            (
                "Indomie Kuah Kari Ayam",
                "Makanan",
                3000.0,
                5000.0,
                12,
                10,
                "pcs",
            ),
            (
                "Mie Sedaap Goreng",
                "Makanan",
                3000.0,
                5000.0,
                30,
                10,
                "pcs",
            ),
            (
                "Mie Sedaap Kuah Soto",
                "Makanan",
                3000.0,
                5000.0,
                18,
                10,
                "pcs",
            ),
            (
                "Beras 5kg Cap Pandan",
                "Makanan",
                58000.0,
                65000.0,
                10,
                3,
                "karung",
            ),
            (
                "Minyak Goreng Bimoli 1L",
                "Makanan",
                18000.0,
                22000.0,
                8,
                3,
                "botol",
            ),
            ("Gula Pasir 1kg", "Makanan", 14000.0, 17000.0, 12, 3, "kg"),
            ("Telur Ayam 1kg", "Makanan", 28000.0, 32000.0, 5, 2, "kg"),
            (
                "Kecap Manis ABC 275ml",
                "Makanan",
                11000.0,
                14000.0,
                10,
                3,
                "botol",
            ),
            (
                "Saus Sambal ABC 335ml",
                "Makanan",
                10000.0,
                13000.0,
                8,
                3,
                "botol",
            ),
            (
                "Tepung Terigu Segitiga 1kg",
                "Makanan",
                12000.0,
                15000.0,
                6,
                2,
                "pcs",
            ),
            (
                "Rinso Anti Noda 800g",
                "Makanan",
                16000.0,
                20000.0,
                6,
                2,
                "pcs",
            ),
            (
                "Sunlight Jeruk Nipis 800ml",
                "Makanan",
                12000.0,
                15000.0,
                8,
                3,
                "botol",
            ),
            (
                "Deterjen Daia 900g",
                "Makanan",
                11000.0,
                14000.0,
                5,
                2,
                "pcs",
            ),
            (
                "Sabun Mandi Lifebuoy 4pcs",
                "Makanan",
                12000.0,
                16000.0,
                6,
                2,
                "pak",
            ),
            (
                "Pasta Gigi Pepsodent 160g",
                "Makanan",
                10000.0,
                14000.0,
                8,
                3,
                "pcs",
            ),
            (
                "Sikat Gigi Pepsodent",
                "Makanan",
                5000.0,
                8000.0,
                10,
                3,
                "pcs",
            ),
            ("Garam Dapur 250g", "Makanan", 3000.0, 5000.0, 15, 5, "pcs"),
            (
                "Kopi Kapal Api Special 165g",
                "Makanan",
                10000.0,
                13000.0,
                8,
                3,
                "pcs",
            ),
            (
                "Teh Pucuk Harum 450ml",
                "Makanan",
                4000.0,
                5000.0,
                24,
                10,
                "botol",
            ),
            ("Aqua 600ml", "Minuman", 3000.0, 5000.0, 48, 12, "botol"),
            (
                "Pocari Sweat 500ml",
                "Minuman",
                7000.0,
                10000.0,
                18,
                6,
                "botol",
            ),
            (
                "Teh Botol Sosro 450ml",
                "Minuman",
                4000.0,
                6000.0,
                24,
                8,
                "botol",
            ),
            ("Coca-Cola 390ml", "Minuman", 6000.0, 8000.0, 12, 4, "botol"),
            ("Sprite 390ml", "Minuman", 6000.0, 8000.0, 12, 4, "botol"),
            (
                "Good Day Freeze 250ml",
                "Minuman",
                5000.0,
                7000.0,
                18,
                6,
                "botol",
            ),
            (
                "Es Teh Manis Gelas",
                "Minuman",
                2000.0,
                5000.0,
                999,
                50,
                "pcs",
            ),
            ("Es Jeruk Gelas", "Minuman", 2000.0, 5000.0, 999, 50, "pcs"),
            ("Gula Arek 1kg", "Makanan", 13000.0, 16000.0, 8, 3, "pcs"),
            (
                "Kopi Torabika Cappuccino 250g",
                "Makanan",
                11000.0,
                15000.0,
                6,
                2,
                "pcs",
            ),
            (
                "Sarden ABC 425g",
                "Makanan",
                14000.0,
                18000.0,
                6,
                2,
                "kaleng",
            ),
            (
                "Kornet Sapi Pronas 340g",
                "Makanan",
                16000.0,
                20000.0,
                4,
                2,
                "kaleng",
            ),
            (
                "SKM Coklat Frisian Flag 370g",
                "Makanan",
                11000.0,
                14000.0,
                8,
                3,
                "kaleng",
            ),
            (
                "Roti Tawar Sari Roti",
                "Makanan",
                13000.0,
                16000.0,
                4,
                2,
                "pcs",
            ),
            (
                "Mie Sedaap Soto Goreng",
                "Makanan",
                3000.0,
                5000.0,
                24,
                10,
                "pcs",
            ),
            (
                "Rinso Cair 800ml",
                "Makanan",
                17000.0,
                21000.0,
                6,
                2,
                "botol",
            ),
            (
                "Sunlight Cair 800ml",
                "Makanan",
                13000.0,
                16000.0,
                6,
                2,
                "botol",
            ),
            (
                "Molto Pewangi 800ml",
                "Makanan",
                13000.0,
                16000.0,
                6,
                2,
                "botol",
            ),
            (
                "Baygon Aerosol 600ml",
                "Makanan",
                25000.0,
                30000.0,
                4,
                2,
                "pcs",
            ),
            ("Tisu Paseo 250s", "Makanan", 12000.0, 15000.0, 6, 2, "pcs"),
            (
                "Rokok Gudang Garam Filter 12",
                "Rokok",
                28000.0,
                32000.0,
                10,
                3,
                "bungkus",
            ),
            (
                "Rokok Sampoerna Mild 16",
                "Rokok",
                32000.0,
                36000.0,
                8,
                3,
                "bungkus",
            ),
        ];

        for (name, cat_suffix, buy, sell, stock, min_stock, unit) in &products {
            let cat_id = find_cat_id(cat_suffix);
            conn.execute(
                "INSERT INTO products (name, buy_price, sell_price, stock, min_stock, unit, category_id, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)",
                params![
                    format!("{DEMO} {name}"),
                    buy,
                    sell,
                    stock,
                    min_stock,
                    unit,
                    cat_id,
                    now
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        stats.insert("products".into(), products.len() as i64);
    } else {
        stats.insert("products".into(), 0);
    }

    // ── Fee Tiers for existing agent services ──
    let existing_fee_tiers: i64 = conn
        .query_row("SELECT COUNT(*) FROM agent_fee_tiers", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    if existing_fee_tiers == 0 {
        // Get service IDs
        let mut svc_stmt = conn
            .prepare(
                "SELECT id, name FROM agent_service_templates WHERE is_active = 1 ORDER BY id ASC",
            )
            .map_err(|e| e.to_string())?;
        let services: Vec<(i64, String)> = svc_stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // Fee tiers: (service_name_contains, min, max, fee, provider_cost)
        let fee_data: Vec<(&str, f64, Option<f64>, f64, f64)> = vec![
            ("Tarik Tunai", 50000.0, Some(1000000.0), 5000.0, 2500.0),
            ("Tarik Tunai", 1000000.0, Some(10000000.0), 7500.0, 4000.0),
            ("Tarik Tunai", 10000000.0, None, 15000.0, 6500.0),
            ("Setor Tunai", 50000.0, Some(5000000.0), 5000.0, 2500.0),
            ("Setor Tunai", 5000000.0, Some(50000000.0), 7500.0, 4000.0),
            ("Setor Tunai", 50000000.0, None, 10000.0, 5000.0),
            ("Transfer", 50000.0, Some(5000000.0), 5000.0, 2500.0),
            ("Transfer", 5000000.0, Some(50000000.0), 7500.0, 4000.0),
            ("Transfer", 50000000.0, None, 10000.0, 5000.0),
            ("Payment", 10000.0, Some(1000000.0), 2500.0, 1500.0),
            ("Payment", 1000000.0, Some(10000000.0), 4000.0, 2500.0),
            ("Payment", 10000000.0, None, 6500.0, 3500.0),
        ];

        for (svc_name, min_amt, max_amt, fee, pcost) in &fee_data {
            if let Some((svc_id, _)) = services.iter().find(|(_, n)| n.contains(svc_name)) {
                conn.execute(
                    "INSERT INTO agent_fee_tiers (service_id, min_amount, max_amount, fee, provider_cost, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![svc_id, min_amt, max_amt, fee, pcost, now],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        stats.insert("fee_tiers".into(), fee_data.len() as i64);
    } else {
        stats.insert("fee_tiers".into(), 0);
    }

    record_app_log(&conn, "INFO", "seed", "Demo data seeded");

    Ok(DemoResult {
        message: "Demo data created".into(),
        stats,
    })
}

// ── Clear Demo Data ───────────────────────────────────────────────

#[tauri::command]
pub fn clear_demo(
    _app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<DemoResult, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let mut stats = HashMap::new();

    const DEMO: &str = "[DEMO]";

    // Delete products with [DEMO] prefix
    let demo_product_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE name LIKE ? || '%'",
            [DEMO],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM products WHERE name LIKE ? || '%'", [DEMO])
        .map_err(|e| e.to_string())?;
    stats.insert("products_removed".into(), demo_product_count);

    // Delete categories with [DEMO] prefix
    let demo_cat_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM product_categories WHERE name LIKE ? || '%'",
            [DEMO],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM product_categories WHERE name LIKE ? || '%'",
        [DEMO],
    )
    .map_err(|e| e.to_string())?;
    stats.insert("categories_removed".into(), demo_cat_count);

    // Fee tiers — clear all (they were seeded as part of demo)
    let fee_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM agent_fee_tiers", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM agent_fee_tiers", [])
        .map_err(|e| e.to_string())?;
    stats.insert("fee_tiers_removed".into(), fee_count);

    record_app_log(&conn, "INFO", "seed", "Demo data cleared");

    Ok(DemoResult {
        message: "Demo data removed".into(),
        stats,
    })
}
