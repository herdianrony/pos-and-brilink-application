import type { ChangeEvent, FormEvent } from "react";
import type { CategoryRow } from "../api";
import { Button, Field, Modal } from "./ui";
import { CurrencyInput } from "./CurrencyInput";

async function resizeProductImage(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
  const size = 360;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}


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
    image_data_url: string;
    image_preview: string;
    remove_image: boolean;
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
    image_data_url: string;
    image_preview: string;
    remove_image: boolean;
  }) => void;
  onSubmitCategory: (event: FormEvent) => void;
  onSubmitProduct: (event: FormEvent) => void;
}) {
  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageDataUrl = await resizeProductImage(file);
    onProductFormChange({ ...productForm, image_data_url: imageDataUrl, image_preview: imageDataUrl, remove_image: false });
  }

  return (
    <>
      {showCategoryModal && (
        <Modal open={showCategoryModal} size="sm" eyebrow="Tambah Kategori" onClose={onCloseCategory}>
          <form onSubmit={onSubmitCategory} className="grid gap-3.5">
            <Field label="Nama Kategori">
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" autoFocus placeholder="Contoh: Rokok, Snack, Aksesoris" value={categoryForm.name} onChange={(e) => onCategoryFormChange({ ...categoryForm, name: e.target.value })} />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden"><Button variant="secondary" type="button" onClick={onCloseCategory}>Batal</Button><Button type="submit" disabled={saving}>Simpan Kategori</Button></div>
          </form>
        </Modal>
      )}
      {showProductModal && (
        <Modal open={showProductModal} size="lg" eyebrow={editingProductId ? "Edit Produk" : "Tambah Produk"} onClose={onCloseProduct}>
          <form onSubmit={onSubmitProduct} className="grid gap-3.5 md:grid-cols-2">
            <Field label="Nama Produk"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" autoFocus value={productForm.name} onChange={(e) => onProductFormChange({ ...productForm, name: e.target.value })} /></Field>
            <Field label="Barcode"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={productForm.barcode} onChange={(e) => onProductFormChange({ ...productForm, barcode: e.target.value })} placeholder="Opsional" /></Field>
            <Field label="Kategori"><select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={productForm.category_id} onChange={(e) => onProductFormChange({ ...productForm, category_id: e.target.value })}>
              <option value="">Tanpa kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select></Field>
            <Field label="Satuan"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={productForm.unit} onChange={(e) => onProductFormChange({ ...productForm, unit: e.target.value })} /></Field>
            <Field label="Harga Beli / HPP"><CurrencyInput value={productForm.buy_price} onChange={(value) => onProductFormChange({ ...productForm, buy_price: value })} /></Field>
            <Field label="Harga Jual"><CurrencyInput value={productForm.sell_price} onChange={(value) => onProductFormChange({ ...productForm, sell_price: value })} /></Field>
            <Field label="Stok"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" type="number" min="0" value={productForm.stock} onChange={(e) => onProductFormChange({ ...productForm, stock: e.target.value })} /></Field>
            <Field label="Minimum Stok"><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" type="number" min="0" value={productForm.min_stock} onChange={(e) => onProductFormChange({ ...productForm, min_stock: e.target.value })} /></Field>
            <div className="grid gap-3 md:col-span-2">
              <Field label="Gambar Produk" note="Opsional. Gambar otomatis dibuat thumbnail ringan.">
                <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
              </Field>
              {productForm.image_preview && productForm.image_preview !== "loading" && <img src={productForm.image_preview} alt="Preview produk" className="h-24 w-24 rounded-2xl border border-slate-200 object-cover" />}
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={productForm.remove_image} onChange={(event) => onProductFormChange({ ...productForm, remove_image: event.target.checked, image_data_url: event.target.checked ? "" : productForm.image_data_url, image_preview: event.target.checked ? "" : productForm.image_preview })} /> Hapus gambar produk</label>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden md:col-span-2"><Button variant="secondary" type="button" onClick={onCloseProduct}>Batal</Button><Button type="submit" disabled={saving}>{editingProductId ? "Simpan Perubahan" : "Simpan Produk"}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
