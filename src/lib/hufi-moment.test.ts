import { describe, it, expect } from "vitest";
import { detectMomentHint } from "./hufi-moment";

describe("detectMomentHint (rein lokaler UI-Hinweis, keine Entscheidungslogik)", () => {
  it("erkennt Buchhaltungs-Moment", () => {
    expect(detectMomentHint("Hufi, ich sitze gerade an der Buchhaltung.")).toBe("bookkeeping");
  });

  it("erkennt Rechnungs-Moment", () => {
    expect(detectMomentHint("Ich glaube, da war noch eine Rechnung.")).toBe("invoice");
  });

  it("erkennt Erinnerungs-/Verlaufs-Fragen", () => {
    expect(detectMomentHint("Was hatten wir beim letzten Mal vereinbart?")).toBe("search_memory");
    expect(detectMomentHint("Wo war das noch mal?")).toBe("search_memory");
  });

  it("erkennt Ueberforderung", () => {
    expect(detectMomentHint("Ich weiß gerade nicht, wo ich anfangen soll.")).toBe("general_overwhelm");
  });

  it("liefert null bei neutralem Text -- kein erfundener Moment", () => {
    expect(detectMomentHint("Wie ist das Wetter heute?")).toBeNull();
  });

  it("liefert null bei leerem Text", () => {
    expect(detectMomentHint("")).toBeNull();
    expect(detectMomentHint("   ")).toBeNull();
  });
});
