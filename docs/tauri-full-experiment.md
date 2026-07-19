# Eksperimen Tauri Full — Tanpa Next Server

Dokumen ini mendefinisikan arah eksperimen **Tauri Full** untuk varian desktop ringan aplikasi POS & Agen Bisnis/BRILink POS.

> Status: eksperimen terpisah dari rilis Electron `v1.0.0`. Jangan mengganti jalur Electron production sampai POC Tauri terbukti stabil di perangkat target.

---

## 1. Keputusan Produk

Eksperimen Tauri full **tidak wajib migrasi data** dari versi Electron.

Artinya Tauri boleh mulai sebagai aplikasi baru/fresh install dengan database kosong dan Setup Wizard baru. Target utamanya adalah fitur yang hampir sama dengan versi awal, bukan kompatibilitas data lama.

Konsekuensi:

- tidak perlu membaca `%APPDATA%/BRILink POS/pos-brilink.db`,
- tidak perlu migrasi otomatis dari schema Electron,
- tidak perlu menjaga path data Electron,
- boleh memakai schema SQLite baru yang lebih rapi,
- import/migrasi data dapat menjadi fitur opsional di masa depan.

Nama kerja yang disarankan:

```txt
BRILink POS Lite / Tauri Edition
```

---

## 2. Tujuan

Eksperimen ini bertujuan membuat varian desktop yang lebih ringan untuk perangkat lama, termasuk kemungkinan dukungan:

- Windows 10/11 64-bit,
- Windows 7 32-bit/64-bit jika WebView2 dan dependency memungkinkan,
- PC lama seperti Core 2 Duo.

Target penting:

```txt
Tidak menjalankan Next.js server lokal.
Tidak membutuhkan Node.js runtime saat aplikasi dipakai user.
Frontend static + backend Rust/Tauri command + SQLite lokal.
```

---

## 3. Prinsip Arsitektur

Arsitektur target:

```txt
React UI static
  ↓ invoke()
Tauri commands (Rust)
  ↓
SQLite lokal
```

Yang tidak dipakai di runtime Tauri full:

```txt
Next.js API Routes
Next.js standalone server
Electron IPC
Node.js server lokal
```

Yang tetap dipertahankan secara konsep:

- model data POS,
- flow layanan agen,
- ledger/mutasi saldo,
- void/reverse,
- laporan,
- backup,
- role admin/kasir,
- offline-first.

---

## 4. Plugin Tauri yang Dibutuhkan

Berdasarkan daftar plugin resmi Tauri v2, kandidat plugin:

| Kebutuhan | Plugin Tauri | Catatan |
|---|---|---|
| SQLite | `tauri-plugin-sql` atau Rust `sqlx/rusqlite` langsung | Untuk POC serius, backend Rust command dengan `sqlx/rusqlite` lebih aman untuk validasi bisnis. |
| File backup/export/import | `tauri-plugin-fs` | Untuk simpan/ambil backup, export CSV/PDF jika perlu. |
| Dialog file save/open | `tauri-plugin-dialog` | Untuk Save PDF, Open backup, Save CSV. |
| Buka URL/file eksternal | `tauri-plugin-opener` | Untuk Sociabuzz, GitHub, file PDF hasil export. |
| Log aplikasi | `tauri-plugin-log` | Pengganti log Electron/Next server. |
| Auto-update | `tauri-plugin-updater` | Pengganti `electron-updater`. Ditunda setelah POC stabil. |
| Single instance | `tauri-plugin-single-instance` | Mencegah aplikasi dibuka ganda. |
| Window state | `tauri-plugin-window-state` | Simpan ukuran/posisi window. |
| OS info | `tauri-plugin-os` | Untuk diagnosis perangkat dan log support. |
| Shell/process | `tauri-plugin-shell` / process | Hanya jika perlu printer/WhatsApp sidecar; harus dibatasi ketat. |
| Store key-value | `tauri-plugin-store` | Untuk config ringan non-rahasia. |
| Secure storage | `tauri-plugin-stronghold` | Kandidat untuk token/license/secret. Ditunda. |
| HTTP client | `tauri-plugin-http` | Untuk license/sync cloud di masa depan. |
| Clipboard | plugin clipboard | Untuk salin pesan WhatsApp manual / laporan. |

Catatan: nama paket final perlu dicek saat implementasi karena beberapa plugin memiliki nama crate/npm berbeda.

---

## 5. Fitur Target Agar Mirip Electron v1.0.0

### Wajib untuk disebut “hampir sama”

- Setup Wizard.
- Login admin/kasir.
- POS produk, cart, diskon, pembayaran tunai/transfer/QRIS.
- Produk dan kategori.
- Kas & Saldo: transfer, sesuaikan, ambil profit, biaya bank.
- Layanan agen dasar: tarik tunai, setor tunai, transfer, pembayaran/topup.
- Riwayat transaksi, pending/completed, void/reverse.
- Dashboard tanpa profit untuk kasir.
- Rekening koran.
- Laporan POS.
- Export CSV/PDF.
- Backup/restore database.
- Log aplikasi.

### Boleh berbeda dari Electron awal

- WhatsApp otomatis boleh diganti mode manual.
- Printer awal boleh system print / network printer dulu.
- Auto-update boleh ditunda.
- Tidak perlu migrasi data Electron.
- Tidak perlu Web/LAN server mode di POC awal.

---

## 6. Fitur yang Diprioritaskan di POC

### POC 1 — Shell + Database + Login

Target:

