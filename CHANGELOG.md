# Changelog

Semua perubahan penting aplikasi dicatat di file ini. Format mengikuti praktik umum [Keep a Changelog](https://keepachangelog.com/) dan versi mengikuti Semantic Versioning.

## [1.0.0] - 2026-07-17

### Added
- Rilis produksi awal aplikasi POS & Agen Bisnis/BRILink POS untuk Windows Electron.
- POS kasir, layanan agen, multi akun kas/rekening, laporan, printer thermal, dan WhatsApp Owner notification.
- Production seed bersih/dinamis: tidak membuat produk, kategori produk, kategori layanan, atau template layanan bisnis.
- Simulasi auto-update Electron untuk QA/demo tanpa perlu publish GitHub Release sungguhan.
- Script release/check versi untuk workflow rilis Windows Electron.
- Tombol cek update dan simulasi update di halaman Tentang saat berjalan di Electron.
- Panel **Log & Monitoring Aplikasi** di Pengaturan > Lanjutan untuk memantau error API, error tampilan, log server Electron, download log, dan membersihkan log aktif.

### Security
- Mengamankan IPC `whatsapp:send` Electron dengan token HMAC yang terikat ke nomor owner, isi pesan, dan masa kedaluwarsa.
- Menambahkan rate limit pengiriman WhatsApp Electron maksimal 10 pesan/menit dan batas panjang pesan 4096 karakter.
- Membatasi IPC `app:getPath` hanya untuk path aman: `userData`, `documents`, dan `desktop`.
- Menambahkan validasi enum untuk konfigurasi flow layanan BRILink (`cashEffect`, `bankEffect`, `flowType`, `defaultFeeMethod`).
- Menambahkan cooldown restart WhatsApp Electron 10 detik.
- Escape HTML pada window error Electron.

### Fixed
- Mengurangi retry WhatsApp yang terlalu luas saat injection WhatsApp Web belum siap.
- Memperbaiki refresh status WhatsApp Settings agar tidak melakukan fetch/IPC setiap user mengetik nomor WhatsApp.
- Memastikan `categoryCode` ikut tersimpan saat membuat/mengedit layanan BRILink.
- Membersihkan error lama WhatsApp saat logout.
- Membersihkan listener auto-update saat komponen unmount.
