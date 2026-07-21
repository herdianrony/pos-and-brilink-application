import { useEffect, useState } from "react";
import { FolderOpen, Landmark, Package, Pencil, Power, Tag } from "lucide-react";
import { createAgentService, createFeeTier, listAgentServices, listFeeTiers, type AgentServiceRow, type CategoryRow, type FeeTierRow, type ProductRow } from "../api";
import { Badge, Button, Card, CardHeader, DataCell, DataCellText, DataRow, DataTable, EmptyState, Modal, PageHeader, Tabs } from "../components/ui";
import { CurrencyInput } from "../components/CurrencyInput";
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
  const [pendingDeactivate, setPendingDeactivate] = useState<ProductRow | null>(null);
  const lowStockProducts = products.filter((product) => product.stock <= product.min_stock);
  const [agentServices, setAgentServices] = useState<AgentServiceRow[]>([]);
  const [feeTiers, setFeeTiers] = useState<FeeTierRow[]>([]);
  const [serviceForm, setServiceForm] = useState({ name: "", category: "Transfer", default_fee: "5000", provider_cost: "0" });
  const [tierForm, setTierForm] = useState({ service_id: "", min_amount: "0", max_amount: "", fee: "5000", provider_cost: "0" });

  async function refreshAgentServices() {
    const rows = await listAgentServices();
    setAgentServices(rows);
    const selected = Number(tierForm.service_id || rows[0]?.id || 0);
    if (selected) {
      setTierForm((form) => ({ ...form, service_id: String(selected) }));
      setFeeTiers(await listFeeTiers(selected));
    }
  }

  useEffect(() => {
    if (activeTab === "agentServices" || activeTab === "agentCategories") refreshAgentServices().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function submitAgentService() {
    await createAgentService({ name: serviceForm.name, category: serviceForm.category, default_fee: Number(serviceForm.default_fee || 0), provider_cost: Number(serviceForm.provider_cost || 0) });
    setServiceForm({ name: "", category: "Transfer", default_fee: "5000", provider_cost: "0" });
    await refreshAgentServices();
  }

  async function submitFeeTier() {
    const serviceId = Number(tierForm.service_id || 0);
    if (!serviceId) return;
    await createFeeTier({ service_id: serviceId, min_amount: Number(tierForm.min_amount || 0), max_amount: tierForm.max_amount ? Number(tierForm.max_amount) : null, fee: Number(tierForm.fee || 0), provider_cost: Number(tierForm.provider_cost || 0) });
    setTierForm({ ...tierForm, min_amount: "0", max_amount: "", fee: "5000", provider_cost: "0" });
    setFeeTiers(await listFeeTiers(serviceId));
  }

  return (
    <div className="space-y-5 animate-[fadeIn_.18s_ease-out]">
      <PageHeader
        title="Manajemen Data"
        description="Kelola produk, kategori, dan layanan agen."
        actions={<>{activeTab === "categories" ? <Button onClick={onAddCategory}>Tambah Kategori</Button> : null}{activeTab === "products" ? <Button onClick={onAddProduct}>Tambah Produk</Button> : null}</>}
      />

      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} ariaLabel="Tab manajemen data" />

      {activeTab === "products" && (
        <section className="grid mb-4 grid grid-cols-2 items-stretch gap-4 max-[980px]:grid-cols-1">
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
              <DataTable columns={["Produk", "Harga", "Stok", "Aksi"]} template="minmax(0,1.4fr) 130px 110px 112px" minWidth={640}>
                {products.map((product) => (
                  <DataRow key={product.id} template="minmax(0,1.4fr) 130px 110px 112px">
                    <DataCell><strong>{product.name}</strong><DataCellText>{product.category_name || "Tanpa kategori"} • {product.unit}</DataCellText><DataCellText>HPP {formatRupiah(product.buy_price)}</DataCellText></DataCell>
                    <DataCell><strong>{formatRupiah(product.sell_price)}</strong><DataCellText>Harga jual</DataCellText></DataCell>
                    <div><Badge tone={product.stock <= product.min_stock ? "warning" : "success"}>Stok {product.stock}</Badge><small className="mt-1 block text-slate-500">Min {product.min_stock}</small></div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="secondary" className="h-10 w-10 p-0" title="Edit produk" aria-label={`Edit produk ${product.name}`} onClick={() => onEditProduct(product)}><Pencil size={16} /></Button>
                      <Button variant="danger" className="h-10 w-10 p-0" title="Nonaktifkan produk" aria-label={`Nonaktifkan produk ${product.name}`} onClick={() => setPendingDeactivate(product)}><Power size={16} /></Button>
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
              <div key={product.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block mx-0 my-1 rounded-2xl bg-amber-50 px-3"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><Badge tone="warning">Rendah</Badge></div>
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
            <div className="grid grid-cols-3 gap-3 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,.04)] [&_svg]:text-emerald-600 [&_strong]:block [&_strong]:font-black [&_strong]:text-slate-900 [&_small]:block [&_small]:text-slate-500">
                  <Tag size={20} />
                  <div><strong>{category.name}</strong><small>Kategori produk</small></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "agentServices" && (
        <section className="grid mb-4 grid grid-cols-2 items-stretch gap-4 max-[980px]:grid-cols-1">
          <Card>
            <CardHeader><div><h2>Tambah Layanan Agen</h2><p>Template layanan untuk dipakai kasir dan pencatatan agen.</p></div></CardHeader>
            <div className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0">
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Nama Layanan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} placeholder="Contoh: Transfer BRI" /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Kategori<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Fee Default<CurrencyInput value={serviceForm.default_fee} onChange={(value) => setServiceForm({ ...serviceForm, default_fee: value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Biaya Provider<CurrencyInput value={serviceForm.provider_cost} onChange={(value) => setServiceForm({ ...serviceForm, provider_cost: value })} /></label>
              <Button className="col-span-full md:col-span-2" onClick={submitAgentService}>Simpan Layanan</Button>
            </div>
          </Card>
          <Card>
            <CardHeader><div><h2>Daftar Layanan</h2><p>{agentServices.length} layanan aktif.</p></div></CardHeader>
            {agentServices.length === 0 ? <EmptyState compact title="Belum ada layanan" description="Tambahkan template layanan pertama." /> : agentServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block"><div><strong>{service.name}</strong><small>{service.category || "Tanpa kategori"} • Provider {formatRupiah(service.provider_cost)}</small></div><strong>{formatRupiah(service.default_fee)}</strong></div>
            ))}
          </Card>
        </section>
      )}

      {activeTab === "agentCategories" && (
        <section className="grid mb-4 grid grid-cols-2 items-stretch gap-4 max-[980px]:grid-cols-1">
          <Card>
            <CardHeader><div><h2>Fee Bertingkat</h2><p>Atur fee berdasarkan nominal transaksi layanan.</p></div></CardHeader>
            <div className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0">
              <label className="grid gap-2 text-[13px] font-black text-slate-600 col-span-full md:col-span-2">Layanan<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={tierForm.service_id} onChange={async (event) => { setTierForm({ ...tierForm, service_id: event.target.value }); setFeeTiers(await listFeeTiers(Number(event.target.value))); }}><option value="">Pilih layanan</option>{agentServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Min Nominal<CurrencyInput value={tierForm.min_amount} onChange={(value) => setTierForm({ ...tierForm, min_amount: value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Max Nominal<CurrencyInput value={tierForm.max_amount} onChange={(value) => setTierForm({ ...tierForm, max_amount: value })} placeholder="Tanpa batas" /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Fee<CurrencyInput value={tierForm.fee} onChange={(value) => setTierForm({ ...tierForm, fee: value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Biaya Provider<CurrencyInput value={tierForm.provider_cost} onChange={(value) => setTierForm({ ...tierForm, provider_cost: value })} /></label>
              <Button className="col-span-full md:col-span-2" onClick={submitFeeTier}>Simpan Tier Fee</Button>
            </div>
          </Card>
          <Card>
            <CardHeader><div><h2>Daftar Tier</h2><p>Fee untuk layanan terpilih.</p></div></CardHeader>
            {feeTiers.length === 0 ? <EmptyState compact title="Belum ada tier" description="Fee default layanan tetap dipakai." /> : feeTiers.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block"><div><strong>{formatRupiah(tier.min_amount)} - {tier.max_amount ? formatRupiah(tier.max_amount) : "∞"}</strong><small>Provider {formatRupiah(tier.provider_cost)}</small></div><strong>{formatRupiah(tier.fee)}</strong></div>
            ))}
          </Card>
        </section>
      )}

      {pendingDeactivate && (
        <Modal size="sm" eyebrow="Konfirmasi" title="Nonaktifkan Produk" onClose={() => setPendingDeactivate(null)}>
          <div className="grid gap-4">
            <p className="m-0 text-sm font-semibold text-slate-600">Produk <strong>{pendingDeactivate.name}</strong> tidak akan tampil lagi di kasir. Lanjutkan?</p>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden">
              <Button variant="secondary" onClick={() => setPendingDeactivate(null)}>Batal</Button>
              <Button variant="danger" onClick={() => { onRemoveProduct(pendingDeactivate); setPendingDeactivate(null); }}>Nonaktifkan</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
