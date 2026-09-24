import { afterEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";

// Rechnungsdatum muss das lokale Datum sein, nicht UTC: kurz nach Mitternacht
// in Deutschland lieferte toISOString() noch den Vortag (Prod, 25.09.2026 00:24 MESZ).
describe("invoice issue date default", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the local calendar day right after local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 0, 24)); // 25.09.2026 00:24 lokale Zeit
    expect(format(new Date(), "yyyy-MM-dd")).toBe("2026-09-25");
  });
});
