import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User, Wallet, Zap } from "lucide-react";
import { tw } from "../lib/tw";

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
    <main className={tw("login-shell")}>
      <section className={tw("login-brand-panel")}>
        <div className={tw("login-brand-content")}>
          <div className={tw("login-logo-row")}>
            <div className={tw("brand-mark")}>CA</div>
            <div>
              <h1>CatatAgen</h1>
              <p>POS Retail & Pencatatan Agen Mikro</p>
            </div>
          </div>
          <div className={tw("login-copy")}>
            <p className={tw("eyebrow")}>Aplikasi Lokal Desktop</p>
            <h2>{isSetup ? "Siapkan toko pertama Anda" : "Selamat datang kembali"}</h2>
            <p>Kelola kasir POS, layanan agen non-API, saldo virtual, stok produk, dan buku utang dalam satu aplikasi ringan.</p>
          </div>
          <div className={tw("login-feature-list")}>
            <div><Zap size={18} /><span>Transaksi cepat untuk kasir harian</span></div>
            <div><ShieldCheck size={18} /><span>Data tersimpan lokal di perangkat</span></div>
            <div><Wallet size={18} /><span>Kas, rekening, QRIS, dan utang tercatat rapi</span></div>
          </div>
        </div>
      </section>
      <section className={tw("login-form-panel")}>
        <div className={tw("login-mobile-brand")}>
          <div className={tw("brand-mark small")}>CA</div>
          <div><strong>CatatAgen</strong><small>Local Edition</small></div>
        </div>
        <div className={tw("login-card")}>
          <div className={tw("login-card-header")}>
            <p className={tw("eyebrow")}>{isSetup ? "Setup Awal" : "Masuk"}</p>
            <h2>{isSetup ? "Buat Admin Pertama" : "Masuk ke Aplikasi"}</h2>
            <p>{isSetup ? "Akun ini akan menjadi owner/admin toko." : "Gunakan akun owner atau kasir yang sudah dibuat."}</p>
          </div>
          <form onSubmit={isSetup ? onSubmitSetup : onSubmitLogin} className={tw("login-form")}>
            {isSetup && (
              <label className={tw("field-label")}>Nama Owner
                <div className={tw("login-input-wrap")}><User size={20} /><input className={tw("form-input")} autoFocus value={setupForm.name} onChange={(e) => onSetupFormChange({ ...setupForm, name: e.target.value })} placeholder="Nama pemilik toko" /></div>
              </label>
            )}
            <label className={tw("field-label")}>Username
              <div className={tw("login-input-wrap")}><User size={20} /><input className={tw("form-input")} autoFocus={!isSetup} value={usernameValue} onChange={(e) => isSetup ? onSetupFormChange({ ...setupForm, username: e.target.value }) : onLoginFormChange({ ...loginForm, username: e.target.value })} placeholder="Masukkan username" /></div>
            </label>
            <label className={tw("field-label")}>Password
              <div className={tw("login-input-wrap")}><Lock size={20} /><input className={tw("form-input")} type={showPassword ? "text" : "password"} value={passwordValue} onChange={(e) => isSetup ? onSetupFormChange({ ...setupForm, password: e.target.value }) : onLoginFormChange({ ...loginForm, password: e.target.value })} placeholder="Masukkan password" /><button type="button" className={tw("input-icon-button")} onClick={onTogglePassword} aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </label>
            <button className={tw("login-submit")} type="submit" disabled={saving}>{saving ? "Memproses..." : isSetup ? "Buat Admin" : <>Masuk <ArrowRight size={20} /></>}</button>
          </form>
          <div className={tw("status-line")}>{message || "Data lokal siap digunakan."}</div>
        </div>
      </section>
    </main>
  );
}
