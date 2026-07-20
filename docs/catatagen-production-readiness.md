# CatatAgen Local — Production Readiness Checklist

Dokumen ini menjadi checklist sebelum Tauri dijadikan jalur utama menggantikan Electron.

## Status Saat Ini

Status Tauri saat ini: **alpha menuju beta lokal**.

Electron tetap jalur production sampai checklist berikut lolos di Windows.

## Wajib Lolos Sebelum Production

### Build & Installer

- [ ] `npm run dev:tauri` stabil di Windows 10/11.
- [ ] `npm run build:tauri` berhasil.
- [ ] Installer NSIS x64 berhasil dibuat.
- [ ] Installer bisa install/uninstall bersih.
- [ ] App bisa dibuka setelah install tanpa Node.js.
- [ ] Database dibuat di app data folder yang benar.

### Data & Ledger

- [ ] POS tunai menambah Kas Tunai.
- [ ] POS transfer menambah rekening penerima.
- [ ] POS QRIS menambah rekening penerima.
- [ ] Stok berkurang sesuai quantity.
- [ ] Mutasi saldo tercatat untuk semua perubahan saldo.
- [ ] Saldo tidak bisa minus jika tidak diizinkan.
- [ ] Backup database berhasil.
- [ ] Restore database berhasil.
- [ ] Backup otomatis sebelum restore berhasil.

### Kasir

- [ ] Kasir bisa login.
- [ ] Kasir hanya melihat menu operasional.
- [ ] Kasir tidak melihat HPP/profit/laporan admin.
- [ ] Kasir bisa checkout POS.
- [ ] Kasir bisa mencatat layanan agen.
- [ ] Kasir bisa mencatat utang.

### Owner/Admin

- [ ] Admin bisa mengelola produk.
- [ ] Admin bisa mengelola kategori.
- [ ] Admin bisa mengelola rekening/saldo.
- [ ] Admin bisa membuat user kasir.
- [ ] Admin bisa melihat laporan.
- [ ] Admin bisa export CSV.
- [ ] Admin bisa melihat log aktivitas.

### Struk & Printer

- [ ] Modal struk muncul setelah checkout.
- [ ] Print struk via WebView/system print berjalan.
- [ ] Printer thermal Windows terdeteksi melalui system print.
- [ ] Ukuran 80mm terbaca baik.
- [ ] Print ulang dari riwayat transaksi tersedia.

### UI/UX

- [ ] Dashboard mudah dipahami pengguna baru.
- [ ] POS layout katalog kiri + keranjang kanan jelas.
- [ ] Layanan Agen memakai alur pilih layanan → nominal → efek saldo → review.
- [ ] Produk/Kategori memakai modal dialog.
- [ ] Kas & Saldo memakai kartu + modal aksi.
- [ ] Buku Utang mudah dipakai untuk catat dan bayar utang.
- [ ] Semua input uang memakai format Rupiah.
- [ ] Semua icon memakai Lucide, bukan emoji.

### Observability

- [ ] Aktivitas penting masuk Log Aktivitas.
- [ ] Error user-facing jelas dan bahasa sederhana.
- [ ] Log teknis bisa membantu support.

## Plugin Tauri

Plugin yang sudah dipakai:

- `tauri-plugin-dialog`
- `tauri-plugin-fs`
- `tauri-plugin-log`
- `tauri-plugin-opener`
- `tauri-plugin-single-instance`
- `tauri-plugin-window-state`

Plugin yang disarankan sebelum production final:

- `tauri-plugin-store` untuk preferensi printer/struk/UI.
- `tauri-plugin-os` untuk diagnosa perangkat.
- `tauri-plugin-notification` untuk notifikasi lokal.

Plugin yang ditunda sampai release/sync SaaS:

- `tauri-plugin-updater`
- `tauri-plugin-http`
- `tauri-plugin-stronghold`
- `tauri-plugin-websocket`

## Keputusan Rilis

Tauri boleh menjadi jalur utama CatatAgen jika:

1. installer Windows berhasil,
2. alur kasir lolos tes manual,
3. backup/restore lolos tes manual,
4. print struk lolos tes printer nyata,
5. role admin/kasir aman,
6. tidak ada crash/blocker selama uji operasional.
