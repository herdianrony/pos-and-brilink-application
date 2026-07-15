# Desktop Application — Electron

Dokumen ini menjelaskan mode desktop aplikasi POS & Agen Bisnis/BRILink POS berdasarkan konfigurasi project saat ini.

> **Konfigurasi saat ini:** package desktop memakai `productName: BRILink POS`, Electron `^43.1.0`, dan target build Windows x64. Dengan konfigurasi ini, target realistis adalah Windows 10/11 64-bit. Dokumentasi lama yang menyebut Electron 22, Windows 7/8, dan ia32 tidak sesuai dengan konfigurasi saat ini.

## Ringkasan Arsitektur

```text
Electron Main Process (electron/main.ts)
  ├─ DEV: load Next.js dev server di http://localhost:3000
  ├─ PRODUCTION: spawn Next.js standalone server
  │    └─ http://127.0.0.1:43219
  ├─ Database: userData/pos-brilink.db
  ├─ AUTH_SECRET: auto-generate di userData/.auth-secret saat packaged
  ├─ Printer thermal: node-thermal-printer + IPC
  ├─ Auto-update: electron-updater + GitHub Releases
  └─ Window, security policy, single instance lock
```

## Batasan Modul Layanan Agen

Modul layanan agen pada aplikasi desktop ini bersifat **pencatatan lokal/offline-first**. Modul tersebut tidak menjalankan transaksi perbankan sungguhan.

Yang dilakukan aplikasi:

- Mencatat transaksi layanan agen ke database lokal.
- Menghitung nominal, admin fee, agent fee, profit, dan total transaksi.
- Mengubah saldo internal kas/rekening yang dicatat di aplikasi.
- Membuat mutasi rekening internal.
- Menyediakan riwayat, laporan, dan struk.

Yang tidak dilakukan aplikasi:

- Tidak melakukan transfer bank otomatis.
- Tidak mengirim instruksi transaksi ke API bank, BRILink, PPOB, QRIS, e-wallet, atau payment gateway.
- Tidak validasi rekening/tagihan secara online.
- Tidak membaca saldo real-time dari bank.
- Tidak melakukan settlement otomatis.

Transaksi aktual tetap dilakukan operator melalui kanal resmi seperti mobile banking, EDC, aplikasi BRILink/PPOB, atau sistem resmi lain, kemudian dicatat di aplikasi ini.

## File Penting

| File | Fungsi |
|------|--------|
| `electron/main.ts` | Main process, window, server Next.js, CSP, single instance, IPC update |
| `electron/preload.ts` | Bridge aman antara renderer dan Electron API |
| `electron/printer.ts` | Integrasi printer thermal ESC/POS |
| `electron/updater.ts` | Auto-update via `electron-updater` |
| `electron/db-path.ts` | Resolver path database Electron |
| `electron-builder.yml` | Konfigurasi packaging desktop |
| `scripts/after-pack.js` | Hook setelah packaging untuk copy Next.js standalone |
| `scripts/copy-preload.js` | Copy preload hasil compile |
| `scripts/post-build.js` | Post-build helper untuk output Next.js |

## Mode Development

Jalankan:

```bash
npm run dev:electron
```

Script ini menjalankan:

1. `npm run compile:electron`
2. `next dev` di port `3000`
3. `wait-on http://localhost:3000`
4. `electron .`

Pada mode ini:

- Electron membaca `ELECTRON_DEV=1`.
- Window Electron memuat `http://localhost:3000`.
- Hot reload dari Next.js tetap aktif.
- Database default mengikuti `DATABASE_URL` atau `file:./data.db`.

Jika ingin menjalankan manual:

```bash
npm run compile:electron
npm run dev
npx electron .
```

## Mode Production Packaged

Pada aplikasi hasil build:

1. Electron mencari Next.js standalone server di folder resources.
2. Electron menjalankan server dengan `ELECTRON_RUN_AS_NODE=1`.
3. Server Next.js berjalan di:

```text
http://127.0.0.1:43219
```

4. BrowserWindow memuat URL lokal tersebut.
5. Database diarahkan ke:

```text
userData/pos-brilink.db
```

6. Log server ditulis ke:

```text
userData/logs/next-server.log
```

## Build Desktop

### Build Installer + Portable

```bash
npm run build:electron
```

Pipeline:

```text
npm run build:web
  └─ next build && node scripts/post-build.js
npm run compile:electron
  └─ tsc -p tsconfig.electron.json && node scripts/copy-preload.js
electron-builder --win
```

### Build Portable Saja

```bash
npm run build:electron:portable
```

### Publish Release

```bash
set GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npm run build:electron:publish
```

Linux/macOS:

```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npm run build:electron:publish
```

## Target Build Saat Ini

Konfigurasi `electron-builder.yml` saat ini:

```yml
productName: BRILink POS
win:
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
```

Artinya:

| Target | Arch | Status |
|--------|------|--------|
| NSIS installer | x64 | Aktif |
| Portable | x64 | Aktif |
| ia32/32-bit | ia32 | Tidak aktif |
| Windows 7/8 compatibility | - | Tidak diklaim untuk konfigurasi saat ini |

Output folder:

```text
dist-electron/
```

Nama artifact mengikuti `electron-builder` dan konfigurasi artifact. Portable dikonfigurasi sebagai:

```text
BRILink POS-Portable-<version>.exe
```

