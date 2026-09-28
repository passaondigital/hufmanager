import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Membership-404 (28.09.2026): HufManager fragt den nicht angewendeten Produkt-Splitter nicht mehr ab.
describe("useProductMembership – HufManager ohne Splitter-RPC", () => {
  const src = readFileSync(join(process.cwd(), "src/hooks/useProductMembership.ts"), "utf8");
  it("HufManager-Flavor kehrt vor dem RPC mit 'unavailable' zurück", () => {
    const guard = src.indexOf('if (ACTIVE_FLAVOR === "hufmanager")');
    const rpc = src.indexOf('supabase.rpc("get_product_membership_context"');
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(rpc);
    expect(src.slice(guard, rpc)).toContain('setResolution("unavailable")');
  });
  it("Startzustand ohne Ladebildschirm im HufManager", () => {
    expect(src).toMatch(/hufmanagerOnly \? "unavailable" : "resolving"/);
    expect(src).toMatch(/!cached && !hufmanagerOnly/);
  });
});
