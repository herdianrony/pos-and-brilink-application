import type { DatePreset } from "@/types/rekening-koran";

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getMonthDateRange(now = new Date()) {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toDateInputValue(firstDay), endDate: toDateInputValue(lastDay) };
}

export function getDatePresetRange(preset: DatePreset, now = new Date()) {
  let start = new Date(now);
  let end = new Date(now);

  switch (preset) {
    case "today":
      break;
    case "yesterday":
      start = end = new Date(now.getTime() - 86400000);
      break;
    case "week":
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "lastmonth":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
  }

  return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
