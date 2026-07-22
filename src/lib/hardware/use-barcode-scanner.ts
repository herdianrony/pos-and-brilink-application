"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook untuk deteksi input dari USB barcode scanner.
 *
 * Mayoritas barcode scanner di pasar Indonesia berfungsi sebagai
 * "USB HID Keyboard" — artinya mereka "mengetik" karakter barcode
 * diakhiri Enter, dengan kecepatan sangat cepat (>50 karakter/detik).
 *
 * Strategi deteksi:
 * - Karakter datang dengan interval < 50ms (manusia tidak bisa secepat itu)
 * - Diakhiri tombol Enter (keyCode 13)
 * - Total panjang minimal 3 karakter
 *
 * Pemakaian:
 *   const { barcode, isScanning } = useBarcodeScanner();
 *   useEffect(() => {
 *     if (barcode) handleScan(barcode);
 *   }, [barcode]);
 *
 * Atau dengan callback:
 *   useBarcodeScanner({ onScan: (code) => addToCart(code) });
 */
interface UseBarcodeScannerOptions {
  onScan?: (barcode: string) => void;
  /** Minimal karakter untuk dianggap barcode (default: 3) */
  minLength?: number;
  /** Maksimal interval antar karakter dalam ms (default: 50) */
  maxInterval?: number;
  /** Aktif/non-aktif (default: true) */
  enabled?: boolean;
  /** Selector elemen yang harus focus untuk trigger (default: document) */
  target?: HTMLElement | Document | null;
}

export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxInterval = 50,
  enabled = true,
  target,
}: UseBarcodeScannerOptions = {}) {
  const [barcode, setBarcode] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Skip jika user sedang mengetik di input field
      // (kecuali input field khusus barcode dengan data-barcode-input)
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !target.hasAttribute("data-barcode-input")
      ) {
        return;
      }

      // Skip modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;

      if (diff > maxInterval && bufferRef.current.length > 0) {
        // Reset — terlalu lambat, bukan scanner
        bufferRef.current = "";
        setIsScanning(false);
      }

      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= minLength) {
          const code = bufferRef.current;
          setBarcode(code);
          setIsScanning(false);
          if (onScan) onScan(code);
        }
        bufferRef.current = "";
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Hanya terima karakter yang bisa dicetak (1 karakter)
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        if (!isScanning) setIsScanning(true);

        // Auto-clear jika tidak ada input lanjutan
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = "";
          setIsScanning(false);
        }, 200);
      }
    };

    const el = target || document;
    el.addEventListener("keydown", handler as EventListener);

    return () => {
      el.removeEventListener("keydown", handler as EventListener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan, minLength, maxInterval, enabled, target, isScanning]);

  return { barcode, isScanning, setBarcode };
}
