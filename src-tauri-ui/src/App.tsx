import { useEffect, useState } from "react";
import { AccountRow, PublicUser, createAdmin, dbInit, healthCheck, listAccounts, login, setupStatus } from "./api";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [form, setForm] = useState({ name: "Admin", username: "admin", password: "Admin123" });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "Admin123" });

  async function bootstrap() {
    setLoading(true);
    try {
      const health = await healthCheck();
      const db = await dbInit();
      const setup = await setupStatus();
      setDbPath(db.path);
      setSetupNeeded(setup.setup_needed);
      setMessage(`${health.app} siap (${health.backend})`);
      if (!setup.setup_needed) setAccounts(await listAccounts());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  async function submitSetup(event: React.FormEvent) {
    event.preventDefault();
    try {
      const admin = await createAdmin(form);
      setUser(admin);
      setSetupNeeded(false);
      setAccounts(await listAccounts());
      setMessage("Setup admin berhasil");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await login(loginForm);
      setUser(result.user);
      setAccounts(await listAccounts());
      setMessage(`Selamat datang, ${result.user.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Eksperimen Tauri Full</p>
          <h1>BRILink POS Lite</h1>
          <p className="subtitle">Frontend static + Rust commands + SQLite lokal. Tanpa Next server.</p>
        </div>
        <button onClick={bootstrap} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
      </section>

      <section className="notice">
        <strong>Status:</strong> {message || "—"}<br />
        <strong>Database:</strong> {dbPath || "—"}
      </section>

      {setupNeeded ? (
        <section className="card">
          <h2>Setup Admin Pertama</h2>
          <form onSubmit={submitSetup} className="form">
            <label>Nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
            <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button type="submit">Buat Admin</button>
          </form>
        </section>
      ) : !user ? (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={submitLogin} className="form">
            <label>Username<input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} /></label>
            <label>Password<input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} /></label>
            <button type="submit">Masuk</button>
          </form>
        </section>
      ) : (
        <section className="grid">
          <div className="card">
            <h2>Dashboard Lite</h2>
            <p>User: <strong>{user.name}</strong> ({user.role})</p>
            <p>POC berikutnya: POS basic + produk + checkout tunai.</p>
          </div>
          <div className="card">
            <h2>Akun Saldo</h2>
            {accounts.length === 0 ? <p>Belum ada akun.</p> : accounts.map((account) => (
              <div key={account.id} className="row">
                <span>{account.name}</span>
                <strong>{formatRupiah(account.balance)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
