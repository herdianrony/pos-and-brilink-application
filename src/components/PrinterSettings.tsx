"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Select, Spinner, Badge } from "@/components/ui";
import { Printer, Wifi, Usb, Cable, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import {
  isElectron,
  loadPrinterConfig,
  savePrinterConfig,
  testPrinter,
  checkPrinterStatus,
} from "@/lib/hardware";
import type { PrinterConfig } from "@/types/electron";

export default function PrinterSettings() {
  const [config, setConfig] = useState<PrinterConfig>({
    type: "network",
    host: "192.168.1.87",
    port: 9100,
    width: 32,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [statusResult, setStatusResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const electronAvailable = isElectron();

  useEffect(() => {
    (async () => {
      const cfg = await loadPrinterConfig();
      if (cfg) setConfig(cfg);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    await savePrinterConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    await savePrinterConfig(config); // pastikan config tersimpan sebelum test
    const result = await testPrinter();
    setTestResult(result);
    setTesting(false);
  }

  async function checkStatus() {
    setChecking(true);
    setStatusResult(null);
    const result = await checkPrinterStatus();
    setStatusResult(result);
    setChecking(false);
  }

  if (loading) return <Spinner />;

  return (
    <Card className="p-6 space-y-5">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-3">
        <Printer size={18} className="text-purple-500" /> Pengaturan Printer Thermal
      </h3>

      {!electronAvailable && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Mode Web — Printer thermal tidak tersedia</p>
            <p className="text-xs mt-1">
              Cetak struk langsung ke printer thermal hanya berfungsi di aplikasi desktop (Electron).
              Di mode web, gunakan tombol "Cetak (Browser)" untuk cetak via dialog browser.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Tipe Koneksi"
          value={config.type}
          onChange={(e) => setConfig({ ...config, type: e.target.value as PrinterConfig["type"] })}
        >
          <option value="network">Network (LAN/WiFi) — Recommended</option>
          <option value="usb">USB (Direct)</option>
          <option value="serial">Serial (COM)</option>
        </Select>
        <Select
          label="Lebar Kertas"
          value={String(config.width || 32)}
          onChange={(e) => setConfig({ ...config, width: Number(e.target.value) as 32 | 48 })}
        >
          <option value="32">58mm (32 karakter)</option>
          <option value="48">80mm (48 karakter)</option>
        </Select>
      </div>

      {config.type === "network" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
          <Input
            label="IP Address Printer"
            value={config.host || ""}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder="192.168.1.87"
          />
          <Input
            label="Port"
            type="number"
            value={String(config.port || 9100)}
            onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
            placeholder="9100"
          />
        </div>
      )}

      {config.type === "serial" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
          <Input
            label="Interface (COM Port)"
            value={config.interface || ""}
            onChange={(e) => setConfig({ ...config, interface: e.target.value })}
            placeholder="COM1 (Windows) / /dev/ttyUSB0 (Linux)"
          />
          <Input
            label="Baud Rate"
            type="number"
            value={String(config.baudRate || 9600)}
            onChange={(e) => setConfig({ ...config, baudRate: Number(e.target.value) })}
            placeholder="9600"
          />
        </div>
      )}

      {config.type === "usb" && (
        <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs animate-fadeIn">Pastikan driver printer USB sudah terinstall di Windows. Interface
          default USB akan dideteksi otomatis oleh sistem.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
        <Button onClick={save} disabled={saving} variant="primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button
          onClick={checkStatus}
          disabled={!electronAvailable || checking}
          variant="secondary"
        >
          {checking ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
          Cek Status
        </Button>
        <Button
          onClick={test}
          disabled={!electronAvailable || testing}
          variant="accent"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {testing ? "Mencetak..." : "Test Print"}
        </Button>
        {saved && (
          <Badge variant="success">Tersimpan</Badge>
        )}
      </div>

      {/* Status & Test results */}
      {statusResult && (
        <div
          className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn ${
            statusResult.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {statusResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>
            {statusResult.ok
              ? "Printer terhubung dan siap digunakan"
              : `Gagal terhubung: ${statusResult.error}`}
          </span>
        </div>
      )}

      {testResult && (
        <div
          className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn ${
            testResult.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>
            {testResult.ok
              ? "Test print berhasil — periksa printer Anda"
              : `Test print gagal: ${testResult.error}`}
          </span>
        </div>
      )}

      {/* Panduan koneksi */}
      <div className="text-xs text-gray-400 space-y-1.5 pt-3 border-t border-gray-100">
        <p className="font-semibold text-gray-500">Panduan:</p>
        <p>• <strong>Network</strong>: Hubungkan printer ke WiFi/router, set IP static, masukkan IP di atas.</p>
        <p>• <strong>USB</strong>: Sambungkan kabel USB, install driver dari pabrikan.</p>
        <p>• <strong>Serial</strong>: Pilih COM port yang sesuai (cek di Device Manager).</p>
        <p>• Test print mengirim 1 baris "Test Printer OK" untuk verifikasi.</p>
      </div>
    </Card>
  );
}
