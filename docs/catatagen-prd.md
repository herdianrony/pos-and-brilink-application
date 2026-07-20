# Product Requirement Document (PRD) — CatatAgen

**Nama Projek:** CatatAgen (tentative)  
**Deskripsi:** POS Retail & Sistem Pencatatan Finansial Agen Mikro Non-API  
**Versi:** 1.2 — Final MVP Blueprint  
**Tanggal:** Juli 2026  
**Status:** Approved for Development

> Catatan implementasi saat ini: multi-tenant belum masuk scope Tauri Lite. Implementasi sekarang diarahkan sebagai **single-tenant/local-first MVP**. Struktur fitur dan istilah disiapkan agar bisa naik kelas ke SaaS multi-tenant di masa depan.

---

## 1. Ringkasan Eksekutif

CatatAgen ditujukan untuk usaha mikro hybrid di Indonesia seperti Agen BRILink, konter HP, agen pulsa, dan toko kelontong yang menjual barang fisik sekaligus mencatat jasa finansial/digital.

Produk ini tidak memproses transaksi finansial riil ke bank/provider. Fokusnya adalah:

- pencatatan ledger,
- validasi saldo virtual,
- stok barang fisik,
- kasir hybrid,
- buku utang,
- struk/pengingat WhatsApp.

---

## 2. Role & Hak Akses

### Super Admin — future SaaS

Ditunda untuk fase multi-tenant.

### Tenant Owner

Untuk versi single-tenant lokal, role ini setara `admin`.

Hak akses:

- melihat laporan profit/laba rugi,
- mengelola produk, kategori, HPP,
- mengelola saldo virtual,
- mengelola layanan agen,
- mengelola pengguna/kasir,
- mengelola WhatsApp/struk/pengingat.

### Tenant Staff

Untuk versi single-tenant lokal, role ini setara `kasir`.

Hak akses:

- checkout POS,
- mencatat transaksi agen,
- mencatat utang,
- mengirim/salin struk/pengingat,
- tidak melihat HPP, profit global, laporan laba bersih, dan pengaturan admin.

---

## 3. Scope MVP Single-Tenant Saat Ini

### Epic 01 — Multi-Tenant & Langganan

Status: **ditunda**.

- Onboarding tenant SaaS ditunda.
- Subscription guard ditunda.
- Struktur code dan dokumentasi disiapkan agar bisa ditambahkan kemudian.

### Epic 02 — POS Retail & Inventori

Target MVP lokal:

- master produk fisik,
- barcode field,
- kategori,
- HPP,
- harga jual,
- stok,
- minimum stok,
- low stock alert.

### Epic 03 — Jasa Agen & Saldo Virtual

Target MVP lokal:

- layanan agen custom/template,
- nominal transaksi,
- biaya modal provider,
- biaya admin toko,
- saldo bank virtual,
- mutasi kas/rekening.

Rumus:

```txt
Total Bayar Pelanggan = Nominal Transaksi + Biaya Admin Toko
Profit Jasa = Biaya Admin Toko - Biaya Modal Provider
```

### Epic 04 — Hybrid Checkout Cart

Target MVP lokal:

- barang fisik dan jasa agen dapat dicatat dalam satu transaksi/struk,
- metode pembayaran: Tunai, Transfer, QRIS,
- status Utang/Belum Lunas.

### Epic 05 — Buku Utang & WhatsApp Reminder

Target MVP lokal:

- daftar pelanggan berutang,
- total utang,
- cicilan/pembayaran utang,
- template pesan WhatsApp pengingat,
- tahap awal: salin pesan / buka WhatsApp manual,
- otomasi WhatsApp ditunda sampai stabil.

---

## 4. Arah Implementasi Tauri Lite

Tauri Lite tetap diperlakukan sebagai eksperimen local-first, bukan pengganti Electron production sampai stabil.

Prioritas berikutnya:

1. rapikan UI/UX agar mendekati Electron production,
2. tambah buku utang,
3. tambah service template agen,
4. tambah hybrid checkout,
5. tambah export CSV/PDF,
6. tambah backup/restore,
7. tambah role guard admin/kasir lebih ketat,
8. siapkan struktur future multi-tenant.
