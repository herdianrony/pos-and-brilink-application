"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import { Card, Button, Input, Modal, Spinner, EmptyState, Badge, Tabs, Select, ConfirmDialog, AlertDialog, useToast } from "@/components/ui";
import { CurrencyInput } from "@/components/CurrencyInput";
import { AccountCard } from "@/components/AccountCard";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Clock, X, Banknote, Building2, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";

interface Account {
  id: number; code: string; name: string; icon: string | null; color: string | null;
  balance: string; minBalance: string | null;
}

interface Mutation {
  id: number; accountId: number; accountName: string | null; accountIcon: string | null;
  type: string; amount: string; balanceAfter: string; notes: string | null;
  referenceId: number | null; createdAt: string;
}

const bankIcons = ["landmark", "wallet", "banknote", "credit-card", "smartphone", "piggy-bank", "building", "coins", "cash", "safe"];
const bankColors = ["#0F172A", "#003366", "#0066cc", "#f97316", "#22c55e", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Cash() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  const [modal, setModal] = useState<"adjust" | "transfer" | "add_account" | "edit_account" | null>(null);
  const [selAccount, setSelAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  
  // For add/edit account
  const [accForm, setAccForm] = useState({ name: "", icon: "landmark", color: "#0F172A", balance: "", minBalance: "100000" });
  // Dialog state
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ title: string; message: string; variant: "info" | "warning" | "danger" } | null>(null);
  const toast = useToast();

  async function load() {
    const [accs, mutsRes] = await Promise.all([
      fetch("/api/accounts").then(r => r.json()),
      fetch("/api/accounts/mutations?limit=100").then(r => r.json()),
    ]);
    setAccounts(accs);
    // API sekarang return { mutations, summary } — extract array
    const muts = Array.isArray(mutsRes) ? mutsRes : (mutsRes.mutations || []);
    setMutations(muts);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filteredMutations = activeTab === "all" 
    ? mutations 
    : mutations.filter(m => m.accountId.toString() === activeTab);

  async function handleAdjust() {
    if (!selAccount || !amount) return;
    setSaving(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        accountId: selAccount.id,
        amount,
        type: parseFloat(amount) >= 0 ? "adjustment_in" : "adjustment_out",
        notes: notes || (parseFloat(amount) >= 0 ? "Penambahan saldo" : "Pengurangan saldo"),
      }),
    });
    setModal(null);
    setAmount("");
    setNotes("");
    load();
    setSaving(false);
  }

  async function handleTransfer() {
    if (!selAccount || !amount || !toAccountId) return;
    setSaving(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transfer",
        fromAccountId: selAccount.id,
        toAccountId: parseInt(toAccountId),
        amount,
        notes: notes || `Transfer antar saldo`,
      }),
    });
    setModal(null);
    setAmount("");
    setNotes("");
    setToAccountId("");
    load();
    setSaving(false);
  }

  async function handleAddAccount() {
    if (!accForm.name) return;
    setSaving(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...accForm,
      }),
    });
    setModal(null);
    setAccForm({ name: "", icon: "landmark", color: "#0F172A", balance: "", minBalance: "100000" });
    load();
    setSaving(false);
  }

  async function handleEditAccount() {
    if (!selAccount || !accForm.name) return;
    setSaving(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: selAccount.id,
        ...accForm,
      }),
    });
    setModal(null);
    load();
    setSaving(false);
  }

  async function handleDeleteAccount(acc: Account) {
    if (acc.code === "cash") {
      setAlertMsg({
        title: "Tidak Bisa Dihapus",
        message: "Kas Tunai tidak bisa dihapus. Akun ini wajib ada untuk transaksi tunai.",
        variant: "warning",
      });
      return;
    }
    setConfirmDelete(acc);
  }

  async function confirmDeleteAccount() {
    if (!confirmDelete) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: confirmDelete.id }),
    });
    load();
    setConfirmDelete(null);
    toast.success("Rekening berhasil dihapus");
  }

  function openEditAccount(acc: Account) {
    setSelAccount(acc);
    setAccForm({ 
      name: acc.name, 
      icon: acc.icon || "landmark", 
      color: acc.color || "#0F172A", 
      balance: "", 
      minBalance: acc.minBalance || "100000" 
    });
    setModal("edit_account");
  }

  const typeLabels: Record<string, { label: string; color: "success" | "danger" | "primary" | "warning" | "purple" | "default" }> = {
    opening: { label: "Saldo Awal", color: "primary" },
    pos: { label: "POS", color: "success" },
    brilink: { label: "BRILink", color: "purple" },
    brilink_fee: { label: "Fee BRILink", color: "success" },
    transfer_in: { label: "Transfer Masuk", color: "success" },
    transfer_out: { label: "Transfer Keluar", color: "danger" },
    adjustment_in: { label: "Penambahan", color: "success" },
    adjustment_out: { label: "Pengurangan", color: "danger" },
    adjustment: { label: "Penyesuaian", color: "warning" },
  };

  if (loading) return <Spinner />;

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Wallet size={24} className="text-emerald-500" /> Manajemen Saldo
          </h2>
          <p className="text-sm text-slate-400">Kelola kas tunai dan rekening M-Banking</p>
        </div>
        <Button onClick={() => { setAccForm({ name: "", icon: "landmark", color: "#0F172A", balance: "", minBalance: "100000" }); setModal("add_account"); }}>
          <Plus size={16} /> Tambah Rekening
        </Button>
      </div>

      {/* Total Balance */}
      <Card className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <p className="text-emerald-100 text-sm">Total Semua Saldo</p>
        <p className="text-3xl font-extrabold">{formatRupiah(totalBalance)}</p>
        <p className="text-emerald-200 text-xs mt-1">{accounts.length} akun aktif</p>
      </Card>

      {/* Account Cards — Kartu Kredit Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <AccountCard
            key={acc.id}
            account={acc}
            onEdit={() => openEditAccount(acc)}
            onDelete={!acc.code || acc.code !== "cash" ? () => handleDeleteAccount(acc) : undefined}
            actions={
              <>
                <button
                  onClick={() => { setSelAccount(acc); setModal("adjust"); }}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Sesuaikan
                </button>
                <button
                  onClick={() => { setSelAccount(acc); setModal("transfer"); }}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft size={14} /> Transfer
                </button>
              </>
            }
          />
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm">
        <p className="text-emerald-800 font-medium mb-2">Tips Multi-Rekening:</p>
        <ul className="text-emerald-700 text-xs space-y-1 list-disc ml-4">
          <li><strong>Hemat Biaya Transfer:</strong> Gunakan rekening yang sama dengan bank tujuan nasabah</li>
          <li><strong>Transfer Sesama Bank = Gratis/Murah:</strong> BRI→BRI, Mandiri→Mandiri, dll</li>
          <li><strong>Balancing:</strong> Gunakan "Transfer" untuk pindah saldo antar rekening (simulasi setor/tarik ATM)</li>
        </ul>
      </div>

      {/* Mutation History */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-extrabold text-slate-700 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" /> Riwayat Mutasi
          </h3>
          <div className="flex gap-1 flex-wrap">
            <button 
              onClick={() => setActiveTab("all")}
              className={cn("px-3 py-1 rounded-xl text-xs font-medium", activeTab === "all" ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}
            >
              Semua
            </button>
            {accounts.map(a => (
              <button
                key={a.id}
                onClick={() => setActiveTab(a.id.toString())}
                className={cn("px-3 py-1 rounded-xl text-xs font-medium", activeTab === a.id.toString() ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}
              >
                {isBankIcon(a.icon) ? <BankIcon name={a.icon} size={16} className="inline-block -mt-0.5 mr-1" /> : <DynamicIcon name={a.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />}
                {a.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
        {filteredMutations.length === 0 ? <EmptyState icon="clipboard-list" title="Belum ada mutasi" /> : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white"><tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-left p-3 font-medium">Akun</th>
                <th className="text-left p-3 font-medium">Tipe</th>
                <th className="text-right p-3 font-medium">Jumlah</th>
                <th className="text-right p-3 font-medium">Saldo</th>
                <th className="text-left p-3 font-medium">Catatan</th>
              </tr></thead>
              <tbody>
                {filteredMutations.map(m => {
                  const tl = typeLabels[m.type] || { label: m.type, color: "default" as const };
                  const isPositive = parseFloat(m.amount) >= 0;
                  return (
                    <tr key={m.id} className="border-t border-slate-50 hover:bg-emerald-50/30">
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(m.createdAt)}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span>{m.accountIcon}</span>
                          <span className="text-xs truncate max-w-[80px]">{m.accountName}</span>
                        </span>
                      </td>
                      <td className="p-3"><Badge variant={tl.color}>{tl.label}</Badge></td>
                      <td className={cn("p-3 text-right font-semibold", isPositive ? "text-emerald-600" : "text-red-500")}>
                        {isPositive ? "+" : ""}{formatRupiah(m.amount)}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-700">{formatRupiah(m.balanceAfter)}</td>
                      <td className="p-3 text-slate-500 text-xs max-w-xs truncate">{m.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Adjust Modal */}
      <Modal open={modal === "adjust"} onClose={() => setModal(null)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Sesuaikan Saldo</h3>
            <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          {selAccount && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Akun</p>
              <p className="font-semibold">{isBankIcon(selAccount.icon) ? <BankIcon name={selAccount.icon} size={16} className="inline-block -mt-0.5 mr-1" /> : <DynamicIcon name={selAccount.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />}{selAccount.name}</p>
              <p className="text-sm text-slate-500">Saldo saat ini: {formatRupiah(selAccount.balance)}</p>
            </div>
          )}
          <CurrencyInput label="Jumlah (positif)" value={amount} onChange={(v) => setAmount(String(v))} placeholder="0" />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: Top up dari ATM" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={handleAdjust} disabled={saving || !amount}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={modal === "transfer"} onClose={() => setModal(null)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Transfer Antar Saldo</h3>
            <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          {selAccount && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Dari Akun</p>
              <p className="font-semibold">{isBankIcon(selAccount.icon) ? <BankIcon name={selAccount.icon} size={16} className="inline-block -mt-0.5 mr-1" /> : <DynamicIcon name={selAccount.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />}{selAccount.name}</p>
              <p className="text-sm text-slate-500">Saldo: {formatRupiah(selAccount.balance)}</p>
            </div>
          )}
          <Select label="Ke Akun" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            <option value="">— Pilih —</option>
            {accounts.filter(a => a.id !== selAccount?.id).map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <CurrencyInput label="Jumlah" value={amount} onChange={(v) => setAmount(String(v))} placeholder="0" />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: Tarik ATM, Setor tunai" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={handleTransfer} disabled={saving || !amount || !toAccountId}>{saving ? "..." : "Transfer"}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Account Modal */}
      <Modal open={modal === "add_account"} onClose={() => setModal(null)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Tambah Rekening Baru</h3>
            <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <Input label="Nama Rekening" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} placeholder="Contoh: M-Banking BCA" />
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Ikon</label>
            <div className="flex flex-wrap gap-2">
              {bankIcons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setAccForm({ ...accForm, icon })}
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all", accForm.icon === icon ? "bg-primary/10 ring-2 ring-primary" : "bg-slate-100 hover:bg-slate-200")}
                ><DynamicIcon name={icon} size={18} className="text-slate-700" /></button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Warna</label>
            <div className="flex flex-wrap gap-2">
              {bankColors.map(color => (
                <button
                  key={color}
                  onClick={() => setAccForm({ ...accForm, color })}
                  className={cn("w-8 h-8 rounded-xl transition-all", accForm.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "")}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <CurrencyInput label="Saldo Awal" value={accForm.balance} onChange={(v) => setAccForm({ ...accForm, balance: String(v) })} placeholder="0" />
          <Input label="Saldo Minimum (Alert)" type="number" value={accForm.minBalance} onChange={e => setAccForm({ ...accForm, minBalance: e.target.value })} placeholder="100000" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddAccount} disabled={saving || !accForm.name}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      <Modal open={modal === "edit_account"} onClose={() => setModal(null)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Edit Rekening</h3>
            <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <Input label="Nama Rekening" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} placeholder="Contoh: M-Banking BCA" />
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Ikon</label>
            <div className="flex flex-wrap gap-2">
              {bankIcons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setAccForm({ ...accForm, icon })}
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all", accForm.icon === icon ? "bg-primary/10 ring-2 ring-primary" : "bg-slate-100 hover:bg-slate-200")}
                ><DynamicIcon name={icon} size={18} className="text-slate-700" /></button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Warna</label>
            <div className="flex flex-wrap gap-2">
              {bankColors.map(color => (
                <button
                  key={color}
                  onClick={() => setAccForm({ ...accForm, color })}
                  className={cn("w-8 h-8 rounded-xl transition-all", accForm.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "")}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <Input label="Saldo Minimum (Alert)" type="number" value={accForm.minBalance} onChange={e => setAccForm({ ...accForm, minBalance: e.target.value })} placeholder="100000" />
          <p className="text-xs text-slate-400">* Untuk mengubah saldo, gunakan fitur "Sesuaikan" pada kartu rekening</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={handleEditAccount} disabled={saving || !accForm.name}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Rekening */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Hapus Rekening?"
        message={`Rekening "${confirmDelete?.name}" akan dihapus permanen. Semua mutasi terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmText="Hapus"
      />

      {/* Alert Dialog (kas tunai tidak bisa dihapus, dll) */}
      <AlertDialog
        open={alertMsg !== null}
        onClose={() => setAlertMsg(null)}
        title={alertMsg?.title}
        message={alertMsg?.message || ""}
        variant={alertMsg?.variant || "info"}
      />
    </div>
  );
}
