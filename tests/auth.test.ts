import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  type SessionPayload,
} from "@/lib/auth";

// Mock jose untuk avoid real JWT signing in unit tests
// Kita test real hashPassword & verifyPassword, dan test JWT sign/verify secara real

describe("Password Hashing", () => {
  it("should hash a password", async () => {
    const hash = await hashPassword("test123");
    expect(hash).not.toBe("test123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should produce different hashes for same password (salt)", async () => {
    const hash1 = await hashPassword("test123");
    const hash2 = await hashPassword("test123");
    expect(hash1).not.toBe(hash2);
  });

  it("should verify correct password", async () => {
    const hash = await hashPassword("mySecret123");
    const valid = await verifyPassword("mySecret123", hash);
    expect(valid).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("mySecret123");
    const valid = await verifyPassword("wrongPassword", hash);
    expect(valid).toBe(false);
  });

  it("should reject empty password", async () => {
    const hash = await hashPassword("test123");
    const valid = await verifyPassword("", hash);
    expect(valid).toBe(false);
  });

  it("should handle special characters in password", async () => {
    const password = "P@ssw0rd!#$%^&*()";
    const hash = await hashPassword(password);
    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });
});

describe("JWT Sign & Verify", () => {
  const testPayload: SessionPayload = {
    sub: "1",
    username: "admin",
    name: "Admin User",
    role: "admin",
  };

  it("should sign and verify a valid token", async () => {
    const token = await signToken(testPayload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe("1");
    expect(decoded!.username).toBe("admin");
    expect(decoded!.role).toBe("admin");
  });

  it("should return null for invalid token", async () => {
    const decoded = await verifyToken("invalid.token.here");
    expect(decoded).toBeNull();
  });

  it("should return null for empty token", async () => {
    const decoded = await verifyToken("");
    expect(decoded).toBeNull();
  });

  it("should return null for undefined token", async () => {
    const decoded = await verifyToken(undefined as unknown as string);
    expect(decoded).toBeNull();
  });

  it("should preserve all payload fields", async () => {
    const token = await signToken(testPayload);
    const decoded = await verifyToken(token);
    expect(decoded).toEqual(
      expect.objectContaining({
        sub: "1",
        username: "admin",
        name: "Admin User",
        role: "admin",
      })
    );
  });
});

describe("Session Payload Structure", () => {
  it("should have required fields for kasir role", async () => {
    const payload: SessionPayload = {
      sub: "2",
      username: "kasir1",
      name: "Kasir Satu",
      role: "kasir",
    };
    const token = await signToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded!.role).toBe("kasir");
  });

  it("should have required fields for admin role", async () => {
    const payload: SessionPayload = {
      sub: "1",
      username: "admin",
      name: "Administrator",
      role: "admin",
    };
    const token = await signToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded!.role).toBe("admin");
  });
});
