import { invoke } from "@tauri-apps/api/core";

export interface HealthCheck {
  ok: boolean;
  app: string;
  backend: string;
  timestamp: string;
}

export interface SetupStatus {
  setup_needed: boolean;
  user_count: number;
}

export interface PublicUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

export interface AccountRow {
  id: number;
  code: string;
  name: string;
  balance: number;
  is_active: boolean;
}

export function healthCheck() {
  return invoke<HealthCheck>("health_check");
}

export function dbInit() {
  return invoke<{ ok: boolean; path: string }>("db_init");
}

export function setupStatus() {
  return invoke<SetupStatus>("setup_status");
}

export function createAdmin(payload: { name: string; username: string; password: string }) {
  return invoke<PublicUser>("create_admin", { payload });
}

export function login(payload: { username: string; password: string }) {
  return invoke<{ ok: boolean; user: PublicUser }>("login", { payload });
}

export function listAccounts() {
  return invoke<AccountRow[]>("list_accounts");
}
