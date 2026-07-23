use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{
    auth::require_admin, auth::require_auth, common::bounded_limit, common::init_schema, common::trim_optional,
    session::SessionState,
};

#[derive(Debug, Serialize)]
pub struct AgentServiceRow {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub default_fee: f64,
    pub provider_cost: f64,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct AgentServicePayload {
    pub name: String,
    pub category: Option<String>,
    pub default_fee: f64,
    pub provider_cost: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct FeeTierRow {
    pub id: i64,
    pub service_id: i64,
    pub min_amount: f64,
    pub max_amount: Option<f64>,
    pub fee: f64,
    pub provider_cost: f64,
}

#[derive(Debug, Deserialize)]
pub struct FeeTierPayload {
    pub service_id: i64,
    pub min_amount: f64,
    pub max_amount: Option<f64>,
    pub fee: f64,
    pub provider_cost: Option<f64>,
}

#[tauri::command]
pub fn list_agent_services(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: Option<i64>,
) -> Result<Vec<AgentServiceRow>, String> {
    let _user = require_auth(&session)?;
    let limit = bounded_limit(payload.as_ref(), 100, 500);
    let conn = init_schema(&app)?;
    let mut stmt = conn.prepare("SELECT id, name, category, default_fee, provider_cost, is_active FROM agent_service_templates WHERE is_active = 1 ORDER BY name ASC LIMIT ?1").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(AgentServiceRow {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                default_fee: row.get(3)?,
                provider_cost: row.get(4)?,
                is_active: row.get::<_, i64>(5)? == 1,
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
pub fn create_agent_service(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: AgentServicePayload,
) -> Result<AgentServiceRow, String> {
    let _user = require_admin(&session)?;
    let conn = init_schema(&app)?;
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err("Nama layanan wajib diisi".into());
    }
    if payload.default_fee < 0.0 || payload.provider_cost.unwrap_or(0.0) < 0.0 {
        return Err("Fee dan biaya provider tidak boleh minus".into());
    }
    let now = chrono::Utc::now().to_rfc3339();
    let category = trim_optional(payload.category);
    let provider_cost = payload.provider_cost.unwrap_or(0.0);
    conn.execute("INSERT INTO agent_service_templates (name, category, default_fee, provider_cost, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5)", params![name, category, payload.default_fee, provider_cost, now]).map_err(|e| format!("Gagal membuat layanan: {e}"))?;
    Ok(AgentServiceRow {
        id: conn.last_insert_rowid(),
        name,
        category,
        default_fee: payload.default_fee,
        provider_cost,
        is_active: true,
    })
}

#[tauri::command]
pub fn list_fee_tiers(
    app: AppHandle,
    session: State<'_, SessionState>,
    service_id: i64,
) -> Result<Vec<FeeTierRow>, String> {
    let _user = require_auth(&session)?;
    let conn = init_schema(&app)?;
    let mut stmt = conn.prepare("SELECT id, service_id, min_amount, max_amount, fee, provider_cost FROM agent_fee_tiers WHERE service_id = ?1 ORDER BY min_amount ASC").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![service_id], |row| {
            Ok(FeeTierRow {
                id: row.get(0)?,
                service_id: row.get(1)?,
                min_amount: row.get(2)?,
                max_amount: row.get(3)?,
                fee: row.get(4)?,
                provider_cost: row.get(5)?,
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
pub fn create_fee_tier(
    app: AppHandle,
    session: State<'_, SessionState>,
    payload: FeeTierPayload,
) -> Result<FeeTierRow, String> {
    let _user = require_admin(&session)?;
    if payload.min_amount < 0.0 || payload.fee < 0.0 || payload.provider_cost.unwrap_or(0.0) < 0.0 {
        return Err("Nominal, fee, dan biaya provider tidak boleh minus".into());
    }
    if let Some(max_amount) = payload.max_amount {
        if max_amount < payload.min_amount {
            return Err("Nominal maksimal harus lebih besar dari nominal minimal".into());
        }
    }
    let conn = init_schema(&app)?;
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM agent_service_templates WHERE id = ?1 AND is_active = 1",
            params![payload.service_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Layanan tidak ditemukan".into());
    }
    let provider_cost = payload.provider_cost.unwrap_or(0.0);
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute("INSERT INTO agent_fee_tiers (service_id, min_amount, max_amount, fee, provider_cost, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![payload.service_id, payload.min_amount, payload.max_amount, payload.fee, provider_cost, now]).map_err(|e| e.to_string())?;
    Ok(FeeTierRow {
        id: conn.last_insert_rowid(),
        service_id: payload.service_id,
        min_amount: payload.min_amount,
        max_amount: payload.max_amount,
        fee: payload.fee,
        provider_cost,
    })
}
