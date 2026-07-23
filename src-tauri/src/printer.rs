use serde::Deserialize;
use std::io::Write;
use std::net::{IpAddr, TcpStream};
use std::time::Duration;
use tauri::State;

use crate::{auth::require_auth, session::SessionState};

/// Validate printer host to prevent SSRF attacks.
/// Only allows private/local network IPs and simple hostnames.
fn validate_printer_host(host: &str) -> Result<(), String> {
    if host.is_empty() {
        return Err("IP/host printer wajib diisi".into());
    }
    // Block scheme injection (http://, https://, file://, etc.)
    if host.contains("://") || host.contains('/') || host.contains('@') {
        return Err("Format host printer tidak valid".into());
    }
    // If it's an IP address, validate it's a private/local address
    if let Ok(ip) = host.parse::<IpAddr>() {
        match ip {
            IpAddr::V4(v4) => {
                if v4.is_loopback() || v4.is_private() || v4.is_link_local() {
                    return Ok(());
                }
                return Err("Printer harus berada di jaringan lokal (private IP)".into());
            }
            IpAddr::V6(v6) => {
                if v6.is_loopback() {
                    return Ok(());
                }
                return Err("Printer harus berada di jaringan lokal (IPv4 private)".into());
            }
        }
    }
    // Simple hostname validation — allow alphanumeric, dots, hyphens
    if host
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
        && !host.starts_with('-')
        && !host.ends_with('-')
    {
        return Ok(());
    }
    Err("Format host printer tidak valid".into())
}

#[derive(Debug, Deserialize)]
pub struct PrintReceiptItemPayload {
    pub name: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Deserialize)]
pub struct PrintReceiptPayload {
    pub host: String,
    pub port: Option<u16>,
    pub store_name: Option<String>,
    pub invoice_no: String,
    pub payment_method: String,
    pub total_amount: f64,
    pub cash_received: Option<f64>,
    pub change_amount: Option<f64>,
    pub items: Vec<PrintReceiptItemPayload>,
}

fn escpos_line(out: &mut Vec<u8>, text: &str) {
    out.extend_from_slice(text.as_bytes());
    out.push(b'\n');
}

#[tauri::command]
pub fn print_thermal_receipt(
    session: State<'_, SessionState>,
    payload: PrintReceiptPayload,
) -> Result<bool, String> {
    let _user = require_auth(&session)?;
    let host = payload.host.trim();
    validate_printer_host(host)?;
    let port = payload.port.unwrap_or(9100);
    let mut bytes = Vec::new();
    bytes.extend_from_slice(&[0x1b, 0x40]);
    bytes.extend_from_slice(&[0x1b, 0x61, 0x01]);
    bytes.extend_from_slice(&[0x1d, 0x21, 0x11]);
    escpos_line(
        &mut bytes,
        payload.store_name.as_deref().unwrap_or("CatatAgen Local"),
    );
    bytes.extend_from_slice(&[0x1d, 0x21, 0x00]);
    escpos_line(&mut bytes, &payload.invoice_no);
    escpos_line(&mut bytes, "------------------------------");
    bytes.extend_from_slice(&[0x1b, 0x61, 0x00]);
    for item in payload.items {
        escpos_line(&mut bytes, &item.name.chars().take(30).collect::<String>());
        escpos_line(
            &mut bytes,
            &format!(
                "{} x Rp{:.0} = Rp{:.0}",
                item.quantity, item.unit_price, item.subtotal
            ),
        );
    }
    escpos_line(&mut bytes, "------------------------------");
    escpos_line(&mut bytes, &format!("Bayar: {}", payload.payment_method));
    escpos_line(&mut bytes, &format!("TOTAL: Rp{:.0}", payload.total_amount));
    if let Some(cash_received) = payload.cash_received {
        escpos_line(&mut bytes, &format!("Tunai: Rp{:.0}", cash_received));
    }
    if let Some(change_amount) = payload.change_amount {
        escpos_line(&mut bytes, &format!("Kembali: Rp{:.0}", change_amount));
    }
    bytes.extend_from_slice(&[0x1b, 0x61, 0x01]);
    escpos_line(&mut bytes, "Terima kasih");
    bytes.extend_from_slice(b"\n\n\n");
    bytes.extend_from_slice(&[0x1d, 0x56, 0x42, 0x00]);
    let mut stream = TcpStream::connect((host, port))
        .map_err(|e| format!("Gagal konek printer {host}:{port}: {e}"))?;
    stream.set_write_timeout(Some(Duration::from_secs(5))).ok();
    stream
        .write_all(&bytes)
        .map_err(|e| format!("Gagal kirim struk ke printer: {e}"))?;
    Ok(true)
}
