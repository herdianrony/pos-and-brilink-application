# Panduan Pengguna — POS & Agen Bisnis

Panduan ini ditujukan untuk pengguna/operator aplikasi POS & Agen Bisnis, seperti pemilik toko, kasir, dan operator layanan agen.

> **Penting:** Modul **Layanan Agen Bisnis** di aplikasi ini adalah fitur **pencatatan operasional**. Aplikasi tidak melakukan transaksi bank/PPOB/QRIS/e-wallet secara langsung. Transaksi nyata tetap dilakukan operator melalui kanal resmi seperti mobile banking, EDC, aplikasi BRILink/PPOB, atau provider resmi lain, lalu dicatat di aplikasi ini untuk pembukuan, saldo internal, laporan, dan struk.

---

## 1. Mengenal Aplikasi

Aplikasi ini membantu operasional usaha untuk:

- Mencatat penjualan POS/kasir.
- Mengelola produk, kategori, harga, dan stok.
- Mencatat layanan agen seperti transfer, tarik tunai, setor tunai, pembayaran tagihan, top up, pulsa, dan voucher.
- Mengelola saldo internal kas dan rekening.
- Melihat riwayat transaksi.
- Melihat rekening koran/mutasi internal.
- Mencetak struk melalui printer thermal jika tersedia.
- Melihat laporan ringkas di dashboard.

### 1.1 Sistem Operasi yang Didukung

Untuk aplikasi desktop/installer:

- Didukung: **Windows 10/11 64-bit**.
- Tidak didukung: Windows 7, Windows 8/8.1, dan Windows 32-bit.

Jika perangkat masih memakai Windows 7/8, gunakan mode Web/LAN dari komputer/server yang lebih modern, atau upgrade OS minimal ke Windows 10 64-bit.

---

## 2. Setup Awal

Saat aplikasi pertama kali dibuka, Anda akan diarahkan ke **Setup Wizard**.

Isi data berikut:

1. **Informasi Usaha**
   - Nama toko/usaha.
   - Nama pemilik.
   - Nomor telepon.
   - Alamat.
   - ID agen jika ada.

2. **Akun Admin**
   - Nama admin.
   - Username.
   - Password.

   Password harus:
   - minimal 8 karakter,
   - maksimal 128 karakter,
   - memakai minimal 2 jenis karakter, misalnya huruf dan angka.

3. **Saldo Awal**
   - Isi saldo awal kas tunai.
   - Aktifkan rekening settlement jika digunakan, misalnya BRI, BCA, Mandiri, BNI, dan lainnya.

4. **Printer**
   - Opsional.
   - Bisa dikonfigurasi nanti lewat menu Pengaturan.

Setelah setup selesai, Anda otomatis masuk ke aplikasi.

---

## 3. Login dan Logout

### Login

1. Buka aplikasi.
2. Masukkan username dan password.
3. Klik **Masuk**.

Jika login gagal berkali-kali, aplikasi akan mengunci percobaan sementara untuk mencegah brute-force. Tunggu beberapa saat lalu coba lagi.

### Logout

Klik tombol keluar/logout di sidebar.

---

## 4. Dashboard

Dashboard menampilkan ringkasan usaha:

- Total transaksi hari ini.
- Omzet POS.
- Volume layanan agen.
- Fee/profit layanan agen.
- Keuntungan hari ini.
- Chart 7 hari berisi omzet, profit, dan jumlah transaksi.
- Laporan POS per periode: omzet, HPP, profit, metode pembayaran, dan produk terlaris.
- Stok menipis.
- Saldo rekening/kas.
- Transaksi terakhir.
- Peringatan tindakan yang perlu diperhatikan.

Gunakan dashboard untuk melihat kondisi usaha secara cepat.

---

## 5. Kasir POS

Menu POS digunakan untuk transaksi penjualan produk.

### Melakukan Penjualan

1. Buka menu **Kasir POS**.
2. Cari produk melalui kolom pencarian atau scan barcode.
3. Klik produk untuk memasukkan ke keranjang.
4. Atur jumlah produk dengan tombol `+` atau `-`.
5. Klik **Bayar Sekarang**.
6. Pilih metode pembayaran:
   - Tunai,
   - Transfer,
   - QRIS.
