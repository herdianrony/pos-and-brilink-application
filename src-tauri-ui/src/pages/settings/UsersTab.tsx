import { useState, type FormEvent } from "react";
import { Shield, Users, UserPlus, Pencil } from "lucide-react";
import type { PublicUser } from "../../api";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select } from "../../components/ui";

export function UsersTab({
  users,
  saving,
  onSubmitUser,
}: {
  users: PublicUser[];
  saving: boolean;
  onSubmitUser: (form: { id: number; name: string; username: string; password: string; role: "admin" | "kasir" }) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [form, setForm] = useState({ id: 0, name: "", username: "", password: "", role: "kasir" as "admin" | "kasir" });

  function openAdd() {
    setEditingUser(null);
    setForm({ id: 0, name: "", username: "", password: "", role: "kasir" });
    setShowModal(true);
  }

  function openEdit(u: PublicUser) {
    setEditingUser(u);
    setForm({ id: u.id, name: u.name, username: u.username, password: "", role: u.role as "admin" | "kasir" });
    setShowModal(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmitUser(form);
    if (!saving) setShowModal(false);
  }

  return (
    <div className="space-y-5" role="tabpanel" aria-label="Pengguna">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Shield size={18} className="text-emerald-500" /><h3 className="text-base font-extrabold text-slate-900">Daftar Pengguna</h3></div>
          <Button size="sm" onClick={openAdd}><UserPlus size={14} /> Tambah</Button>
        </div>
        {users.length === 0 ? <EmptyState compact title="Belum ada pengguna" description="Klik Tambah untuk membuat akun kasir." /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Daftar Pengguna</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Nama</th><th className="py-3 pr-4">Username</th><th className="py-3 pr-4">Role</th><th className="py-3 text-right">Aksi</th></tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{u.username}</td>
                  <td className="py-3 pr-4"><Badge variant={u.role === "admin" ? "purple" : "default"}>{u.role}</Badge></td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.name}`}><Pencil size={14} /></Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Add/Edit User Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} size="md" eyebrow="Pengguna">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-emerald-500" />
            <h3 className="text-lg font-extrabold text-slate-900">{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</h3>
          </div>
          <p className="text-sm text-slate-500 mb-5">{editingUser ? `Mengedit: ${editingUser.name} — kosongkan password jika tidak ingin mengubah.` : "Buat akun kasir agar staf tidak memakai akun owner."}</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" autoFocus /></Field>
            <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username login" /></Field>
            <Field label="Password"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Min 8 karakter"} /></Field>
            <Field label="Role"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "kasir" })}><option value="kasir">Kasir / Staff</option><option value="admin">Owner / Admin</option></Select></Field>
            <div className="flex gap-2 sm:col-span-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Buat Pengguna"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
