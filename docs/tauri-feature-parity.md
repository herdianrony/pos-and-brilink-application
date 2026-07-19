# Feature Parity Checklist — Tauri Full

Checklist ini digunakan untuk membandingkan fitur Electron `v1.0.0` dengan eksperimen Tauri full.

Status:

- `[ ]` belum dibuat
- `[~]` sebagian dibuat
- `[x]` selesai dan sudah dites

---

## Fondasi

- [ ] Tauri v2 app dibuat.
- [ ] Build dev Tauri jalan.
- [ ] Build Windows x64 jalan.
- [ ] Build Windows i686 eksperimen jalan.
- [ ] SQLite lokal dibuat di app data folder.
- [ ] Migration fresh schema jalan.
- [ ] Logging lokal jalan.
- [ ] Single instance jalan.
- [ ] Window state tersimpan.

## Setup & Auth

- [ ] Setup Wizard.
- [ ] Buat admin pertama.
- [ ] Login.
- [ ] Logout.
- [ ] Role admin/kasir.
- [ ] Password hashing.
- [ ] Login lockout.
- [ ] Kasir tidak melihat profit.
- [ ] Kasir tidak akses halaman admin.

## POS

- [ ] List produk.
- [ ] Search produk.
- [ ] Barcode scanner keyboard wedge.
- [ ] Cart.
- [ ] Quantity +/-.
- [ ] Hold cart.
- [ ] Diskon.
- [ ] PIN admin diskon besar.
- [ ] Checkout tunai.
- [ ] Checkout transfer + rekening penerima.
- [ ] Checkout QRIS + rekening penerima.
- [ ] Stok berkurang.
- [ ] Mutasi POS tunai.
- [ ] Mutasi POS transfer.
- [ ] Mutasi POS QRIS.
- [ ] Struk/receipt preview.

## Produk

- [ ] CRUD produk.
- [ ] Kategori produk.
- [ ] Barcode.
- [ ] Harga beli/jual.
- [ ] Stok/min stok.
- [ ] Foto produk opsional.
- [ ] Alert stok menipis.

## Kas & Saldo

- [ ] List akun.
- [ ] Tambah/edit akun.
- [ ] Aktif/nonaktif akun.
- [ ] Transfer antar akun.
- [ ] Sesuaikan saldo.
- [ ] Ambil profit owner.
- [ ] Biaya admin bank/MDR QRIS.
- [ ] Mutasi saldo.
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

- [ ] Riwayat transaksi.
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
