# Hufi CLI — Vision & Konzept

> Stand: 2026-05-11. Konzeptdokument.
>
> Keine Implementierung. Kein Code. Nur das Konzept.
>
> Voraussetzung für CLI-Implementierung: Memory-API muss existieren.
> Erst `src/lib/hufai/core/memory/` stabil, dann CLI.

---

## Was Hufi CLI ist

Hufi CLI ist ein Terminal-Interface zu HufAI Core.

Es richtet sich an:
- Pascal selbst (technischer Nutzer)
- Systemadministratoren der HufiApp-Infrastruktur
- Zukünftige Entwickler die HufAI integrieren
- Automatisierungs-Scripts (Cron, CI)

Es ist **kein Ersatz** für HufiApp. Es ist ein anderer Zugangspunkt
zur selben Intelligence — für Kontexte wo ein Browser unpraktisch ist.

---

## Beispiel-Interaktionen

```bash
# Tagesüberblick
$ hufi today

Guten Morgen, Pascal.
3 Termine heute · 1 Pferd überfällig · 2 offene Anfragen
─────────────────────────────────────────────────────────
09:00  Sissy bei Müller (5 km)
11:00  Bavaria bei Schmidt
14:30  Hela bei Wagner

⚠  Lou: 10 Wochen seit letztem Termin (avg 6)
💬 Neue Anfrage: Michael Braun (Neukunde, BHS BALANCE?)

$ hufi today --voice   # TTS-Ausgabe (lokal oder API)
```

```bash
# Pferd öffnen
$ hufi horse bella

Bella · Warmblut · Besitzerin: Anna Müller
─────────────────────────────────────────────────────────
Letzter Termin: 2026-04-12 (29 Tage)
Nächster Termin: 2026-05-14 (3 Tage)
Letzter Befund: Leichte Weißlinienaufweitung VL, VR unauffällig

Huf-Intervall: ø 28 Tage (aktuell: 29 ✓)
Fotos: 4 (zuletzt 2026-04-12)

[memory]  Anna wünscht morgendliche Terminbestätigungen
[pattern] Bella oft empfindlich bei Feuchtigkeit (3 Befunde)
```

```bash
# Frage stellen
$ hufi ask "Warum ist Bella seit März sensitiv?"

Bella — Kontextanalyse:
─────────────────────────────────────────────────────────
Timeline:
  2026-01-15: Befund — alle Hufe unauffällig
  2026-02-20: Befund — VL leichte Empfindlichkeit bei Druck
  2026-03-10: Wetterdaten — erhöhte Feuchtigkeit (Feb–März 68%)
  2026-03-15: Befund — VL/VR: Empfindlichkeit bei Bodenkontakt
  2026-04-12: Befund — Weißlinienaufweitung VL, Empfindlichkeit bestätigt

Hypothese (kein Urteil): Zeitliche Korrelation zwischen erhöhter
Feuchtigkeitsbelastung ab Februar und verstärkter Empfindlichkeit.
Weißlinienaufweitung als möglicher struktureller Faktor.

→ Tierarzt-Konsultation empfohlen bei Fortbestand.

Quelle: horse_memory, horse_timeline, Wetterdaten Open-Meteo
Confidence: mittel | Timestamp: 2026-05-11T08:32:11
```

```bash
# Foto analysieren (Phase F-2 Voraussetzung)
$ hufi scan huf_bella_vl_20260511.jpg --horse bella

Analysiere Bild... ████████████████████ 100%

Befund-Vorschlag (kein medizinisches Urteil):
─────────────────────────────────────────────────────────
Region: Vorderhuf links
Sichtbare Merkmale: Weißlinie, Hufrand, Tragerand
Beobachtung: Aufweitung der Weißlinie sichtbar, ca. 3mm
Empfehlung: Dokumentation, Verlaufsbeobachtung, ggf. Tierarzt

→ Zum Befund hinzufügen? [J/N]
→ Mit letztem Befund vergleichen? [J/N]

Quelle: Claude Vision · ai_status: analysiert
Disclaimer: Kein Ersatz für Tierarzt-Untersuchung.
```

