import { describe, expect, it } from "vitest";
import { getConnectionState } from "./connectionState";
describe("getConnectionState", () => { it("reports offline only when the browser explicitly reports no route", () => { expect(getConnectionState({ onLine: false } as Navigator)).toBe("offline"); expect(getConnectionState({ onLine: true } as Navigator)).toBe("online"); }); });
