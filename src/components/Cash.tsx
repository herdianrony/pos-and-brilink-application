"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import {
  Card,
  Button,
  Input,
  Modal,
  Spinner,
  EmptyState,
  Badge,
  Tabs,
  Select,
  ConfirmDialog,
  AlertDialog,
  useToast,
} from "@/components/ui";
import { CurrencyInput } from "@/components/CurrencyInput";
import { AccountCard } from "@/components/AccountCard";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Clock,
  X,
  Banknote,
  Building2,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";
import AccountBalanceOverview, {
  type CashModalType,
} from "@/components/cash/AccountBalanceOverview";
import MutationHistory from "@/components/cash/MutationHistory";
import type { Account, AccountMutation as Mutation } from "@/types/models";

const bankIcons = [
  "landmark",
  "wallet",
  "banknote",
  "credit-card",
  "smartphone",
  "piggy-bank",
  "building",
  "coins",
  "cash",
  "safe",
];
const bankColors = [
  "#0F172A",
  "#003366",
  "#0066cc",
  "#f97316",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function Cash() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [modal, setModal] = useState<CashModalType>(null);
  const [selAccount, setSelAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  // For add/edit account
  const [accForm, setAccForm] = useState<{
    name: string;
    icon: string;
    color: string;
    balance: string;
    minBalance: string;
    isActive?: boolean;
  }>({
    name: "",
    icon: "landmark",
    color: "#0F172A",
    balance: "",
    minBalance: "100000",
  });
  // Dialog state
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);
  const [alertMsg, setAlertMsg] = useState<{
    title: string;
    message: string;
    variant: "info" | "warning" | "danger";
  } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const toast = useToast();

  async function load() {
    const [accs, mutsRes] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/accounts/mutations?limit=100").then((r) => r.json()),
    ]);
    setAccounts(accs);
    // API sekarang return { mutations, summary } — extract array
    const muts = Array.isArray(mutsRes) ? mutsRes : mutsRes.mutations || [];
    setMutations(muts);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

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
        notes:
          notes ||
          (parseFloat(amount) >= 0 ? "Penambahan saldo" : "Pengurangan saldo"),
      }),
    });
    setModal(null);
    setAmount("");
    setNotes("");
    load();
    setSaving(false);
  }

  async function handleBankFee() {
    if (!selAccount || !amount) return;
    const nominal = Math.abs(parseFloat(amount));
    if (!Number.isFinite(nominal) || nominal <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust",
          accountId: selAccount.id,
          amount: -nominal,
          type: "bank_fee",
          notes: notes || "Biaya admin bank bulanan",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Gagal mencatat biaya bank");
        return;
      }
      toast.success("Biaya bank tercatat");
      setModal(null);
      setAmount("");
      setNotes("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleOwnerDraw() {
    if (!selAccount || !amount) return;
    const nominal = Math.abs(parseFloat(amount));
    if (!Number.isFinite(nominal) || nominal <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust",
          accountId: selAccount.id,
          amount: -nominal,
          type: "owner_draw",
          notes: notes || "Prive / ambil profit owner",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Gagal mencatat ambil profit");
        return;
      }
      toast.success("Ambil profit owner tercatat");
      setModal(null);
      setAmount("");
      setNotes("");
      load();
    } finally {
      setSaving(false);
    }
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
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...accForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menambah rekening");
        return;
      }
      toast.success("Rekening berhasil ditambahkan");
      setModal(null);
      setAccForm({
        name: "",
        icon: "landmark",
        color: "#0F172A",
        balance: "",
        minBalance: "100000",
      });
      load();
    } catch {
      toast.error("Gagal menambah rekening");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditAccount() {
    if (!selAccount || !accForm.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: selAccount.id,
          ...accForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengupdate rekening");
        return;
      }
      toast.success("Rekening berhasil diupdate");
      setModal(null);
      load();
    } catch {
      toast.error("Gagal mengupdate rekening");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount(acc: Account) {
    if (acc.code === "cash") {
      setAlertMsg({
        title: "Tidak Bisa Dinonaktifkan",
        message:
          "Kas Tunai tidak bisa dinonaktifkan. Akun ini wajib ada untuk transaksi tunai.",
        variant: "warning",
      });
      return;
    }
    // Check if account has non-zero balance
    const balance = parseFloat(acc.balance);
    if (Math.abs(balance) > 0.01) {
      setAlertMsg({
        title: "Tidak Bisa Dinonaktifkan",
        message: `Rekening ini masih memiliki saldo Rp${balance.toLocaleString("id-ID")}. Pindahkan atau sesuaikan saldo terlebih dahulu sebelum menonaktifkan.`,
        variant: "warning",
      });
      return;
    }
    setConfirmDelete(acc);
  }

  async function confirmDeleteAccount() {
    if (!confirmDelete) return;
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: confirmDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menonaktifkan rekening");
        setConfirmDelete(null);
        return;
      }
      toast.success("Rekening berhasil dinonaktifkan");
      load();
      setConfirmDelete(null);
    } catch {
      toast.error("Gagal menonaktifkan rekening");
    }
  }

  function openEditAccount(acc: Account) {
    setSelAccount(acc);
    setAccForm({
      name: acc.name,
      icon: acc.icon || "landmark",
      color: acc.color || "#0F172A",
      balance: "",
      minBalance: acc.minBalance || "100000",
      isActive: acc.isActive !== false,
    });
    setModal("edit_account");
  }

  if (loading) return <Spinner />;

  // P0: Filter active vs inactive accounts
  const activeAccounts = accounts.filter((a) => a.isActive !== false);
  const inactiveAccounts = accounts.filter((a) => a.isActive === false);
  const totalBalance = activeAccounts.reduce(
    (sum, a) => sum + parseFloat(a.balance),
    0,
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Wallet size={24} className="text-emerald-500" /> Manajemen Saldo
          </h2>
          <p className="text-sm text-slate-400">
            Kelola kas tunai dan rekening M-Banking
          </p>
        </div>
        <Button
          onClick={() => {
            setAccForm({
              name: "",
              icon: "landmark",
              color: "#0F172A",
              balance: "",
              minBalance: "100000",
            });
            setModal("add_account");
          }}
        >
          <Plus size={16} /> Tambah Rekening
        </Button>
      </div>

      <AccountBalanceOverview
        activeAccounts={activeAccounts}
        inactiveAccounts={inactiveAccounts}
        showInactive={showInactive}
        onToggleInactive={() => setShowInactive((value) => !value)}
        onEditAccount={openEditAccount}
        onDeleteAccount={handleDeleteAccount}
        onSelectAccount={setSelAccount}
        onOpenModal={setModal}
      />

      {/* Info Box */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm">
        <p className="text-emerald-800 font-medium mb-2">
          Tips Multi-Rekening:
        </p>
        <ul className="text-emerald-700 text-xs space-y-1 list-disc ml-4">
          <li>
            <strong>Hemat Biaya Transfer:</strong> Gunakan rekening yang sama
            dengan bank tujuan nasabah
          </li>
          <li>
            <strong>Transfer Sesama Bank = Gratis/Murah:</strong> BRI→BRI,
            Mandiri→Mandiri, dll
          </li>
          <li>
            <strong>Balancing:</strong> Gunakan "Transfer" untuk pindah saldo
            antar rekening (simulasi setor/tarik ATM)
          </li>
        </ul>
      </div>

      <MutationHistory
        accounts={accounts}
        mutations={mutations}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Adjust Modal */}
      <Modal open={modal === "adjust"} onClose={() => setModal(null)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Sesuaikan Saldo</h3>
            <button
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          {selAccount && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Akun</p>
              <p className="font-semibold">
                {isBankIcon(selAccount.icon) ? (
                  <BankIcon
                    name={selAccount.icon}
                    size={16}
                    className="inline-block -mt-0.5 mr-1"
                  />
                ) : (
                  <DynamicIcon
                    name={selAccount.icon}
                    fallback="package"
                    size={14}
                    className="inline-block -mt-0.5 mr-1"
                  />
                )}
                {selAccount.name}
              </p>
              <p className="text-sm text-slate-500">
                Saldo saat ini: {formatRupiah(selAccount.balance)}
              </p>
            </div>
          )}
          <CurrencyInput
            label="Jumlah (positif)"
            value={amount}
            onChange={(v) => setAmount(String(v))}
            placeholder="0"
          />
          <Input
            label="Catatan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Top up dari ATM"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAdjust}
              disabled={saving || !amount}
            >
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bank Fee Modal */}
      <Modal
        open={modal === "bank_fee"}
        onClose={() => setModal(null)}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Biaya Admin Bank</h3>
            <button
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          {selAccount && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
              <p className="font-bold">Catat potongan rekening</p>
              <p className="text-xs mt-1">
                Untuk biaya admin bulanan, biaya transfer, biaya kartu, atau MDR
                QRIS. Saldo {selAccount.name} akan berkurang, tetapi profit
                transaksi tidak berubah.
              </p>
              <p className="text-xs mt-2">
                Saldo saat ini: <b>{formatRupiah(selAccount.balance)}</b>
              </p>
            </div>
          )}
          <CurrencyInput
            label="Nominal biaya"
            value={amount}
            onChange={(v) => setAmount(String(v))}
            placeholder="0"
          />
          <Input
            label="Catatan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Biaya admin BRI Juli 2026 / MDR QRIS"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleBankFee}
              disabled={saving || !amount}
            >
              {saving ? "..." : "Catat Biaya"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Owner Draw Modal */}
      <Modal
        open={modal === "owner_draw"}
        onClose={() => setModal(null)}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Ambil Profit Owner</h3>
            <button
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          {selAccount && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <p className="font-bold">Prive / penarikan laba</p>
              <p className="text-xs mt-1">
                Mencatat uang yang diambil owner dari {selAccount.name}. Ini
                bukan biaya operasional dan tidak mengubah profit transaksi,
                hanya mengurangi saldo akun.
              </p>
              <p className="text-xs mt-2">
                Saldo saat ini: <b>{formatRupiah(selAccount.balance)}</b>
              </p>
            </div>
          )}
          <CurrencyInput
            label="Nominal yang diambil"
            value={amount}
            onChange={(v) => setAmount(String(v))}
            placeholder="0"
          />
          <Input
            label="Catatan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Ambil profit harian / prive owner"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleOwnerDraw}
              disabled={saving || !amount}
            >
              {saving ? "..." : "Catat Ambil Profit"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={modal === "transfer"}
        onClose={() => setModal(null)}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Transfer Antar Saldo</h3>
            <button
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          {selAccount && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Dari Akun</p>
              <p className="font-semibold">
                {isBankIcon(selAccount.icon) ? (
                  <BankIcon
                    name={selAccount.icon}
                    size={16}
                    className="inline-block -mt-0.5 mr-1"
                  />
                ) : (
                  <DynamicIcon
                    name={selAccount.icon}
                    fallback="package"
                    size={14}
                    className="inline-block -mt-0.5 mr-1"
                  />
                )}
                {selAccount.name}
              </p>
              <p className="text-sm text-slate-500">
                Saldo: {formatRupiah(selAccount.balance)}
              </p>
            </div>
          )}
          <Select
            label="Ke Akun"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            <option value="">— Pilih —</option>
            {accounts
              .filter((a) => a.id !== selAccount?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
          <CurrencyInput
            label="Jumlah"
            value={amount}
            onChange={(v) => setAmount(String(v))}
            placeholder="0"
          />
          <Input
            label="Catatan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Tarik ATM, Setor tunai"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleTransfer}
              disabled={saving || !amount || !toAccountId}
            >
              {saving ? "..." : "Transfer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Account Modal */}
      <Modal
        open={modal === "add_account"}
        onClose={() => setModal(null)}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Tambah Rekening Baru</h3>
            <button
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          <Input
            label="Nama Rekening"
            value={accForm.name}
            onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
            placeholder="Contoh: M-Banking BCA"
          />
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Ikon
            </label>
            <div className="flex flex-wrap gap-2">
              {bankIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setAccForm({ ...accForm, icon })}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                    accForm.icon === icon
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-slate-100 hover:bg-slate-200",
                  )}
                >
                  <DynamicIcon
                    name={icon}
                    size={18}
                    className="text-slate-700"
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Warna
            </label>
            <div className="flex flex-wrap gap-2">
              {bankColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccForm({ ...accForm, color })}
                  className={cn(
                    "w-8 h-8 rounded-xl transition-all",
                    accForm.color === color
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <CurrencyInput
            label="Saldo Awal"
            value={accForm.balance}
            onChange={(v) => setAccForm({ ...accForm, balance: String(v) })}
            placeholder="0"
          />
          <CurrencyInput
            label="Saldo Minimum (Alert)"
            value={accForm.minBalance}
            onChange={(v) => setAccForm({ ...accForm, minBalance: String(v) })}
            placeholder="100000"
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddAccount}
              disabled={saving || !accForm.name}
            >
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        open={modal === "edit_account"}
        onClose={() => setModal(null)}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Edit Rekening</h3>
            <button
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          <Input
            label="Nama Rekening"
            value={accForm.name}
            onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
            placeholder="Contoh: M-Banking BCA"
          />
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Ikon
            </label>
            <div className="flex flex-wrap gap-2">
              {bankIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setAccForm({ ...accForm, icon })}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                    accForm.icon === icon
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-slate-100 hover:bg-slate-200",
                  )}
                >
                  <DynamicIcon
                    name={icon}
                    size={18}
                    className="text-slate-700"
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Warna
            </label>
            <div className="flex flex-wrap gap-2">
              {bankColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccForm({ ...accForm, color })}
                  className={cn(
                    "w-8 h-8 rounded-xl transition-all",
                    accForm.color === color
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <CurrencyInput
            label="Saldo Minimum (Alert)"
            value={accForm.minBalance}
            onChange={(v) => setAccForm({ ...accForm, minBalance: String(v) })}
            placeholder="100000"
          />

          {/* P0: Active/inactive toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">
              Status Rekening
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={accForm.isActive !== false}
                onChange={(e) =>
                  setAccForm({ ...accForm, isActive: e.target.checked })
                }
                className="w-5 h-5 rounded text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Aktif untuk transaksi
                </p>
                <p className="text-xs text-slate-400">
                  Rekening nonaktif tidak tampil di selector transaksi/transfer
                </p>
              </div>
            </label>
          </div>

          <p className="text-xs text-slate-400">
            * Untuk mengubah saldo, gunakan fitur "Sesuaikan" pada kartu
            rekening
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleEditAccount}
              disabled={saving || !accForm.name}
            >
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Rekening (sebenarnya nonaktifkan) */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Nonaktifkan Rekening?"
        message={`Rekening "${confirmDelete?.name}" akan dinonaktifkan. Rekening tidak akan dipakai untuk transaksi baru, tetapi riwayat mutasi tetap tersimpan. Anda bisa mengaktifkan kembali nanti.`}
        variant="warning"
        confirmText="Nonaktifkan"
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
