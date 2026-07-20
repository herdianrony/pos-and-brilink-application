import { useState, type FormEvent } from "react";
import { createCategory, createProduct, deactivateProduct, updateProduct, type ProductRow } from "../api";

const emptyProductForm = {
  name: "",
  barcode: "",
  category_id: "",
  buy_price: "0",
  sell_price: "0",
  stock: "0",
  min_stock: "5",
  unit: "pcs",
};

export function useProductMaster({
  saving,
  setSaving,
  onRefresh,
  onMessage,
  onNavigateProducts,
}: {
  saving: boolean;
  setSaving: (value: boolean) => void;
  onRefresh: () => Promise<unknown>;
  onMessage: (message: string) => void;
  onNavigateProducts: () => void;
}) {
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "package", color: "#059669" });
  const [productForm, setProductForm] = useState(emptyProductForm);

  async function submitCategory(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createCategory(categoryForm);
      setCategoryForm({ name: "", icon: "package", color: "#059669" });
      setShowCategoryModal(false);
      await onRefresh();
      onMessage("Kategori berhasil ditambahkan");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        name: productForm.name,
        barcode: productForm.barcode,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        buy_price: Number(productForm.buy_price || 0),
        sell_price: Number(productForm.sell_price || 0),
        stock: Number(productForm.stock || 0),
        min_stock: Number(productForm.min_stock || 0),
        unit: productForm.unit || "pcs",
      };
      if (editingProductId) {
        await updateProduct({ ...payload, id: editingProductId });
      } else {
        await createProduct(payload);
      }
      clearProductForm();
      setShowProductModal(false);
      await onRefresh();
      onMessage(editingProductId ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function clearProductForm() {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  }

  function openAddProduct() {
    clearProductForm();
    setShowProductModal(true);
  }

  function startEditProduct(product: ProductRow) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      barcode: product.barcode || "",
      category_id: product.category_id ? String(product.category_id) : "",
      buy_price: String(product.buy_price),
      sell_price: String(product.sell_price),
      stock: String(product.stock),
      min_stock: String(product.min_stock),
      unit: product.unit || "pcs",
    });
    onNavigateProducts();
    setShowProductModal(true);
  }

  async function removeProduct(product: ProductRow) {
    if (!confirm(`Nonaktifkan produk ${product.name}?`)) return;
    if (saving) return;
    setSaving(true);
    try {
      await deactivateProduct({ id: product.id });
      await onRefresh();
      onMessage("Produk berhasil dinonaktifkan");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return {
    showProductModal,
    setShowProductModal,
    showCategoryModal,
    setShowCategoryModal,
    editingProductId,
    categoryForm,
    setCategoryForm,
    productForm,
    setProductForm,
    submitCategory,
    submitProduct,
    clearProductForm,
    openAddProduct,
    startEditProduct,
    removeProduct,
  };
}
