import { useEffect, useState, useCallback } from "react";
import { MessageCircle, RefreshCw, Wifi, WifiOff, QrCode, LogOut, Loader2, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { whatsappStatus, whatsappStart, whatsappRestart, whatsappLogout, type WhatsAppStatus } from "../../api";
import { Card, Button, EmptyState } from "../../components/ui";
import { cn } from "../../lib/cn";

export function WhatsAppPage({ saving, onMessage }: { saving: boolean; onMessage: (msg: string) => void }) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await whatsappStatus();
      setStatus(s);
      if (s.qr_code) setQrCode(s.qr_code);
    } catch {
      // WhatsApp not available
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 10_000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  async function handleStart() {
    setLoading(true);
    try {
      await whatsappStart();
      onMessage("WhatsApp sedang dimulai...");
      // Poll for QR code
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const s = await whatsappStatus();
        setStatus(s);
        if (s.qr_code) { setQrCode(s.qr_code); break; }
        if (s.running) break;
      }
    } catch (e) {
      onMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestart() {
    setLoading(true);
    try {
      await whatsappRestart();
      onMessage("WhatsApp sedang di-restart...");
      setQrCode(null);
      await new Promise((r) => setTimeout(r, 3000));
      await refreshStatus();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await whatsappLogout();
      onMessage("WhatsApp berhasil di-logout");
      setQrCode(null);
      await refreshStatus();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const isConnected = status?.running && status?.sidecar_status === "ready";
  const isRunning = status?.running;
  const hasError = status?.error;

  return (
    <div className="space-y-5" role="tabpanel" aria-label="WhatsApp">
      {/* Status Card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              isConnected ? "bg-emerald-100 text-emerald-600" : isRunning ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
            )}>
              {isConnected ? <Wifi size={22} /> : isRunning ? <Loader2 size={22} className="animate-spin" /> : <WifiOff size={22} />}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Status WhatsApp</h3>
              <p className="text-sm text-slate-500">
                {isConnected ? "Terhubung dan siap mengirim notifikasi" : isRunning ? "Sedang berjalan..." : "Belum terhubung"}
              </p>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold",
            isConnected ? "bg-emerald-100 text-emerald-700" : isRunning ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
          )}>
            {isConnected ? "Terhubung" : isRunning ? "Berjalan" : "Offline"}
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Status Sidecar</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{status?.sidecar_status || "idle"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Auto Notify</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{status?.auto_notify_owner ? "Aktif" : "Nonaktif"}</p>
          </div>
          {status?.owner_number && (
            <div className="rounded-xl bg-slate-50 p-3 col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Nomor Owner</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{status.owner_number}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {hasError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-none" />
            <div>
              <p className="font-bold text-red-700 text-sm">Error</p>
              <p className="text-xs text-red-600 mt-1">{status?.error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              {loading ? "Memulai..." : "Mulai WhatsApp"}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleRestart} disabled={loading}>
                <RefreshCw size={16} /> Restart
              </Button>
              <Button variant="danger" onClick={handleLogout} disabled={loading}>
                <LogOut size={16} /> Logout
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={refreshStatus} disabled={loading}>
            <RefreshCw size={16} /> Refresh Status
          </Button>
        </div>
      </Card>

      {/* QR Code */}
      {qrCode && !isConnected && (
        <Card className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode size={20} className="text-primary" />
            <h3 className="font-extrabold text-slate-900">Scan QR Code</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Buka WhatsApp di ponsel → Pengaturan → Perangkat Tertaut → Tautkan Perangkat
          </p>
          <div className="inline-block rounded-2xl border-2 border-slate-200 bg-white p-4">
            <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
          </div>
          <p className="text-xs text-slate-400 mt-3">QR code akan kedaluwarsa dalam 60 detik</p>
        </Card>
      )}

      {/* Connected success */}
      {isConnected && (
        <Card className="p-5 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-emerald-800">WhatsApp Terhubung</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Notifikasi otomatis akan dikirim ke owner saat transaksi agen tercatat.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Info card */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-700">Tentang Fitur WhatsApp</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p>• Notifikasi otomatis dikirim ke owner saat kasir mencatat transaksi agen (tarik tunai, setor, transfer, payment, topup)</p>
          <p>• Menggunakan WhatsApp Web (Baileys) — bukan API resmi Meta</p>
          <p>• Session tersimpan lokal di perangkat, tidak di server</p>
          <p>• Jangan digunakan untuk spam/broadcast massal</p>
          <p>• Jika WhatsApp belum terhubung, transaksi tetap tersimpan — hanya notifikasi yang tidak terkirim</p>
        </div>
      </Card>
    </div>
  );
}
