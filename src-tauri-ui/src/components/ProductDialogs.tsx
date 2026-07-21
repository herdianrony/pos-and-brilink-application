import type { FormEvent } from "react";
import type { CategoryRow } from "../api";
import { Button, Field, Modal } from "./ui";
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
        <Modal size="sm" eyebrow="Kategori" title="Tambah Kategori" onClose={onCloseCategory}>
          <form onSubmit={onSubmitCategory} className="grid gap-3.5">
            <Field label="Nama Kategori">
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" autoFocus placeholder="Contoh: Rokok, Snack, Aksesoris" value={categoryForm.name} onChange={(e) => onCategoryFormChange({ ...categoryForm, name: e.target.value })} />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden"><Button variant="secondary" type="button" onClick={onCloseCategory}>Batal</Button><Button type="submit" disabled={saving}>Simpan Kategori</Button></div>
          </form>
        </Modal>
      )}
      {showProductModal && (
        <Modal size="lg" eyebrow="Produk" title={editingProductId ? "Edit Produk" : "Tambah Produk"} onClose={onCloseProduct}>
          <form onSubmit={onSubmitProduct} className="grid gap-3.5 md:grid-cols-2">
            <Field label="Nama Produk"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" autoFocus value={productForm.name} onChange={(e) => onProductFormChange({ ...productForm, name: e.target.value })} /></Field>
            <Field label="Barcode"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={productForm.barcode} onChange={(e) => onProductFormChange({ ...productForm, barcode: e.target.value })} placeholder="Opsional" /></Field>
            <Field label="Kategori"><select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={productForm.category_id} onChange={(e) => onProductFormChange({ ...productForm, category_id: e.target.value })}>
              <option value="">Tanpa kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select></Field>
            <Field label="Satuan"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={productForm.unit} onChange={(e) => onProductFormChange({ ...productForm, unit: e.target.value })} /></Field>
            <Field label="Harga Beli / HPP"><CurrencyInput value={productForm.buy_price} onChange={(value) => onProductFormChange({ ...productForm, buy_price: value })} /></Field>
            <Field label="Harga Jual"><CurrencyInput value={productForm.sell_price} onChange={(value) => onProductFormChange({ ...productForm, sell_price: value })} /></Field>
            <Field label="Stok"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" type="number" min="0" value={productForm.stock} onChange={(e) => onProductFormChange({ ...productForm, stock: e.target.value })} /></Field>
            <Field label="Minimum Stok"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" type="number" min="0" value={productForm.min_stock} onChange={(e) => onProductFormChange({ ...productForm, min_stock: e.target.value })} /></Field>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden md:col-span-2"><Button variant="secondary" type="button" onClick={onCloseProduct}>Batal</Button><Button type="submit" disabled={saving}>{editingProductId ? "Simpan Perubahan" : "Simpan Produk"}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
