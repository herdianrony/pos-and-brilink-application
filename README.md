# POS & Agen Bisnis

Aplikasi Point of Sale (POS) dan layanan agen bisnis untuk UMKM Indonesia. Aplikasi ini mendukung transaksi kasir, layanan agen seperti transfer/tarik/setor tunai, manajemen produk, multi-rekening, laporan transaksi, printer thermal, barcode scanner, serta mode desktop berbasis Electron.

> **Status dokumentasi:** README ini disesuaikan dengan konfigurasi project saat ini: Next.js 16, React 19, Node.js >= 22.12.0, Electron 43, dan build desktop Windows x64.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black.svg)
![Electron](https://img.shields.io/badge/Electron-43.1.0-blue.svg)

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

### Desktop App

- Desktop app berbasis Electron.
- Build saat ini menargetkan Windows x64.
- Next.js standalone server dijalankan secara lokal di dalam aplikasi desktop.
- Database SQLite lokal/offline-first.
- Single instance lock.
- Auto-update via GitHub Releases.

## Batasan Penting

Aplikasi ini adalah aplikasi POS dan pencatatan agen bisnis. Untuk modul layanan agen:

- Tidak ada integrasi transaksi langsung ke bank.
- Tidak ada koneksi ke API resmi BRI/BRILink, BCA, Mandiri, BNI, PPOB, QRIS, e-wallet, atau payment gateway.
- Tidak ada validasi rekening/tagihan secara online.
- Tidak ada settlement otomatis.
- Saldo bank/kas yang tampil adalah **saldo internal/catatan aplikasi**, bukan saldo real-time dari bank.

Operator tetap harus melakukan transaksi sebenarnya melalui mobile banking, EDC, aplikasi BRILink/PPOB resmi, atau kanal resmi lain. Setelah itu transaksi dicatat di aplikasi ini untuk kebutuhan pembukuan, struk, dan laporan.

## Tech Stack

### Frontend

- **Next.js 16.2.6** dengan App Router.
- **React 19.2.6**.
- **TypeScript 5.9.3**.
- **Tailwind CSS 4.1.17**.
- **Lucide React** untuk icon.
- **Recharts** untuk grafik.

### Backend

- **Next.js API Routes**.
- **Drizzle ORM 0.45.2**.
- **libSQL/SQLite**.
- **JWT** menggunakan `jose`.
- **bcryptjs** untuk password hashing.

### Desktop

- **Electron 43.1.0**.
- **electron-builder** untuk packaging.
- **electron-updater** untuk auto-update.
- **node-thermal-printer** untuk printer thermal.

## Persyaratan Sistem

### Development

- **Node.js >= 22.12.0**.
- npm sesuai bawaan Node.js 22.
- Windows, macOS, atau Linux.

> Project ini mendefinisikan engine Node di `package.json` sebagai `>=22.12.0`. CI juga berjalan dengan Node.js 22.

### Runtime Desktop

Konfigurasi desktop saat ini menggunakan Electron 43 dan target build Windows x64.

- Windows 10/11 64-bit direkomendasikan.
- RAM minimal 2GB, direkomendasikan 4GB.
- Disk space minimal sekitar 250MB setelah install.
- Printer thermal opsional.
- Barcode scanner USB opsional.

> **Catatan penting:** Dokumentasi versi lama menyebut Windows 7/8 dan Electron 22. Konfigurasi project saat ini memakai Electron 43, sehingga klaim Windows 7/8 tidak berlaku untuk build saat ini.

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

## Konfigurasi Environment

Salin file contoh environment:

```bash
cp .env.example .env.local
```

Isi utama:

```env
AUTH_SECRET=
DATABASE_URL=file:./data.db
```

### `AUTH_SECRET`

- Development/test: boleh kosong; aplikasi membuat random secret per proses, tanpa fixed secret di source code.
- Production web/server: wajib diisi, minimal 32 karakter.
- Production Electron: dibuat otomatis saat first run dan disimpan di `userData/.auth-secret`.

Generate secret manual:

```bash
openssl rand -hex 48
```

### `DATABASE_URL`

Default development:

```env
DATABASE_URL=file:./data.db
```

Pada mode Electron packaged, `DATABASE_URL` otomatis diarahkan ke database di folder `userData` aplikasi.

## Pengembangan

### Mode Web

```bash
npm run dev
```

Akses aplikasi di:

```text
http://localhost:3000
```

### Mode Desktop Electron

```bash
npm run dev:electron
```

Command ini akan:

1. Compile TypeScript untuk Electron.
2. Menjalankan Next.js dev server di port 3000.
3. Membuka window Electron yang memuat `http://localhost:3000`.

### Typecheck

```bash
npm run typecheck
npm run typecheck:electron
```

### Lint

```bash
npm run lint
```

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

| Tipe Bisnis | Contoh Branding |
|-------------|-----------------|
| Agen BRILink | BRILink POS |
| Counter HP | Counter HP POS |
| Agen Pulsa | Agen Pulsa POS |
| Agen Pembayaran | Agen Bayar POS |
| Toko Kelontong | Toko POS |
| Lainnya | Branding custom |

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

## Auto-Update

Auto-update berjalan pada aplikasi Electron packaged melalui `electron-updater` dan GitHub Releases.

Alur umum:

1. Aplikasi cek update saat startup.
2. Jika ada versi baru di GitHub Releases, aplikasi mengunduh update.
3. User mendapat notifikasi update.
4. User dapat memilih install dan restart.

Setup release:

1. Update `version` di `package.json`.
2. Pastikan `publish` di `electron-builder.yml` mengarah ke repository yang benar.
3. Set `GH_TOKEN`.
4. Jalankan `npm run build:electron:publish`.

## Database

Database menggunakan SQLite/libSQL melalui Drizzle ORM.

### Lokasi Database

| Mode | Path |
|------|------|
| Development web | `./data.db` atau nilai `DATABASE_URL` |
| Production Electron | `userData/pos-brilink.db` |

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

| Area | Route |
|------|-------|
| Health | `/api/health` |
| Auth | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/setup`, `/api/auth/users` |
| Setup | `/api/setup/complete`, `/api/setup/templates` |
| Produk | `/api/products`, `/api/categories` |
| Layanan agen | `/api/service-categories`, `/api/brilink-services`, `/api/fee-tiers` |
| Transaksi | `/api/transactions`, `/api/transactions/[id]` |
| Rekening/kas | `/api/accounts`, `/api/accounts/mutations`, `/api/cash` |
| Dashboard | `/api/dashboard` |
| Settings | `/api/settings` |
| Hardware | `/api/hardware/printer` |
| Data utility | `/api/backup`, `/api/seed`, `/api/seed-demo` |

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

### Electron dev tidak membuka aplikasi

Pastikan port 3000 tidak dipakai aplikasi lain. Jalankan:

```bash
npm run dev:electron
```

Jika masih gagal, coba jalankan terpisah:

```bash
npm run dev
npm run compile:electron
npx electron .
```

### Next.js standalone server tidak ditemukan

Untuk build desktop, gunakan command resmi:

```bash
npm run build:electron
```

Jangan menjalankan `electron .` sebagai production build tanpa menjalankan build web/standalone terlebih dahulu.

### Port 43219 sudah dipakai

Aplikasi Electron production memakai port internal `43219`. Tutup aplikasi lain yang memakai port tersebut, lalu jalankan ulang aplikasi.

### Printer thermal tidak terdeteksi

1. Untuk network printer, pastikan komputer dan printer berada dalam jaringan yang sama.
2. Cek IP printer dan port, biasanya `9100`.
3. Untuk USB, pastikan driver printer terpasang di Windows.
4. Gunakan tombol Test Print di pengaturan printer.

### Login gagal atau lupa password admin

Jika masih development dan ingin reset total, hapus database development:

```bash
rm data.db
```

Untuk production Electron, backup dulu data penting sebelum menghapus database di folder `userData`.

### Auto-update tidak berjalan

1. Pastikan aplikasi adalah hasil build/publish, bukan dev mode.
2. Pastikan koneksi internet tersedia.
3. Pastikan GitHub Releases berisi artifact update yang valid.
4. Pastikan konfigurasi `publish` di `electron-builder.yml` benar.

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Menjalankan Next.js dev server |
| `npm run dev:web` | Alias mode web dev |
| `npm run dev:electron` | Menjalankan Electron + Next.js dev server |
| `npm run build` | Build Next.js |
| `npm run build:web` | Build Next.js standalone + post-build script |
| `npm run build:electron` | Build desktop Windows NSIS + portable |
| `npm run build:electron:portable` | Build desktop portable saja |
| `npm run build:electron:publish` | Build dan publish ke GitHub Releases |
| `npm run dist` | Alias build Electron |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check untuk web |
| `npm run typecheck:electron` | TypeScript check untuk Electron |
| `npm run compile:electron` | Compile Electron TypeScript dan copy preload |
| `npm test` | Menjalankan Vitest |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest dengan coverage |
| `npm run test:e2e` | Playwright E2E test |
| `npm run test:e2e:ui` | Playwright E2E UI mode |

## Struktur Project

```text
pos-and-brilink-application/
├── .github/workflows/        # CI workflow
├── drizzle/                  # Drizzle migrations dan metadata
├── e2e/                      # Playwright E2E tests
├── electron/                 # Electron main/preload/printer/updater
│   ├── main.ts
│   ├── preload.ts
│   ├── printer.ts
│   ├── updater.ts
│   └── db-path.ts
├── scripts/                  # Build helper scripts
├── src/
│   ├── app/                  # Next.js App Router dan API routes
│   ├── components/           # React components
│   ├── db/                   # Drizzle client dan schema
│   ├── lib/                  # Auth, utility, hardware hook, settings
│   └── types/                # Type declarations
├── tests/                    # Vitest tests
├── electron-builder.yml      # Konfigurasi desktop build
├── next.config.ts            # Konfigurasi Next.js
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.electron.json
└── vitest.config.ts
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
