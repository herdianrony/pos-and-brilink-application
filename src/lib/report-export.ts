"use client";

export interface ReportSection {
  title: string;
  html: string;
}

export interface BuildReportHtmlOptions {
  title: string;
  subtitle?: string;
  meta?: Array<[string, string | number | null | undefined]>;
  summary?: Array<{
    label: string;
    value: string;
    tone?: "default" | "success" | "danger" | "warning";
  }>;
  sections: ReportSection[];
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function reportTable(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
) {
  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${
          rows.length === 0
            ? `<tr><td colspan="${headers.length}" class="empty">Tidak ada data</td></tr>`
            : rows
                .map(
                  (row) =>
                    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
                )
                .join("")
        }
      </tbody>
    </table>`;
}

export function buildReportHtml(options: BuildReportHtmlOptions) {
  const generatedAt = new Date().toLocaleString("id-ID");
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; background: #fff; font-size: 11px; }
    .header { border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 14px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #064e3b; }
    .subtitle { margin: 0; color: #64748b; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 18px; margin: 12px 0; }
    .meta div { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; gap: 12px; }
    .meta span:first-child { color: #64748b; font-weight: 700; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 14px 0; }
    .card { border: 1px solid #dbeafe; border-radius: 10px; padding: 9px; background: #f8fafc; }
    .card .label { color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .card .value { font-size: 14px; font-weight: 800; margin-top: 3px; }
    .card.success .value { color: #059669; }
    .card.danger .value { color: #dc2626; }
    .card.warning .value { color: #d97706; }
    h2 { font-size: 14px; margin: 18px 0 8px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th { background: #ecfdf5; color: #065f46; border: 1px solid #bbf7d0; padding: 6px; text-align: left; font-size: 10px; }
    td { border: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
    td:nth-child(n+3), th:nth-child(n+3) { text-align: right; }
    .empty { text-align: center !important; color: #94a3b8; padding: 16px; }
    .footer { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 8px; color: #64748b; font-size: 9px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(options.title)}</h1>
    ${options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : ""}
  </div>
  ${options.meta?.length ? `<div class="meta">${options.meta.map(([k, v]) => `<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(v ?? "—")}</strong></div>`).join("")}</div>` : ""}
  ${options.summary?.length ? `<div class="summary">${options.summary.map((item) => `<div class="card ${item.tone || "default"}"><div class="label">${escapeHtml(item.label)}</div><div class="value">${escapeHtml(item.value)}</div></div>`).join("")}</div>` : ""}
  ${options.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${section.html}</section>`).join("")}
  <div class="footer">Dicetak/dibuat: ${escapeHtml(generatedAt)} — POS & Agen Bisnis</div>
</body>
</html>`;
}

export async function exportReportPdf(html: string, defaultFilename: string) {
  if (typeof window !== "undefined" && window.electronAPI?.report?.savePdf) {
    return window.electronAPI.report.savePdf({
      html,
      defaultPath: defaultFilename,
    });
  }

  const win = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=1000,height=800",
  ) as unknown as Window | null;
  if (!win) return { ok: false, error: "Popup diblokir browser" };
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return { ok: true, browserPrint: true };
}
