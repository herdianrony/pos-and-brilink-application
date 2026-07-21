import { formatRupiah, parseCurrencyInput } from "../lib/format";

export function CurrencyInput({
  value,
  onChange,
  allowNegative = false,
  placeholder = "Rp0",
}: {
  value: string;
  onChange: (value: string) => void;
  allowNegative?: boolean;
  placeholder?: string;
}) {
  const displayValue = value && value !== "-" ? formatRupiah(Number(value)) : value;
  return (
    <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={(event) => onChange(parseCurrencyInput(event.target.value, allowNegative))}
      onFocus={(event) => event.currentTarget.select()}
    />
  );
}
