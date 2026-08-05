import { describe, expect, it } from "vitest";
import { formatDraftDate, formatDuration, formatFileSize } from "./audioDraftFormat";

describe("formatFileSize", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
  it("never returns a negative or NaN size", () => {
    expect(formatFileSize(-5)).toBe("0 B");
    expect(formatFileSize(NaN)).toBe("0 B");
  });
});

describe("formatDraftDate", () => {
  it("formats a valid ISO timestamp", () => {
    const result = formatDraftDate("2026-08-05T14:30:00.000Z");
    expect(result).toMatch(/2026/);
  });
  it("falls back to the raw string for an invalid date", () => {
    expect(formatDraftDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });
  it("clamps negative durations to zero", () => {
    expect(formatDuration(-3)).toBe("0:00");
  });
});
