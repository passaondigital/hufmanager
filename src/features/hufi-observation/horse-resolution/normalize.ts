// ── Namensnormalisierung für die Pferdesuche ────────────────────────────
//
// Zweck: "Ginger", "ginger", "  Ginger " und "GINGER" sollen denselben
// Treffer liefern; deutsche Umlaute/ß sowie gängige lateinische Akzente
// (é, à, ñ, …) sollen sowohl in ausgeschriebener ("ae") als auch in
// akzentloser ("a") Tippweise gefunden werden, ohne eine Postgres-
// Erweiterung (z. B. unaccent) vorauszusetzen — reine JS-Normalisierung,
// angewendet auf Suchbegriff UND gespeicherten Namen gleichermaßen, siehe
// match.ts.

/** Deutsche Umlaute/ß explizit vor der generischen Diakritika-Entfernung
 * ausschreiben — sonst würde NFD "ä" zu "a" statt zur in Deutschland
 * gebräuchlicheren Schreibweise "ae" auflösen. */
function expandGermanUmlauts(input: string): string {
  return input
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

/** Generische Diakritika-Entfernung für alles, was nicht deutsch ist
 * (é→e, à→a, ñ→n, …) — nach der Umlaut-Ausschreibung, damit ä/ö/ü nicht
 * doppelt (und anders) behandelt werden. */
function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Kanonische Form für Namensvergleiche: Umlaute ausgeschrieben, übrige
 * Akzente entfernt, kleingeschrieben, Leerraum getrimmt/kollabiert. Wird
 * auf Suchbegriff UND horses.name gleichermaßen angewendet. */
export function normalizeHorseSearchTerm(input: string): string {
  return stripDiacritics(expandGermanUmlauts(input))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Normalisierung für readable_id/EQID-Eingaben: '#' entfernen,
 * Großschreibung, Leerraum trimmen — entspricht der serverseitigen
 * clean_id-Logik in search_horse_by_readable_id()/search_profile_by_readable_id()
 * (siehe docs/hufi-id-system-analysis.md Abschnitt 14 Punkt 3 zur Begründung,
 * warum diese Funktion selbst hier NICHT aufgerufen wird — nur ihr
 * Normalisierungsmuster wird übernommen). */
export function normalizeReadableIdInput(input: string): string {
  return input.replace(/#/g, "").trim().toUpperCase();
}