7. Untuk tunai, isi uang diterima agar kembalian dihitung otomatis.
8. Klik **Konfirmasi Bayar**.
9. Setelah sukses, Anda dapat mencetak struk.

### Diskon

1. Klik tombol **Diskon** di panel keranjang.
2. Pilih jenis diskon:
   - persen,
   - rupiah.
3. Isi nilai diskon.
4. Isi alasan diskon.
5. Jika diskon besar, aplikasi dapat meminta PIN admin.
6. Klik **Terapkan**.

### Hold Transaksi

Gunakan fitur **Hold** jika transaksi perlu ditahan sementara.

- Klik **Hold** untuk menyimpan keranjang sementara.
- Klik daftar hold untuk melanjutkan transaksi.
- Cocok saat pelanggan belum selesai belanja atau kasir perlu melayani pelanggan lain.

### Shortcut

- `F1`: buka pembayaran.
- `F2`: hold transaksi.
- `Esc`: tutup modal atau kosongkan keranjang.

---

## 6. Layanan Agen Bisnis

Menu ini digunakan untuk **mencatat** layanan agen.

Contoh layanan:

- Transfer.
- Tarik tunai.
- Setor tunai.
- Pembayaran PLN/PDAM/BPJS/Telkom/cicilan.
- Pulsa dan paket data.
- Top up e-wallet/game.
- Voucher.
- Inquiry/cek saldo.

### Alur Umum Pencatatan

1. Operator melakukan transaksi aktual melalui aplikasi resmi/provider resmi.
2. Buka menu **Layanan Agen**.
3. Pilih layanan.
4. Isi nominal dan data pelanggan jika perlu.
5. Pilih rekening/kas internal yang terdampak.
6. Review dampak saldo.
7. Konfirmasi pencatatan.
8. Simpan nomor referensi provider jika tersedia.

### Contoh Tarik Tunai

Jika pelanggan ingin tarik tunai Rp100.000 dengan admin Rp5.000:

1. Pelanggan transfer ke rekening agen sebesar Rp105.000.
2. Agen menyerahkan cash dari laci sebesar Rp100.000.
3. Aplikasi mencatat:
   - Kas Tunai berkurang Rp100.000.
   - Rekening agen bertambah Rp105.000.
   - Profit/fee agen Rp5.000.

Pastikan layanan Tarik Tunai memilih rekening penerima transfer nasabah agar saldo internal rekening ikut bertambah.

### Catatan Penting

- Saldo yang berubah adalah **saldo internal aplikasi**, bukan saldo real-time bank.
- Jika transaksi aktual gagal di provider, jangan tandai selesai.
- Gunakan status pending/completed/reverse agar laporan tetap akurat.

### Favorit dan Terakhir Dipakai

- Klik ikon bintang pada layanan untuk menambah favorit.
- Layanan yang sering dipakai akan muncul di bagian “Terakhir Dipakai”.

---

## 7. Manajemen Data

Menu **Manajemen Data** berisi:

1. Produk.
2. Kategori Produk.
3. Layanan Agen.
4. Kategori Layanan.

### Produk

Anda dapat:

- menambah produk,
- mengubah produk,
- menghapus/nonaktifkan produk,
- mengatur barcode,
- mengatur harga beli dan harga jual,
- mengatur stok dan stok minimum,
- menambahkan gambar produk.

### Kategori Produk

Gunakan kategori agar produk lebih mudah dicari di POS.

### Layanan Agen

> Production tidak menyediakan layanan agen siap pakai secara otomatis. Owner/admin perlu membuat kategori layanan dan layanan sendiri sesuai SOP usaha, termasuk efek kas, efek rekening, biaya admin, dan flow layanan.

Anda dapat mengatur:

- nama layanan,
- kategori layanan,
- biaya admin yang dibayar pelanggan,
- profit agen opsional jika berbeda dari biaya admin,
- fee berjenjang,
- efek kas,
- efek saldo bank,
- deskripsi.

