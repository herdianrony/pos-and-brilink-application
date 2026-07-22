export function exportCsvFile(
  filename: string,
  rows: Array<Record<string, string | number | null | undefined>>,
) {
  if (rows.length === 0) {
    throw new Error("Tidak ada data untuk diunduh");
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
