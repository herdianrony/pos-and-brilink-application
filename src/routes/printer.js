/**
 * Printer route — send ESC/POS thermal receipt via TCP.
 */

import { Router } from 'express';
import net from 'node:net';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function validatePrinterHost(host) {
  if (!host || !host.trim()) throw new Error('IP/host printer wajib diisi');
  host = host.trim();
  if (host.includes('://') || host.includes('/') || host.includes('@')) {
    throw new Error('Format host printer tidak valid');
  }
  // IP validation
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 127 || (parts[0] === 10) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168)) {
      return host;
    }
    throw new Error('Printer harus berada di jaringan lokal (private IP)');
  }
  if (/^[a-zA-Z0-9.-]+$/.test(host) && !host.startsWith('-') && !host.endsWith('-')) {
    return host;
  }
  throw new Error('Format host printer tidak valid');
}

function escposLine(out, text) {
  out.extend(Buffer.from(text, 'utf-8'));
  out.push(0x0a); // \n
}

// POST /api/printer/receipt
router.post('/printer/receipt', requireAuth, (req, res) => {
  try {
    const host = validatePrinterHost(req.body.host || '');
    const port = Number(req.body.port) || 9100;
    const {
      store_name, invoice_no, payment_method, total_amount,
      cash_received, change_amount, items,
    } = req.body;

    const bytes = [];

    // ESC/POS init
    bytes.push(0x1b, 0x40); // Initialize
    bytes.push(0x1b, 0x61, 0x01); // Center align
    bytes.push(0x1d, 0x21, 0x11); // Double height, double width

    escposLine(bytes, store_name || 'CatatAgen Local');

    bytes.push(0x1d, 0x21, 0x00); // Normal size
    escposLine(bytes, invoice_no || '');
    escposLine(bytes, '------------------------------');

    bytes.push(0x1b, 0x61, 0x00); // Left align

    for (const item of (items || [])) {
      escposLine(bytes, (item.name || '').substring(0, 30));
      escposLine(bytes, `${item.quantity} x Rp${Math.round(item.unit_price || 0)} = Rp${Math.round(item.subtotal || 0)}`);
    }

    escposLine(bytes, '------------------------------');
    escposLine(bytes, `Bayar: ${payment_method || 'cash'}`);
    escposLine(bytes, `TOTAL: Rp${Math.round(total_amount || 0)}`);

    if (cash_received) {
      escposLine(bytes, `Tunai: Rp${Math.round(cash_received)}`);
    }
    if (change_amount) {
      escposLine(bytes, `Kembali: Rp${Math.round(change_amount)}`);
    }

    bytes.push(0x1b, 0x61, 0x01); // Center
    escposLine(bytes, 'Terima kasih');
    bytes.push(0x0a, 0x0a, 0x0a);
    bytes.push(0x1d, 0x56, 0x42, 0x00); // Cut paper

    const buffer = Buffer.from(bytes);

    // Send via TCP
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.connect(port, host, () => {
      socket.write(buffer, (err) => {
        socket.destroy();
        if (err) {
          return res.status(500).json({ error: `Gagal kirim struk ke printer: ${err.message}` });
        }
        res.json({ ok: true });
      });
    });

    socket.on('error', (err) => {
      socket.destroy();
      res.status(500).json({ error: `Gagal konek printer ${host}:${port}: ${err.message}` });
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.status(500).json({ error: `Timeout koneksi printer ${host}:${port}` });
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
