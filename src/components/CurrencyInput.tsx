"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * CurrencyInput — input field dengan auto-format Rupiah.
 *
 * Fitur:
 * - Auto-format: ketik "50000" → tampil "Rp 50.000"
 * - Value selalu number (onChange returns number)
 * - Prefix "Rp " otomatis
 * - Thousand separator titik (id-ID)
 * - Paste support (strip non-digit)
 * - Keyboard: hanya menerima angka, backspace, delete, arrow, tab
 *
 * Pemakaian:
 *   <CurrencyInput label="Harga Jual" value={price} onChange={setPrice} />
 *   <CurrencyInput value={amount} onChange={(v) => setAmount(v)} placeholder="0" />
 */

interface CurrencyInputProps {
  label?: string;
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  min?: number;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = "0",
  className,
  autoFocus,
  disabled,
  required,
  min = 0,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState("");

  // Sync external value → display
  useEffect(() => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) {
      setDisplayValue("");
    } else {
      setDisplayValue(formatRupiahInput(num));
    }
  }, [value]);

  function formatRupiahInput(num: number): string {
    return new Intl.NumberFormat("id-ID").format(num);
  }

  function parseRupiahInput(str: string): number {
    // Strip everything except digits
    const digits = str.replace(/\D/g, "");
    if (!digits) return 0;
    return parseInt(digits, 10);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    const clamped = Math.max(min, num);
    setDisplayValue(clamped > 0 ? formatRupiahInput(clamped) : "");
    onChange(clamped);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow: backspace, delete, tab, escape, enter, arrows, home, end
    const allowed = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End",
    ];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }
    // Block non-digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const num = parseRupiahInput(text);
    const clamped = Math.max(min, num);
    setDisplayValue(clamped > 0 ? formatRupiahInput(clamped) : "");
    onChange(clamped);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    // Select all on focus for quick edit
    setTimeout(() => e.target.select(), 0);
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-bold text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
          Rp
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className={cn(
            "w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50",
            "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
            "transition-all text-sm font-bold placeholder:text-slate-300 placeholder:font-normal",
            "hover:border-slate-300",
            disabled && "opacity-40 cursor-not-allowed",
            className
          )}
        />
      </div>
    </div>
  );
}

export default CurrencyInput;
