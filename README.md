# POS & Agen Bisnis

Aplikasi Point of Sale & Layanan Agen Bisnis yang lengkap dengan manajemen produk, transaksi, multi-rekening, dan laporan keuangan. Dirancang untuk berbagai jenis bisnis seperti BRILink, Counter HP, Agen Pulsa, Agen Pembayaran, dan toko retail di Indonesia.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%207%2F8%2F10%2F11-lightgrey.svg)
![Electron](https://img.shields.io/badge/Electron-22.3.27-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black.svg)

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Pengembangan](#pengembangan)
- [Build Desktop (Windows)](#build-desktop-windows)
- [Target Bisnis](#target-bisnis)
- [Integrasi Hardware](#integrasi-hardware)
- [Auto-Update](#auto-update)
- [Database](#database)
- [Keamanan](#keamanan)
- [Troubleshooting](#troubleshooting)
- [Dukung Pengembangan](#dukung-pengembangan)
- [Lisensi](#lisensi)

## Fitur Utama

### POS & Kasir
- Transaksi penjualan cepat dengan dukungan barcode scanner
- Manajemen keranjang, checkout multi-pembayaran (Tunai, Transfer, QRIS)
- Cetak struk otomatis via printer thermal
- Kalkulasi kembalian otomatis

### Layanan Agen Bisnis
- Transfer antar bank dan sesama bank
- Penarikan tunai
- Setor tunai
- Pembayaran tagihan (PLN, PDAM, Telkom, BPJS, cicilan)
- Pulsa & paket data
- Top up game dan e-wallet
- Voucher game
- Biaya admin berjenjang (tiered fee) per layanan

### Manajemen Produk
- CRUD produk dengan barcode, kategori, harga beli/jual, stok
- Manajemen kategori produk dengan icon dan warna
- Alert stok menipis
- Pencarian produk cepat

### Manajemen Kas & Saldo
- Multi-rekening (Kas Tunai, M-Banking BRI, Mandiri, BCA, BNI, dll)
- Kartu saldo bergaya kartu kredit (dengan chip, contactless icon)
- Transfer antar rekening
- Penyesuaian saldo
- Mutasi rekening dengan running balance

### Rekening Koran Instan
- Halaman rekening koran per rekening (seperti mutasi BCA/BRI)
- Filter date range dengan quick presets (Hari Ini, 7 Hari, Bulan Ini, dll)
- Summary: Saldo Awal, Total Masuk, Total Keluar, Saldo Akhir
- Export CSV
- Print mode

### Dashboard & Laporan
- Ringkasan aktivitas harian (omzet POS, volume layanan agen, profit)
- Grafik pendapatan 7 hari
- Stok menipis alert
- Transaksi terakhir
- Multi-rekening balance overview

### Otentikasi & Multi-User
- Login dengan JWT + bcrypt password hashing
- Role-based access (Admin & Kasir)
- Setup wizard untuk first-run configuration
- Session cookie httpOnly (7 hari)

### Aplikasi Desktop (Electron)
- Target Windows 7/8/10/11 (Electron 22 untuk kompatibilitas Win 7/8)
- Auto-update dari GitHub Releases
- Integrasi printer thermal ESC/POS
- Integrasi barcode scanner (USB HID keyboard wedge)
- Database lokal SQLite (offline-first)
- Single instance lock

## Tech Stack

### Frontend
- **Next.js 16.2.6** (App Router, Turbopack)
- **React 19.2.6**
- **TypeScript 5.9.3**
- **Tailwind CSS 4.1.17**
- **Lucide React** (icon set)
- **Recharts** (grafik)

### Backend
- **Next.js API Routes** (Node.js runtime)
- **Drizzle ORM 0.45.2**
- **libSQL/SQLite** (database lokal)
- **JWT (jose)** untuk otentikasi
- **bcryptjs** untuk password hashing

### Desktop
- **Electron 22.3.27** (terakhir support Windows 7/8)
- **electron-builder** untuk packaging
- **electron-updater** untuk auto-update
- **node-thermal-printer** untuk printer thermal

## Persyaratan Sistem

### Untuk Development
- Node.js 18+ (recommended 20+)
- npm 9+ atau pnpm
- Windows 10/11, macOS, atau Linux

### Untuk End User (Runtime)
- **Windows 7 SP1** / 8 / 8.1 / 10 / 11
- RAM minimal 2GB (recommended 4GB)
- Disk space 250MB (setelah install)
- Printer thermal (opsional, untuk cetak struk)
- Barcode scanner USB (opsional, untuk kasir cepat)

> **Catatan:** Untuk Windows 7/8, gunakan installer `ia32` (32-bit). Electron 22 adalah versi terakhir yang mendukung Windows 7/8/8.1.

## Instalasi

### Clone Repository

```bash
git clone https://github.com/herdianrony/pos-and-brilink-application.git
cd pos-and-brilink-application
```

### Install Dependencies

```bash
npm install
```

### Konfigurasi Environment (Opsional)

Buat file `.env.local` di root project:

```env
# Auth secret (WAJIB untuk produksi — generate dengan: openssl rand -hex 32)
AUTH_SECRET=your-secret-key-here

# Database URL (default: file:./data.db untuk dev)
DATABASE_URL=file:./data.db
```

> Jika `AUTH_SECRET` tidak diset, akan menggunakan default (tidak aman untuk produksi).

## Pengembangan

### Mode Web (Browser)

```bash
npm run dev
```

Akses di `http://localhost:3000`

### Mode Desktop (Electron + Hot Reload)

```bash
npm run dev:electron
```

Ini akan menjalankan:
1. `next dev` di port 3000
2. Electron window yang load `http://localhost:3000`
3. Hot reload aktif

### Typecheck

```bash
npm run typecheck
```

### Build Web Saja

```bash
npm run build
```

Output: `.next/standalone/` (self-contained server)

## Build Desktop (Windows)

### Prasyarat
- Windows 10/11 (untuk build installer Windows)
- Atau Linux/macOS dengan Wine (untuk cross-compile)

### Build NSIS Installer + Portable

```bash
npm run build:electron
```

Output di `dist-electron/`:
- `POS & Agen Bisnis-Setup-1.0.0.exe` — NSIS installer (x64 + ia32)
- `POS & Agen Bisnis-Portable-1.0.0.exe` — Portable (USB-stick, no install)

### Build Portable Saja

```bash
npm run build:electron:portable
```

### Publish ke GitHub Releases (Auto-Update)

```bash
# Set GitHub token di environment
set GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Build + upload ke GitHub Releases
npm run build:electron:publish
```

Setelah publish, aplikasi yang sudah terinstall akan otomatis cek update dan menawarkan instalasi versi baru.

## Target Bisnis

Aplikasi ini dirancang fleksibel untuk berbagai jenis bisnis agen:

| Tipe Bisnis | Preset di Setup Wizard |
|-------------|------------------------|
| **Agen BRILink** | Branding: "BRILink POS", Menu: "Layanan BRILink" |
| **Counter HP** | Branding: "Counter HP POS", Menu: "Layanan Counter" |
| **Agen Pulsa** | Branding: "Agen Pulsa POS", Menu: "Layanan Pulsa" |
| **Agen Pembayaran** | Branding: "Agen Bayar POS", Menu: "Layanan Pembayaran" |
| **Toko Kelontong** | Branding: "Toko POS", Menu: "Layanan Tambahan" |
| **Lainnya** | Branding custom |

### Cara Ganti Branding

1. Buka **Pengaturan → Branding & Tipe Bisnis**
2. Pilih preset atau isi manual:
   - **Nama Aplikasi** — tampil di sidebar, title bar, struk
   - **Tipe Bisnis** — tampil di subtitle
   - **Label Menu Layanan** — tampil di sidebar menu, dashboard, history
3. Klik **Simpan** — branding langsung berubah di seluruh app (real-time)

## Integrasi Hardware

### Printer Thermal (ESC/POS)

Didukung:
- **Network (LAN/WiFi)** — recommended, paling stabil
- **USB Direct** — perlu driver dari pabrikan
- **Serial (COM)** — untuk printer legacy

Protocol: ESC/POS (mayoritas printer thermal China).

#### Konfigurasi
1. Buka **Pengaturan → Printer Thermal**
2. Pilih tipe koneksi (Network/USB/Serial)
3. Untuk Network: masukkan IP printer (default port 9100)
4. Pilih lebar kertas: 58mm (32 karakter) atau 80mm (48 karakter)
5. Klik **Test Print** untuk verifikasi

#### Struk yang Dicetak
- Header: nama toko, alamat, telepon, ID agen
- Info invoice: nomor, tanggal, kasir, pelanggan
- Item transaksi (auto-wrap nama panjang)
- Summary: subtotal, admin fee, total, pembayaran, kembalian
- Footer: pesan terima kasih

### Barcode Scanner

Didukung: **USB HID Keyboard Wedge** (mayoritas scanner di pasar Indonesia).

Cara kerja: scanner "mengetik" barcode diakhiri Enter, dengan kecepatan >50 karakter/detik. Hook `useBarcodeScanner` mendeteksi pola ini dan trigger callback.

#### Pemakaian di Code

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

Aplikasi desktop otomatis cek update saat startup (delay 10 detik).

### Cara Kerja
1. Cek update dari GitHub Releases
2. Jika ada versi baru, download di background
3. Tampilkan notifikasi "Update v.X.Y.Z Tersedia"
4. Setelah download selesai, tampilkan "Install & Restart"
5. User klik → aplikasi restart & install update

### Setup Auto-Update
1. Push kode baru ke GitHub
2. Update version di `package.json`
3. Jalankan: `npm run build:electron:publish` (dengan `GH_TOKEN` set)
4. electron-builder upload otomatis ke GitHub Releases
5. User yang sudah install akan terima notifikasi update

## Database

### Lokasi Database

| Mode | Path |
|------|------|
| Dev (npm run dev) | `./data.db` |
| Production Windows | `%APPDATA%/POS & Agen Bisnis/pos-brilink.db` |
| Production macOS | `~/Library/Application Support/POS & Agen Bisnis/pos-brilink.db` |
| Production Linux | `~/.config/POS & Agen Bisnis/pos-brilink.db` |

Database persisten antar update aplikasi. Saat uninstall, installer akan tanya konfirmasi hapus data.

### Schema

Tabel utama:
- `users` — akun admin/kasir
- `categories` — kategori produk
- `products` — produk dengan stok
- `service_categories` — kategori layanan agen
- `brilink_services` — layanan agen (transfer, tarik, setor, dll)
- `fee_tiers` — biaya admin berjenjang
- `transactions` — transaksi POS & layanan
- `transaction_items` — item transaksi POS
- `accounts` — rekening (kas, bank)
- `account_mutations` — mutasi rekening
- `settings` — konfigurasi aplikasi (key-value)
- `cash_balance` — legacy (backward compat)

## Keamanan

### Otentikasi
- Password di-hash dengan **bcryptjs** (10 rounds)
- Session token **JWT** via `jose` di cookie `httpOnly`
- Session expired 7 hari
- Cookie flag: `httpOnly`, `sameSite=lax`, `secure` di production

### Content Security Policy (Electron)
- **Production**: CSP strict (`script-src 'self'`, no inline, no eval)
- **Dev mode**: CSP disabled (Next.js butuh inline scripts untuk HMR)
- `frame-ancestors 'none'` (anti clickjacking)

### Electron Security
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: false` (diperlukan untuk preload IPC)
- Preload script expose API via `contextBridge` (aman)

## Troubleshooting

### Aplikasi tidak bisa start
- **Error "Next.js standalone server tidak ditemukan"**
  - Jalankan `npm run build:electron` (bukan `electron .` langsung)
  - Atau untuk dev: `npm run dev:electron`

### Warna putih/blank di Electron
- **Penyebab**: Tailwind CSS 4 menggunakan `color-mix()` yang tidak didukung Chromium 108 (Electron 22)
- **Sudah di-fix** dengan inline fallback colors
- Jika masih terjadi, pastikan menggunakan versi terbaru (`git pull`)

### Printer thermal tidak terdeteksi
1. **Network**: Pastikan printer & komputer di network yang sama, cek IP printer
2. **USB**: Pastikan driver terinstall di Windows Device Manager
3. Coba port 9100 (default ESC/POS) atau 9101
4. Test print dari Pengaturan → Printer Thermal

### Login gagal
- Pastikan sudah setup akun via Setup Wizard (`/setup`)
- Jika lupa password admin, hapus file database:
  - Dev: `rm data.db`
  - Production: hapus `%APPDATA%/POS & Agen Bisnis/pos-brilink.db`
  - Lalu jalankan ulang → setup wizard muncul lagi

### Auto-update tidak berfungsi
1. Pastikan terhubung internet
2. Cek firewall — aplikasi butuh akses ke `github.com`
3. Lihat log di DevTools (Ctrl+Shift+I) → Console

### Electron Security Warning (unsafe-eval)
- **Normal di dev mode** — Next.js Turbopack pakai `eval()` untuk HMR
- **Tidak muncul di production** (sesuai pesan: "This warning will not show up once the app is packaged")
- Bukan bug, hanya dev-only reminder

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Web dev mode (browser) |
| `npm run dev:electron` | Desktop dev mode (Electron + hot reload) |
| `npm run build` | Build Next.js standalone |
| `npm run build:electron` | Build installer Windows (NSIS + portable) |
| `npm run build:electron:portable` | Build portable saja |
| `npm run build:electron:publish` | Build + upload ke GitHub Releases |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run compile:electron` | Compile Electron TypeScript |

## Struktur Project

```
pos-and-brilink-application/
├── electron/                  # Electron main process
│   ├── main.ts               # Main entry (spawn Next.js, window, IPC)
│   ├── preload.ts            # Preload script (contextBridge)
│   ├── printer.ts            # Thermal printer integration
│   ├── updater.ts            # Auto-update logic
│   ├── db-path.ts            # Database path resolver
│   └── build/                # Build assets (icon)
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Main page (sidebar + content)
│   │   ├── layout.tsx        # Root layout
│   │   ├── login/            # Login page
│   │   ├── setup/            # Setup wizard
│   │   ├── about/            # About developer page
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Login, logout, setup, me
│   │   │   ├── accounts/     # Rekening & mutasi
│   │   │   ├── transactions/ # Transaksi
│   │   │   ├── products/     # Produk
│   │   │   ├── categories/   # Kategori
│   │   │   ├── brilink-services/ # Layanan agen
│   │   │   ├── dashboard/    # Dashboard summary
│   │   │   ├── settings/     # App settings
│   │   │   └── hardware/     # Printer bridge
│   │   └── globals.css       # Global styles + design tokens
│   ├── components/           # React components
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── Dashboard.tsx     # Dashboard page
│   │   ├── POS.tsx           # Kasir POS
│   │   ├── BRILink.tsx       # Layanan agen
│   │   ├── Products.tsx      # Manajemen produk
│   │   ├── History.tsx       # Riwayat transaksi
│   │   ├── Cash.tsx          # Kas & saldo
│   │   ├── RekeningKoran.tsx # Rekening koran
│   │   ├── Settings.tsx      # Pengaturan
│   │   ├── AccountCard.tsx   # Kartu saldo (gaya kartu kredit)
│   │   ├── DynamicIcon.tsx   # Lucide icon mapper
│   │   ├── PrinterSettings.tsx # Printer config UI
│   │   ├── UpdateNotification.tsx # Auto-update banner
│   │   └── ui.tsx            # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts           # JWT + bcrypt utilities
│   │   ├── use-settings.ts   # Settings hook (branding dinamis)
│   │   ├── utils.ts          # Format rupiah, date, dll
│   │   └── hardware/         # Electron hardware bridge
│   ├── db/
│   │   ├── index.ts          # Drizzle client + DB bootstrap
│   │   └── schema.ts         # Database schema
│   ├── types/
│   │   └── electron.d.ts     # Electron API type declarations
│   └── proxy.ts              # Next.js proxy (auth middleware)
├── drizzle/                  # Drizzle migrations
├── electron-builder.yml      # Electron build config
├── next.config.ts            # Next.js config (standalone output)
├── tsconfig.json             # TypeScript config (Next.js)
├── tsconfig.electron.json    # TypeScript config (Electron)
└── package.json
```

## Dukung Pengembangan

Aplikasi ini gratis & open-source. Dukungan Anda sangat berarti untuk pengembangan fitur baru, perbaikan bug, dan biaya operasional.

[Dukung via Sociabuzz](https://sociabuzz.com/herdianrony/tribe)

Setiap kontribusi — sekecil apapun — sangat dihargai.

## Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.

## Author

**Herdian Rony**
- GitHub: [@herdianrony](https://github.com/herdianrony)
- Email: herdianrony@gmail.com
- Support: [Sociabuzz](https://sociabuzz.com/herdianrony/tribe)

---

Dibuat dengan untuk pelaku UMKM Indonesia.
