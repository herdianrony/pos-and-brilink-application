import type { CategoryRow, ProductRow } from "../api";
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
          <button className="secondary" onClick={onAddCategory}>Tambah Kategori</button>
          <button onClick={onAddProduct}>Tambah Produk</button>
        </div>
      </div>
      <div className="page-help">
        <strong>Halaman ini dibuat bersih:</strong>
        <span>Daftar produk fokus di satu halaman.</span>
        <span>Tambah/edit produk dibuka lewat dialog agar tidak menumpuk.</span>
      </div>
      <section className="grid product-master-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Kategori</h2>
              <p>Gunakan kategori untuk mempercepat pencarian produk di kasir.</p>
            </div>
          </div>
          {categories.length === 0 ? (
            <div className="empty-state compact">
              <strong>Belum ada kategori</strong>
              <span>Klik Tambah Kategori untuk membuat kategori pertama.</span>
            </div>
          ) : (
            <div className="category-chip-list">
              {categories.map((category) => <span key={category.id} className="category-chip">{category.name}</span>)}
            </div>
          )}
        </div>
        <div className="card product-list-card">
          <div className="card-header">
            <div>
              <h2>Daftar Produk</h2>
              <p>{products.length} produk ditampilkan. Gunakan pencarian di atas untuk memfilter.</p>
            </div>
          </div>
          <div className="admin-product-list">
            {products.length === 0 ? (
              <div className="empty-state">
                <strong>Produk tidak ditemukan</strong>
                <span>Tambahkan produk baru atau ubah kata kunci pencarian.</span>
              </div>
            ) : products.map((product) => (
              <div key={product.id} className="admin-product-row">
                <div className="product-main">
                  <strong>{product.name}</strong>
                  <small>{product.category_name || "Tanpa kategori"} • {product.unit}</small>
                  <small>HPP {formatRupiah(product.buy_price)} • Jual {formatRupiah(product.sell_price)}</small>
                </div>
                <div className="product-meta">
                  <strong>{formatRupiah(product.sell_price)}</strong>
                  <span className={product.stock <= product.min_stock ? "stock-badge danger-stock" : "stock-badge"}>Stok {product.stock}</span>
                </div>
                <div className="product-actions">
                  <button className="secondary" onClick={() => onEditProduct(product)}>Edit</button>
                  <button className="danger" onClick={() => onRemoveProduct(product)}>Nonaktifkan</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
