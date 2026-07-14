import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Barcode Scanner Logic Tests ──────────────────
// Test detection logic without React component

// Replikasi logic dari use-barcode-scanner.ts
const MAX_INTERVAL = 50; // ms
const MIN_LENGTH = 3;

interface ScanResult {
  barcode: string;
  isScanning: boolean;
}

function createScannerState() {
  let buffer = "";
  let lastKeyTime = 0;
  let isScanning = false;

  function handleKey(key: string, timestamp: number): ScanResult | null {
    // Skip modifier keys
    // Skip jika terlalu lambat
    const diff = timestamp - lastKeyTime;
    if (diff > MAX_INTERVAL && buffer.length > 0) {
      buffer = "";
      isScanning = false;
    }
    lastKeyTime = timestamp;

    if (key === "Enter") {
      if (buffer.length >= MIN_LENGTH) {
        const code = buffer;
        buffer = "";
        isScanning = false;
        return { barcode: code, isScanning: false };
      }
      buffer = "";
      isScanning = false;
      return null;
    }

    if (key.length === 1) {
      buffer += key;
      isScanning = true;
      return null;
    }

    return null;
  }

  function getState(): ScanResult {
    return { barcode: "", isScanning };
  }

  return { handleKey, getState };
}

describe("Barcode Scanner: detection logic", () => {
  let scanner: ReturnType<typeof createScannerState>;

  beforeEach(() => {
    scanner = createScannerState();
  });

  it("should detect barcode on Enter after fast typing", () => {
    const baseTime = 1000;
    // Simulate fast scanning: "899001010012" + Enter
    const chars = "899001010012";
    for (let i = 0; i < chars.length; i++) {
      scanner.handleKey(chars[i], baseTime + i * 10); // 10ms between chars
    }
    const result = scanner.handleKey("Enter", baseTime + chars.length * 10);
    expect(result).not.toBeNull();
    expect(result!.barcode).toBe("899001010012");
  });

  it("should not detect if too slow (human typing)", () => {
    const baseTime = 1000;
    // Simulate slow typing: 200ms between chars (human speed)
    scanner.handleKey("8", baseTime);
    scanner.handleKey("9", baseTime + 200);
    scanner.handleKey("9", baseTime + 400);
    const result = scanner.handleKey("Enter", baseTime + 600);
    // Buffer should be reset due to slow interval
    expect(result).toBeNull();
  });

  it("should not detect if barcode too short", () => {
    const baseTime = 1000;
    scanner.handleKey("1", baseTime);
    scanner.handleKey("2", baseTime + 10);
    const result = scanner.handleKey("Enter", baseTime + 20);
    // Only 2 chars < MIN_LENGTH (3)
    expect(result).toBeNull();
  });

  it("should detect minimum length barcode (3 chars)", () => {
    const baseTime = 1000;
    scanner.handleKey("1", baseTime);
    scanner.handleKey("2", baseTime + 10);
    scanner.handleKey("3", baseTime + 20);
    const result = scanner.handleKey("Enter", baseTime + 30);
    expect(result).not.toBeNull();
    expect(result!.barcode).toBe("123");
  });

  it("should reset buffer on slow input", () => {
    const baseTime = 1000;
    // Start fast scan
    scanner.handleKey("8", baseTime);
    scanner.handleKey("9", baseTime + 10);
    // Wait too long
    scanner.handleKey("9", baseTime + 200); // > 50ms → reset
    scanner.handleKey("0", baseTime + 210);
    scanner.handleKey("0", baseTime + 220);
    scanner.handleKey("1", baseTime + 230);
    const result = scanner.handleKey("Enter", baseTime + 240);
    // Should only have "9001" (after reset), not "899001"
    expect(result).not.toBeNull();
    expect(result!.barcode).toBe("9001");
  });

  it("should handle multiple scans in sequence", () => {
    const baseTime = 1000;
    // First scan
    const chars1 = "111";
    for (let i = 0; i < chars1.length; i++) {
      scanner.handleKey(chars1[i], baseTime + i * 10);
    }
    const result1 = scanner.handleKey("Enter", baseTime + chars1.length * 10);
    expect(result1!.barcode).toBe("111");

    // Second scan (after delay)
    const baseTime2 = 2000;
    const chars2 = "222";
    for (let i = 0; i < chars2.length; i++) {
      scanner.handleKey(chars2[i], baseTime2 + i * 10);
    }
    const result2 = scanner.handleKey("Enter", baseTime2 + chars2.length * 10);
    expect(result2!.barcode).toBe("222");
  });

  it("should ignore multi-char keys (like 'Shift', 'Control')", () => {
    const baseTime = 1000;
    scanner.handleKey("Shift", baseTime);
    scanner.handleKey("8", baseTime + 10);
    scanner.handleKey("9", baseTime + 20);
    scanner.handleKey("9", baseTime + 30);
    const result = scanner.handleKey("Enter", baseTime + 40);
    expect(result).not.toBeNull();
    expect(result!.barcode).toBe("899");
  });
});
