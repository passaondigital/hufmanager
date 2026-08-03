// Typgeprüfte Beispiel-/Assertions-Skripte, kein echter Test-Runner
// (siehe ../../contracts/__examples__/README.md). Geprüft via
// `npx tsc --noEmit`. Arbeitet ausschließlich mit handgebauten
// AccessibleHorse-Fixtures — KEIN Supabase-/Netzwerkzugriff, siehe
// resolve.ts-Kommentar zur Trennung reiner Entscheidungsfunktionen von I/O.

import type { AccessibleHorse } from "../horse-access";
import { matchHorsesByName } from "../match";
import { resolveFromMatches, resolveContextHorse } from "../resolve";
import { assertTrue, assertFalse } from "../../contracts/__examples__/assert-helpers";

function horse(overrides: Partial<AccessibleHorse> & { id: string; name: string }): AccessibleHorse {
  return {
    readableId: null,
    ownerId: "00000000-0000-0000-0000-0000000000f0",
    ownerDisplayName: "Test-Kundin",
    horseStatus: "active",
    ...overrides,
  };
}

// ── exact ────────────────────────────────────────────────────────────────
{
  const horses = [horse({ id: "h1", name: "Bella" })];
  const result = resolveFromMatches(matchHorsesByName(horses, "Bella"));
  assertTrue(result.status === "exact", "genau ein aktiver Treffer ergibt Status 'exact'");
  assertTrue(result.selectedHorseId === "h1", "exact setzt selectedHorseId");
  assertTrue(
    result.candidates.length === 1 && result.candidates[0].selectable === true,
    "exact liefert genau einen auswählbaren Kandidaten",
  );
}

// ── ambiguous — gleiche Pferdenamen, unterschiedliche Besitzer ──────────
{
  const horses = [
    horse({ id: "h2a", name: "Ginger", ownerId: "owner-a", ownerDisplayName: "Anna Kunde" }),
    horse({ id: "h2b", name: "Ginger", ownerId: "owner-b", ownerDisplayName: "Bea Kunde" }),
  ];
  const result = resolveFromMatches(matchHorsesByName(horses, "Ginger"));
  assertTrue(result.status === "ambiguous", "zwei gleichnamige Pferde ergeben 'ambiguous'");
  assertTrue(result.candidates.length === 2, "beide Kandidaten werden gelistet");
  assertTrue(
    result.candidates.every((c) => c.selectable),
    "beide Kandidaten sind auswählbar (beide autorisiert)",
  );
  assertTrue(
    result.candidates[0].owner?.displayName !== result.candidates[1].owner?.displayName,
    "unterschiedliche Besitzer werden zur Unterscheidung mitgeliefert",
  );
  assertTrue(result.selectedHorseId === undefined, "ambiguous setzt KEIN selectedHorseId");
}

// ── not_found ────────────────────────────────────────────────────────────
{
  const horses = [horse({ id: "h3", name: "Bella" })];
  const result = resolveFromMatches(matchHorsesByName(horses, "Maximus"));
  assertTrue(result.status === "not_found", "kein Treffer ergibt 'not_found'");
  assertTrue(result.candidates.length === 0, "not_found liefert keine Kandidaten");
}

// ── archived (verkauft/verstorben/archiviert/gestohlen) ─────────────────
{
  const horses = [horse({ id: "h4", name: "Rocky", horseStatus: "sold" })];
  const result = resolveFromMatches(matchHorsesByName(horses, "Rocky"));
  assertTrue(result.status === "archived", "einziger Treffer mit horse_status≠'active' ergibt 'archived'");
  assertTrue(
    result.candidates[0].selectable === false && result.candidates[0].exclusionReason === "verkauft",
    "archivierter Kandidat ist nicht auswählbar und trägt den Grund",
  );
}

// ── aktiv + archiviert gleichzeitig: aktiver Treffer gewinnt (exact) ────
{
  const horses = [
    horse({ id: "h5a", name: "Nova", horseStatus: "active" }),
    horse({ id: "h5b", name: "Nova", horseStatus: "archived", ownerId: "owner-c" }),
  ];
  const result = resolveFromMatches(matchHorsesByName(horses, "Nova"));
  assertTrue(
    result.status === "exact" && result.selectedHorseId === "h5a",
    "bei genau einem aktiven Treffer neben archivierten gleichnamigen wird 'exact' auf den aktiven gesetzt",
  );
  assertTrue(
    result.candidates.some((c) => c.horseId === "h5b" && !c.selectable),
    "der archivierte gleichnamige Kandidat bleibt sichtbar, aber nicht auswählbar",
  );
}

// ── EQID vorhanden: exakter EQID-Treffer hat Vorrang vor Namenssuche ────
{
  const horses = [
    horse({ id: "h6", name: "Storm", readableId: "EQID-483920" }),
    horse({ id: "h6b", name: "Storm II", readableId: "EQID-111111" }),
  ];
  const result = resolveFromMatches(matchHorsesByName(horses, "#eqid-483920"));
  assertTrue(
    result.status === "exact" && result.selectedHorseId === "h6",
    "EQID-Eingabe (mit '#', Kleinschreibung) findet exakt das passende Pferd über readable_id",
  );
}

// ── EQID nicht vorhanden: horses.readableId === null wird nie fälschlich getroffen ──
{
  const horses = [horse({ id: "h7", name: "Aurora", readableId: null })];
  const result = resolveFromMatches(matchHorsesByName(horses, "EQID-999999"));
  assertTrue(
    result.status === "not_found",
    "Suche nach einer EQID, die kein Pferd hat, liefert 'not_found' statt eines falschen Treffers",
  );
}

// ── unauthorized: KEINE Pferdedaten in den Kandidaten ───────────────────
{
  const result = resolveContextHorse(null);
  assertTrue(result.status === "unauthorized", "fehlender Kontext-Zugriff ergibt 'unauthorized'");
  assertTrue(
    result.candidates.length === 0,
    "unauthorized liefert eine leere Kandidatenliste — keine Information über das fremde Pferd",
  );
}

// ── contextual ───────────────────────────────────────────────────────────
{
  const h = horse({ id: "h8", name: "Contexta" });
  const result = resolveContextHorse(h);
  assertTrue(result.status === "contextual", "vorhandenes Kontext-Pferd ergibt 'contextual'");
  assertTrue(result.selectedHorseId === "h8", "contextual setzt selectedHorseId direkt");
}

// ── contextual, aber archiviert ──────────────────────────────────────────
{
  const h = horse({ id: "h9", name: "Alt", horseStatus: "deceased" });
  const result = resolveContextHorse(h);
  assertTrue(
    result.status === "archived" && result.candidates[0].exclusionReason === "verstorben",
    "archiviertes Kontext-Pferd ergibt 'archived', nicht 'contextual'",
  );
}

// ── Namenssuche mit zu kurzem Suchbegriff liefert keine Treffer ─────────
{
  const horses = [horse({ id: "h10", name: "A" })];
  assertFalse(
    matchHorsesByName(horses, "a").length > 0,
    "ein einzelnes Zeichen als Suchbegriff liefert keine Treffer (Missbrauchsschutz)",
  );
}
