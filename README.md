# POS & Agen Bisnis

Aplikasi Point of Sale (POS) dan layanan agen bisnis untuk UMKM Indonesia. Aplikasi ini mendukung transaksi kasir, layanan agen seperti transfer/tarik/setor tunai, manajemen produk, multi-rekening, laporan transaksi, printer thermal, barcode scanner, serta mode desktop berbasis Tauri.

> **Status dokumentasi:** README ini disesuaikan dengan konfigurasi project saat ini: React 19, TypeScript 7, Node.js >= 22.12.0, Tauri 2, dan build desktop Windows x64.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey.svg)
![React](https://img.shields.io/badge/React-19.2.8-61DAFB.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.9.0-24C8DC.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6.svg)

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Batasan Penting](#batasan-penting)
- [Tech Stack](#tech-stack)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Pengembangan](#pengembangan)
- [Testing](#testing)
- [Build Desktop Windows](#build-desktop-windows)
- [Target Bisnis](#target-bisnis)
- [Integrasi Hardware](#integrasi-hardware)
- [Auto-Update](#auto-update)
- [Database](#database)
- [API Routes](#api-routes)
- [Panduan Pengguna](#panduan-pengguna)
- [Keamanan](#keamanan)
- [Troubleshooting](#troubleshooting)
- [Scripts](#scripts)
- [Struktur Project](#struktur-project)
- [Dukungan dan Bantuan](#dukungan-dan-bantuan)
- [Lisensi](#lisensi)
- [Author](#author)

## Fitur Utama

### POS & Kasir

- Transaksi penjualan produk.
- Dukungan barcode scanner USB HID keyboard wedge.
- Manajemen keranjang dan checkout.
- Metode pembayaran tunai, transfer, dan QRIS.
- Kalkulasi kembalian otomatis.
- Cetak struk via printer thermal ESC/POS.

### Layanan Agen Bisnis

> **Penting:** Modul Layanan Agen Bisnis adalah fitur **pencatatan operasional/manual bookkeeping**, bukan sistem transaksi perbankan atau payment switching. Aplikasi ini **tidak melakukan transfer bank otomatis**, **tidak terhubung ke API bank/BRILink/PPOB/QRIS**, dan **tidak memproses pembayaran real-time**. Transaksi aktual tetap dilakukan operator melalui kanal resmi masing-masing, lalu dicatat di aplikasi ini untuk laporan, saldo internal, profit, dan struk.

- Pencatatan layanan transfer antar bank dan sesama bank.
- Pencatatan tarik tunai dan setor tunai.
- Pencatatan pembayaran tagihan seperti PLN, PDAM, Telkom, BPJS, dan cicilan.
- Pencatatan pulsa, paket data, top up game/e-wallet, dan voucher.
- Perhitungan biaya admin dan fee agen.
- Update saldo internal kas/rekening berdasarkan efek transaksi.
- Mutasi rekening internal dan laporan profit.

### Manajemen Produk

- CRUD produk.
- Barcode, kategori, harga beli, harga jual, dan stok.
- Kategori produk dengan icon dan warna.
- Alert stok menipis.
- Pencarian produk.

### Manajemen Kas & Saldo

- Multi-rekening: kas tunai, bank, dan akun lain.
- Transfer antar rekening.
- Penyesuaian saldo.
- Mutasi rekening dengan running balance.

### Rekening Koran

- Mutasi per rekening.
- Filter rentang tanggal dan preset cepat.
- Ringkasan saldo awal, total masuk, total keluar, dan saldo akhir.
- Export CSV dan mode print.

### Dashboard & Laporan

- Ringkasan aktivitas harian.
- Omzet POS, volume layanan agen, dan profit.
- Grafik pendapatan.
- Stok menipis.
- Transaksi terakhir.

### Otentikasi & Multi-User

- Login dengan JWT.
- Password hashing menggunakan bcryptjs.
- Role admin dan kasir.
- Setup wizard saat first run.
- Session cookie `httpOnly`.

### Desktop App (Tauri)

- **Tauri 2.9.0** untuk desktop application
- **WebView2** (Windows) atau WebKit (macOS/Linux) untuk rendering
- React + Vite untuk UI components
- Express.js sebagai embedded backend server
- Database SQLite lokal/offline-first
- Single instance lock
- Auto-update via GitHub Releases

### Cara Menjalankan Desktop App

```bash
npm run dev:tauri
```

Command ini akan:
1. Install dependencies (jika belum)
2. Build backend TypeScript
3. Build UI dengan Vite
4. Launch Tauri development window dengan hot-reload

Untuk production build:

```bash
npm run build:tauri
```

Build akan menghasilkan file di `src-tauri/target/release/` dan dapat di-upload sebagai release.

## Batasan Penting

Aplikasi ini adalah aplikasi POS dan pencatatan agen bisnis. Untuk modul layanan agen:

- Tidak ada integrasi transaksi langsung ke bank.
- Tidak ada koneksi ke API resmi BRI/BRILink, BCA, Mandiri, BNI, PPOB, QRIS, e-wallet, atau payment gateway.
- Tidak ada validasi rekening/tagihan secara online.
- Tidak ada settlement otomatis.
- Saldo bank/kas yang tampil adalah **saldo internal/catatan aplikasi**, bukan saldo real-time dari bank.

Operator tetap harus melakukan transaksi sebenarnya melalui mobile banking, EDC, aplikasi BRILink/PPOB resmi, atau kanal resmi lain. Setelah itu transaksi dicatat di aplikasi ini untuk kebutuhan pembukuan, struk, dan laporan.

## Dukungan dan Bantuan

Aplikasi ini masih tahap pemantapan dan bisa dipakai tanpa biaya lisensi pada rilis awal `v1.0.0`.

Jika aplikasi ini membantu usaha Anda, Anda boleh memberi dukungan sukarela. Dukungan ini membantu perbaikan bug, pembuatan fitur baru, dan penulisan panduan.

- Donasi tidak wajib.
- Aplikasi tidak dikunci jika pengguna tidak berdonasi.
- Jika pengguna meminta bantuan langsung seperti instalasi, training, setup printer, setup layanan agen, backup/restore, atau penyesuaian khusus, bantuan tersebut bisa berbayar sesuai kesepakatan.
- Dukungan sukarela: <https://sociabuzz.com/herdianrony/tribe>
- Bantuan teknis: <mailto:herdianrony@gmail.com>

## Tech Stack

### Frontend

- **React 19.2.8** dengan shadcn/ui (Radix UI primitives)
- **TypeScript 7.0.2**
- **Vite 8.1.5** untuk build dan development server
- **Tailwind CSS 4.3.3**
- **Chart.js 4.5.1** untuk grafik
- **Lucide React** untuk icon

### Backend

- **Express.js** API server
- **Drizzle ORM 0.45.2**
- **libSQL/SQLite**
- **JWT** menggunakan `jose`
- **bcryptjs** untuk password hashing

### Desktop (Tauri)

- **Tauri 2.9.0** untuk desktop application
- **WebView2** (Windows) atau WebKit (macOS/Linux)
- **React 19.2.8** + **Vite** untuk UI
- **Express.js** sebagai embedded backend server
- **Database SQLite** lokal/offline-first
- **Single instance lock**
- **Auto-update** via GitHub Releases

### Desktop (Lama - Electron)

⚠️ **Deprecated**: Project ini sudah beralih dari Electron ke Tauri. Electron version ada di branch lama atau history commit sebelum migration.

## Persyaratan Sistem

### Development

- **Node.js >= 22.12.0**.
- npm sesuai bawaan Node.js 22.
- **Rust 1.70+** untuk build Tauri (jika ada Rust tidak installed, install toolchain akan otomatis).
- **Python 3.6+** (optional, untuk native module builds).
- **WebView2 Runtime** (Windows 10/11 sudah include, tapi perlu terinstall di Windows 7/8).

> Project ini mendefinisikan engine Node di `package.json` sebagai `>=22.12.0`. CI juga berjalan dengan Node.js 22.

### Runtime Desktop (Tauri)

Konfigurasi desktop saat ini menggunakan Tauri 2 dan target build Windows x64.

- **Didukung:** Windows 10/11 64-bit.
- **Tidak didukung:** Windows 7, Windows 8/8.1, Windows 32-bit/ia32, ARM.
- RAM minimal 2GB, direkomendasikan 4GB.
- Disk space minimal sekitar 500MB setelah install.
- Printer thermal opsional.
- Barcode scanner USB opsional.

### Cara Install WebView2 Runtime (Windows)

Jika WebView2 tidak terinstall, download dari:

- [WebView2 Runtime Download Page](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

> **Catatan penting:** Windows 10/11 sudah include WebView2. Windows 7/8 tidak didukung karena Tauri 2 membutuhkan WebView2 runtime yang hanya support Windows 10+. Jika perangkat masih Windows 7/8, gunakan Web/LAN mode dari server/PC yang lebih modern, atau upgrade minimal ke Windows 10 64-bit.

### Catatan untuk PC Lama / Core 2 Duo

Banyak usaha masih memakai PC lama seperti Core 2 Duo. Aplikasi Tauri masih bisa berjalan jika perangkat tersebut sudah memenuhi syarat berikut:

| Komponen | Rekomendasi                                      |
| -------- | ------------------------------------------------ |
| CPU      | Core 2 Duo yang mendukung 64-bit atau lebih baru |
| RAM      | Minimal 4GB                                      |
| Storage  | SSD sangat disarankan                            |
| OS       | Windows 10 64-bit                                |

Jika PC masih memakai **Windows 7/8 32-bit**, desktop application tidak didukung. Solusi yang disarankan adalah menjalankan aplikasi di PC/server yang lebih baru, lalu PC lama mengakses lewat browser dalam mode Web/LAN.

Contoh skenario Web/LAN:

```txt
PC/server utama Windows 10/11 atau Linux menjalankan aplikasi
PC lama membuka http://IP-SERVER:3000 dari browser
```

## Instalasi

### Clone Repository

```bash
git clone https://github.com/herdianrony/pos-and-brilink-application.git
cd pos-and-brilink-application
```

### Install Dependencies

Gunakan Node.js 22 LTS sesuai `.nvmrc` (`22.12.0`). Node 25 tidak direkomendasikan.

```bash
npm install
```

## Konfigurasi Environment

Salin file contoh environment:

```bash
cp .env.example .env
```

Isi utama:

```env
AUTH_SECRET=
DATABASE_URL=file:./data.db
```

### `AUTH_SECRET`

- Development/test: boleh kosong; aplikasi membuat random secret per proses, tanpa fixed secret di source code.
- Production: wajib diisi, minimal 32 karakter.

Generate secret manual:

```bash
openssl rand -hex 48
```

### `DATABASE_URL`

Default development:

```env
DATABASE_URL=file:./data.db
```

Pada mode Tauri packaged, `DATABASE_URL` otomatis diarahkan ke database di folder `userData` aplikasi.

## Pengembangan

### Development Mode

```bash
npm run dev
```

Command ini akan:

1. Build backend TypeScript
2. Start Express.js server di port 3001
3. Build UI dengan Vite di port 3000
4. Launch Tauri development window dengan hot-reload

Aplikasi akan tersedia di port 3000 (UI) dan backend API di port 3001.

### Typecheck

```bash
npx tsc --noEmit
```

### Lint

```bash
npx eslint src-tauri-ui/src --ext .ts,.tsx
```

### Build Production

```bash
npm run build:tauri
```

Build process:
1. Install dependencies (jika belum)
2. Build backend TypeScript
3. Build UI dengan Vite
4. Build Tauri application
5. Output di `src-tauri/target/release/`

## Testing

### Unit/Integration Test

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

### E2E Test Playwright

Install browser Playwright jika belum tersedia:

```bash
npx playwright install
```

Jalankan E2E test:

```bash
npm run test:e2e
```

Mode UI:

```bash
npm run test:e2e:ui
```

## Build Desktop Windows

### Build Web/Standalone untuk Desktop

```bash
npm run build:web
```

Command ini menjalankan `next build` dan script post-build.

### Build Installer + Portable

```bash
npm run build:electron
```

Konfigurasi build saat ini ada di `electron-builder.yml`:

- `productName`: **BRILink POS**.
- Output folder: `dist-electron/`.
- Target Windows: NSIS installer x64 dan Portable x64.
- Build ia32/32-bit tidak aktif pada konfigurasi saat ini.

Perkiraan output:

```text
dist-electron/BRILink POS Setup <version>.exe
dist-electron/BRILink POS-Portable-<version>.exe
```

Nama final dapat berubah mengikuti format artifact bawaan `electron-builder`.

### Build Portable Saja

```bash
npm run build:electron:portable
```

### Publish ke GitHub Releases

```bash
# Windows PowerShell/CMD
set GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npm run build:electron:publish
```

Atau di Linux/macOS:

```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npm run build:electron:publish
```

`GH_TOKEN` harus memiliki permission untuk membuat atau mengunggah GitHub Release pada repository ini.

## Target Bisnis

Aplikasi ini dirancang fleksibel untuk berbagai jenis usaha:

| Tipe Bisnis     | Contoh Branding |
| --------------- | --------------- |
| Agen BRILink    | BRILink POS     |
| Counter HP      | Counter HP POS  |
| Agen Pulsa      | Agen Pulsa POS  |
| Agen Pembayaran | Agen Bayar POS  |
| Toko Kelontong  | Toko POS        |
| Lainnya         | Branding custom |

Branding dapat diubah melalui menu pengaturan aplikasi, termasuk nama aplikasi, tipe bisnis, dan label menu layanan.

> Walaupun tersedia preset seperti Agen BRILink, Agen Pulsa, dan Agen Pembayaran, preset tersebut hanya mengubah konteks pencatatan/branding. Preset tidak mengaktifkan koneksi langsung ke layanan perbankan atau provider pembayaran.

## Integrasi Hardware

### Printer Thermal ESC/POS

Jenis koneksi yang didukung:

- Network/LAN/WiFi.
- USB direct, tergantung driver pabrikan.
- Serial/COM untuk printer legacy.

Konfigurasi tersedia di:

```text
Pengaturan → Printer Thermal
```

Fitur printer:

- Test print.
- Cetak struk transaksi.
- Konfigurasi ukuran kertas 58mm/80mm.
- Integrasi melalui Electron IPC dan `node-thermal-printer`.

### Barcode Scanner

Jenis scanner yang didukung:

- USB HID keyboard wedge.

Cara kerja: scanner bertindak seperti keyboard, mengetik kode barcode lalu mengirim Enter. Hook `useBarcodeScanner` mendeteksi pola input cepat dan memanggil callback.

Contoh penggunaan:

```tsx
import { useBarcodeScanner } from "@/lib/hardware/use-barcode-scanner";

function POSPage() {
  useBarcodeScanner({
    onScan: (code) => addToCartByBarcode(code),
  });

  return null;
}
```

## WhatsApp Owner

Aplikasi mendukung notifikasi WhatsApp otomatis ke owner melalui **WhatsApp Web** (`whatsapp-web.js`). Fitur ini bersifat opsional dan ditujukan untuk notifikasi internal, misalnya saat kasir mencatat Tarik Tunai dan owner perlu mengecek transfer masuk di m-banking.

Fitur utama:

- nomor WhatsApp owner dapat diisi saat Setup Wizard atau Pengaturan,
- mode desktop memakai client WhatsApp native Electron (`wwebjs-electron`) dengan persistent partition,
- mode Web/LAN memakai fallback server-side `whatsapp-web.js`,
- scan QR menggunakan WhatsApp kasir/operasional,
- tombol restart/logout WhatsApp,
- notifikasi otomatis untuk flow `cash_withdrawal`, `cash_deposit`, `transfer`, `payment`, dan `topup`,
- tidak mengirim untuk inquiry/cek saldo.

Catatan penting:

- ini memakai WhatsApp Web automation, bukan API resmi Meta/WhatsApp Business Cloud API,
- jangan digunakan untuk spam/broadcast massal,
- jika WhatsApp belum terhubung, transaksi tetap tersimpan; hanya notifikasi yang gagal/tidak terkirim,
- session desktop disimpan di partition Electron/userData, bukan di root project. Perangkat produksi sebaiknya memakai full-disk encryption seperti BitLocker.

## Auto-Update

Auto-update berjalan pada aplikasi Electron packaged melalui `electron-updater` dan GitHub Releases.

Alur umum:

1. Aplikasi cek update saat startup.
2. Jika ada versi baru di GitHub Releases, aplikasi mengunduh update.
3. User mendapat notifikasi update.
4. User dapat memilih install dan restart.

Setup release:

1. Naikkan versi dengan `npm run version:patch`, `npm run version:minor`, atau `npm run version:major`.
2. Update `CHANGELOG.md`.
3. Jalankan `npm run release:check`.
4. Build installer lokal dengan `npm run build:electron`, atau publish GitHub Release dengan `GH_TOKEN=... npm run build:electron:publish`.
5. Untuk simulasi UI update tanpa publish release, jalankan `npm run dev:electron:update-sim` lalu klik **Simulasi Update** di halaman Tentang.

Panduan lengkap ada di `docs/release.md`.

## Log & Monitoring

Admin dapat memantau error aplikasi dari:

```text
Pengaturan → Lanjutan → Log & Monitoring Aplikasi
```

Panel ini menampilkan error API, error tampilan, log server Electron, filter level, pencarian, download log, dan tombol bersihkan log aktif.

Lokasi file log desktop:

```text
%APPDATA%/BRILink POS/logs/app.log
%APPDATA%/BRILink POS/logs/next-server.log
%APPDATA%/BRILink POS/logs/whatsapp-electron.log
```

## Database

Database menggunakan SQLite/libSQL melalui Drizzle ORM.

### Lokasi Database

| Mode                | Path                                  |
| ------------------- | ------------------------------------- |
| Development web     | `./data.db` atau nilai `DATABASE_URL` |
| Production Electron | `userData/pos-brilink.db`             |

Pada Windows, lokasi `userData` biasanya berada di bawah `%APPDATA%` sesuai nama aplikasi desktop. Dengan `productName` saat ini, lokasinya umumnya berada di folder aplikasi **BRILink POS**.

### Tabel Utama

Schema berada di `src/db/schema.ts`. Tabel utama:

- `users`
- `categories`
- `products`
- `service_categories`
- `brilink_services`
- `fee_tiers`
- `transactions`
- `transaction_items`
- `transaction_denominations`
- `accounts`
- `account_mutations`
- `settings`
- `cash_balance` legacy/backward compatibility

### Migration

File migration ada di folder `drizzle/`. Konfigurasi Drizzle berada di:

```text
drizzle.config.json
```

## API Routes

API berada di `src/app/api/`. Endpoint yang tersedia antara lain:

| Area         | Route                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------- |
| Health       | `/api/health`                                                                               |
| Auth         | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/setup`, `/api/auth/users` |
| Setup        | `/api/setup/complete`, `/api/setup/templates`                                               |
| Produk       | `/api/products`, `/api/categories`                                                          |
| Layanan agen | `/api/service-categories`, `/api/brilink-services`, `/api/fee-tiers`                        |
| Transaksi    | `/api/transactions`, `/api/transactions/[id]`                                               |
| Rekening/kas | `/api/accounts`, `/api/accounts/mutations`, `/api/cash`                                     |
| Dashboard    | `/api/dashboard`                                                                            |
| Settings     | `/api/settings`                                                                             |
| Hardware     | `/api/hardware/printer`                                                                     |
| Data utility | `/api/backup`, `/api/seed`, `/api/seed-demo`                                                |

> Production seed hanya membuat settings default dan template rekening/kas. Produk, kategori produk, kategori layanan, layanan agen, dan fee tidak dibuat otomatis; owner/admin mengisinya sendiri sesuai SOP bisnis.

> Dokumentasi detail request/response API belum dipisahkan ke file khusus.

## Panduan Pengguna

Panduan operasional untuk admin, kasir, dan operator tersedia di:

```text
docs/user-guide.md
```

Panduan deployment produksi tersedia di:

```text
docs/deployment.md
```

Dokumen tersebut menjelaskan setup awal, POS/kasir, pencatatan layanan agen, manajemen saldo, riwayat transaksi, rekening koran, printer, backup, troubleshooting, dan batasan aplikasi.

## Keamanan

### Otentikasi

- Password di-hash dengan `bcryptjs`.
- Session menggunakan JWT dari `jose`.
- Cookie session memakai `httpOnly`.
- Production web/server wajib punya `AUTH_SECRET` kuat.
- Electron production membuat secret unik per instalasi.

### Electron Security

Konfigurasi utama di `electron/main.ts`:

- `contextIsolation: true`.
- `nodeIntegration: false`.
- API native diekspos lewat preload/contextBridge.
- Single instance lock.
- Pada production, koneksi dibatasi ke server lokal internal.
- Next.js standalone server production bind ke `127.0.0.1` pada port `43219`.

## Troubleshooting

### Aplikasi web tidak jalan

Cek versi Node.js:

```bash
node --version
```

Pastikan minimal `22.12.0`, lalu install ulang dependency:

```bash
npm install
npm run dev
```

### Tauri dev tidak membuka aplikasi

Pastikan port 3000 (UI) dan 3001 (API) tidak dipakai aplikasi lain. Jalankan:

```bash
npm run dev:tauri
```

Jika masih gagal, coba jalankan terpisah:

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start UI
npm run dev:ui

# Terminal 3: Start Tauri
npm run dev:tauri
```

### Build Tauri gagal

Jika build Tauri error:

1. **Cek Rust**:
   ```bash
   rustc --version
   cargo --version
   ```
   - Pastikan Rust >= 1.70 terinstall.
   - Install Rust dari [rustup.rs](https://rustup.rs/).

2. **Cek npm dependencies**:
   ```bash
   npm install
   npm run build:ui
   ```

3. **Reinstall node_modules**:
   ```bash
   cd src-tauri-ui
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

4. **Clean Tauri cache**:
   ```bash
   npm run tauri dev -- --reload
   ```

### UI Hot-Reload tidak berjalan

Jika UI tidak hot-reload saat dev:

1. **Restart Vite dev server**:
   ```bash
   cd src-tauri-ui
   npm run dev:ui
   ```

2. **Check Vite proxy**:
   - Pastikan API server berjalan di port 3001.
   - Pastikan `vite.config.ts` proxy config benar (`/api` → `http://127.0.0.1:3001`).

3. **Clear Vite cache**:
   ```bash
   cd src-tauri-ui
   rm -rf node_modules/.vite
   npm run dev:ui
   ```

### Database Error

Jika muncul error database:

1. **Check backend logs**: Pastikan `npm run dev:backend` sukses berjalan.
2. **Cek SQLite database**:
   ```bash
   # Backend folder
   cd src
   # Cek database file
   ls db/
   ```
3. **Rebuild database**:
   ```bash
   cd src
   npm run db:generate  # generate schema jika ada
   npm run db:migrate   # run migrations
   ```

### Module Not Found / Import Error

Jika muncul error import tidak ditemukan:

1. **Reinstall node_modules**:
   ```bash
   npm install
   ```

2. **Check TypeScript config**:
   - Pastikan `tsconfig.json` alias valid (`@/*` → `./src/*`).

3. **Check vite.config.ts**:
   - Pastikan `resolve.alias` benar.

### Printer thermal tidak terdeteksi

1. Untuk network printer, pastikan komputer dan printer berada dalam jaringan yang sama.
2. Cek IP printer dan port, biasanya `9100`.
3. Untuk USB, pastikan driver printer terpasang di Windows.
4. Gunakan tombol Test Print di pengaturan printer.

### Login gagal atau lupa password admin

Jika masih development dan ingin reset total, hapus database development:

```bash
# Web mode
rm data.db

# Tauri mode (userData folder)
# Windows: Cek di %APPDATA%/catatagen-local
# macOS: Cek di ~/Library/Application Support/catatagen-local
# Linux: Cek di ~/.config/catatagen-local
```

Untuk production Tauri, backup dulu data penting sebelum menghapus database di folder `userData`.

### Auto-Update tidak berjalan

1. **Pastikan aplikasi adalah hasil build**, bukan dev mode.
2. **Pastikan koneksi internet tersedia**.
3. **Pastikan GitHub Releases berisi artifact update yang valid**.
4. **Cek Tauri config**: Pastikan `tauri.conf.json` memiliki `allowUpdater: true`.
5. **Check update manifest**: Pastikan Tauri dapat mengakses GitHub Releases API.

## Scripts

| Command                           | Deskripsi                                    |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Menjalankan backend + UI dengan hot-reload   |
| `npm run build:tauri`             | Build aplikasi desktop produksi              |
| `npm run build:ui`                | Build UI saja                                 |
| `npm run build:backend`           | Build backend TypeScript saja                 |
| `npm run lint`                    | ESLint pada UI code                          |
| `npm run test:e2e:tauri`          | Playwright E2E test untuk Tauri              |
| `npm run typecheck`               | TypeScript check untuk UI code               |

## Struktur Project

```text
pos-and-brilink-application/
├── .github/workflows/        # CI workflow
├── src/                      # Express.js backend
│   ├── routes/               # API routes
│   ├── db/                   # Drizzle client dan schema
│   ├── lib/                  # Utility functions, auth, settings
│   ├── types/                # Type declarations
│   └── package.json          # Backend dependencies
├── src-tauri-ui/             # React + Vite + Tauri UI
│   ├── src/
│   │   ├── components/       # React components (shadcn/ui)
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # React hooks (useAuth, useAppData, dll)
│   │   ├── api.ts            # API client
│   │   ├── mockApi.ts        # Mock API untuk development
│   │   ├── types.ts          # UI types
│   │   ├── styles.css        # Global styles
│   │   ├── App.tsx           # App root component
│   │   └── main.tsx          # Entry point
│   ├── package.json          # UI dependencies
│   ├── vite.config.ts        # Vite configuration
│   ├── tsconfig.json         # TypeScript configuration
│   └── index.html            # HTML entry
├── src-tauri/                # Tauri Rust backend
│   ├── src/                  # Rust source code
│   │   ├── lib.rs            # Library entry
│   │   ├── main.rs           # Tauri command handlers
│   │   ├── auth.rs           # Authentication
│   │   ├── pos/              # POS module
│   │   ├── products.rs       # Products
│   │   ├── transactions.rs   # Transactions
│   │   ├── accounts.rs       # Accounts management
│   │   ├── agent_services.rs # Agent services
│   │   ├── debts.rs          # Debt management
│   │   ├── settings.rs       # Settings
│   │   ├── whatsapp.rs       # WhatsApp integration
│   │   ├── printer.rs        # Printer integration
│   │   ├── seed.rs           # Database seeding
│   │   └── ...               # Other modules
│   ├── Cargo.toml            # Rust dependencies
│   ├── Cargo.lock            # Lock file untuk deterministic builds
│   ├── tauri.conf.json       # Tauri configuration
│   └── build.rs              # Build scripts
├── docs/                     # Documentation
│   ├── tauri-feature-parity.md
│   ├── tauri-plugin-plan.md
│   └── ...
├── e2e-tauri/                # Playwright E2E tests untuk Tauri
│   ├── fixtures/             # Test fixtures
│   └── *.spec.ts             # Test files
├── package.json              # Root package dengan workspaces
├── package-lock.json
├── .nvmrc                    # Node.js version
├── tsconfig.json             # Root TypeScript configuration
└── vite.config.ts            # Root Vite configuration
```

## Lisensi

Project ini menggunakan lisensi MIT sesuai `package.json`.

> Disarankan menambahkan file `LICENSE` berisi teks MIT License agar informasi lisensi lengkap untuk distribusi open-source.

## Author

**Herdian Rony**

- GitHub: [@herdianrony](https://github.com/herdianrony)
- Email: herdianrony@users.noreply.github.com

---

Dibuat untuk membantu pelaku UMKM Indonesia menjalankan transaksi POS dan layanan agen secara offline-first.
