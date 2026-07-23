use base64::Engine;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::auth::{require_admin, require_auth};
use crate::common::{init_schema, product_images_dir, record_app_log, trim_optional};
use crate::session::SessionState;

#[derive(Debug, Serialize)]
pub struct ProductRow {
    pub id: i64,
    pub name: String,
    pub barcode: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub buy_price: f64,
    pub sell_price: f64,
    pub stock: i64,
    pub min_stock: i64,
    pub unit: String,
    pub image_path: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct ProductPayload {
    pub name: String,
    pub barcode: Option<String>,
    pub category_id: Option<i64>,
    pub buy_price: f64,
    pub sell_price: f64,
    pub stock: i64,
    pub min_stock: i64,
    pub unit: Option<String>,
    pub image_data_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProductUpdatePayload {
    pub id: i64,
    pub name: String,
    pub barcode: Option<String>,
    pub category_id: Option<i64>,
    pub buy_price: f64,
    pub sell_price: f64,
    pub stock: i64,
    pub min_stock: i64,
    pub unit: Option<String>,
    pub image_data_url: Option<String>,
    pub remove_image: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ProductIdPayload {
    pub id: i64,
}

#[derive(Debug, Serialize)]
pub struct CategoryRow {
    pub id: i64,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct CategoryPayload {
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CategoryIdPayload {
    pub category_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryPayload {
    pub id: i64,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListProductsPayload {
    pub search: Option<String>,
    pub category_id: Option<i64>,
}

#[tauri::command]
pub fn list_categories(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
) -> Result<Vec<CategoryRow>, String> {
    let _user = require_auth(&session)?;
    let conn = get_db(&db)?;
    let mut stmt = conn
        .prepare("SELECT id, name, icon, color, is_active FROM product_categories WHERE is_active = 1 ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(CategoryRow {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
                is_active: row.get::<_, i64>(4)? == 1,
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
pub fn create_category(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: CategoryPayload,
) -> Result<CategoryRow, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama kategori wajib diisi".into());
    }
    let icon = trim_optional(payload.icon);
    let color = trim_optional(payload.color).or_else(|| Some("#059669".to_string()));
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO product_categories (name, icon, color, is_active, created_at) VALUES (?1, ?2, ?3, 1, ?4)",
        params![name, icon, color, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(CategoryRow {
        id: conn.last_insert_rowid(),
        name,
        icon,
        color,
        is_active: true,
    })
}

#[tauri::command]
pub fn update_category(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: UpdateCategoryPayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let mut sets = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref n) = payload.name {
        let n = n.trim();
        if n.is_empty() {
            return Err("Nama kategori wajib diisi".into());
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
    if sets.is_empty() {
        return Err("Tidak ada field yang diubah".into());
    }
    params_vec.push(Box::new(payload.id));
    let sql = format!(
        "UPDATE product_categories SET {} WHERE id = ?",
        sets.join(", ")
    );
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn deactivate_category(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: CategoryIdPayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    conn.execute(
        "UPDATE product_categories SET is_active = 0 WHERE id = ?1",
        params![payload.category_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn list_products(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: Option<ListProductsPayload>,
) -> Result<Vec<ProductRow>, String> {
    let _user = require_auth(&session)?;
    let conn = get_db(&db)?;
    let search = payload
        .as_ref()
        .and_then(|p| p.search.as_ref())
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty());
    let mut sql = String::from(
        r#"SELECT p.id, p.name, p.barcode, p.category_id, c.name, p.buy_price, p.sell_price,
               p.stock, p.min_stock, COALESCE(p.unit, 'pcs'), p.image_path, p.is_active
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id
        WHERE p.is_active = 1"#,
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref s) = search {
        sql.push_str(" AND (LOWER(p.name) LIKE ? OR p.barcode LIKE ?)");
        let pattern = format!("%{}%", s);
        params_vec.push(Box::new(pattern.clone()));
        params_vec.push(Box::new(pattern));
    }
    if let Some(cid) = payload.as_ref().and_then(|p| p.category_id) {
        sql.push_str(" AND p.category_id = ?");
        params_vec.push(Box::new(cid));
    }
    sql.push_str(" ORDER BY p.name ASC");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|b| b.as_ref()).collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(ProductRow {
                id: row.get(0)?,
                name: row.get(1)?,
                barcode: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
                buy_price: row.get(5)?,
                sell_price: row.get(6)?,
                stock: row.get(7)?,
                min_stock: row.get(8)?,
                unit: row.get(9)?,
                image_path: row.get(10)?,
                is_active: row.get::<_, i64>(11)? == 1,
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
pub fn create_product(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: ProductPayload,
) -> Result<ProductRow, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama produk wajib diisi".into());
    }
    if payload.buy_price < 0.0
        || payload.sell_price <= 0.0
        || payload.stock < 0
        || payload.min_stock < 0
    {
        return Err("Harga jual harus lebih dari 0, harga beli dan stok tidak boleh minus".into());
    }
    let barcode = trim_optional(payload.barcode);
    let unit = trim_optional(payload.unit).unwrap_or_else(|| "pcs".to_string());
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        r#"
        INSERT INTO products (name, barcode, category_id, buy_price, sell_price, stock, min_stock, unit, image_path, is_active, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, 1, ?9, ?9)
        "#,
        params![
            name,
            barcode,
            payload.category_id,
            payload.buy_price,
            payload.sell_price,
            payload.stock,
            payload.min_stock,
            unit,
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let image_path = save_product_image(&app, id, payload.image_data_url)?;
    if image_path.is_some() {
        conn.execute(
            "UPDATE products SET image_path = ?1 WHERE id = ?2",
            params![&image_path, id],
        )
        .map_err(|e| e.to_string())?;
    }
    let category_name = if let Some(category_id) = payload.category_id {
        conn.query_row(
            "SELECT name FROM product_categories WHERE id = ?1",
            params![category_id],
            |row| row.get::<_, String>(0),
        )
        .ok()
    } else {
        None
    };
    Ok(ProductRow {
        id,
        name,
        barcode,
        category_id: payload.category_id,
        category_name,
        buy_price: payload.buy_price,
        sell_price: payload.sell_price,
        stock: payload.stock,
        min_stock: payload.min_stock,
        unit,
        image_path,
        is_active: true,
    })
}

#[tauri::command]
pub fn update_product(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: ProductUpdatePayload,
) -> Result<ProductRow, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama produk wajib diisi".into());
    }
    if payload.buy_price < 0.0
        || payload.sell_price <= 0.0
        || payload.stock < 0
        || payload.min_stock < 0
    {
        return Err("Harga jual harus lebih dari 0, harga beli dan stok tidak boleh minus".into());
    }
    let barcode = trim_optional(payload.barcode);
    let unit = trim_optional(payload.unit).unwrap_or_else(|| "pcs".to_string());
    let now = chrono::Utc::now().to_rfc3339();
    let existing_image: Option<String> = conn
        .query_row(
            "SELECT image_path FROM products WHERE id = ?1 AND is_active = 1",
            params![payload.id],
            |row| row.get(0),
        )
        .ok()
        .flatten();
    let image_path = if payload.remove_image.unwrap_or(false) {
        None
    } else {
        save_product_image(&app, payload.id, payload.image_data_url)?.or(existing_image)
    };
    conn.execute(
        r#"
        UPDATE products
        SET name = ?1, barcode = ?2, category_id = ?3, buy_price = ?4, sell_price = ?5,
            stock = ?6, min_stock = ?7, unit = ?8, image_path = ?9, updated_at = ?10
        WHERE id = ?11 AND is_active = 1
        "#,
        params![
            name,
            barcode,
            payload.category_id,
            payload.buy_price,
            payload.sell_price,
            payload.stock,
            payload.min_stock,
            unit,
            &image_path,
            now,
            payload.id
        ],
    )
    .map_err(|e| e.to_string())?;
    if conn.changes() == 0 {
        return Err("Produk tidak ditemukan".into());
    }
    let category_name = if let Some(category_id) = payload.category_id {
        conn.query_row(
            "SELECT name FROM product_categories WHERE id = ?1",
            params![category_id],
            |row| row.get::<_, String>(0),
        )
        .ok()
    } else {
        None
    };
    Ok(ProductRow {
        id: payload.id,
        name,
        barcode,
        category_id: payload.category_id,
        category_name,
        buy_price: payload.buy_price,
        sell_price: payload.sell_price,
        stock: payload.stock,
        min_stock: payload.min_stock,
        unit,
        image_path,
        is_active: true,
    })
}

#[tauri::command]
pub fn deactivate_product(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: ProductIdPayload,
) -> Result<bool, String> {
    let _user = require_admin(&session)?;
    let conn = get_db(&db)?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE products SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        params![now, payload.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.changes() > 0)
}

#[tauri::command]
pub fn get_product_image(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: ProductIdPayload,
) -> Result<Option<String>, String> {
    let _user = require_auth(&session)?;
    let conn = get_db(&db)?;
    let image_path: Option<String> = conn
        .query_row(
            "SELECT image_path FROM products WHERE id = ?1 AND is_active = 1",
            params![payload.id],
            |row| row.get(0),
        )
        .ok()
        .flatten();
    crate::common::product_image_data_url(&app, image_path)
}

fn save_product_image(
    app: &AppHandle,
    product_id: i64,
    data_url: Option<String>,
) -> Result<Option<String>, String> {
    let Some(data_url) = data_url else {
        return Ok(None);
    };
    if data_url.trim().is_empty() {
        return Ok(None);
    }
    let (extension, encoded) = if let Some(value) = data_url.strip_prefix("data:image/png;base64,")
    {
        ("png", value)
    } else if let Some(value) = data_url.strip_prefix("data:image/jpeg;base64,") {
        ("jpg", value)
    } else if let Some(value) = data_url.strip_prefix("data:image/webp;base64,") {
        ("webp", value)
    } else {
        return Err("Format gambar produk harus PNG, JPG, atau WEBP".into());
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|_| "Data gambar produk tidak valid".to_string())?;
    if bytes.len() > 650_000 {
        return Err("Ukuran gambar produk terlalu besar setelah kompresi".into());
    }
    let file_name = format!(
        "product-{product_id}-{}.{}",
        chrono::Utc::now().timestamp_millis(),
        extension
    );
    let path = product_images_dir(app)?.join(&file_name);
    std::fs::write(&path, bytes).map_err(|e| format!("Gagal menyimpan gambar produk: {e}"))?;
    Ok(Some(file_name))
}

// ── Restock Product ──────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RestockPayload {
    pub product_id: i64,
    pub quantity: i64,
    pub notes: Option<String>,
    pub cost_price: Option<f64>,
}

#[tauri::command]
pub fn restock_product(
    app: AppHandle,
    session: State<'_, SessionState>,
    db: State<'_, DbConn>,
    payload: RestockPayload,
) -> Result<ProductRow, String> {
    let _user = require_admin(&session)?;
    if payload.quantity <= 0 {
        return Err("Jumlah restock harus lebih dari 0".into());
    }
    let conn = get_db(&db)?;
    let now = chrono::Utc::now().to_rfc3339();

    // Check product exists and is active
    let product_name: String = conn
        .query_row(
            "SELECT name FROM products WHERE id = ?1 AND is_active = 1",
            params![payload.product_id],
            |r| r.get(0),
        )
        .map_err(|_| format!("Produk ID {} tidak ditemukan", payload.product_id))?;

    // Optionally update buy_price if provided
    if let Some(cost) = payload.cost_price {
        if cost > 0.0 {
            conn.execute(
                "UPDATE products SET buy_price = ?1, updated_at = ?2 WHERE id = ?3",
                params![cost, now, payload.product_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Atomically increment stock
    let affected = conn
        .execute(
            "UPDATE products SET stock = stock + ?1, updated_at = ?2 WHERE id = ?3 AND is_active = 1",
            params![payload.quantity, now, payload.product_id],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Gagal menambah stok produk".into());
    }

    record_app_log(
        &conn,
        "INFO",
        "products",
        &format!(
            "Restock {} +{} {}",
            product_name,
            payload.quantity,
            payload.notes.as_deref().unwrap_or("")
        ),
    );

    // Return updated product
    conn.query_row(
        "SELECT p.id, p.name, p.barcode, p.category_id, p.buy_price, p.sell_price, p.stock, p.min_stock, p.unit, p.image_path, p.is_active, pc.name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id WHERE p.id = ?1",
        params![payload.product_id],
        |row| Ok(ProductRow {
            id: row.get(0)?,
            name: row.get(1)?,
            barcode: row.get(2)?,
            category_id: row.get(3)?,
            category_name: row.get(11)?,
            buy_price: row.get(4)?,
            sell_price: row.get(5)?,
            stock: row.get(6)?,
            min_stock: row.get(7)?,
            unit: row.get(8)?,
            image_path: row.get(9)?,
            is_active: row.get::<_, i64>(10)? == 1,
        }),
    )
    .map_err(|e| e.to_string())
}
