import type { FormEvent } from "react";
import type { CategoryRow } from "../api";
import { CurrencyInput } from "./CurrencyInput";

export function ProductDialogs({
  showCategoryModal,
  showProductModal,
  saving,
  editingProductId,
  categoryForm,
  productForm,
  categories,
  onCloseCategory,
  onCloseProduct,
  onCategoryFormChange,
  onProductFormChange,
  onSubmitCategory,
  onSubmitProduct,
}: {
  showCategoryModal: boolean;
  showProductModal: boolean;
  saving: boolean;
  editingProductId: number | null;
  categoryForm: { name: string; icon: string; color: string };
  productForm: {
    name: string;
    barcode: string;
    category_id: string;
    buy_price: string;
    sell_price: string;
    stock: string;
    min_stock: string;
    unit: string;
  };
  categories: CategoryRow[];
  onCloseCategory: () => void;
  onCloseProduct: () => void;
  onCategoryFormChange: (form: { name: string; icon: string; color: string }) => void;
  onProductFormChange: (form: {
    name: string;
    barcode: string;
    category_id: string;
    buy_price: string;
    sell_price: string;
    stock: string;
    min_stock: string;
    unit: string;
  }) => void;
  onSubmitCategory: (event: FormEvent) => void;
  onSubmitProduct: (event: FormEvent) => void;
}) {
  return (
    <>
      {showCategoryModal && (
        <div className="modal-backdrop">
          <section className="dialog-card small-dialog">
            <div className="card-header">
              <div><p className="eyebrow">Kategori</p><h2>Tambah Kategori</h2></div>
              <button className="secondary" onClick={onCloseCategory}>Tutup</button>
            </div>
            <form onSubmit={onSubmitCategory} className="dialog-form">
              <label>Nama Kategori<input autoFocus placeholder="Contoh: Rokok, Snack, Aksesoris" value={categoryForm.name} onChange={(e) => onCategoryFormChange({ ...categoryForm, name: e.target.value })} /></label>
              <div className="modal-actions"><button className="secondary" type="button" onClick={onCloseCategory}>Batal</button><button type="submit" disabled={saving}>Simpan Kategori</button></div>
            </form>
          </section>
        </div>
      )}
      {showProductModal && (
        <div className="modal-backdrop">
          <section className="dialog-card product-dialog">
            <div className="card-header">
              <div><p className="eyebrow">Produk</p><h2>{editingProductId ? "Edit Produk" : "Tambah Produk"}</h2></div>
              <button className="secondary" onClick={onCloseProduct}>Tutup</button>
            </div>
            <form onSubmit={onSubmitProduct} className="dialog-form product-form no-box">
              <label>Nama Produk<input autoFocus value={productForm.name} onChange={(e) => onProductFormChange({ ...productForm, name: e.target.value })} /></label>
              <label>Barcode<input value={productForm.barcode} onChange={(e) => onProductFormChange({ ...productForm, barcode: e.target.value })} placeholder="Opsional" /></label>
              <label>Kategori<select value={productForm.category_id} onChange={(e) => onProductFormChange({ ...productForm, category_id: e.target.value })}>
                <option value="">Tanpa kategori</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select></label>
              <label>Satuan<input value={productForm.unit} onChange={(e) => onProductFormChange({ ...productForm, unit: e.target.value })} /></label>
              <label>Harga Beli / HPP<CurrencyInput value={productForm.buy_price} onChange={(value) => onProductFormChange({ ...productForm, buy_price: value })} /></label>
              <label>Harga Jual<CurrencyInput value={productForm.sell_price} onChange={(value) => onProductFormChange({ ...productForm, sell_price: value })} /></label>
              <label>Stok<input type="number" min="0" value={productForm.stock} onChange={(e) => onProductFormChange({ ...productForm, stock: e.target.value })} /></label>
              <label>Minimum Stok<input type="number" min="0" value={productForm.min_stock} onChange={(e) => onProductFormChange({ ...productForm, min_stock: e.target.value })} /></label>
              <div className="modal-actions span-2"><button className="secondary" type="button" onClick={onCloseProduct}>Batal</button><button type="submit" disabled={saving}>{editingProductId ? "Simpan Perubahan" : "Simpan Produk"}</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
