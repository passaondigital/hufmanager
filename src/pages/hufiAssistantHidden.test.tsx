import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import Support from "@/pages/Support";
import { HufiAssistantUnavailableCard } from "@/components/settings/HufiAssistantUnavailableCard";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/config/featureFlags";

// Hufi-Assistent ist vorübergehend ausgeblendet (28.09.2026, KI-Anbieter nicht erreichbar).
describe("Hufi-Assistent ausgeblendet", () => {
  it("Flag steht auf aus", () => {
    expect(FEATURE_FLAGS.hufiAssistant.enabled).toBe(false);
    expect(isFeatureEnabled("hufiAssistant")).toBe(false);
  });

  it("Support zeigt keine Hufi-Chat-Kachel, aber weiter E-Mail-Support", () => {
    const html = renderToStaticMarkup(<MemoryRouter><Support /></MemoryRouter>);
    expect(html).not.toContain("Frag Hufi");
    expect(html).not.toContain("Chat starten");
    expect(html).toContain("E-Mail");
  });

  it("Ersatzkarte meldet 'nicht verfügbar' und behält den DSGVO-Link", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HufiAssistantUnavailableCard /></MemoryRouter>);
    expect(html).toContain("derzeit nicht verfügbar");
    expect(html).toContain('href="/hufi/memory"');
  });

  it("Einstellungen: KI-Karte und Routinen hängen am Flag, Routinen-Tab wird ausgefiltert", () => {
    const src = readFileSync("src/pages/Management.tsx", "utf8");
    expect(src).toContain('isFeatureEnabled("hufiAssistant") ? <KiSettingsCard');
    expect(src).toContain('isFeatureEnabled("hufiAssistant") ? <HufiRoutinesManager />');
    expect(src).toMatch(/assistantEnabled \|\| t\.value !== "routines"/);
  });

  it("Normaler Slim-Ablauf bindet den Assistenten (MobileShell/hufi-agent) nicht ein", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).not.toMatch(/<MobileShell[\s/>]/);
    const shell = readFileSync("src/components/slim/HufManagerSlimShell.tsx", "utf8");
    expect(shell).not.toMatch(/hufi-agent|askHufiAgent|MobileShell/);
  });
});
