export interface PasswordPolicyResult {
  ok: boolean;
  error?: string;
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < 8) {
    return { ok: false, error: "Password minimal 8 karakter" };
  }
  if (password.length > 128) {
    return { ok: false, error: "Password maksimal 128 karakter" };
  }

  const categories = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (categories < 2) {
    return {
      ok: false,
      error: "Password harus memakai minimal 2 jenis karakter: huruf besar, huruf kecil, angka, atau simbol",
    };
  }

  return { ok: true };
}

export function sanitizeInternalRedirect(value: string | null | undefined): string {
  if (!value) return "/";
  const trimmed = value.trim();

  // Allow only local absolute paths. Reject protocol-relative URLs (//evil.com),
  // absolute URLs, backslash variants, and control characters.
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return "/";
  }

  return trimmed;
}
