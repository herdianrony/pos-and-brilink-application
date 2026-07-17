# Panduan Deployment — POS & Agen Bisnis

Dokumen ini menjelaskan cara menjalankan aplikasi dalam dua mode produksi yang direkomendasikan:

1. **Windows Desktop Mode** — untuk kasir utama dengan installer/portable Electron.
2. **Web/LAN Server Mode** — untuk Linux/Armbian/macOS/Windows server yang diakses melalui browser di jaringan lokal.

> Rekomendasi distribusi utama: **Windows Desktop**. Untuk OS lain, gunakan **Web/LAN Server Mode** agar lebih ringan dan mudah dirawat.

---

## 1. Pilihan Mode Deployment

| Mode            | Cocok Untuk                                      | Kelebihan                                                        | Catatan                                               |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------- |
| Windows Desktop | Laptop/PC kasir Windows 10/11 x64                | Installer mudah, printer Electron, database lokal, offline-first | Target utama aplikasi; Windows 7/8/8.1 tidak didukung |
| Web/LAN Server  | STB Armbian, mini PC, Linux, macOS, server lokal | Bisa diakses banyak device via browser                           | Printer thermal native perlu strategi terpisah        |

---

## 2. Windows Desktop Mode

Mode ini menggunakan Electron dan cocok untuk kasir utama.

### 2.1 Requirement

- Windows 10/11 64-bit.
- Windows 7, Windows 8/8.1, dan Windows 32-bit tidak didukung.
- RAM minimal 2GB, disarankan 4GB.
- Storage kosong minimal 500MB.
- Printer thermal opsional.
- Barcode scanner USB opsional.

### 2.2 Build Installer

Di mesin developer:

```bash
npm ci
npm run build:electron
```

Output ada di:

```txt
dist-electron/
```

Target saat ini:

```txt
NSIS installer x64
Portable x64
```

### 2.3 Install di Komputer Kasir

1. Jalankan file installer `.exe` dari `dist-electron`.
2. Ikuti wizard instalasi.
3. Buka aplikasi.
4. Lakukan Setup Wizard jika pertama kali.
5. Konfigurasi printer bila diperlukan.

### 2.4 Lokasi Database Desktop

Database disimpan di folder `userData` Electron.

Umumnya di Windows:

```txt
%APPDATA%/BRILink POS/pos-brilink.db
```

File penting lain:

```txt
%APPDATA%/BRILink POS/.auth-secret
%APPDATA%/BRILink POS/printer-config.json
%APPDATA%/BRILink POS/logs/app.log
%APPDATA%/BRILink POS/logs/next-server.log
%APPDATA%/BRILink POS/logs/whatsapp-electron.log
```

### 2.5 Backup Desktop

Lakukan backup database secara rutin melalui menu aplikasi jika tersedia, atau salin file:

```txt
pos-brilink.db
```

Saran:

- Backup harian.
- Backup sebelum update aplikasi.
- Simpan backup di flashdisk/cloud/local NAS.

### 2.6 Printer Thermal di Desktop

Mode desktop mendukung integrasi printer melalui Electron.

Jenis koneksi yang disarankan:

1. Network/LAN/WiFi — paling stabil.
2. USB — tergantung driver Windows.
3. Serial/COM — untuk printer lama.

Konfigurasi dilakukan di menu:

```txt
Pengaturan → Printer Thermal
```

---

## 3. Web/LAN Server Mode

Mode ini menjalankan aplikasi sebagai server lokal. Cocok untuk Linux, Armbian/STB, macOS, atau Windows server.

Perangkat lain dapat mengakses aplikasi melalui browser:

```txt
http://IP-SERVER:3000
```

Contoh:

```txt
http://192.168.1.10:3000
```

---

## 4. Web/LAN Mode di Linux/Armbian

### 4.1 Cek Spesifikasi

Di server Linux/Armbian:

```bash
uname -m
getconf LONG_BIT
free -h
df -h
```

Rekomendasi:

```txt
Arsitektur: aarch64/x64 lebih disarankan
RAM: minimal 2GB
Storage kosong: minimal 2GB
```

Untuk STB Armbian, mode ini lebih disarankan daripada Electron karena lebih ringan.

### 4.2 Install Dependency Dasar

```bash
sudo apt update
sudo apt install -y git curl build-essential openssl
```

### 4.3 Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Cek:

```bash
node -v
npm -v
```

Pastikan Node 22:

```txt
v22.x.x
```

### 4.4 Clone Repository

Contoh install di `/opt`:

```bash
cd /opt
sudo git clone https://github.com/herdianrony/pos-and-brilink-application.git
sudo chown -R $USER:$USER pos-and-brilink-application
cd pos-and-brilink-application
```

### 4.5 Install Dependencies

