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
- [~] Logging lokal jalan — plugin log dan halaman Riwayat Aktivitas sudah ada.
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
- [~] Struk/receipt preview — modal struk sukses dan print browser/webview sudah ada.

## Produk

- [~] CRUD produk — create/list/edit/nonaktif produk sudah ada, delete permanen belum.
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
- [~] Transfer antar akun — backend/UI awal sudah ada.
- [~] Sesuaikan saldo — penyesuaian saldo plus/minus sudah ada.
- [~] Ambil profit owner — backend/UI awal `owner_draw` sudah ada.
- [~] Biaya admin bank/potongan QRIS — backend/UI awal `bank_fee` sudah ada.
- [~] Mutasi saldo — daftar mutasi saldo terakhir sudah ada.
- [ ] Proteksi saldo minus.

## Layanan Agen

- [~] Kategori layanan — preset layanan basic sudah ada, master kategori belum.
- [ ] CRUD layanan.
- [~] Preset tarik tunai — preset UI sudah ada.
- [~] Preset setor tunai — preset UI sudah ada.
- [~] Preset transfer tunai — preset UI sudah ada.
- [~] Preset payment/topup — preset UI sudah ada.
- [~] Fee/admin — field fee/admin sudah ada.
- [ ] Fee tier.
- [~] Cash/bank effect — efek kas/rekening fleksibel sudah ada.
- [~] Transaksi agen — command/UI `create_agent_transaction` sudah ada.
- [ ] Pending/completed.
- [ ] Nomor referensi.
- [ ] Void/reverse.

## Buku Utang

- [~] Buku utang digital — tambah utang, daftar utang, status lunas/belum lunas sudah ada.
- [~] Cicilan/pelunasan — pembayaran utang sudah ada.
- [~] WhatsApp reminder manual — generate dan salin pesan pengingat sudah ada.
- [ ] WhatsApp reminder otomatis — ditunda.

## Riwayat & Laporan

- [~] Riwayat transaksi — list 100 transaksi terakhir sudah ada di POC Tauri.
- [ ] Filter POS/agen.
- [ ] Filter status.
- [~] Detail transaksi — detail item POS sudah bisa dilihat dari Riwayat.
- [~] Rekening koran — ringkasan akun dan mutasi saldo sudah ada.
- [~] Laporan POS — ringkasan omzet/profit POS basic sudah ada.
- [ ] Dashboard.
- [ ] Unduh CSV.
- [ ] Unduh PDF.
- [ ] Print laporan.

## Cadangkan & Pulihkan Data

- [~] Unduh database — cadangan lokal database sudah ada.
- [~] Pulihkan database — pulihkan dari daftar cadangan lokal sudah ada.
- [~] Validasi file cadangan — pulihkan dibatasi ke folder cadangan aplikasi.
- [~] Cadangan sebelum pulihkan — aplikasi membuat cadangan cadangan sebelum pulihkan.

## Printer

- [~] Browser/system print — struk POS memakai `window.print()` dari WebView.
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