### Biaya Admin dan Profit Agen

Secara default aplikasi menyederhanakan fee layanan menjadi satu input:

```txt
Biaya Admin yang dibayar pelanggan
```

Nilai ini otomatis dicatat juga sebagai profit agen. Jika profit agen berbeda dari biaya admin, aktifkan opsi:

```txt
Profit agen berbeda dari biaya admin
```

Contoh:

```txt
Biaya Admin pelanggan: Rp7.000
Profit Agen:           Rp5.000
Selisih/provider:      Rp2.000
```

### Fee Berjenjang

Fee berjenjang digunakan jika biaya admin berubah berdasarkan nominal transaksi. Profit agen pada tier otomatis mengikuti biaya admin.

Contoh:

| Nominal           | Biaya Admin |
| ----------------- | ----------: |
| 0–500.000         |       5.000 |
| 500.001–2.000.000 |       7.500 |
| >2.000.000        |      10.000 |

---

## 8. Manajemen Saldo

### Sesuaikan Saldo

Fitur **Sesuaikan Saldo** digunakan untuk koreksi saldo internal agar sesuai dengan kondisi nyata, misalnya:

- top up kas/rekening,
- koreksi selisih kas opname,
- koreksi saldo karena salah input,
- biaya admin bank atau potongan lain yang perlu dicatat.

Gunakan catatan yang jelas agar audit mudah dibaca. Untuk transaksi operasional normal, jangan pakai Sesuaikan Saldo; gunakan transaksi POS/Layanan Agen agar laporan tetap benar.

### Ambil Profit Owner

Jika owner mengambil laba/prive, gunakan tombol **Ambil Profit** pada kartu akun saldo. Contoh:

1. Owner mengambil Rp200.000 dari Kas Tunai.
2. Buka **Kas & Saldo**.
3. Pilih akun **Kas Tunai**.
4. Klik **Ambil Profit**.
5. Isi nominal Rp200.000 dan catatan “Ambil profit harian”.

Efeknya:

- saldo kas/rekening berkurang,
- tercatat sebagai mutasi `Prive Owner`,
- profit transaksi historis tidak berubah,
- laporan POS tetap menunjukkan profit operasional, sedangkan prive terlihat di mutasi saldo.

Menu **Manajemen Saldo** digunakan untuk mengelola saldo internal.

Fitur:

- melihat total saldo aktif,
- melihat kartu kas/rekening,
- menambah rekening,
- mengubah rekening,
- menonaktifkan rekening,
- menyesuaikan saldo,
- transfer antar saldo internal,
- melihat riwayat mutasi.

### Sesuaikan Saldo

Gunakan jika ada selisih fisik antara catatan dan kondisi nyata.

Contoh:

- koreksi kas,
- top up saldo rekening,
- penyesuaian setelah setor/tarik ATM.

### Transfer Antar Saldo

Digunakan untuk mencatat perpindahan saldo internal.

Contoh:

- kas tunai disetor ke bank,
- saldo BRI dipindah ke BCA,
- saldo marketplace dipindah ke kas.

---

## 9. Riwayat Transaksi

Menu **Riwayat Transaksi** menampilkan semua transaksi POS dan layanan agen.

Fitur:

- filter berdasarkan tipe transaksi,
- filter berdasarkan status,
- lihat detail transaksi,
- cetak ulang struk POS,
- tandai transaksi pending menjadi selesai,
- batalkan transaksi pending,
- reverse transaksi layanan agen yang sudah completed.

### Status Transaksi

| Status     | Arti                                                   |
| ---------- | ------------------------------------------------------ |
| Selesai    | Transaksi selesai dan tercatat final                   |
| Pending    | Transaksi dicatat tetapi perlu penyelesaian/konfirmasi |
| Dibatalkan | Transaksi dibatalkan                                   |
| Di-reverse | Transaksi dibalik dengan counter-mutasi                |

### Complete Pending

Gunakan saat transaksi yang awalnya pending sudah selesai di provider/bank.

Isi nomor referensi jika ada.

### Void/Batalkan

Gunakan jika transaksi pending tidak jadi dilakukan.

