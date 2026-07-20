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
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={(event) => onChange(parseCurrencyInput(event.target.value, allowNegative))}
      onFocus={(event) => event.currentTarget.select()}
    />
  );
}
