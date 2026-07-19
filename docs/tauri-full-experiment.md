# Eksperimen Tauri Full — Tanpa Next Server

Dokumen ini mendefinisikan arah eksperimen **Tauri Full** untuk varian desktop ringan aplikasi POS & Agen Bisnis/BRILink POS.

> Status: eksperimen terpisah dari rilis Electron `v1.0.0`. Jangan mengganti jalur Electron production sampai POC Tauri terbukti stabil di perangkat target.

---

## 1. Tujuan

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

## 2. Prinsip Arsitektur

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

## 3. Plugin Tauri yang Dibutuhkan

Berdasarkan daftar plugin resmi Tauri v2, kandidat plugin:

| Kebutuhan | Plugin Tauri | Catatan |
|---|---|---|
| SQLite | `tauri-plugin-sql` | Untuk akses SQLite via `sqlx`. Perlu evaluasi migrasi dari Drizzle/SQLite schema saat ini. |
| File backup/export/import | `tauri-plugin-fs` | Untuk simpan/ambil backup, export CSV/PDF jika perlu. |
| Dialog file save/open | `tauri-plugin-dialog` | Untuk Save PDF, Open backup, Save CSV. |
| Buka URL/file eksternal | `tauri-plugin-opener` | Untuk Sociabuzz, GitHub, file PDF hasil export. |
| Log aplikasi | `tauri-plugin-log` | Pengganti log Electron/Next server. |
| Auto-update | `tauri-plugin-updater` | Pengganti `electron-updater`. Perlu signing/update metadata Tauri. |
| Single instance | `tauri-plugin-single-instance` | Mencegah aplikasi dibuka ganda. |
| Window state | `tauri-plugin-window-state` | Simpan ukuran/posisi window. |
| OS info | `tauri-plugin-os` | Untuk diagnosis perangkat dan log support. |
| Shell/process | `tauri-plugin-shell` / `process` | Untuk eksperimen printer/WhatsApp sidecar bila diperlukan. Harus dibatasi ketat. |
| Store key-value | `tauri-plugin-store` | Untuk config ringan non-rahasia. |
| Secure storage | `tauri-plugin-stronghold` | Kandidat untuk token/license/secret. Evaluasi kompleksitas. |
| HTTP client | `tauri-plugin-http` | Untuk update, license, atau sync cloud di masa depan. |
| Clipboard | `tauri-plugin-clipboard-manager` | Untuk salin pesan WhatsApp manual / laporan. |
| Global shortcut | `tauri-plugin-global-shortcut` | Opsional untuk shortcut global kasir. |

Catatan: nama paket final perlu dicek saat implementasi karena beberapa plugin memiliki nama crate/npm berbeda.

---

## 4. Fitur yang Diprioritaskan di POC

### POC 1 — Shell + Database + Login

Target:

- Tauri window terbuka.
- Frontend static tampil.
- SQLite database dibuat di app data folder.
- Migrasi schema minimal.
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
- Stok berkurang.
- Mutasi kas tercatat.
- Riwayat transaksi POS.

### POC 3 — Kas & Saldo

Target:

- Multi akun.
- Mutasi saldo.
- Transfer antar akun.
- Sesuaikan saldo.
- Ambil profit owner.
- Biaya bank.

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

## 5. Fitur yang Ditunda

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

## 6. Windows 7 / 32-bit Strategy

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

## 7. Data Model Tauri

Untuk POC, schema SQLite mengikuti schema saat ini semirip mungkin agar migrasi data dari Electron lebih mudah.

Prinsip:

- transaksi tetap append-only sebisa mungkin,
- saldo dihitung dan dicatat lewat mutasi,
- void/reverse membuat counter mutation,
- profit disembunyikan untuk kasir,
- semua perubahan saldo wajib punya catatan/mutasi.

---

## 8. Migration Plan dari Electron

Database Electron saat ini:

```txt
%APPDATA%/BRILink POS/pos-brilink.db
```

Tauri harus bisa membaca/migrasi database lama. Rencana:

1. Deteksi database Electron lama.
2. Backup otomatis sebelum migrasi.
3. Jalankan migration Rust.
4. Simpan database Tauri di app data folder baru atau reuse path lama.
5. Tampilkan hasil migrasi ke user.

---

## 9. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Rewrite backend besar | Lama dan rawan bug | POC bertahap, jangan ganggu Electron main. |
| Windows 7 WebView2 gagal | Tauri Lite tidak jalan di target lama | Test VM/perangkat asli sedini mungkin. |
| Printer berbeda | Fitur kasir terganggu | Mulai dari printer network/system print. |
| WhatsApp sulit | Notifikasi tidak otomatis | Mode manual dulu. |
| SQLite migration | Data user berisiko | Backup otomatis sebelum migrasi. |
| Perbedaan logika transaksi | Laporan/saldo salah | Port test bisnis ke Rust/command tests. |

---

## 10. Definition of Done POC Awal

POC awal dianggap berhasil jika:

- build Tauri x64 berhasil,
- app terbuka tanpa Next server,
- login admin berhasil,
- POS tunai berhasil membuat transaksi,
- stok berkurang,
- kas bertambah,
- riwayat menampilkan transaksi,
- database tetap lokal SQLite,
- ukuran aplikasi dan RAM lebih rendah dari Electron.

POC Windows 7/32-bit dianggap berhasil jika:

- installer NSIS i686 berhasil dibuat,
- WebView2 terpasang/jalan,
- login + POS tunai berjalan di Windows 7 32-bit asli/VM.

---

## 11. Rekomendasi Eksekusi

- Branch: `experiment/tauri-full`
- Jangan merge ke `main` sebelum POC stabil.
- Electron tetap jalur production `v1.0.0`.
- Tauri dianggap calon `BRILink POS Lite` atau `v2.0`.
