import { useState } from "react";
import { FolderOpen, Landmark, Package, Pencil, Power, Tag } from "lucide-react";
import type { CategoryRow, ProductRow } from "../api";
import { Badge, Button, Card, CardHeader, DataCell, DataCellText, DataRow, DataTable, EmptyState, PageHeader } from "../components/ui";
import { formatRupiah } from "../lib/format";

type MasterTab = "products" | "categories" | "agentServices" | "agentCategories";

const tabs: Array<{ id: MasterTab; label: string; icon: typeof Package }> = [
  { id: "products", label: "Produk", icon: Package },
  { id: "categories", label: "Kategori Produk", icon: Tag },
  { id: "agentServices", label: "Layanan Agen", icon: Landmark },
  { id: "agentCategories", label: "Kategori Layanan", icon: FolderOpen },
];

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
  const [activeTab, setActiveTab] = useState<MasterTab>("products");
  const lowStockProducts = products.filter((product) => product.stock <= product.min_stock);

  return (
    <div className="space-y-5 animate-fadeIn">
      <PageHeader
        title="Manajemen Data"
        description="Kelola produk, kategori, dan layanan agen."
        actions={<>{activeTab === "categories" ? <Button onClick={onAddCategory}>Tambah Kategori</Button> : null}{activeTab === "products" ? <Button onClick={onAddProduct}>Tambah Produk</Button> : null}</>}
      />

      <div className="electron-tabs master-tabs">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button key={tab.id} className={activeTab === tab.id ? "electron-tab active" : "electron-tab"} onClick={() => setActiveTab(tab.id)}>
              <TabIcon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "products" && (
        <section className="grid dashboard-grid">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader>
              <div>
                <h2>Daftar Produk</h2>
                <p>{products.length} produk ditampilkan. Gunakan pencarian di atas untuk memfilter.</p>
              </div>
              <Button onClick={onAddProduct}>Tambah Produk</Button>
            </CardHeader>
            {products.length === 0 ? (
              <EmptyState title="Produk tidak ditemukan" description="Tambahkan produk baru atau ubah kata kunci pencarian." />
            ) : (
              <DataTable columns={["Produk", "Harga", "Stok", "Aksi"]} template="minmax(0,1.4fr) 130px 110px 112px" minWidth={760}>
                {products.map((product) => (
                  <DataRow key={product.id} template="minmax(0,1.4fr) 130px 110px 112px">
                    <DataCell><strong>{product.name}</strong><DataCellText>{product.category_name || "Tanpa kategori"} • {product.unit}</DataCellText><DataCellText>HPP {formatRupiah(product.buy_price)}</DataCellText></DataCell>
                    <DataCell><strong>{formatRupiah(product.sell_price)}</strong><DataCellText>Harga jual</DataCellText></DataCell>
                    <div><Badge tone={product.stock <= product.min_stock ? "warning" : "success"}>Stok {product.stock}</Badge><small className="mt-1 block text-slate-500">Min {product.min_stock}</small></div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="secondary" className="h-10 w-10 p-0" title="Edit produk" aria-label={`Edit produk ${product.name}`} onClick={() => onEditProduct(product)}><Pencil size={16} /></Button>
                      <Button variant="danger" className="h-10 w-10 p-0" title="Nonaktifkan produk" aria-label={`Nonaktifkan produk ${product.name}`} onClick={() => onRemoveProduct(product)}><Power size={16} /></Button>
                    </div>
                  </DataRow>
                ))}
              </DataTable>
            )}
          </Card>
          <Card>
            <CardHeader><div><h2>Stok Menipis</h2><p>Produk yang perlu segera dicek.</p></div></CardHeader>
            {lowStockProducts.length === 0 ? (
              <EmptyState compact title="Stok aman" description="Tidak ada produk di bawah minimum." />
            ) : lowStockProducts.slice(0, 8).map((product) => (
              <div key={product.id} className="row rich-row warning-row"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><Badge tone="warning">Rendah</Badge></div>
            ))}
          </Card>
        </section>
      )}

      {activeTab === "categories" && (
        <Card>
          <CardHeader>
            <div>
              <h2>Kategori Produk</h2>
              <p>Kategori membantu kasir mencari dan memfilter produk lebih cepat.</p>
            </div>
            <Button onClick={onAddCategory}>Tambah Kategori</Button>
          </CardHeader>
          {categories.length === 0 ? (
            <EmptyState title="Belum ada kategori" description="Klik Tambah Kategori untuk membuat kategori pertama." />
          ) : (
            <div className="category-grid">
              {categories.map((category) => (
                <div key={category.id} className="category-card">
                  <Tag size={20} />
                  <div><strong>{category.name}</strong><small>Kategori produk</small></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "agentServices" && (
        <Card>
          <CardHeader><div><h2>Layanan Agen</h2><p>Template layanan agen custom akan dikelola di sini pada tahap berikutnya.</p></div></CardHeader>
          <EmptyState title="Template layanan belum tersedia" description="Untuk saat ini pencatatan layanan agen memakai preset di halaman Layanan Agen." />
        </Card>
      )}

      {activeTab === "agentCategories" && (
        <Card>
          <CardHeader><div><h2>Kategori Layanan</h2><p>Kategori layanan akan dipakai untuk mengelompokkan jasa agen seperti transfer, tunai, dan payment.</p></div></CardHeader>
          <EmptyState title="Kategori layanan belum tersedia" description="Fitur ini disiapkan untuk master layanan agen custom." />
        </Card>
      )}
    </div>
  );
}
