"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Select, Badge, Spinner, Modal, ConfirmDialog, useToast } from "@/components/ui";
import { Users as UsersIcon, Plus, Pencil, Trash2, X, Shield, User as UserIcon, Key } from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<UserItem | null>(null);
  const [confirmDel, setConfirmDel] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", username: "", password: "", role: "kasir" });
  const toast = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) setUsers(await res.json());
    } catch {}
    setLoading(false);
  }

  function openAdd() {
    setEdit(null);
    setF({ name: "", username: "", password: "", role: "kasir" });
    setModal(true);
  }

  function openEdit(u: UserItem) {
    setEdit(u);
    setF({ name: u.name, username: u.username, password: "", role: u.role });
    setModal(true);
  }

  async function save() {
    if (!f.name || !f.username) return;
    if (!edit && !f.password) {
      toast.warning("Password wajib diisi untuk user baru");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: f.name,
        username: f.username,
        role: f.role,
      };
      if (f.password) body.password = f.password;
      if (edit) body.id = edit.id;

      const res = await fetch("/api/auth/users", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan");
        return;
      }
      toast.success(edit ? "User berhasil diupdate" : "User berhasil ditambahkan");
      setModal(false);
      load();
    } catch {
      toast.error("Gagal menyimpan");
    }
    setSaving(false);
  }

  async function del(id: number) {
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus");
        return;
      }
      toast.success("User berhasil dihapus");
      load();
    } catch {
      toast.error("Gagal menghapus");
    }
    setConfirmDel(null);
  }

  async function toggleActive(u: UserItem) {
    try {
      await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, name: u.name, username: u.username, role: u.role, isActive: !u.isActive }),
      });
      toast.success(u.isActive ? "User dinonaktifkan" : "User diaktifkan");
      load();
    } catch {
      toast.error("Gagal mengubah status");
    }
  }

  if (loading) return <Spinner />;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <UsersIcon size={18} className="text-emerald-500" /> Manajemen Pengguna
        </h3>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} /> Tambah User
        </Button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Belum ada user</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${u.role === "admin" ? "bg-emerald-100" : "bg-slate-200"}`}>
                {u.role === "admin" ? <Shield size={18} className="text-emerald-600" /> : <UserIcon size={18} className="text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 truncate">{u.name}</p>
                  {!u.isActive && <Badge variant="danger">Nonaktif</Badge>}
                </div>
                <p className="text-xs text-slate-400">@{u.username} • {u.role === "admin" ? "Administrator" : "Kasir"}</p>
                {u.lastLoginAt && (
                  <p className="text-[10px] text-slate-400">Login terakhir: {new Date(u.lastLoginAt).toLocaleString("id-ID")}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleActive(u)} className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700" title={u.isActive ? "Nonaktifkan" : "Aktifkan"}>
                  {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button onClick={() => openEdit(u)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Pencil size={14} /></button>
                <button onClick={() => setConfirmDel(u)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} size="sm">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900">{edit ? "Edit User" : "Tambah User"}</h3>
            <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="space-y-3">
            <Input label="Nama Lengkap" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama user" autoFocus />
            <Input label="Username" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="username" />
            <Input
              label={edit ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
              type="password"
              value={f.password}
              onChange={e => setF({ ...f, password: e.target.value })}
              placeholder="Minimal 6 karakter"
            />
            <Select label="Role" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
              <option value="kasir">Kasir (transaksi POS & layanan)</option>
              <option value="admin">Admin (akses penuh)</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !f.name || !f.username}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && del(confirmDel.id)}
        title="Hapus User?"
        message={`User "${confirmDel?.name}" akan dinonaktifkan. Mereka tidak bisa login lagi.`}
        variant="danger"
        confirmText="Hapus"
      />
    </Card>
  );
}
