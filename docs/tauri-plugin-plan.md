# Tauri Plugin Plan — CatatAgen Local

Dokumen ini mencatat plugin Tauri v2 yang sudah dipakai, yang belum perlu, dan yang disarankan untuk fase production.

## Sudah dipakai saat ini

| Plugin / Pendekatan | Status | Kegunaan |
|---|---:|---|
| `tauri-plugin-dialog` | Sudah | Fondasi dialog file/open/save untuk backup/restore/export berikutnya. |
| `tauri-plugin-fs` | Sudah | Fondasi akses file untuk backup/restore/export berikutnya. |
| `tauri-plugin-log` | Sudah | Logging aplikasi Tauri. Panel log belum dibuat. |
| `tauri-plugin-opener` | Sudah | Buka file/URL eksternal di fase berikutnya. |
| `tauri-plugin-single-instance` | Sudah | Mencegah aplikasi dibuka ganda. |
| `tauri-plugin-window-state` | Sudah | Simpan ukuran/posisi window. |
| `rusqlite` langsung | Sudah | Database SQLite lokal. Tidak memakai `tauri-plugin-sql` karena logika bisnis divalidasi di Rust command. |

## Belum dipasang karena belum wajib untuk MVP lokal

| Plugin | Status | Alasan |
|---|---:|---|
| `tauri-plugin-sql` | Tidak dipakai | Tidak diperlukan karena backend memakai `rusqlite` langsung. Ini lebih cocok untuk validasi ledger dan transaksi di Rust. |
| `tauri-plugin-updater` | Ditunda | Baru dipasang setelah installer/release channel stabil. |
| `tauri-plugin-os` | Disarankan nanti | Untuk halaman diagnosa perangkat/support. |
| `tauri-plugin-notification` | Disarankan nanti | Untuk notifikasi lokal: stok rendah, backup berhasil, reminder. |
| Clipboard plugin | Opsional | Saat ini memakai `navigator.clipboard` untuk salin reminder/ringkasan. Jika WebView bermasalah, ganti ke plugin clipboard. |
| `tauri-plugin-store` | Disarankan nanti | Untuk preferensi ringan: printer default, ukuran struk, preferensi UI. |
| `tauri-plugin-stronghold` | Ditunda | Untuk menyimpan secret/token jika nanti ada sync SaaS/license. |
| `tauri-plugin-http` | Ditunda | Untuk future SaaS sync, subscription guard, license, atau update metadata. |
| `tauri-plugin-shell` / process | Ditunda ketat | Hanya jika perlu integrasi printer/sidecar. Jangan dipakai tanpa kebutuhan jelas. |
| `tauri-plugin-autostart` | Tidak perlu sekarang | CatatAgen tidak perlu auto-start pada MVP. |
| `tauri-plugin-websocket` | Ditunda | Untuk future realtime/sync jika multi-tenant SaaS dibangun. |

## Rekomendasi fase berikutnya

### Fase MVP Local Final

Tambahkan bila diperlukan:

1. `tauri-plugin-notification`
2. `tauri-plugin-os`
3. `tauri-plugin-store`

Tetap pakai:

- `rusqlite` langsung untuk database,
- `dialog` + `fs` untuk backup/restore,
- `opener` untuk membuka file export.

### Fase Release Production

Tambahkan:

1. `tauri-plugin-updater`
2. strategi NSIS installer final,
3. WebView2 offline/fixed runtime strategy jika target perangkat lama.

### Fase Future SaaS / Multi-Tenant

Tambahkan sesuai kebutuhan:

1. `tauri-plugin-http`
2. `tauri-plugin-stronghold`
3. `tauri-plugin-websocket` bila perlu realtime,
4. subscription guard dan tenant sync di backend SaaS, bukan di local-only database.

## Kesimpulan

Belum semua plugin dari daftar Tauri perlu dipakai. Untuk CatatAgen Local, pendekatan terbaik adalah **minimal plugin, maksimal stabilitas**. Plugin ditambahkan hanya saat fitur membutuhkan akses native tertentu.
