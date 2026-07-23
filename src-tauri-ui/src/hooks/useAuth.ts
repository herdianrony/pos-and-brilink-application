import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createAdmin, createUser, login, logoutSession, getMe, type PublicUser } from "../api";
import type { ViewKey } from "../types";

const SESSION_KEY = "catatagen.session.user";

export function useAuth({
  saving,
  setSaving,
  onRefresh,
  onMessage,
  onSetupComplete,
  onNavigate,
}: {
  saving: boolean;
  setSaving: (value: boolean) => void;
  onRefresh: () => Promise<unknown>;
  onMessage: (message: string) => void;
  onSetupComplete: () => void;
  onNavigate: (view: ViewKey) => void;
}) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [setupForm, setSetupForm] = useState({ name: "", username: "", password: "" });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [userForm, setUserForm] = useState({ name: "", username: "", password: "", role: "kasir" as "admin" | "kasir" });

  // Persist user to localStorage
  function persistUser(u: PublicUser | null) {
    if (u) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  // Restore session on mount — validate with backend
  const restoreSession = useCallback(async () => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as PublicUser;
      // Validate with backend
      const validated = await getMe();
      setUser(validated);
      persistUser(validated);
      return validated;
    } catch {
      // Backend session expired or invalid — clear stored
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }, []);

  async function submitSetup(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const admin = await createAdmin(setupForm);
      setUser(admin);
      persistUser(admin);
      onSetupComplete();
      await onRefresh();
      onMessage("Setup admin berhasil");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await login(loginForm);
      setUser(result.user);
      persistUser(result.user);
      onNavigate("dashboard");
      await onRefresh();
      onMessage(`Selamat datang, ${result.user.name}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createUser(userForm);
      setUserForm({ name: "", username: "", password: "", role: "kasir" });
      await onRefresh();
      onMessage("User berhasil dibuat");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await logoutSession();
    } catch {
      // Local UI logout must still proceed even if the backend session is already cleared.
    }
    setUser(null);
    persistUser(null);
    onNavigate("dashboard");
  }

  return {
    user,
    setUser,
    showAuthPassword,
    setShowAuthPassword,
    setupForm,
    setSetupForm,
    loginForm,
    setLoginForm,
    userForm,
    setUserForm,
    submitSetup,
    submitLogin,
    submitUser,
    logout,
    restoreSession,
  };
}