```bash
npm ci
```

Jika RAM kecil, tambahkan swap.

Contoh swap 2GB:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4.6 Buat Environment Production

Buat file `.env.local`:

```bash
nano .env.local
```

Isi:

```env
AUTH_SECRET=isi_dengan_secret_panjang_minimal_32_karakter
DATABASE_URL=file:/opt/pos-and-brilink-application/data.db
```

Generate secret:

```bash
openssl rand -hex 48
```

Contoh:

```env
AUTH_SECRET=3c2b44f0c1f9...panjang
DATABASE_URL=file:/opt/pos-and-brilink-application/data.db
```

### 4.7 Build Aplikasi

```bash
npm run build
```

### 4.8 Jalankan Server

```bash
HOSTNAME=0.0.0.0 PORT=3000 npm start
```

Cek IP server:

```bash
hostname -I
```

Akses dari browser perangkat lain:

```txt
http://IP-SERVER:3000
```

---

## 5. Menjalankan Web/LAN Mode sebagai Service Linux

Agar aplikasi otomatis berjalan saat boot, buat systemd service.

```bash
sudo nano /etc/systemd/system/pos-brilink.service
```

Isi:

```ini
[Unit]
Description=POS & Agen Bisnis Web Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/pos-and-brilink-application
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pos-brilink
sudo systemctl start pos-brilink
```

Cek status:

```bash
sudo systemctl status pos-brilink
```

Lihat log:

```bash
journalctl -u pos-brilink -f
```

---

## 6. Web/LAN Mode di Windows

Jika ingin menjadikan komputer Windows sebagai server LAN:

```bat
git pull
npm ci
npm run build
```

Jalankan:

```bat
set HOSTNAME=0.0.0.0
set PORT=3000
npm start
```

Akses dari perangkat lain:

```txt
http://IP-WINDOWS:3000
```

Cek IP Windows:

```bat
ipconfig
```

Pastikan firewall mengizinkan port `3000`.

---

## 7. Web/LAN Mode di macOS

Install Node.js 22, lalu:

```bash
git clone https://github.com/herdianrony/pos-and-brilink-application.git
cd pos-and-brilink-application
npm ci
cp .env.example .env.local
npm run build
HOSTNAME=0.0.0.0 PORT=3000 npm start
```

Akses dari browser:

```txt
http://IP-MAC:3000
```

---

## 8. Seed Data Production

Production membutuhkan seed template sistem:

```txt
/api/seed
```

Seed ini berisi:

- Kas Tunai default.
- Template rekening bank/e-wallet.
- Settings default.

Seed production **tidak** membuat:

- produk,
- kategori produk,
- kategori layanan agen,
- layanan agen,
- fee layanan.

Semua produk, kategori, layanan, efek saldo, dan fee dibuat sendiri oleh owner melalui aplikasi agar benar-benar sesuai SOP masing-masing bisnis.

Seed ini **bukan data demo**.

Jangan gunakan untuk production:

```txt
/api/seed-demo
```

Aplikasi biasanya menjalankan seed template secara otomatis saat first run/login page. Data bisnis seperti saldo, produk, kategori, layanan agen, fee, dan user tetap diisi pengguna melalui Setup Wizard/Pengaturan.

---

## 9. Printer di Web/LAN Mode

Mode Web/LAN tidak memiliki `window.electronAPI`, sehingga integrasi printer Electron tidak tersedia.

Pilihan printer:

### Opsi 1 — Browser Print

Gunakan dialog print browser.

Cocok untuk:

- printer biasa,
- PDF,
- thermal printer yang dikenali OS sebagai printer biasa.

### Opsi 2 — Printer Network/LAN

Untuk produksi multi-device, printer thermal LAN/WiFi paling disarankan.

Catatan: jika ingin server Linux/Armbian mencetak langsung ke printer ESC/POS, perlu backend print API khusus. Saat ini mode paling siap untuk printer native adalah Windows Desktop/Electron.

### Opsi 3 — Pakai Windows Desktop untuk Kasir

Jika printer thermal USB dipakai, lebih mudah jalankan aplikasi desktop di Windows.

---

## 10. WhatsApp Owner di Deployment

Fitur WhatsApp Owner memakai `wwebjs-electron` di Windows Desktop dan fallback `whatsapp-web.js` di Web/LAN. Untuk Windows Desktop, session disimpan di persistent partition Electron/userData. Lokasi userData terkait:

```text
%APPDATA%/BRILink POS/
```

Untuk Web/LAN mode, jika `WHATSAPP_SESSION_DIR` tidak diatur, session disimpan di folder home user:

```text
~/.pos-brilink/whatsapp-session
```

Anda dapat mengatur lokasi session secara eksplisit:

