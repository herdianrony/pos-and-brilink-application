"use client";

import { useState, useEffect } from "react";

/**
 * Settings global untuk branding & label yang bisa dikustomisasi.
 * Berguna agar aplikasi bisa dipakai untuk berbagai bisnis sejenis:
 * - BRILink
 * - Counter HP / Pulsa
 * - Agen pembayaran (PLN, PDAM, BPJS, dll)
 * - Toko kelontong dengan layanan agen
 * - Bisnis lain dengan model serupa
 */

export interface AppSettings {
  // Branding
  app_name: string;
  business_type: string;
  services_label: string;
  // Store info
  store_name: string;
  store_address: string;
  phone: string;
  agent_id: string;
  owner_name: string;
  opening_balance: string;
  // Tambahan
  [key: string]: string;
}

const DEFAULTS: AppSettings = {
  app_name: "POS & Agen Bisnis",
  business_type: "Agen Bisnis",
  services_label: "Layanan Agen",
  store_name: "",
  store_address: "",
  phone: "",
  agent_id: "",
  owner_name: "",
  opening_balance: "500000",
};

let cachedSettings: AppSettings | null = null;
const subscribers = new Set<(s: AppSettings) => void>();

/**
 * Hook untuk ambil settings di client component.
 * Settings di-cache agar tidak fetch berulang.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(cachedSettings || DEFAULTS);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        const merged = { ...DEFAULTS, ...data };
        cachedSettings = merged;
        setSettings(merged);
        setLoading(false);
      })
      .catch(() => {
        setSettings(DEFAULTS);
        setLoading(false);
      });
  }, []);

  // Subscribe to updates
  useEffect(() => {
    const cb = (s: AppSettings) => setSettings(s);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return { settings, loading };
}

/**
 * Update settings dan broadcast ke semua subscriber.
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Gagal menyimpan settings");
  // Refresh cache
  cachedSettings = { ...(cachedSettings || DEFAULTS), ...updates } as AppSettings;
  // Broadcast
  subscribers.forEach((cb) => cb(cachedSettings!));
}

/**
 * Refresh settings dari server (untuk invalidation).
 */
export async function refreshSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  const data = await res.json();
  cachedSettings = { ...DEFAULTS, ...data } as AppSettings;
  subscribers.forEach((cb) => cb(cachedSettings!));
  return cachedSettings;
}

/**
 * Default values untuk dipakai saat settings belum dimuat.
 */
export const DEFAULT_SETTINGS = DEFAULTS;