Wajib isi alasan.

### Reverse

Gunakan untuk membalik transaksi layanan agen yang sudah selesai jika terjadi kesalahan atau transaksi provider gagal setelah dicatat.

Aplikasi akan membuat mutasi pembalik agar audit trail tetap terjaga.

---

## 10. Rekening Koran

Menu **Rekening Koran** menampilkan mutasi internal per rekening.

Fitur:

- pilih rekening,
- pilih rentang tanggal,
- preset tanggal cepat,
- lihat saldo awal,
- total masuk,
- total keluar,
- saldo akhir,
- export CSV,
- export PDF,
- print.

Preset tanggal:

- Hari ini.
- 7 hari.
- Bulan ini.
- Bulan lalu.
- Tahun ini.

---

## 11. Pengaturan

Menu Pengaturan digunakan untuk:

- mengubah branding aplikasi,
- mengubah nama toko,
- mengatur alamat dan telepon,
- mengatur notifikasi WhatsApp owner,
- mengatur printer thermal,
- mengatur PIN admin untuk diskon besar,
- mengatur kebijakan diskon,
- mengatur user/admin/kasir.

### WhatsApp Owner

Fitur WhatsApp Owner digunakan untuk mengirim notifikasi internal ke owner, misalnya saat kasir mencatat Tarik Tunai dan owner perlu mengecek transfer masuk di m-banking.

Cara mengaktifkan:

1. Isi nomor WhatsApp owner saat **Setup Wizard** atau buka **Pengaturan → WhatsApp Owner**.
2. Pastikan nomor WhatsApp owner sudah benar.
3. Aktifkan **WhatsApp Owner** dan **Kirim otomatis** jika diperlukan.
4. Klik **Simpan Pengaturan WhatsApp**.
5. Klik **Mulai / Tampilkan QR**.
6. Scan QR dengan WhatsApp kasir/operasional.

Contoh notifikasi Tarik Tunai:

```txt
[CEK TRANSFER MASUK]
Kasir mencatat transaksi Tarik Tunai.
Nominal: Rp100.000
Admin/Fee: Rp5.000
Transfer masuk yang perlu dicek: Rp105.000
Mohon cek/proses melalui kanal resmi.
```

Catatan:

- Fitur ini menggunakan WhatsApp Web otomatis.
- Jangan digunakan untuk spam/broadcast massal.
- Jika session bermasalah, klik **Logout WhatsApp** lalu scan ulang QR.
- Jika WhatsApp belum terhubung, transaksi tetap tersimpan; hanya notifikasi yang gagal terkirim.

### User Management

Admin dapat:

- membuat user baru,
- mengubah role,
- mengaktifkan/nonaktifkan user,
- mengganti password user.

Role umum:

- **Admin:** akses pengaturan dan perubahan data penting.
- **Kasir:** akses operasional transaksi.

---

## 12. Printer Thermal

Aplikasi mendukung printer thermal ESC/POS melalui Electron.

Jenis koneksi yang umum:

- Network/LAN/WiFi.
- USB direct, tergantung driver.
- Serial/COM.

Cara konfigurasi:

1. Buka **Pengaturan**.
2. Pilih bagian printer thermal.
3. Pilih tipe koneksi.
4. Isi IP/port jika network printer.
5. Pilih ukuran kertas 58mm atau 80mm.
6. Klik test print.

Jika cetak gagal:

- pastikan printer menyala,
- pastikan driver terpasang,
- pastikan IP printer benar,
- coba port `9100`,
- pastikan komputer dan printer satu jaringan.

---

## 13. Backup dan Restore

Jika fitur backup tersedia di menu/admin:

- Lakukan backup database secara berkala.
- Simpan file backup di lokasi aman.
- Restore database hanya dari file backup terpercaya.
- Setelah restore, aplikasi perlu dimulai ulang.

Rekomendasi:

- Backup harian untuk toko aktif.
- Backup sebelum update aplikasi.
- Simpan minimal 2 salinan backup di media berbeda.

---

## 14. Log & Monitoring Aplikasi

Admin dapat membuka:

