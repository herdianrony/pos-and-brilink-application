import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User, Wallet, Zap } from "lucide-react";

export function AuthShell({
  kind,
  saving,
  message,
  showPassword,
  onTogglePassword,
  setupForm,
  loginForm,
  onSetupFormChange,
  onLoginFormChange,
  onSubmitSetup,
  onSubmitLogin,
}: {
  kind: "setup" | "login";
  saving: boolean;
  message: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  setupForm: { name: string; username: string; password: string };
  loginForm: { username: string; password: string };
  onSetupFormChange: (form: { name: string; username: string; password: string }) => void;
  onLoginFormChange: (form: { username: string; password: string }) => void;
  onSubmitSetup: (event: FormEvent) => void;
  onSubmitLogin: (event: FormEvent) => void;
}) {
  const isSetup = kind === "setup";
  const usernameValue = isSetup ? setupForm.username : loginForm.username;
  const passwordValue = isSetup ? setupForm.password : loginForm.password;

  return (
    <main className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)] bg-bg lg:block">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#052e2b_55%,#111827_100%)] p-10 text-white before:absolute before:-right-32 before:-top-32 before:h-96 before:w-96 before:rounded-full before:bg-primary-lighter/30 before:blur-3xl after:absolute after:-bottom-28 after:-left-24 after:h-80 after:w-80 after:rounded-full after:bg-teal-500/20 after:blur-3xl max-lg:hidden">
        <div className="relative z-10 flex h-full flex-col justify-between gap-10">
          <div className="flex items-center gap-4 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-black [&_p]:m-0 [&_p]:text-sm [&_p]:font-semibold [&_p]:text-slate-400">
            <div className="grid place-items-center rounded-3xl gradient-primary text-white font-black tracking-tighter shadow-glow-primary h-16 w-16">CA</div>
            <div>
              <h1>CatatAgen</h1>
              <p>POS Retail & Pencatatan Agen Mikro</p>
            </div>
          </div>
          <div className="max-w-xl [&_h1]:text-[52px] [&_h1]:leading-[.95] [&_h1]:text-white [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-slate-300 [&_.eyebrow]:text-primary-lighter">
            <p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.14em] text-primary">Aplikasi Lokal Desktop</p>
            <h2>{isSetup ? "Siapkan toko pertama Anda" : "Selamat datang kembali"}</h2>
            <p>Kelola kasir POS, layanan agen non-API, saldo virtual, stok produk, dan buku utang dalam satu aplikasi ringan.</p>
          </div>
          <div className="grid gap-3 [&_div]:flex [&_div]:items-center [&_div]:gap-3 [&_div]:text-sm [&_div]:font-bold [&_div]:text-slate-200 [&_svg]:text-primary-lighter">
            <div><Zap size={18} /><span>Transaksi cepat untuk kasir harian</span></div>
            <div><ShieldCheck size={18} /><span>Data tersimpan lokal di perangkat</span></div>
            <div><Wallet size={18} /><span>Kas, rekening, QRIS, dan utang tercatat rapi</span></div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-surface-alt p-6 lg:p-12">
        <div className="mb-6 hidden items-center gap-3 lg:flex [&_strong]:block [&_strong]:text-xl [&_strong]:font-black [&_strong]:text-slate-900 [&_small]:block [&_small]:text-xs [&_small]:font-semibold [&_small]:text-slate-400">
          <div className="grid place-items-center rounded-3xl gradient-primary text-white font-black tracking-tighter shadow-glow-primary h-11 w-11 text-sm">CA</div>
          <div><strong>CatatAgen</strong><small>Local Edition</small></div>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-float">
          <div className="mb-6 [&_h2]:mb-1 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-900 [&_p]:m-0 [&_p]:text-sm [&_p]:font-semibold [&_p]:text-slate-400">
            <p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.14em] text-primary">{isSetup ? "Setup Awal" : "Masuk"}</p>
            <h2>{isSetup ? "Buat Admin Pertama" : "Masuk ke Aplikasi"}</h2>
            <p>{isSetup ? "Akun ini akan menjadi owner/admin toko." : "Gunakan akun owner atau kasir yang sudah dibuat."}</p>
          </div>
          <form onSubmit={isSetup ? onSubmitSetup : onSubmitLogin} className="grid gap-4">
            {isSetup && (
              <label className="grid gap-2 text-sm font-black text-ink-soft">Nama Owner
                <div className="relative flex items-center [&_svg]:absolute [&_svg]:left-4 [&_svg]:text-slate-400 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border-2 [&_input]:border-border [&_input]:bg-surface-alt [&_input]:py-3.5 [&_input]:pl-12 [&_input]:pr-4 [&_input]:font-semibold [&_input]:focus:bg-white"><User size={20} /><input className="w-full rounded-2xl border border-border bg-white px-3.5 py-3 text-base text-ink transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" autoFocus value={setupForm.name} onChange={(e) => onSetupFormChange({ ...setupForm, name: e.target.value })} placeholder="Nama pemilik toko" /></div>
              </label>
            )}
            <label className="grid gap-2 text-sm font-black text-ink-soft">Username
              <div className="relative flex items-center [&_svg]:absolute [&_svg]:left-4 [&_svg]:text-slate-400 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border-2 [&_input]:border-border [&_input]:bg-surface-alt [&_input]:py-3.5 [&_input]:pl-12 [&_input]:pr-4 [&_input]:font-semibold [&_input]:focus:bg-white"><User size={20} /><input className="w-full rounded-2xl border border-border bg-white px-3.5 py-3 text-base text-ink transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" autoFocus={!isSetup} value={usernameValue} onChange={(e) => isSetup ? onSetupFormChange({ ...setupForm, username: e.target.value }) : onLoginFormChange({ ...loginForm, username: e.target.value })} placeholder="Masukkan username" /></div>
            </label>
            <label className="grid gap-2 text-sm font-black text-ink-soft">Password
              <div className="relative flex items-center [&_svg]:absolute [&_svg]:left-4 [&_svg]:text-slate-400 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border-2 [&_input]:border-border [&_input]:bg-surface-alt [&_input]:py-3.5 [&_input]:pl-12 [&_input]:pr-4 [&_input]:font-semibold [&_input]:focus:bg-white"><Lock size={20} /><input className="w-full rounded-2xl border border-border bg-white px-3.5 py-3 text-base text-ink transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" type={showPassword ? "text" : "password"} value={passwordValue} onChange={(e) => isSetup ? onSetupFormChange({ ...setupForm, password: e.target.value }) : onLoginFormChange({ ...loginForm, password: e.target.value })} placeholder="Masukkan password" /><button type="button" className="absolute right-2 grid h-9 w-9 place-items-center rounded-xl border-0 bg-transparent p-0 text-slate-400 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:text-slate-600 hover:shadow-none" onClick={onTogglePassword} aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </label>
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-4 py-3.5 font-black text-white shadow-glow-primary" type="submit" disabled={saving}>{saving ? "Memproses..." : isSetup ? "Buat Admin" : <>Masuk <ArrowRight size={20} /></>}</button>
          </form>
          <div className="mt-5 rounded-2xl bg-success-light/30 px-3.5 py-3 font-extrabold text-success">{message || "Data lokal siap digunakan."}</div>
        </div>
      </section>
    </main>
  );
}
