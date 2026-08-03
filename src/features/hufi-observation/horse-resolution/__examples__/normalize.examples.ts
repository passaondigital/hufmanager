// Typgeprüfte Beispiel-/Assertions-Skripte, kein echter Test-Runner
// (siehe ../../contracts/__examples__/README.md für die Begründung —
// gilt unverändert für diesen Ordner). Geprüft via `npx tsc --noEmit`.

import { normalizeHorseSearchTerm, normalizeReadableIdInput } from "../normalize";
import { assertTrue } from "../../contracts/__examples__/assert-helpers";

// ── Groß-/Kleinschreibung ────────────────────────────────────────────────
assertTrue(
  normalizeHorseSearchTerm("Ginger") === normalizeHorseSearchTerm("GINGER"),
  "Groß-/Kleinschreibung wird ignoriert",
);
assertTrue(
  normalizeHorseSearchTerm("Ginger") === normalizeHorseSearchTerm("ginger"),
  "Kleinschreibung entspricht Originalschreibung",
);

// ── Leerzeichen ──────────────────────────────────────────────────────────
assertTrue(
  normalizeHorseSearchTerm("  Ginger  ") === normalizeHorseSearchTerm("Ginger"),
  "Führende/nachgestellte Leerzeichen werden entfernt",
);
assertTrue(
  normalizeHorseSearchTerm("Lucky   Star") === normalizeHorseSearchTerm("Lucky Star"),
  "Mehrfache Leerzeichen werden zu einem kollabiert",
);

// ── Umlaute ──────────────────────────────────────────────────────────────
assertTrue(
  normalizeHorseSearchTerm("Härte") === normalizeHorseSearchTerm("Haerte"),
  "ä wird zu ae normalisiert (deutsche Schreibweise)",
);
assertTrue(
  normalizeHorseSearchTerm("Königin") === normalizeHorseSearchTerm("Koenigin"),
  "ö wird zu oe normalisiert",
);
assertTrue(
  normalizeHorseSearchTerm("Grüezi") === normalizeHorseSearchTerm("Gruezi"),
  "ü wird zu ue normalisiert",
);
assertTrue(
  normalizeHorseSearchTerm("Straße") === normalizeHorseSearchTerm("Strasse"),
  "ß wird zu ss normalisiert",
);

// ── Einfache Sonderzeichen (nicht-deutsche Akzente) ────────────────────
assertTrue(
  normalizeHorseSearchTerm("José") === normalizeHorseSearchTerm("Jose"),
  "é wird über NFD-Diakritika-Entfernung auf e abgebildet",
);

// ── EQID-Normalisierung ──────────────────────────────────────────────────
assertTrue(
  normalizeReadableIdInput("#EQID-483920") === "EQID-483920",
  "# wird aus EQID-Eingaben entfernt",
);
assertTrue(
  normalizeReadableIdInput("eqid-483920") === "EQID-483920",
  "EQID-Eingabe wird großgeschrieben",
);
assertTrue(
  normalizeReadableIdInput("  EQID-483920  ") === "EQID-483920",
  "EQID-Eingabe wird getrimmt",
);
