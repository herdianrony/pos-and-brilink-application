"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Modal, Button, Input, Card, Spinner, EmptyState, ConfirmDialog, useToast } from "@/components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DynamicIcon, AVAILABLE_ICONS } from "@/components/DynamicIcon";
import type { ServiceCategory as ServiceCat } from "@/types/models";

const icons = AVAILABLE_ICONS;

export default function BLCategoriesTab() {
  const [cats, setCats] = useState<ServiceCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<ServiceCat | null>(null);
  const [f, setF] = useState({ name: "", icon: "credit-card", color: "#0ea5e9", sortOrder: "0" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const toast = useToast();

  async function load() { setCats(await (await fetch("/api/service-categories")).json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openAdd() { setEdit(null); setF({ name: "", icon: "credit-card", color: "#0ea5e9", sortOrder: "0" }); setModal(true); }
  function openEdit(c: ServiceCat) { setEdit(c); setF({ name: c.name, icon: c.icon || "credit-card", color: c.color || "#0ea5e9", sortOrder: c.sortOrder.toString() }); setModal(true); }
  async function save() {
    if (!f.name) return; setSaving(true);
    await fetch("/api/service-categories", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(edit ? { id: edit.id } : {}), name: f.name, icon: f.icon, color: f.color, sortOrder: parseInt(f.sortOrder || "0") })
    });
    setModal(false); load(); setSaving(false);
    toast.success(edit ? "Kategori layanan berhasil diupdate" : "Kategori layanan berhasil ditambahkan");
  }
  async function del(id: number) {
    await fetch("/api/service-categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
    toast.success("Kategori layanan berhasil dihapus");
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={openAdd}><Plus size={16} /> Tambah Kategori</Button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? <Spinner /> : cats.length === 0 ? <EmptyState icon="folder-open" title="Belum ada kategori layanan" /> :
          cats.map(c => (
            <Card key={c.id} className="p-4 flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${c.color}15` }}><DynamicIcon name={c.icon} fallback="package" size={24} className="text-slate-700" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                <p className="text-xs text-slate-400">Urutan: {c.sortOrder}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl"><Pencil size={14} /></button>
                <button onClick={() => setConfirmDel(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))
        }
      </div>

      <Modal open={modal} onClose={() => setModal(false)} size="sm">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-extrabold">{edit ? "Edit Kategori" : "Tambah Kategori Layanan"}</h3>
          <Input label="Nama" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama kategori" />
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Ikon</label>
            <div className="flex flex-wrap gap-2 bg-slate-50 rounded-xl p-3">
              {icons.slice(30, 60).map(em => (
                <button key={em} onClick={() => setF({ ...f, icon: em })}
                  className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-lg", f.icon === em ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-slate-200")}><DynamicIcon name={em} size={18} className="text-slate-700" /></button>
              ))}
            </div>
          </div>
          <Input label="Warna" type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} />
          <Input label="Urutan" type="number" value={f.sortOrder} onChange={e => setF({ ...f, sortOrder: e.target.value })} placeholder="0" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !f.name}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (confirmDel !== null) {
            await del(confirmDel);
            setConfirmDel(null);
          }
        }}
        title="Hapus Kategori Layanan?"
        message="Kategori layanan akan dihapus permanen. Layanan terkait mungkin terpengaruh."
        variant="danger"
        confirmText="Hapus"
      />
    </>
  );
}
