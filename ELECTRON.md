# BRILink POS — Desktop Application

Aplikasi desktop POS & BRILink berbasis Electron, mendukung Windows 7/8/10/11.

## Architecture

```
Electron Main Process (electron/main.ts)
  ├─ spawn Next.js standalone server (.next/standalone/server.js)
  ├─ BrowserWindow load http://127.0.0.1:43219
  ├─ Database: %APPDATA%/BRILink POS/pos-brilink.db (persistent)
  ├─ Printer thermal via node-thermal-printer (ESC/POS)
  ├─ Auto-update via electron-updater + GitHub Releases
  └─ IPC handlers (printer, window controls, update)
```

## Development

```bash
# Mode web saja (untuk development cepat)
npm run dev

# Mode desktop (Electron + Next.js dev)
npm run dev:electron

# Build installer Windows
npm run build:electron
# Output: dist-electron/BRILink POS-Setup-1.0.0.exe
#         dist-electron/BRILink POS-Portable-1.0.0.exe

# Build portable saja (cepat)
npm run build:electron:portable
```

## Target Windows

| Target | Windows 7/8/8.1 | Windows 10/11 |
|--------|-----------------|----------------|
| NSIS Installer (x64) | ❌ | ✅ |
| NSIS Installer (ia32) | ✅ | ✅ |
| Portable (x64) | ❌ | ✅ |

> **Catatan**: Untuk Windows 7/8, gunakan installer `ia32` (32-bit).
> Electron 22 adalah versi terakhir yang mendukung Windows 7/8.

## Printer Thermal

Didukung:
- **Network (LAN/WiFi)** — recommended, paling stabil
- **USB Direct** — perlu driver dari pabrikan
- **Serial (COM)** — untuk printer legacy

Protocol: ESC/POS (mayoritas printer thermal China).

Konfigurasi via menu **Pengaturan → Printer Thermal**.

Test printer: tombol "Test Print" akan mencetak 1 baris "Test Printer OK".

## Barcode Scanner

Didukung: **USB HID Keyboard Wedge** (mayoritas scanner di pasar Indonesia).

Cara kerja: scanner "mengetik" barcode diakhiri Enter, dengan kecepatan
>50 karakter/detik. Hook `useBarcodeScanner` mendeteksi pola ini dan
trigger callback `onScan`.

Pemakaian:
```tsx
import { useBarcodeScanner } from "@/lib/hardware/use-barcode-scanner";

function POSPage() {
  const { barcode } = useBarcodeScanner({
    onScan: (code) => addToCartByBarcode(code),
  });
  // ...
}
```

## Auto-Update

Konfigurasi:
1. Set `GH_TOKEN` environment variable (GitHub Personal Access Token dengan scope `repo`)
2. Update version di `package.json`
3. Jalankan: `npm run build:electron:publish`
4. electron-builder akan upload otomatis ke GitHub Releases dengan:
   - `BRILink POS-Setup-x.y.z.exe` (NSIS installer)
   - `BRILink POS-Portable-x.y.z.exe` (portable)
   - `latest.yml` (metadata untuk auto-update)

Aplikasi akan otomatis cek update saat startup (delay 10 detik),
download di background, lalu muncul notifikasi "Install & Restart"
di pojok kanan bawah.

## Database Path

| Mode | Path |
|------|------|
| Dev (npm run dev) | `./data.db` |
| Production Windows | `%APPDATA%/BRILink POS/pos-brilink.db` |
| Production macOS | `~/Library/Application Support/BRILink POS/pos-brilink.db` |
| Production Linux | `~/.config/BRILink POS/pos-brilink.db` |

Database persisten antar update aplikasi.

## Troubleshooting

### "Next.js standalone server tidak ditemukan"
Jalankan `npm run build:web` dulu sebelum `npm run build:electron`.

### Printer tidak terdeteksi
1. Pastikan printer & komputer di network yang sama (untuk network printer)
2. Cek IP printer di pengaturan → test ping
3. Coba port 9100 (default ESC/POS) atau 9101
4. Untuk USB: pastikan driver terinstall di Windows Device Manager

### App tidak bisa cek update
1. Pastikan terhubung internet
2. Cek firewall — aplikasi butuh akses ke `github.com`
3. Lihat log di DevTools (Ctrl+Shift+I) → Console

### Data hilang setelah update
Database disimpan di `%APPDATA%/BRILink POS/pos-brilink.db`. Jangan hapus
folder ini saat uninstall (installer akan tanya konfirmasi).

## Code Signing (Opsional)

Untuk hindari SmartScreen warning di Windows:
1. Beli code signing certificate (OV/EV) dari DigiCert/Sectigo/GlobalSign
2. Set env:
   ```
   CSC_LINK=path/to/cert.p12
   CSC_KEY_PASSWORD=your_password
   ```
3. Build: `npm run build:electron`

Tanpa signing, user akan lihat "Windows protected your PC" — klik
"More info" → "Run anyway" untuk install.
