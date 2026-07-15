"use client";

import { cn } from "@/lib/utils";
import { DynamicIcon } from "./DynamicIcon";
import { BankIcon, isBankIcon } from "./BankIcon";
import { AlertTriangle, Wifi, Pencil, Trash2 } from "lucide-react";

export interface AccountData {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  balance: string | number;
  minBalance?: string | number | null;
  isActive?: boolean;
}

/**
 * AccountCard — kartu saldo bergaya kartu kredit/bank card.
 *
 * Fitur:
 * - Gradient background dari account.color
 * - Chip kartu (untuk rekening bank)
 * - Contactless icon (Wifi rotated) seperti kartu kredit modern
 * - Bank icon di pojok kanan atas
 * - Nama akun + balance prominent
 * - Min balance indicator
 * - Hover: lift effect (no 3D rotation)
 * - Low balance warning (AlertTriangle)
 * - Optional action buttons di dalam card (bawah)
 */
export function AccountCard({
  account,
  onClick,
  compact = false,
  actions,
  onEdit,
  onDelete,
}: {
  account: AccountData;
  onClick?: () => void;
  compact?: boolean;
  /** Custom action buttons rendered di dalam card (bottom row) */
  actions?: React.ReactNode;
  /** Show edit button on hover (top-right) */
  onEdit?: () => void;
  /** Show delete button on hover (top-right). Only shown if provided. */
  onDelete?: () => void;
}) {
  const balance = parseFloat(String(account.balance)) || 0;
  const minBalance = account.minBalance
    ? parseFloat(String(account.minBalance)) || 0
    : 0;
  const isLow = balance < minBalance;
  const isCash = account.code === "cash";

  // Warna kartu — gunakan color dari account, fallback ke default
  const cardColor = account.color || (isCash ? "#22c55e" : "#0F172A");
  // Darken color for gradient bottom
  const cardColorDark = darkenColor(cardColor, 25);
  // Lighter accent for top-right decoration
  const cardColorLight = lightenColor(cardColor, 15);

  // Format balance
  const formattedBalance = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(balance);

  // Masked "card number" dari code (dummy untuk efek kartu kredit)
  const cardNumber = maskCardNumber(account.code);

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "group relative text-left w-full overflow-hidden block",
        "rounded-2xl shadow-pop hover:shadow-float transition-all duration-300",
        "hover:-translate-y-0.5",
        !onClick && "cursor-default",
      )}
      style={{
        background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColorDark} 100%)`,
      }}
    >
      {/* ── Decorative circles ──────────────────────── */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500"
        style={{ background: cardColorLight }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500"
        style={{ background: cardColorLight }}
      />

      {/* ── Subtle pattern overlay ──────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* ── Card content ────────────────────────────── */}
      <div className="relative p-4 text-white">
        {/* Top row: icon + low balance warning + contactless + edit/delete */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isBankIcon(account.icon) ? (
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1">
                <BankIcon name={account.icon} size={28} />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <DynamicIcon
                  name={account.icon}
                  fallback={isCash ? "wallet" : "landmark"}
                  size={18}
                  className="text-white"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium leading-tight">
                {isCash ? "Kas Tunai" : "Rekening"}
              </p>
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {account.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isLow && (
              <div
                className="w-7 h-7 rounded-xl bg-amber-400/30 backdrop-blur-sm flex items-center justify-center"
                title={`Saldo di bawah minimum: ${minBalance}`}
              >
                <AlertTriangle size={14} className="text-amber-200" />
              </div>
            )}
            {/* Contactless icon (rotated wifi) — seperti pada kartu kredit modern */}
            {!isCash && (
              <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center rotate-90">
                <Wifi size={14} className="text-white/70" />
              </div>
            )}
            {/* Edit & Delete buttons — always visible (P0: not hover-only for mobile/touch) */}
            {(onEdit || onDelete) && (
              <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity duration-200">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white"
                    title="Edit rekening"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {onDelete && !isCash && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="w-7 h-7 rounded-xl bg-red-500/30 hover:bg-red-500/50 backdrop-blur-sm flex items-center justify-center text-white"
                    title="Nonaktifkan rekening"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Middle: chip kartu (untuk non-cash) */}
        {!isCash && !compact && (
          <div className="flex items-center gap-2 my-3">
            <div className="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 relative overflow-hidden shadow-soft">
              {/* Chip pattern */}
              <div className="absolute inset-0.5 rounded-sm border border-yellow-600/30" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-600/30" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-yellow-600/30" />
              <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-sm border border-yellow-600/40" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-sm border border-yellow-600/40" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-sm border border-yellow-600/40" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-sm border border-yellow-600/40" />
            </div>
            <span className="text-[10px] font-mono text-white/60 tracking-wider">
              {cardNumber}
            </span>
          </div>
        )}

        {/* Balance section */}
        <div className={cn(!isCash && !compact && "mt-3")}>
          <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">
            Saldo {isCash ? "Tunai" : "Rekening"}
          </p>
          <p className="text-xl font-extrabold text-white tracking-tight">
            {formattedBalance}
          </p>
          {!compact && account.minBalance && (
            <p className="text-[10px] text-white/50 mt-0.5">
              Batas aman:{" "}
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(minBalance)}
            </p>
          )}
        </div>

        {/* Action buttons (di dalam card, bawah) */}
        {actions && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-white/15">
            {actions}
          </div>
        )}
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-x-12 -top-12 h-24 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-12 group-hover:translate-x-[300%] transition-transform duration-1000" />
      </div>
    </Wrapper>
  );
}

// ── Helpers ───────────────────────────────────────

function maskCardNumber(code: string): string {
  // Buat dummy card number dari code
  const padded = code.padEnd(8, "0").slice(0, 8);
  return `**** **** ${padded.slice(-4)}`;
}

function darkenColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(
      0,
      ((num >> 16) & 0xff) - Math.round(255 * (percent / 100)),
    );
    const g = Math.max(
      0,
      ((num >> 8) & 0xff) - Math.round(255 * (percent / 100)),
    );
    const b = Math.max(0, (num & 0xff) - Math.round(255 * (percent / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

function lightenColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(
      255,
      ((num >> 16) & 0xff) + Math.round(255 * (percent / 100)),
    );
    const g = Math.min(
      255,
      ((num >> 8) & 0xff) + Math.round(255 * (percent / 100)),
    );
    const b = Math.min(255, (num & 0xff) + Math.round(255 * (percent / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

export default AccountCard;
