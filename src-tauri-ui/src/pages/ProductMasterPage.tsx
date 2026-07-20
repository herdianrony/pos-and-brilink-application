import type { CategoryRow, ProductRow } from "../api";
import { Badge, Button, Card, CardHeader, EmptyState } from "../components/ui";
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
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Data Master</p>
          <h1>Produk & Kategori</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={onAddCategory}>Tambah Kategori</Button>
          <Button onClick={onAddProduct}>Tambah Produk</Button>
        </div>
      </div>
      <div className="page-help">
        <strong>Halaman ini dibuat bersih:</strong>
        <span>Daftar produk fokus di satu halaman.</span>
        <span>Tambah/edit produk dibuka lewat dialog agar tidak menumpuk.</span>
      </div>
      <section className="grid product-master-grid">
        <Card>
          <CardHeader>
            <div>
              <h2>Kategori</h2>
              <p>Gunakan kategori untuk mempercepat pencarian produk di kasir.</p>
            </div>
          </CardHeader>
          {categories.length === 0 ? (
            <EmptyState compact title="Belum ada kategori" description="Klik Tambah Kategori untuk membuat kategori pertama." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => <Badge key={category.id}>{category.name}</Badge>)}
            </div>
          )}
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <div>
              <h2>Daftar Produk</h2>
              <p>{products.length} produk ditampilkan. Gunakan pencarian di atas untuk memfilter.</p>
            </div>
          </CardHeader>
          <div className="grid gap-2.5">
            {products.length === 0 ? (
              <EmptyState title="Produk tidak ditemukan" description="Tambahkan produk baru atau ubah kata kunci pencarian." />
            ) : products.map((product) => (
              <div key={product.id} className="grid items-center gap-3.5 rounded-[20px] border border-slate-200 bg-white p-3.5 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="grid min-w-0 gap-1">
                  <strong className="truncate">{product.name}</strong>
                  <small className="text-slate-500">{product.category_name || "Tanpa kategori"} • {product.unit}</small>
                  <small className="text-slate-500">HPP {formatRupiah(product.buy_price)} • Jual {formatRupiah(product.sell_price)}</small>
                </div>
                <div className="grid gap-1.5 text-left lg:justify-items-end lg:text-right">
                  <strong>{formatRupiah(product.sell_price)}</strong>
                  <Badge tone={product.stock <= product.min_stock ? "warning" : "success"}>Stok {product.stock}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="secondary" onClick={() => onEditProduct(product)}>Edit</Button>
                  <Button variant="danger" onClick={() => onRemoveProduct(product)}>Nonaktifkan</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
