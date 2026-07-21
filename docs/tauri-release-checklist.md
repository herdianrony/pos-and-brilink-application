# CatatAgen Local / Tauri Release Checklist

Status terakhir: branch `experiment/tauri-full` sudah berhasil dijalankan dan dibuild di Windows dengan:

```bat
npm run dev:tauri
npm run build:tauri
```

## 1. Validasi build Windows

- [x] `npm run dev:tauri` berhasil di Windows.
- [x] `npm run build:tauri` berhasil di Windows.
- [x] Rust compile berhasil di Windows.
- [x] Vite/Tauri UI build berhasil.
- [ ] Installer hasil build diinstall di mesin bersih.
- [ ] Uninstall/reinstall diverifikasi.
- [ ] App data path diverifikasi tidak hilang saat update.

## 2. Validasi flow utama

- [x] Setup admin pertama.
- [x] Login/logout dengan session backend.
- [x] Guard command Tauri untuk user login.
- [x] Guard command admin untuk fitur sensitif.
- [x] POS produk retail.
- [x] Modal pembayaran Tunai/Transfer/QRIS.
- [x] Kembalian tunai.
- [x] Layanan agen masuk ke transaksi POS.
- [x] Struk gabungan produk + layanan.
- [x] Kas & saldo.
- [x] Rekening koran.
- [x] Buku utang.
- [x] Laporan.
- [x] Pengaturan user, data, backup, info, aktivitas.
- [ ] Stress test 50-100 transaksi.
- [ ] Test restore backup setelah banyak transaksi.

## 3. Validasi data dan keuangan

- [x] SQLite WAL + foreign keys.
- [x] Checkout POS memakai transaction.
- [x] Transfer saldo memakai transaction.
- [x] Pembayaran utang memakai transaction.
- [x] Backup/restore punya path traversal protection.
- [ ] Migrasi uang dari `f64` ke `i64` Rupiah untuk production-grade accounting.
- [ ] Void/refund/reversal transaksi.
- [ ] Rekonsiliasi saldo kas/rekening setelah restore.

## 4. Printer dan struk

- [x] Fallback `window.print()`.
- [ ] Native thermal printer ESC/POS.
- [ ] Simpan konfigurasi printer default.
- [ ] Test printer 58mm dan 80mm.
- [ ] Test fallback print jika printer native gagal.

## 5. E2E dan QA

- [x] Unit test existing lolos: 23 file / 401 tests.
- [x] E2E Tauri smoke tests disesuaikan dengan UI terbaru.
- [ ] Jalankan `npx playwright install chromium` di Windows.
- [ ] Jalankan `npm run test:e2e:tauri` di Windows.
- [ ] Tambah E2E backup/restore.
- [ ] Tambah E2E role kasir vs admin.

## 6. Known limitation sebelum mengganti Electron

- Electron tetap baseline production sampai printer thermal native, E2E, dan stress test selesai.
- Tauri branch masih `experiment/tauri-full`, belum merge ke `main`.
- Session saat ini in-memory; user login ulang setelah restart app.
- `tw()` masih dipakai sebagai Tailwind utility mapping agar `styles.css` tetap 0 custom CSS.
