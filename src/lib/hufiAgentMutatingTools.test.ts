import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HUFI_ACTION_TYPES } from "./hufiActionTypes";
import { taskTypeToActionType, type AgentTaskType } from "./hufi-agent-tasks";
import { toolNameToTaskType } from "./hufi-tool-definitions";

/**
 * P1-3 (Correction Pass 5): Vertragstest über die Grenze Edge Function ↔ App.
 *
 * Befund war: hufi-agent bewirbt das Tool create_contact, führt es aber nie
 * aus, weil es in EXECUTABLE_MUTATING_TOOLS fehlte. Der neue, kanonische
 * create_customer_with_contact-Pfad war damit faktisch unerreichbar. Das ist
 * keine Logik, die man in der Edge Function unit-testen kann (Deno, eigener
 * Runtime) — prüfbar ist aber die Deklaration selbst. Genau das macht dieser
 * Test: er liest die beiden Listen aus dem Quelltext der Function und hält
 * sie gegen die Ausführungspfade der App.
 */
const AGENT_SOURCE = readFileSync(
  resolve(__dirname, "../../supabase/functions/hufi-agent/index.ts"),
  "utf8",
);

function parseMutatingTools(): string[] {
  const match = AGENT_SOURCE.match(/const MUTATING_TOOLS = new Set\(\[([\s\S]*?)\]\)/);
  if (!match) throw new Error("MUTATING_TOOLS nicht gefunden — hufi-agent/index.ts umgebaut?");
  return [...match[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

function parseExecutableMutatingTools(): Record<string, { taskType: string; actionType: string }> {
  const match = AGENT_SOURCE.match(
    /const EXECUTABLE_MUTATING_TOOLS: Record<string, \{ taskType: string; actionType: string \}> = \{([\s\S]*?)\n\};/,
  );
  if (!match) throw new Error("EXECUTABLE_MUTATING_TOOLS nicht gefunden — hufi-agent/index.ts umgebaut?");
  const entries: Record<string, { taskType: string; actionType: string }> = {};
  for (const line of match[1].split("\n")) {
    const row = line.match(/^\s*([a-z_]+):\s*\{\s*taskType:\s*"([a-z_]+)",\s*actionType:\s*"([a-z_]+)"\s*\}/);
    if (row) entries[row[1]] = { taskType: row[2], actionType: row[3] };
  }
  return entries;
}

const mutatingTools = parseMutatingTools();
const executableTools = parseExecutableMutatingTools();

describe("hufi-agent: mutierende Tools", () => {
  it("die Listen lassen sich überhaupt lesen (Test wird sonst stillschweigend wertlos)", () => {
    expect(mutatingTools.length).toBeGreaterThan(0);
    expect(Object.keys(executableTools).length).toBeGreaterThan(0);
  });

  it("create_contact ist ausführbar (P1-3: war beworben, aber unerreichbar)", () => {
    expect(executableTools.create_contact).toBeDefined();
    expect(executableTools.create_contact.actionType).toBe("create_customer");
  });

  it("create_contact bleibt bestätigungspflichtig — kein Bypass der Autorisierung", () => {
    // Das ist der Kern: ausführbar zu machen darf NICHT heißen, an
    // MUTATING_TOOLS vorbeizugehen. Nur wer hier steht, wird als
    // hufi_task_queue-Eintrag mit requires_confirm abgelegt und erst nach
    // Nutzerbestätigung ausgeführt.
    expect(mutatingTools).toContain("create_contact");
  });

  it("kein ausführbares Tool umgeht die Bestätigungspflicht", () => {
    for (const tool of Object.keys(executableTools)) {
      expect(mutatingTools, `${tool} fehlt in MUTATING_TOOLS`).toContain(tool);
    }
  });

  it("jedes ausführbare Tool zeigt auf einen Aktionstyp, den executeHufiAction kennt", () => {
    // Genau diese Prüfung hätte den P1-3-Befund verhindert: ein Eintrag mit
    // actionType, den es in hufi-actions.ts nicht gibt, fällt sofort auf.
    for (const [tool, entry] of Object.entries(executableTools)) {
      expect(
        HUFI_ACTION_TYPES as readonly string[],
        `${tool} verweist auf unbekannten actionType "${entry.actionType}"`,
      ).toContain(entry.actionType);
    }
  });

  it("create_horse bleibt bewusst ohne Ausführungspfad (klare Absage statt stillem Hängen)", () => {
    expect(mutatingTools).toContain("create_horse");
    expect(executableTools.create_horse).toBeUndefined();
  });
});

describe("Tool → Task → Aktion für create_contact", () => {
  it("toolNameToTaskType bildet create_contact auf create_customer ab", () => {
    expect(toolNameToTaskType("create_contact")).toBe("create_customer");
  });

  it("taskTypeToActionType führt von create_customer zum Ausführungspfad", () => {
    expect(taskTypeToActionType("create_customer")).toBe("create_customer");
  });

  it("die Kette aus der Edge Function endet beim selben Aktionstyp wie die App-Kette", () => {
    const fromEdgeFunction = executableTools.create_contact.actionType;
    const fromApp = taskTypeToActionType(toolNameToTaskType("create_contact") as AgentTaskType);
    expect(fromEdgeFunction).toBe(fromApp);
  });

  it("unbekannte/nicht freigegebene Tools erhalten keinen Ausführungspfad", () => {
    expect(executableTools.delete_everything).toBeUndefined();
    expect(toolNameToTaskType("delete_everything")).toBe("generic_action");
  });
});