- Tauri window terbuka.
- Frontend static tampil.
- SQLite database baru dibuat di app data folder.
- Schema awal dibuat dari nol.
- Setup Wizard minimal.
- Login admin/kasir lokal berjalan.
- Settings dasar terbaca.

Belum termasuk:

- printer,
- WhatsApp,
- auto-update,
- layanan agen lengkap.

### POC 2 — POS Basic

Target:

- Produk/kategori.
- Keranjang.
- Checkout tunai.
- Checkout transfer/QRIS dengan akun penerima.
- Stok berkurang.
- Mutasi kas/rekening tercatat.
- Riwayat transaksi POS.

### POC 3 — Kas & Saldo

Target:

- Multi akun.
- Mutasi saldo.
- Transfer antar akun.
- Sesuaikan saldo.
- Ambil profit owner.
- Biaya bank/MDR QRIS.

### POC 4 — Layanan Agen Basic

Target:

- Layanan agen dinamis.
- Tarik tunai.
- Setor tunai.
- Transfer tunai.
- Flow kas/bank sama seperti Electron.

### POC 5 — Laporan

Target:

- Dashboard ringan.
- Rekening koran.
- Laporan POS.
- Export CSV/PDF.

---

## 7. Fitur yang Ditunda

Untuk eksperimen awal, fitur berikut ditunda agar POC tidak terlalu besar:

- WhatsApp otomatis,
- printer USB/serial kompleks,
- auto-update production,
- license online,
- cloud sync,
- multi-tenant,
- import Excel,
- full dynamic RBAC.

WhatsApp di Tauri full sebaiknya dimulai dari mode manual:

```txt
Buat pesan → Salin pesan / buka wa.me
```

bukan langsung otomasi WhatsApp Web.

---

## 8. Windows 7 / 32-bit Strategy

Dokumentasi Tauri menyebut Windows 7 dan target 32-bit memungkinkan dengan catatan:

- build 32-bit memakai `i686-pc-windows-msvc`,
- WebView2 perlu tersedia,
- MSI bisa bermasalah di Windows 7 jika perlu download WebView2 bootstrapper,
- NSIS lebih realistis,
- untuk offline lebih aman memakai WebView2 `offlineInstaller` atau `fixedVersion`.

Target eksperimen:

```bash
rustup target add i686-pc-windows-msvc
npm run tauri build -- --target i686-pc-windows-msvc
```

Namun dukungan Windows 7 32-bit baru boleh diklaim jika sudah dites langsung di mesin/VM Windows 7 32-bit.

---

## 9. Data Model Tauri Fresh Install

Karena tidak perlu migrasi, schema Tauri boleh dibuat lebih rapi tetapi tetap mirip konsep Electron.

Prinsip:

- transaksi tetap append-only sebisa mungkin,
- saldo dihitung dan dicatat lewat mutasi,
- void/reverse membuat counter mutation,
- profit disembunyikan untuk kasir,
- semua perubahan saldo wajib punya catatan/mutasi,
- UUID dapat dipakai untuk ID publik walau SQLite tetap punya integer id lokal.

Minimal tabel POC:

```txt
users
settings
product_categories
products
accounts
account_mutations
transactions
transaction_items
service_categories
agent_services
fee_tiers
transaction_events
app_logs
```

---

## 10. Tidak Ada Migration Plan dari Electron

Untuk eksperimen ini, migration plan dari Electron **dihapus dari scope awal**.

Data Electron tetap aman di aplikasi Electron. Tauri full dimulai dari database baru.

Jika suatu saat migration/import dibutuhkan, buat fitur terpisah:

```txt
Import dari backup Electron
```

Tetapi tidak menjadi syarat POC.

---

## 11. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Rewrite backend besar | Lama dan rawan bug | POC bertahap, jangan ganggu Electron main. |
| Windows 7 WebView2 gagal | Tauri Lite tidak jalan di target lama | Test VM/perangkat asli sedini mungkin. |
| Printer berbeda | Fitur kasir terganggu | Mulai dari system print/network printer. |
| WhatsApp sulit | Notifikasi tidak otomatis | Mode manual dulu. |
| Schema baru berbeda | Fitur belum parity | Feature parity checklist wajib. |
| Perbedaan logika transaksi | Laporan/saldo salah | Port test bisnis ke Rust/command tests. |

---

## 12. Definition of Done POC Awal

POC awal dianggap berhasil jika:

- build Tauri x64 berhasil,
- app terbuka tanpa Next server,
- Setup Wizard berjalan,
- login admin berhasil,
- POS tunai berhasil membuat transaksi,
- stok berkurang,
- kas bertambah,
- riwayat menampilkan transaksi,
- database lokal SQLite dibuat baru,
- ukuran aplikasi dan RAM lebih rendah dari Electron.

POC Windows 7/32-bit dianggap berhasil jika:

- installer NSIS i686 berhasil dibuat,
- WebView2 terpasang/jalan,
- setup + login + POS tunai berjalan di Windows 7 32-bit asli/VM.

---

## 13. Rekomendasi Eksekusi

- Branch: `experiment/tauri-full`
- Jangan merge ke `main` sebelum POC stabil.
- Electron tetap jalur production `v1.0.0`.
- Tauri dianggap calon `BRILink POS Lite` atau `v2.0`.

Langkah berikut:

1. Install Rust + Visual Studio Build Tools.
2. Inisialisasi Tauri v2.
3. Buat frontend static minimal.
4. Buat command `health_check`.
5. Buat database SQLite baru.
6. Port Setup Wizard + login.
