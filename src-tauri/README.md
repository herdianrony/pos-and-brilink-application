# src-tauri — Eksperimen Tauri Full

Folder ini disiapkan untuk eksperimen Tauri full.

Target eksperimen:

```txt
React UI static + Rust/Tauri commands + SQLite lokal
Tanpa Next.js server lokal
Tanpa Electron
Tanpa Node.js runtime saat dipakai user
Fresh install, tidak perlu migrasi data Electron
```

Status saat ini: **dokumen/scaffold awal saja**.

## Prinsip

- Tauri full adalah varian baru, bukan pengganti langsung Electron `v1.0.0`.
- Database mulai dari kosong / Setup Wizard baru.
- Fitur diusahakan hampir sama, tetapi data lama Electron tidak wajib dibawa.
- WhatsApp otomatis ditunda; mode awal cukup salin/buka pesan manual.
- Printer awal cukup system print / network print.

## Tahap berikutnya

1. Install Rust toolchain.
2. Inisialisasi Tauri v2.
3. Tambahkan plugin minimum:
   - SQL / Rust SQLite,
   - FS,
   - Dialog,
   - Log,
   - Opener,
   - Single Instance,
   - Window State.
4. Buat command Rust pertama:
   - `health_check`,
   - `db_init`,
   - `auth_login`.
5. Buat frontend adapter agar UI bisa memilih backend:
   - Electron/Next fetch untuk main branch,
   - Tauri invoke untuk eksperimen.

Jangan merge eksperimen ini ke main sebelum POC stabil.
