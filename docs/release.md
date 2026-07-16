# Panduan Release & Auto-Update Electron

Dokumen ini dipakai setiap kali aplikasi Windows Electron akan dirilis atau dinaikkan versinya.

## Mode rilis yang didukung

- **Produksi utama:** Windows desktop Electron (`BRILink POS Setup x.y.z.exe`).
- **Mode lain:** Web/LAN mode untuk Linux, Armbian, macOS, atau server lokal. Tidak perlu installer Electron untuk OS tersebut.

## Aturan versi

Gunakan Semantic Versioning:

- `patch` — bugfix, security fix kecil, polish UI tanpa perubahan workflow besar. Contoh: `1.0.1`.
- `minor` — fitur baru yang kompatibel. Contoh: `1.1.0`.
- `major` — perubahan besar/berpotensi breaking. Contoh: `2.0.0`.

Nomor versi sumber utama ada di:

- `package.json`
- `package-lock.json`

Aplikasi Electron membaca versi dari package saat build.

## Menaikkan versi

```bash
npm run version:patch
# atau
npm run version:minor
npm run version:major
```

Bisa juga set versi eksplisit:

```bash
node scripts/bump-version.js 1.2.3
```

Setelah menaikkan versi, update `CHANGELOG.md`.

## Validasi sebelum release

Wajib jalankan:

```bash
npm run release:check
```

Isi `release:check`:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run compile:electron
npm audit --audit-level=moderate
```

## Build installer Windows lokal

```bash
npm run build:electron
```

Output utama:

```txt
dist-electron/BRILink POS Setup <version>.exe
dist-electron/BRILink POS-Portable-<version>.exe
dist-electron/latest.yml
```

`latest.yml` penting untuk auto-update Electron.

## Publish GitHub Release untuk auto-update

Syarat:

1. `version` sudah lebih tinggi dari versi yang terinstall di komputer user.
2. Validasi sudah pass.
3. Token GitHub tersedia sebagai environment variable `GH_TOKEN`.
4. Tag rilis menggunakan format `vX.Y.Z`.

Langkah manual yang aman:

```bash
git status
npm run release:check
git add package.json package-lock.json CHANGELOG.md docs/release.md
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
GH_TOKEN=isi_token npm run build:electron:publish
```

Alternatif jika artifact sudah dibuat lokal, upload asset berikut ke GitHub Release `vX.Y.Z`:

- installer `.exe`
- portable `.exe` jika diperlukan
- `latest.yml`

## Simulasi auto-update tanpa publish release

Untuk mengetes UI update Electron tanpa membuat release sungguhan:

```bash
npm run dev:electron:update-sim
```

Lalu buka halaman **Tentang Aplikasi** dan klik **Simulasi Update**.

Yang diuji:

1. Event `update:available`.
2. Progress download.
3. Event `update:downloaded`.
4. Notifikasi kanan bawah.
5. Tombol `Install & Restart` masuk ke mode simulasi dan menutup notifikasi tanpa restart sungguhan.

Catatan:

- Simulasi tidak mengunduh installer.
- Simulasi tidak mengubah file aplikasi.
- Simulasi hanya untuk QA alur update UI/IPC.

## Simulasi startup update otomatis

Jika ingin simulasi berjalan otomatis saat startup Electron dev:

```bash
ELECTRON_UPDATE_SIMULATION=1 npm run dev:electron
```

Di Windows CMD:

```bat
set ELECTRON_UPDATE_SIMULATION=1
npm run dev:electron
```

Atau gunakan script lintas platform:

```bash
npm run dev:electron:update-sim
```

## Cara kerja auto-update produksi

1. Aplikasi packaged start.
2. `electron/updater.ts` menjalankan `autoUpdater.checkForUpdates()` setelah delay startup.
3. `electron-updater` membaca metadata GitHub Release (`latest.yml`).
4. Jika versi GitHub Release lebih tinggi dari versi terinstall, update diunduh di background.
5. Renderer menampilkan notifikasi update.
6. User klik **Install & Restart**.
7. Aplikasi restart dan versi baru aktif.

## Checklist release produksi

- [ ] Node.js sesuai `.nvmrc` (`22.12.0` atau Node 22 LTS).
- [ ] `npm ci` bersih.
- [ ] `npm run release:check` pass.
- [ ] `CHANGELOG.md` sudah diisi.
- [ ] `package.json` dan `package-lock.json` versi sama.
- [ ] Installer Windows berhasil dibuat.
- [ ] Installer dites di Windows bersih atau VM.
- [ ] Login, seed awal, tambah layanan, transaksi POS, transaksi agen, printer, backup, dan WhatsApp owner dites.
- [ ] Git tag `vX.Y.Z` dibuat dan dipush.
- [ ] GitHub Release berisi installer dan `latest.yml`.
- [ ] Komputer dengan versi lama berhasil menerima update.

## Troubleshooting

### Aplikasi tidak menemukan update

Cek:

- Versi GitHub Release harus lebih tinggi dari versi aplikasi terinstall.
- Release harus published, bukan draft.
- `latest.yml` harus ikut terupload.
- `electron-builder.yml` bagian `publish` harus mengarah ke repo benar.

### Update terunduh tapi gagal install

Cek:

- Aplikasi tidak sedang dibuka lebih dari satu instance.
- Antivirus tidak mengunci installer.
- User punya permission write ke folder install.

### Ingin rollback

Publish versi baru yang lebih tinggi berisi fix rollback. Jangan rely pada downgrade otomatis karena `allowDowngrade` diset `false`.
