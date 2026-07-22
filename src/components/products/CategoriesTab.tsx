"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Modal, Button, Input, Card, Spinner, EmptyState, ConfirmDialog, useToast } from "@/components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DynamicIcon, AVAILABLE_ICONS } from "@/components/DynamicIcon";
import type { Category } from "@/types/models";

const icons = AVAILABLE_ICONS;

export default function CategoriesTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [f, setF] = useState({ name: "", icon: "package", color: "#6366f1" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const toast = useToast();

  async function load() { setCats(await (await fetch("/api/categories")).json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openAdd() { setEdit(null); setF({ name: "", icon: "package", color: "#6366f1" }); setModal(true); }
  function openEdit(c: Category) { setEdit(c); setF({ name: c.name, icon: c.icon || "package", color: c.color || "#6366f1" }); setModal(true); }
  async function save() {
    if (!f.name) return; setSaving(true);
    await fetch("/api/categories", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(edit ? { id: edit.id } : {}), ...f }) });
    setModal(false); load(); setSaving(false);
    toast.success(edit ? "Kategori berhasil diupdate" : "Kategori berhasil ditambahkan");
  }
  async function del(id: number) {
    await fetch("/api/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
    toast.success("Kategori berhasil dihapus");
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={openAdd}><Plus size={16} /> Tambah Kategori</Button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? <Spinner /> : cats.length === 0 ? <EmptyState icon="tag" title="Belum ada kategori" /> :
          cats.map(c => (
            <Card key={c.id} className="p-4 flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${c.color}15` }}><DynamicIcon name={c.icon} fallback="package" size={24} className="text-slate-700" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                <p className="text-xs text-slate-400 font-medium">{(c as any).productCount || 0} produk</p>
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
          <h3 className="text-lg font-extrabold">{edit ? "Edit Kategori" : "Tambah Kategori"}</h3>
          <Input label="Nama Kategori" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama kategori" />
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Pilih Ikon</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-slate-50 rounded-xl p-3">
              {icons.slice(0, 30).map(em => (
                <button key={em} onClick={() => setF({ ...f, icon: em })}
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all", f.icon === em ? "bg-primary/10 ring-2 ring-primary scale-110" : "hover:bg-slate-200")}><DynamicIcon name={em} size={18} className="text-slate-700" /></button>
              ))}
            </div>
          </div>
          <Input label="Warna" type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} />
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
        title="Hapus Kategori?"
        message="Kategori akan dihapus permanen. Produk yang terkait mungkin terpengaruh."
        variant="danger"
        confirmText="Hapus"
      />
    </>
  );
}

