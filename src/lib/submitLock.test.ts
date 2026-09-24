import { describe, expect, it } from "vitest";
import { createSubmitLock } from "./submitLock";

describe("createSubmitLock", () => {
  it("fuehrt bei gleichzeitigem Doppel-Aufruf genau einmal aus", async () => {
    const run = createSubmitLock();
    let calls = 0;
    const work = () => new Promise<number>((r) => { calls++; setTimeout(() => r(calls), 20); });
    const [a, b] = await Promise.all([run(work), run(work)]);
    expect(calls).toBe(1);
    expect(a).toBe(1);
    expect(b).toBeUndefined();
  });

  it("gibt nach Abschluss wieder frei", async () => {
    const run = createSubmitLock();
    let calls = 0;
    await run(async () => { calls++; });
    await run(async () => { calls++; });
    expect(calls).toBe(2);
  });

  it("gibt auch nach einem Fehler wieder frei", async () => {
    const run = createSubmitLock();
    await expect(run(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    let ran = false;
    await run(async () => { ran = true; });
    expect(ran).toBe(true);
  });
});
