import { useState, type FormEvent } from "react";
import { Shield, Users } from "lucide-react";
import type { PublicUser } from "../../api";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "../../components/ui";

export function UsersTab({
  users,
  userForm,
  saving,
  onUserFormChange,
  onSubmitUser,
}: {
  users: PublicUser[];
  userForm: { name: string; username: string; password: string; role: "admin" | "kasir" };
  saving: boolean;
  onUserFormChange: (form: { name: string; username: string; password: string; role: "admin" | "kasir" }) => void;
  onSubmitUser: (event: FormEvent) => void;
}) {
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);

  function startEditUser(u: PublicUser) {
    setEditingUser(u);
    onUserFormChange({ name: u.name, username: u.username, password: "", role: u.role as "admin" | "kasir" });
  }
  function cancelEditUser() {
    setEditingUser(null);
    onUserFormChange({ name: "", username: "", password: "", role: "kasir" });
  }

  return (
    <div className="space-y-5" role="tabpanel" aria-label="Pengguna">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Users size={18} className="text-emerald-500" />
          <h3 className="text-base font-extrabold text-slate-900">{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</h3>
        </div>
        <p className="text-sm text-slate-500">{editingUser ? `Mengedit: ${editingUser.name}` : "Buat akun kasir agar staf tidak memakai akun owner."}</p>
        <form onSubmit={(e) => { onSubmitUser(e); if (!saving) setEditingUser(null); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama"><Input value={userForm.name} onChange={(e) => onUserFormChange({ ...userForm, name: e.target.value })} placeholder="Nama lengkap" /></Field>
          <Field label="Username"><Input value={userForm.username} onChange={(e) => onUserFormChange({ ...userForm, username: e.target.value })} placeholder="Username login" /></Field>
          <Field label="Password"><Input type="password" value={userForm.password} onChange={(e) => onUserFormChange({ ...userForm, password: e.target.value })} placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Password"} /></Field>
          <Field label="Role"><Select value={userForm.role} onChange={(e) => onUserFormChange({ ...userForm, role: e.target.value as "admin" | "kasir" })}><option value="kasir">Kasir / Staff</option><option value="admin">Owner / Admin</option></Select></Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>{saving && <span className="animate-spin">⏳</span>}{editingUser ? "Simpan Perubahan" : "Buat Pengguna"}</Button>
            {editingUser && <Button type="button" variant="secondary" onClick={cancelEditUser}>Batal</Button>}
          </div>
        </form>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2"><Shield size={18} className="text-emerald-500" /><h3 className="text-base font-extrabold text-slate-900">Daftar Pengguna</h3></div>
        {users.length === 0 ? <EmptyState compact title="Belum ada pengguna" /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Daftar Pengguna</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Nama</th><th className="py-3 pr-4">Username</th><th className="py-3 pr-4">Role</th><th className="py-3 text-right">Aksi</th></tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{u.username}</td>
                  <td className="py-3 pr-4"><Badge variant={u.role === "admin" ? "purple" : "default"}>{u.role}</Badge></td>
                  <td className="py-3 text-right">
                    <button type="button" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors mr-3" onClick={() => startEditUser(u)}>Edit</button>
                    <button type="button" className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors">Hapus</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
