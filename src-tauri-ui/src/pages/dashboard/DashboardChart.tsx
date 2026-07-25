import { useEffect, useRef } from "react";
import { formatRupiah } from "../../lib/format";
import {
  Chart,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(BarController, LineController, BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

function compactRupiah(value: number) {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}rb`;
  return `Rp${value}`;
}

export function DashboardChart({ data, showProfit }: { data: Array<{ label: string; revenue: number; profit: number; count: number }>; showProfit: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            type: "line" as const,
            label: "Omzet",
            data: data.map((d) => d.revenue),
            borderColor: "#00875A",
            backgroundColor: "rgba(0,135,90,0.08)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: "#00875A",
            yAxisID: "y",
            order: 1,
          },
          ...(showProfit
            ? [{ type: "bar" as const, label: "Profit", data: data.map((d) => d.profit), backgroundColor: "#10b981", borderRadius: 8, borderSkipped: false, yAxisID: "y", order: 2 }]
            : []),
          {
            type: "line" as const,
            label: "Transaksi",
            data: data.map((d) => d.count),
            borderColor: "#f59e0b",
            borderWidth: 2,
            borderDash: [5, 3],
            pointRadius: 3,
            pointBackgroundColor: "#f59e0b",
            fill: false,
            tension: 0.3,
            yAxisID: "y1",
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { font: { size: 11, weight: "bold" }, padding: 12 } },
          tooltip: {
            backgroundColor: "white",
            titleColor: "#1e293b",
            bodyColor: "#475569",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            titleFont: { weight: "bold" as const, size: 12 },
            callbacks: { label: (ctx: any) => ctx.dataset.label === "Transaksi" ? `${ctx.dataset.label}: ${ctx.parsed.y}` : `${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: "bold" as const }, color: "#64748b" } },
          y: { position: "left", grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 }, color: "#94a3b8", callback: (value: any) => compactRupiah(Number(value)) } },
          y1: { position: "right", grid: { display: false }, ticks: { font: { size: 10 }, color: "#94a3b8", stepSize: 1, callback: (value: any) => Number(value) } },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, showProfit]);

  return <canvas ref={canvasRef} />;
}