```env
WHATSAPP_SESSION_DIR=/opt/pos-and-brilink-data/whatsapp-session
```

Catatan produksi:

- WhatsApp Web otomatis bukan API resmi Meta.
- Gunakan hanya untuk notifikasi internal owner.
- Jangan digunakan untuk spam/broadcast massal.
- Jika QR/session gagal, logout WhatsApp dari Pengaturan lalu scan ulang.
- Jangan menyimpan folder session WhatsApp di root project karena dapat mengganggu build dan backup source code.

## 11. Backup Web/LAN Mode

Database default contoh:

```txt
/opt/pos-and-brilink-application/data.db
```

Backup manual:

```bash
mkdir -p ~/backup-pos
cp /opt/pos-and-brilink-application/data.db ~/backup-pos/data-$(date +%F-%H%M).db
```

Backup otomatis harian dengan cron:

```bash
crontab -e
```

Tambahkan:

```cron
0 22 * * * mkdir -p ~/backup-pos && cp /opt/pos-and-brilink-application/data.db ~/backup-pos/data-$(date +\%F-\%H\%M).db
```

Saran:

- Simpan backup harian.
- Hapus backup lama secara berkala.
- Salin backup ke perangkat lain.

---

## 12. Update Aplikasi

### Windows Desktop

Jika auto-update diaktifkan, update dapat dilakukan dari GitHub Releases.

Jika manual:

1. Backup database.
2. Install versi baru.
3. Jalankan aplikasi.
4. Pastikan data masih ada.

### Web/LAN Server

```bash
cd /opt/pos-and-brilink-application
git pull
npm ci
npm run build
sudo systemctl restart pos-brilink
```

Cek log:

```bash
journalctl -u pos-brilink -f
```

---

## 13. Keamanan Deployment Web/LAN

Jika hanya untuk jaringan lokal:

- Jalankan di LAN terpercaya.
- Jangan expose port 3000 langsung ke internet.
- Gunakan password admin kuat.
- Backup rutin.

Jika ingin diakses dari internet:

- Gunakan reverse proxy HTTPS.
- Gunakan firewall.
- Pertimbangkan VPN.
- Jangan expose langsung tanpa TLS.
- Pertimbangkan rate limit persistent dan CSRF token tambahan.

Rekomendasi akses jarak jauh:

```txt
VPN / Tailscale / ZeroTier
```

bukan membuka port publik langsung.

---

## 14. Troubleshooting

### Node version tidak sesuai

Cek:

```bash
node -v
```

Gunakan Node 22.x sesuai `.nvmrc` (`22.12.0` atau Node 22 LTS). Node 25 tidak direkomendasikan untuk build produksi Electron walaupun sebagian test bisa berjalan.

### Windows 7/8 tidak didukung

Installer desktop resmi hanya untuk Windows 10/11 64-bit. Untuk perangkat lama/Windows 7, gunakan Web/LAN mode dari PC/server yang lebih modern atau upgrade OS.

### Build gagal karena RAM kecil

Tambahkan swap 2GB atau lebih.

### Tidak bisa diakses dari perangkat lain

Pastikan server jalan dengan:

```bash
HOSTNAME=0.0.0.0 PORT=3000 npm start
```

Pastikan firewall membuka port 3000.

### Database tidak ditemukan

Cek `DATABASE_URL` di `.env.local`.

### Login gagal setelah pindah server

Pastikan `AUTH_SECRET` tetap sama jika membawa database lama. Jika `AUTH_SECRET` berubah, session lama tidak valid dan user perlu login ulang.

### WhatsApp session mengganggu build

Pastikan session WhatsApp tidak berada di root project. Jika ada folder lama, hapus setelah menutup proses Chrome/Node/Electron:

```bash
rm -rf .whatsapp-session
```

Windows:

```bat
rmdir /s /q .whatsapp-session
```

### Cek log aplikasi

Di desktop, admin bisa melihat log dari:

```txt
Pengaturan → Lanjutan → Log & Monitoring Aplikasi
```

File log ada di:

```txt
%APPDATA%/BRILink POS/logs/app.log
%APPDATA%/BRILink POS/logs/next-server.log
%APPDATA%/BRILink POS/logs/whatsapp-electron.log
```

### Printer tidak muncul di Web/LAN

Gunakan browser print atau jalankan mode Windows Desktop untuk integrasi printer thermal native.

---

## 15. Rekomendasi Final

Untuk produksi UMKM/toko:

```txt
Kasir utama Windows + aplikasi desktop Electron
```

Untuk STB/Armbian/mini PC:

```txt
Jadikan server lokal Web/LAN, akses dari browser
```

Untuk printer thermal:

```txt
Gunakan Windows Desktop atau printer network/LAN
```

Untuk data:

```txt
Backup harian wajib
```