## Database Path

Resolver database berada di `electron/db-path.ts`.

| Mode | Database |
|------|----------|
| Development | `DATABASE_URL` atau `file:./data.db` |
| Production Electron | `file:<userData>/pos-brilink.db` |

Pada Windows, folder `userData` biasanya berada di `%APPDATA%/<nama aplikasi>`. Karena `productName` saat ini adalah `BRILink POS`, folder umumnya adalah:

```text
%APPDATA%/BRILink POS/
```

File yang relevan:

```text
%APPDATA%/BRILink POS/pos-brilink.db
%APPDATA%/BRILink POS/.auth-secret
%APPDATA%/BRILink POS/logs/next-server.log
%APPDATA%/BRILink POS/printer-config.json
```

> Lokasi aktual dapat berbeda tergantung OS dan metadata aplikasi.

## AUTH_SECRET di Electron

Pada production Electron:

- `AUTH_SECRET` dibuat otomatis saat first run.
- Secret disimpan di `userData/.auth-secret`.
- Jika file sudah ada dan valid, secret lama dipakai ulang.
- Jika gagal disimpan, aplikasi membuat secret per proses sebagai fallback, tetapi session dapat reset setelah restart.

Untuk production web/server non-Electron, `AUTH_SECRET` wajib disediakan lewat environment variable.

## Printer Thermal

Printer thermal diintegrasikan melalui:

```text
electron/printer.ts
src/app/api/hardware/printer/route.ts
src/components/PrinterSettings.tsx
```

Koneksi yang didukung:

- Network/LAN/WiFi.
- USB direct, tergantung driver.
- Serial/COM.

Konfigurasi printer disimpan di:

```text
userData/printer-config.json
```

Gunakan menu berikut di aplikasi:

```text
Pengaturan → Printer Thermal
```

## Barcode Scanner

Barcode scanner didukung melalui pola keyboard wedge. Scanner USB HID biasanya bertindak seperti keyboard yang mengetik barcode dan menekan Enter.

Hook tersedia di:

```text
src/lib/hardware/use-barcode-scanner.ts
```

Contoh:

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

Auto-update memakai:

```text
electron-updater
```

Konfigurasi publish di `electron-builder.yml`:

```yml
publish:
  provider: github
  owner: herdianrony
  repo: pos-and-brilink-application
  releaseType: release
```

Alur release:

1. Update `version` di `package.json`.
2. Pastikan repository dan token GitHub benar.
3. Jalankan:

```bash
npm run build:electron:publish
```

4. Artifact dan metadata update diunggah ke GitHub Releases.
5. Aplikasi installed dapat mengecek dan mengunduh update.

## Security Notes

Konfigurasi penting di `electron/main.ts`:

- `contextIsolation: true`.
- `nodeIntegration: false`.
- Preload expose API via contextBridge.
- Single instance lock.
- Production server bind ke `127.0.0.1`, bukan `0.0.0.0`.
- Production window hanya mengizinkan koneksi ke port internal yang ditentukan.
- External URL dibuka melalui shell, bukan langsung di dalam app tanpa kontrol.

## Troubleshooting

### Next.js standalone server tidak ditemukan

Pastikan build desktop dijalankan melalui:

```bash
npm run build:electron
```

Jangan menjalankan build Electron tanpa `npm run build:web` karena server standalone dibutuhkan untuk production.

### Electron dev gagal connect ke localhost:3000

Pastikan Next.js dev server hidup:

```bash
npm run dev
```

Lalu jalankan Electron manual:

```bash
npm run compile:electron
npx electron .
```

### Port 43219 sudah dipakai

Production Electron memakai port internal `43219`. Tutup proses yang memakai port tersebut lalu jalankan ulang aplikasi.

### Aplikasi blank atau gagal load

Cek log:

```text
userData/logs/next-server.log
```

Penyebab umum:

- File standalone tidak ikut terbundle.
- Port internal dipakai aplikasi lain.
- Antivirus memblokir eksekusi.
- Database tidak bisa dibuat/ditulis.
- Module runtime tidak ditemukan.

### Printer tidak terdeteksi

1. Untuk network printer, pastikan IP dan port benar.
2. Coba port `9100` atau `9101`.
3. Untuk USB, pastikan driver terinstall.
4. Jalankan Test Print dari menu pengaturan.

### Auto-update tidak bekerja

1. Pastikan aplikasi berjalan sebagai packaged app, bukan dev mode.
2. Pastikan koneksi ke GitHub tidak diblokir firewall.
3. Pastikan GitHub Release memiliki file update yang lengkap.
4. Pastikan `publish.owner` dan `publish.repo` benar.
5. Pastikan version baru lebih tinggi dari version terinstall.

## Catatan Konsistensi Nama

Kode/UI banyak memakai nama default **POS & Agen Bisnis**, sedangkan konfigurasi desktop saat ini memakai `productName: BRILink POS`. Jika ingin branding konsisten, samakan nilai berikut:

- `electron-builder.yml` → `productName`, `shortcutName`, `appId` jika perlu.
- `src/app/layout.tsx` → metadata title.
- Default setting/seed di API setup.
- Teks di komponen UI.
- Dokumentasi release dan nama artifact.

Dokumen ini tidak mengubah konfigurasi aplikasi; hanya menjelaskan kondisi project saat ini.
