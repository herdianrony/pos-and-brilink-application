import { describe, expect, it } from "vitest";
import { normalizeWhatsAppNumber, shouldNotifyOwner } from "@/lib/whatsapp";

describe("whatsapp helpers", () => {
  it("normalizes Indonesian WhatsApp numbers", () => {
    expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("6281234567890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("81234567890")).toBe("6281234567890");
  });

  it("detects flows that should notify owner", () => {
    expect(shouldNotifyOwner("cash_withdrawal")).toBe(true);
    expect(shouldNotifyOwner("cash_deposit")).toBe(true);
    expect(shouldNotifyOwner("transfer")).toBe(true);
    expect(shouldNotifyOwner("payment")).toBe(true);
    expect(shouldNotifyOwner("topup")).toBe(true);
    expect(shouldNotifyOwner("inquiry")).toBe(false);
    expect(shouldNotifyOwner(null)).toBe(false);
  });
});