```bash
# Stall-Überblick
$ hufi summarize stable

Stall-Zusammenfassung · 2026-05-11
─────────────────────────────────────────────────────────
Aktive Pferde: 12
Überfällige Pferde (>8 Wochen): 2 (Lou, Bonita)
Termine diese Woche: 7
Offene Rechnungen: 3 (2 > 14 Tage)
Neue Anfragen: 1

Wetter morgen: Regen (67% Wahrscheinlichkeit), 12°C
→ Empfehlung: Puffer für morgen einplanen
```

```bash
# Rechnungen
$ hufi invoices

Offene Rechnungen:
─────────────────────────────────────────────────────────
INV-2026-041  Anna Müller    €240.00   seit 21 Tagen  [MAHNFÄHIG]
INV-2026-038  Klaus Wagner   €180.00   seit 14 Tagen
INV-2026-044  Stall Bergmann €320.00   seit 3 Tagen

$ hufi invoices --create bella --date 2026-05-14
→ Öffnet Bestätigung, dann erstellt Rechnung nach Approval
```

---

## CLI-Architektur (Zielkonzept)

```
hufi (CLI binary)
  │
  ├── auth module       — Supabase JWT, gespeichert in ~/.hufi/credentials
  ├── api client        — HufAI Memory API (REST/GraphQL)
  ├── voice module      — TTS (lokal oder Azure API)
  ├── inference module  — Ollama lokal wenn verfügbar, sonst API
  ├── offline cache     — SQLite lokal (~/.hufi/cache.db)
  └── commands/
        ├── today        — Tagesüberblick
        ├── horse        — Pferd-Details + Memory
        ├── scan         — Bild-Analyse (Phase F-2)
        ├── summarize    — Zusammenfassungen
        ├── invoices     — Rechnungsverwaltung
        ├── ask          — Freie Fragen an HufAI
        ├── notify       — Benachrichtigungen prüfen
        └── config       — CLI konfigurieren
```

**Stack-Empfehlung:**
- Go (compiled binary, cross-platform, kein Node-Install nötig)
- Oder Node.js (gleicher Code-Stack wie HufiApp)

Go ist bevorzugt für Portabilität (ein Binary für Linux/macOS/Windows).

---

## Implementierungs-Voraussetzungen

Bevor Hufi CLI gebaut werden kann, muss folgendes existieren:

1. **HufAI Memory API** — REST-Endpoints für horse_memory, user_memory
2. **Session-Auth für CLI** — Supabase JWT via `supabase auth` oder
   separater CLI-Auth-Flow
3. **Phase F-2** — für `hufi scan` (Vision-Analyse)
4. **Stable Multi-Turn** — für `hufi ask` mit Konversations-Kontext
5. **TTS-Integration** — optional für `--voice` Flag

**Zeitplan:** CLI ist P2. Erst wenn P0 und P1 erledigt.

---

## Offline-CLI

```
Wenn kein Internet verfügbar:

$ hufi today --offline

[Offline-Modus] — Daten aus lokalem Cache (Stand: 2026-05-11 07:00)
─────────────────────────────────────────────────────────
Heute: 3 Termine (aus letztem Sync)
⚠ Keine Live-Daten verfügbar.

[Offline-Modus] — Lokale Inferenz (Ollama llama3.1)
$ hufi ask "Was war Bellas letzter Befund?"
→ Antwortet aus lokalem Cache + lokalem Modell
```

Offline-Mode erfordert:
- Lokale SQLite-Cache-DB mit letzten Sync-Daten
- Ollama installiert und Modell geladen
- Letzte Memory-Daten lokal synchronisiert

---

## Was CLI nicht ist

- Kein Ersatz für HufiApp
- Kein Admin-Tool für Supabase (dafür: `supabase` CLI)
- Kein Backup-Tool
- Kein direkter DB-Zugriff (immer über HufAI API)
- Keine autonomen Aktionen ohne Approval-Prompt

---

## Warum CLI wichtig ist für den Moat

1. **Ecosystem-Signaling:** Ein CLI zeigt Ernsthaftigkeit — kein Spielzeug
2. **Automation:** Cron-Jobs für Briefings, Berichte, Backups
3. **Developer API:** Dritte können HufAI integrieren
4. **Offline-AI:** Terminal-Inferenz ohne Browser
5. **Power-User-Werkzeug:** Pascal kann alles per Terminal erledigen
