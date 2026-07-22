import { describe, expect, it } from "vitest";
import { sanitizeInternalRedirect, validatePasswordPolicy } from "@/lib/security";

describe("security: sanitizeInternalRedirect", () => {
  it("allows safe internal paths", () => {
    expect(sanitizeInternalRedirect("/dashboard")).toBe("/dashboard");
    expect(sanitizeInternalRedirect("/history?filter=today")).toBe("/history?filter=today");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(sanitizeInternalRedirect("https://evil.example")).toBe("/");
    expect(sanitizeInternalRedirect("//evil.example")).toBe("/");
    expect(sanitizeInternalRedirect("/\\evil.example")).toBe("/");
  });

  it("rejects empty values and control characters", () => {
    expect(sanitizeInternalRedirect(null)).toBe("/");
    expect(sanitizeInternalRedirect("")).toBe("/");
    expect(sanitizeInternalRedirect("/ok\nSet-Cookie:bad=1")).toBe("/");
  });
});

describe("security: validatePasswordPolicy", () => {
  it("accepts passwords that meet length and complexity requirements", () => {
    expect(validatePasswordPolicy("Admin123").ok).toBe(true);
    expect(validatePasswordPolicy("long password with spaces").ok).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(validatePasswordPolicy("1234567").ok).toBe(false);
    expect(validatePasswordPolicy("abcdefgh").ok).toBe(false);
    expect(validatePasswordPolicy("A".repeat(129)).ok).toBe(false);
  });
});
