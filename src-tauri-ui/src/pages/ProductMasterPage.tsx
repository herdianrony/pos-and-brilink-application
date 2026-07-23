import { useState } from "react";
import { Package, Pencil, Trash2, Search } from "lucide-react";
import type { CategoryRow, ProductRow } from "../api";
import { Button, Card, EmptyState, Badge, Spinner } from "../components/ui";
import { formatRupiah } from "../lib/format";

export function ProductMasterPage({
  categories,
  products,
  onAddCategory,
  onAddProduct,
  onEditProduct,
  onRemoveProduct,
}: {
  categories: CategoryRow[];
  products: ProductRow[];
  onAddCategory: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: ProductRow) => void;
  onRemoveProduct: (product: ProductRow) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = products.filter((product) => {
    const q = search.toLowerCase();
    return (
      product.name.toLowerCase().includes(q) ||
      (product.category_name ?? "").toLowerCase().includes(q) ||
      product.barcode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-emerald-500" /> Produk
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola daftar produk, kategori, dan harga jual.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Button variant="secondary" size="sm" onClick={onAddCategory}>
            Tambah Kategori
          </Button>
          <Button size="sm" onClick={onAddProduct}>
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Cari produk, kategori, atau barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </div>

      {/* ── Table ── */}
      <Card>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package size={32} className="text-slate-300" />}
              title={products.length === 0 ? "Belum ada produk" : "Produk tidak ditemukan"}
              description={
                products.length === 0
                  ? "Klik \"Tambah Produk\" untuk menambahkan produk pertama."
                  : "Ubah kata kunci pencarian untuk menemukan produk."
              }
            />
          ) : (
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Daftar produk</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">Nama</th>
                  <th className="px-5 py-4">Kategori</th>
                  <th className="px-5 py-4 text-right">Harga Beli</th>
                  <th className="px-5 py-4 text-right">Harga Jual</th>
                  <th className="px-5 py-4 text-center">Stok</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => {
                  const isLow = product.stock <= product.min_stock;
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/60 transition-colors duration-150"
                    >
                      {/* Nama */}
                      <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        {product.name}
                      </td>
                      {/* Kategori */}
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {product.category_name ?? (
                          <span className="text-slate-400">Tanpa kategori</span>
                        )}
                      </td>
                      {/* Harga Beli */}
                      <td className="px-5 py-4 text-right text-slate-600 whitespace-nowrap tabular-nums">
                        {formatRupiah(product.buy_price)}
                      </td>
                      {/* Harga Jual */}
                      <td className="px-5 py-4 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatRupiah(product.sell_price)}
                      </td>
                      {/* Stok */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <Badge variant={isLow ? "danger" : "success"}>
                          {product.stock}
                        </Badge>
                      </td>
                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Edit produk"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => onEditProduct(product)}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title="Hapus produk"
                            aria-label={`Hapus ${product.name}`}
                            onClick={() => onRemoveProduct(product)}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}