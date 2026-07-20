# Feature Parity Checklist — Tauri Full

Checklist ini digunakan untuk membandingkan fitur Electron `v1.0.0` dengan eksperimen Tauri full.

Status:

- `[ ]` belum dibuat
- `[~]` sebagian dibuat
- `[x]` selesai dan sudah dites

---

## Fondasi

- [~] Tauri v2 app dibuat — scaffold POC sudah ada di `src-tauri`.
- [ ] Build dev Tauri jalan — menunggu validasi Windows dengan Rust + Visual Studio Build Tools.
- [ ] Build Windows x64 jalan.
- [ ] Build Windows i686 eksperimen jalan.
- [~] SQLite lokal dibuat di app data folder — command `db_init` sudah membuat database fresh.
- [~] Migration fresh schema jalan — tabel awal user, akun, produk, kategori, transaksi, mutasi sudah dibuat.
- [~] Logging lokal jalan — plugin log sudah dipasang, belum ada panel log.
- [~] Single instance jalan — plugin single instance sudah dipasang.
- [~] Window state tersimpan — plugin window state sudah dipasang.

## Setup & Auth

- [~] Setup Wizard — form admin pertama sudah tersedia.
- [~] Buat admin pertama — command Rust `create_admin` sudah ada.
- [~] Login — command Rust `login` sudah ada.
- [ ] Logout.
- [~] Role admin/kasir — struktur role sudah ada, UI/guard belum lengkap.
- [~] Password hashing — bcrypt sudah dipakai.
- [ ] Login lockout.
- [ ] Kasir tidak melihat profit.
- [ ] Kasir tidak akses halaman admin.

## POS

- [~] List produk — command/UI awal sudah ada.
- [ ] Search produk.
- [ ] Barcode scanner keyboard wedge.
- [~] Cart — keranjang sederhana sudah ada.
- [~] Quantity +/- — input jumlah sudah ada.
- [ ] Hold cart.
- [ ] Diskon.
- [ ] PIN admin diskon besar.
- [~] Checkout tunai — command `checkout_pos_cash` sudah mencatat transaksi.
- [~] Checkout transfer + rekening penerima — backend/UI awal sudah ada, perlu validasi Windows.
- [~] Checkout QRIS + rekening penerima — backend/UI awal sudah ada, perlu validasi Windows.
- [~] Stok berkurang — sudah dilakukan saat checkout tunai.
- [~] Mutasi POS tunai — sudah menambah saldo Kas Tunai dan `account_mutations`.
- [~] Mutasi POS transfer — sudah mencatat `pos_transfer_in` ke rekening penerima.
- [~] Mutasi POS QRIS — sudah mencatat `pos_qris_in` ke rekening penerima.
- [ ] Struk/receipt preview.

## Produk

- [~] CRUD produk — create/list produk sudah ada, edit/delete belum.
- [~] Kategori produk — create/list kategori sudah ada, edit/delete belum.
- [~] Barcode — field barcode sudah ada, scanner/search belum.
- [~] Harga beli/jual — field dan kalkulasi profit POS tunai sudah ada.
- [~] Stok/min stok — field stok/min stok sudah ada, alert belum.
- [ ] Foto produk opsional.
- [ ] Alert stok menipis.

## Kas & Saldo

- [~] List akun — command/UI awal sudah ada.
- [~] Tambah/edit akun — tambah rekening non-tunai sudah ada, edit belum.
- [ ] Aktif/nonaktif akun.
- [ ] Transfer antar akun.
- [~] Sesuaikan saldo — penyesuaian saldo plus/minus sudah ada.
- [ ] Ambil profit owner.
- [ ] Biaya admin bank/MDR QRIS.
- [~] Mutasi saldo — daftar mutasi saldo terakhir sudah ada.
- [ ] Proteksi saldo minus.

## Layanan Agen

- [ ] Kategori layanan.
- [ ] CRUD layanan.
- [ ] Preset tarik tunai.
- [ ] Preset setor tunai.
- [ ] Preset transfer tunai.
- [ ] Preset payment/topup.
- [ ] Fee/admin.
- [ ] Fee tier.
- [ ] Cash/bank effect.
- [ ] Transaksi agen.
- [ ] Pending/completed.
- [ ] Nomor referensi.
- [ ] Void/reverse.

## Riwayat & Laporan

- [~] Riwayat transaksi — list 100 transaksi terakhir sudah ada di POC Tauri.
- [ ] Filter POS/agen.
- [ ] Filter status.
- [ ] Detail transaksi.
- [ ] Rekening koran.
- [ ] Laporan POS.
- [ ] Dashboard.
- [ ] Export CSV.
- [ ] Export PDF.
- [ ] Print laporan.

## Backup & Restore

- [ ] Export database.
- [ ] Restore database.
- [ ] Validasi file backup.
- [ ] Backup sebelum restore.

## Printer

- [ ] Browser/system print.
- [ ] Printer network ESC/POS.
- [ ] Printer USB.
- [ ] Printer serial/COM.
- [ ] Test print.

## WhatsApp

Tahap awal Tauri tidak menargetkan otomatisasi WhatsApp.

- [ ] Generate pesan owner.
- [ ] Salin pesan.
- [ ] Buka WhatsApp/wa.me manual.
- [ ] WhatsApp otomatis — ditunda.

## Release

- [ ] Installer NSIS x64.
- [ ] Installer NSIS i686.
- [ ] WebView2 offline/fixed runtime strategy.
- [ ] Auto-update Tauri — ditunda.
- [ ] Dokumentasi install.

---

## Catatan

Tauri full tidak wajib kompatibel dengan database Electron. Parity yang dicari adalah **alur fitur**, bukan data lama.
