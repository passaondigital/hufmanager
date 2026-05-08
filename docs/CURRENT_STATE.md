# Hufi — Current State

> Snapshot dieses Projektzustands. Erste Anlaufstelle für jeden Menschen oder
> Agenten (Claude Code, Gemini CLI, ChatGPT), der einsteigt. Wenn etwas hier
> nicht stimmt, ist diese Datei stale — bitte aktualisieren, nicht ignorieren.
>
> **Begleitdokumente:** `VISION.md` (was Hufi sein will), `ROADMAP.md`
> (wann), `RECOVERY_LOG.md` (was zuletzt repariert wurde),
> `VPS_INFRASTRUCTURE.md` (wo es läuft), `PROJECT_MAP.md` (wie die Marken
> zusammenhängen), `PASCAL_CONTEXT.md` (wer den Hut auf hat).

## Stand

- **Datum:** 2026-05-08
- **Branch:** `sprint2/anthropic-and-domains-20260425`
- **Live-Domain:** https://hufiapp.de
- **Kanonischer Pfad:** `/hufiapp` → Symlink auf `/root/hufmanager_v25/production`
- **Build-Output:** `/var/www/hufiapps/v25/`
- **Working Tree:** Index ist normalerweise leer. Dauerhaft modifiziert
  bleibt nur `supabase/.temp/cli-latest` (generierter CLI-Versionsmarker,
  **nicht committen**). Untracked Dateien während aktiver Doku- oder
  Feature-Sessions sind erwartet und kein Defekt.

## Wer ist Hufi heute?

- HufiApp ist die **aktuelle Produktebene**.
- HufManager ist der **Ursprung und Legacy-Name** — bestehende Nutzer und
  Bookmarks zeigen weiter auf `hufmanager.de` / `app.hufmanager.de`.
- Die Codebase ist eine Codebase für beide. Es gibt kein zweites, getrenntes
  HufManager-Repo und es soll auch keins geben.

## Was produktiv wichtig ist

- Live-Auslieferung über `hufiapp.de` (Hauptdomain) und die `hufmanager.de`-
  Aliase darf nicht brechen.
- Lead-/Anfragen-Flow zwischen Provider-Sicht (`Anfragen.tsx`) und
  Stall-Sicht (`StallAnfragen.tsx`) muss konsistent bleiben.
- PWA / Mobile Bottom Nav sind Recovery-empfindlich — vor Änderungen
  testen, nicht "schnell anpassen".
- Anthropic-Key liegt **nicht** im Frontend, sondern als Supabase-Secret
  hinter der Edge Function `anthropic-proxy`.

## Was zuletzt gefixt wurde (heute)

| Commit | Fix |
|---|---|
| `3522de61` | `fix(leads)` — Status-Werte zwischen Provider- und Stall-View kompatibel: `neu`/`new`, `kontaktiert`/`pending`, `gewonnen`/`accepted`. |
| `b8eb6249` | `fix(routing)` — `hufmanager.de` und `www.hufmanager.de` als Legacy-Main-Domain-Aliase, damit alte HufManager-Bookmarks die Landing Page sehen statt Auth-Screen. |
| `2d7344be` | `docs(vision)` — `docs/VISION.md` als versionierte Produkt-Vision (ohne vertrauliche Langfrist-Strategie). |

Davor (für Kontext, nicht heute):
- `932728d6` `feat(leads)` — Next-Step-Hint auf Lead-Karten.
- `37f43d5b` `chore(recovery)` — Mobile-Nav-Zentrierung + PWA-Cache-Limit.
- `88403316` `feat(leads)` — BHS-Plan-Tier-Klassifikation.

## Was noch offen ist

- **Kein Push** der drei heutigen Recovery-Commits — bewusste
  Sicherheitspause, bevor Live-Deployment ausgelöst wird.
- **PWA / Mobile Nav** noch nicht systematisch getestet (Recovery-Risiko aus
  früherem Stand, Code unverändert seit `37f43d5b`).
- **Inventur der `hufmanager`-Mentions** in `src/` steht noch aus —
  laut Live-Check ~65 Vorkommen (E-Mails, Affiliate-Links,
  UI-Strings). Klassifikation in *legitim* vs. *zu migrieren*
  als P1 in `ROADMAP.md`, keine Massen-Replace-Aktion.
- **`src/lib/hufi-memory.ts`** existiert noch nicht — Hufi-Memory-Layer
  ist Konzept, kein Code.
- **`docs/PASCAL_CONTEXT.md`** ist strukturiert vorbereitet, wartet
  aber weiter auf den "System Context Export". SmartHoof, PASSAON,
  Arbeitsrhythmen und Mitarbeitende brauchen direkte Pascal-Inputs,
  kein Agent darf sie erfinden.

## Bekannte Risiken

- **Disk-Auslastung** auf VPS: 71% belegt (136 GB von 193 GB) — Build-Output
  und Ollama-Modelle wachsen, im Auge behalten.
- **Generierte Riesen-Assets**: am 2026-05-07 wurden durch einen
  Agenten-Unfall drei Bilder (`apple-touch-icon.png`, `og-image.png`,
  fälschlich erzeugte `favicon.ico`) als 11.8 MB / 10000×10000 PNGs
  überschrieben. Zurückgerollt, nicht im Verlauf. Wenn solche Sizes
  wieder auftauchen → sofort stoppen. Details: `RECOVERY_LOG.md`.
- **Memory-Drift**: Architektur-Memory aus April/Mai 2026 enthält teils
  veraltete Routen-Aussagen. Code-Stand schlägt Memory.

## Was nicht angefasst werden soll

- `supabase/.temp/cli-latest` — generierter Marker.
- Bestehende `hufiapp.de`-Routing-Logik.
- Auth-Domain-Setup (`app.hufiapp.de` / `app.hufmanager.de`).
- Ollama-Modellbestand auf dem VPS, wenn nicht ausdrücklich gefragt.
- Supabase-Schema (keine Migrations in Recovery-Phasen).

## Nächster sinnvoller Schritt

> Diese Liste ist bewusst kurz und wird bei jeder Aktualisierung dieser
> Datei neu geschrieben. Erledigtes wandert ins `RECOVERY_LOG.md`.

1. Doku-Dateien aus dieser Session (`CURRENT_STATE`, `ROADMAP`,
   `VPS_INFRASTRUCTURE`, `RECOVERY_LOG`, `PASCAL_CONTEXT`, `PROJECT_MAP`)
   reviewen und committen, sobald freigegeben.
2. Push-Entscheidung für die heutigen Recovery- und Doku-Commits treffen
   (kein Push ohne explizite Freigabe).
3. PWA-/Mobile-Nav-Verifikation gezielt durchführen, separat von
   Feature-Arbeit.
4. `PASCAL_CONTEXT.md` mit Pascals "System Context Export" verdichten,
   sobald nachgereicht.
