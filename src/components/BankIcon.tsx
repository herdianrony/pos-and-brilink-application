"use client";

import { cn } from "@/lib/utils";

/**
 * Daftar icon bank & fintech Indonesia yang tersedia.
 * File SVG ada di /public/icons/banks/{name}.svg
 * Sumber: https://github.com/hafidznoor/idn-finlogos
 */
export const BANK_ICONS = [
  // Bank besar
  "bca", "bri", "bni", "mandiri", "btn", "cimb-niaga", "danamon",
  "permata", "muamalat",
  // Bank daerah & lainnya
  "bank-bjb", "bank-jakarta", "bank-mayapada", "bank-nagari",
  "bank-sahabat-sampoerna",
  // E-wallet & payment
  "gopay", "ovo", "dana", "linkaja", "doku", "jenius", "astra-pay",
  // Service & tagihan
  "pln", "indihome", "pdam", "bpjs",
] as const;

export type BankIconName = (typeof BANK_ICONS)[number];

/**
 * Cek apakah nama icon adalah bank icon (bukan Lucide icon).
 */
export function isBankIcon(name: string | null | undefined): name is BankIconName {
  if (!name) return false;
  return (BANK_ICONS as readonly string[]).includes(name);
}

/**
 * Render bank icon dari file SVG di /public/icons/banks/.
 *
 * Pemakaian:
 *   <BankIcon name="bca" size={32} className="..." />
 *   <BankIcon name={acc.icon} fallback="landmark" />
 *
 * Jika name bukan bank icon, return null (caller harus fallback ke DynamicIcon).
 */
export function BankIcon({
  name,
  size = 24,
  className,
  rounded = true,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  if (!isBankIcon(name)) return null;
  return (
    <img
      src={`/icons/banks/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={cn(
        "object-contain",
        rounded && "rounded-lg",
        className
      )}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

export default BankIcon;
