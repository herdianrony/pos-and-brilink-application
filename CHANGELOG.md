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
- Chart Dashboard 7 hari yang lebih informatif dengan omzet, profit, jumlah transaksi, tooltip, ringkasan total, dan data tanggal kosong tetap tampil.
- Navigasi hash awal (`/#brilink`, `/#settings`, dll.) diproses saat halaman pertama kali dibuka agar E2E dan deep-link langsung masuk ke halaman tujuan.
- Data demo E2E mengaktifkan saldo kas dan rekening BRI secara deterministik di mode development agar skenario layanan agen dan insufficient balance stabil.
- Login setelah submit memakai full navigation agar cookie httpOnly terbaca stabil oleh middleware pada Playwright/Electron.
- Dokumentasi release/deployment/user guide diselaraskan: desktop resmi Windows 10/11 x64, Windows 7/8/8.1 tidak didukung, Node 22 LTS untuk build produksi, dan OS lain memakai Web/LAN mode.
- Log WhatsApp Electron khusus (`whatsapp-electron.log`) untuk event QR, authenticated, ready, disconnected, restart/logout, dan hasil kirim pesan; log ini ikut tampil di panel Log & Monitoring.
- Persiapan remote debugging Electron untuk WhatsApp dibuat lebih stabil dengan port lokal deterministik `43220` dan penulisan `DevToolsActivePort`; bila mode native Electron bermasalah, WhatsApp desktop sekarang memakai fallback utama `whatsapp-web.js` + Edge/Chrome lokal agar tidak bergantung pada remote debugging Electron.
- WhatsApp Owner menambahkan readiness probe/polling setelah status `authenticated` agar session yang sudah login bisa dinaikkan ke `ready` ketika WA Web injection sudah siap, meskipun event `ready` tidak terpanggil.

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
