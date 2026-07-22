import { describe, expect, it } from "vitest";
import { csvEscape, getDatePresetRange, getMonthDateRange } from "@/lib/rekening-koran";

describe("rekening koran date helpers", () => {
  const now = new Date("2026-07-15T12:00:00+07:00");

  it("returns current month range", () => {
    expect(getMonthDateRange(now)).toEqual({ startDate: "2026-07-01", endDate: "2026-07-31" });
  });

  it("returns today range", () => {
    expect(getDatePresetRange("today", now)).toEqual({ startDate: "2026-07-15", endDate: "2026-07-15" });
  });

  it("returns week range", () => {
    expect(getDatePresetRange("week", now)).toEqual({ startDate: "2026-07-08", endDate: "2026-07-15" });
  });

  it("returns previous month range", () => {
    expect(getDatePresetRange("lastmonth", now)).toEqual({ startDate: "2026-06-01", endDate: "2026-06-30" });
  });
});

describe("rekening koran csvEscape", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(csvEscape("normal")).toBe("normal");
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('a "quote"')).toBe('"a ""quote"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
  });
});