```txt
Pengaturan → Lanjutan → Log & Monitoring Aplikasi
```

Menu ini digunakan untuk:

- melihat error aplikasi/API,
- melihat error tampilan,
- melihat log server Electron,
- memfilter error/warning/info/debug,
- mencari pesan log,
- download log untuk dikirim ke developer,
- membersihkan log aktif.

Jika aplikasi terasa bermasalah, buka panel ini lalu download log sebelum restart/reinstall.

---

## 15. Praktik Operasional yang Disarankan

1. Cocokkan saldo kas fisik dengan saldo aplikasi setiap akhir hari.
2. Cocokkan saldo bank real dengan saldo internal aplikasi secara berkala.
3. Catat nomor referensi provider untuk transaksi agen.
4. Jangan hapus/ubah transaksi sembarangan; gunakan void/reverse agar audit trail tetap jelas.
5. Gunakan akun kasir berbeda untuk tiap operator.
6. Jangan bagikan password admin.
7. Lakukan backup sebelum update aplikasi.
8. Pastikan printer dan scanner diuji sebelum jam operasional.

---

## 16. Dukungan Pengembangan dan Support

Aplikasi dapat digunakan tanpa biaya license pada tahap stabilisasi. Jika aplikasi membantu operasional usaha, pengguna dapat mendukung pengembangan secara sukarela.

Dukungan sukarela digunakan untuk membantu:

- pengembangan fitur baru,
- perbaikan bug,
- dokumentasi,
- pengujian perangkat/printer,
- biaya operasional pengembangan.

Dukungan tidak wajib dan bukan aktivasi license.

Jika membutuhkan bantuan teknis seperti instalasi, setup printer, setup layanan agen, training kasir, backup/restore, atau customisasi laporan, developer dapat menyediakan layanan support berbayar sesuai kesepakatan.

Kontak dan dukungan:

```txt
Sociabuzz: https://sociabuzz.com/herdianrony/tribe
Email: herdianrony@gmail.com
```

---

## 17. Troubleshooting Singkat

### Tidak bisa login

- Pastikan username/password benar.
- Jika terlalu banyak gagal, tunggu lockout selesai.
- Hubungi admin untuk reset password.

### Stok tidak cukup

- Cek stok produk di Manajemen Data.
- Tambahkan stok jika barang fisik tersedia.

### Saldo kas/rekening tidak cukup

- Cek saldo di Manajemen Saldo.
- Lakukan penyesuaian jika memang ada saldo nyata.
- Jangan memaksa transaksi jika saldo internal belum sesuai.

### Layanan agen tercatat pending

- Selesaikan transaksi di provider resmi.
- Buka Riwayat Transaksi.
- Klik tandai selesai dan isi nomor referensi.

### Salah input transaksi agen

- Jika pending: batalkan/void.
- Jika sudah selesai: gunakan reverse.

### CSV rekening koran tidak sesuai

- Pastikan rekening dan rentang tanggal benar.
- Coba preset Bulan Ini atau Hari Ini.

---

## 18. Batasan Aplikasi

Aplikasi ini tidak menyediakan:

- transfer bank otomatis,
- validasi rekening bank online,
- cek tagihan online,
- integrasi QRIS acquirer,
- integrasi payment gateway,
- integrasi API BRILink/PPOB resmi,
- sinkronisasi saldo real-time bank.

Aplikasi ini fokus pada:

- pencatatan transaksi,
- pembukuan internal,
- kontrol saldo internal,
- struk,
- laporan,
- audit trail.

---

## 19. Alur Tutup Hari yang Disarankan

1. Selesaikan semua transaksi pending.
2. Cek Riwayat Transaksi hari ini.
3. Cocokkan kas fisik dengan saldo Kas Tunai.
4. Cocokkan saldo bank/e-wallet dengan saldo internal aplikasi.
5. Gunakan penyesuaian saldo jika ada selisih yang jelas.
6. Export rekening koran jika diperlukan.
7. Backup database.
8. Logout dari aplikasi.

---

Dokumen ini dapat disesuaikan dengan SOP masing-masing usaha.
