import { Download, Package } from "lucide-react";
import type { ProductRow } from "../../api";
import { formatRupiah } from "../../lib/format";
import { Badge, Button, Card, EmptyState } from "../../components/ui";
import { StatCards } from "./helpers";

export function ProductsTab({ products, onExportCsv }: { products: ProductRow[]; onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void }) {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Produk">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Package size={18} className="text-emerald-500" /><h3 className="text-base font-extrabold text-slate-900">Ringkasan Produk</h3></div>
          <Button variant="secondary" size="sm" onClick={() => onExportCsv("produk-catatagen.csv", products.map((p) => ({ nama: p.name, barcode: p.barcode, kategori: p.category_name, harga_beli: p.buy_price, harga_jual: p.sell_price, stok: p.stock, min_stok: p.min_stock })))}><Download size={14} /> Unduh CSV</Button>
        </div>
        <StatCards stats={[
          { label: "Total Produk", value: products.length },
          { label: "Aktif", value: products.filter((p) => p.is_active).length },
          { label: "Total Stok", value: products.reduce((s, p) => s + p.stock, 0) },
          { label: "Stok Rendah", value: products.filter((p) => p.stock <= p.min_stock).length },
        ]} />
        {products.length === 0 ? <EmptyState compact title="Belum ada produk" /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Daftar Produk</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Nama</th><th className="py-3 pr-4">Kategori</th><th className="py-3 pr-4 text-right">Harga Beli</th><th className="py-3 pr-4 text-right">Harga Jual</th><th className="py-3 pr-4 text-right">Stok</th><th className="py-3 text-center">Status</th></tr></thead>
              <tbody>{products.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{p.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.category_name || "—"}</td>
                  <td className="py-3 pr-4 text-right text-slate-600">{formatRupiah(p.buy_price)}</td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(p.sell_price)}</td>
                  <td className="py-3 pr-4 text-right"><span className={p.stock <= p.min_stock ? "text-red-600 font-bold" : "text-slate-600"}>{p.stock}</span></td>
                  <td className="py-3 text-center">{p.is_active ? <Badge variant="success">Aktif</Badge> : <Badge variant="default">Nonaktif</Badge>}</td>
                </tr>
              ))}</tbody>
            </table>
            {products.length > 50 && <p className="text-xs text-slate-500 text-center pt-3">Menampilkan 50 dari {products.length} produk</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
