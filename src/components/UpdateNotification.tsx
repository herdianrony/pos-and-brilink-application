"use client";

import { useEffect, useState } from "react";
import { DownloadCloud, X, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { isElectron } from "@/lib/hardware";

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface ProgressInfo {
  percent: number;
  transferred: number;
  total: number;
}

export default function UpdateNotification() {
  const [available, setAvailable] = useState<UpdateInfo | null>(null);
  const [downloaded, setDownloaded] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [electronAvail, setElectronAvail] = useState(false);

  useEffect(() => {
    setElectronAvail(isElectron());
  }, []);

  useEffect(() => {
    if (!electronAvail || !window.electronAPI) return;

    const api = window.electronAPI;
    api.update.onUpdateAvailable((info) => {
      setAvailable(info);
      setDismissed(false);
    });
    api.update.onUpdateDownloaded((info) => {
      setDownloaded(info);
      setAvailable(null);
      setProgress(null);
    });
    api.update.onUpdateProgress((p) => {
      setProgress(p);
    });
    api.update.onUpdateError((e) => {
      setError(e.message);
    });
  }, [electronAvail]);

  // Auto-dismiss error after 10s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(t);
    }
  }, [error]);

  if (!electronAvail) return null;
  if (dismissed && !downloaded) return null;

  // Update sudah didownload — prompt install
  if (downloaded) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-slideUp">
        <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm">
                Update v{downloaded.version} Siap Dipasang
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Restart aplikasi untuk menginstal pembaruan.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => window.electronAPI?.update.install()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                >
                  Install & Restart
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
                >
                  Nanti
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sedang download
  if (progress) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-slideUp">
        <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw size={18} className="text-blue-500 animate-spin" />
            <div>
              <h4 className="font-bold text-gray-800 text-sm">Mengunduh Update...</h4>
              <p className="text-xs text-gray-500">
                {progress.percent.toFixed(0)}% • {(progress.transferred / 1024 / 1024).toFixed(1)}MB / {(progress.total / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Update tersedia — tunggu download selesai otomatis
  if (available && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-slideUp">
        <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <DownloadCloud size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm">
                Update v{available.version} Tersedia
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Sedang mengunduh di background...
              </p>
              {available.releaseNotes && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                  {available.releaseNotes}
                </p>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-slideUp">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm">Gagal Cek Update</h4>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
