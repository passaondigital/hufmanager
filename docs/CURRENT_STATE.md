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

- **Datum:** 2026-05-11
- **Branch:** `sprint2/anthropic-and-domains-20260425`
- **Live-Domain:** https://hufiapp.de
- **Kanonischer Pfad:** `/hufiapp` → Symlink auf `/root/hufmanager_v25/production`
- **Build-Output:** `/var/www/hufiapps/v25/`
- **Working Tree:** Index ist normalerweise leer. Dauerhaft modifiziert
  bleibt nur `supabase/.temp/cli-latest` (generierter CLI-Versionsmarker,
  **nicht committen**). Untracked Dateien während aktiver Doku- oder
  Feature-Sessions sind erwartet und kein Defekt.

## Wer ist Hufi heute?

- **HufiApp** ist die tägliche Shell und das Workflow-Werkzeug.
  Termine, Pferde, Befunde, Rechnungen, Navigation — live unter `hufiapp.de`.
- **HufAI** ist die Intelligenzschicht dahinter.
  Proaktives Briefing, Sprachsteuerung, Kontext-Assistent.
  Leitfrage: "Macht das HufAI intelligenter?"
- **HufManager** ist der Ursprung und Legacy-Name — bestehende Nutzer und
  Bookmarks zeigen weiter auf `hufmanager.de` / `app.hufmanager.de`.
- Eine Codebase für alle. Kein zweites Repo.

## Phase E — Proaktives Briefing (live)

| Datei | Funktion |
|---|---|
| `src/lib/hufai-proactive.ts` | TTL-Gate, Open-Meteo-Wetter, Briefing-Builder |
| `src/components/voice/ProactiveBriefing.tsx` | Bottom-Sheet, TTS, Action-Chips |
| `src/components/layout/MobileShell.tsx` | Integration, shouldShowBriefing-Check |

- Feuert maximal einmal alle 4 Stunden pro Gerät (localStorage-Gate).
- Kein LLM-Aufruf, kein API-Key — rein regel-basiert.
- Wetter via Open-Meteo (kostenlos, kein Key), Fallback wenn nicht erreichbar.
- Spricht automatisch via `useHufiTTS` wenn Sprachausgabe aktiviert.

## Phase F-1 — Horse Media Pipeline (implementiert, noch nicht deployed)

| Datei | Funktion |
|---|---|
| `supabase/migrations/20260511180000_horse_media.sql` | Tabelle `horse_media`, RLS, Bucket `horse-media` |
| `src/lib/hufai-media.ts` | Upload, List, SignedURL, Delete |
| `src/components/horse-detail/HorseMediaTimeline.tsx` | Kompakte Medien-Galerie (6 Items) |
| `src/pages/ProviderHorseDetail.tsx` | HufiCam → echten Upload verdrahtet |

- Bucket `horse-media` (privat, 50 MB, signed URLs, kein öffentlicher Zugriff).
- Pfad-Struktur: `{ownerId}/{horseId}/{yyyy}/{mm}/{uuid}.{ext}`.
- `ai_status = 'pending'` — Phase F-2 wird KI-Analyse anhängen.
- **Keine** automatisierte medizinische Diagnose.
- Migration noch nicht gepusht (warte auf explizite Freigabe via `db push`).

## Sensor-Layer (implementiert, Integration gestartet)

| Modul | Datei | Status |
|---|---|---|
| Biometrie (WebAuthn) | `src/lib/hufi-biometrics.ts` | Fertig — in `/management/sicherheit` eingebunden |
| GPS-Hook | `src/hooks/useHufiGPS.ts` | Fertig — Opt-in-Consent in DayCockpit eingebunden |
| Kamera / Video | `src/components/camera/HufiCam.tsx` | Fertig — in ProviderHorseDetail eingebunden |
| Biometrie-UI | `src/components/sensors/HufiBiometricGate.tsx` | Fertig — in ManagementSicherheit eingebunden |
| Wetter-Widget | `src/components/weather/HufiWeatherWidget.tsx` | Fertig — in MobileShell TopBar eingebunden |

**Noch ausstehend:**
- Kamera-Upload / Storage-Flow (Upload-Ziel offen — kein upload noch).
- Foto/Video aus HufiCam in die Pferdeakte speichern (Supabase Storage-Bucket).
- Deeper GPS-Integration: `useHufiGPS` in der bestehenden DayCockpit-GPS-Logik als
  Hook-Ersatz (aktuell nur Consent-Gate, rawes watchPosition bleibt).
- HufiWeatherWidget auf Dashboard/Home-Seite (derzeit nur TopBar compact).
- Biometrik für Tresor-Entsperrung (statt oder zusätzlich zu PIN).

## Was produktiv wichtig ist

- Live-Auslieferung über `hufiapp.de` (Hauptdomain) und die `hufmanager.de`-
  Aliase darf nicht brechen.
- Lead-/Anfragen-Flow zwischen Provider-Sicht (`Anfragen.tsx`) und
  Stall-Sicht (`StallAnfragen.tsx`) muss konsistent bleiben.
- PWA / Mobile Bottom Nav sind Recovery-empfindlich — vor Änderungen
  testen, nicht "schnell anpassen".
- Anthropic-Key liegt **nicht** im Frontend, sondern als Supabase-Secret
  hinter der Edge Function `anthropic-proxy`.

## Was zuletzt gebaut wurde

| Commit | Inhalt |
|---|---|
| `1aa10683` | `feat(voice)` — Phase E: Proaktives Briefing, Wetter-Integration |
| `304d3f7d` | `feat(tresor)` — Vault Premium Gate |
| `e64687ab` | `feat(voice)` — Phase D: extended wake words + opt-in consent |
| `55cdd6ab` | `feat(nav)` — Phase E: context-aware actions |
| `2f4153d6` | `feat(voice)` — Phase D: globales "Hey Hufi" wake-word |
| `cedb7794` | `feat(voice+nav)` — Phase A/B/C: Voice Greeting, Push-to-Talk, Nav |

## Strategische Verschiebung (2026-05-11)

**HufAI ist das Produkt. HufiApp ist die Manifestation.**

HufiApp wird zu: UI-Shell, Identitätsschicht, Workflow-Layer, Geräte-Gateway.
HufAI Core wird zu: Persistentes Pferde-Gedächtnis, Intelligenzschicht, Proaktivität.

Ziel-Ordnerstruktur: `src/lib/hufai/core/`, `/runtime/`, `/layers/`, `/integrations/`, `/multimodal/`
Vollständige Vision: `docs/HUFAI_RUNTIME_VISION.md`

## Was noch offen ist

### Security P0 (vor Nutzerzuwachs patchen)

1. **`anthropic-proxy` ohne Auth** — `supabase/functions/anthropic-proxy/index.ts`
   kein JWT, CORS `"*"`. Jeder mit der URL kann API-Calls auf Projektkosten auslösen.
   Fix: Supabase JWT validieren vor Anthropic-Request. Aufwand: < 1 Tag.

2. **Voice-Befund-Persistenz** — `src/components/pferdeakte/PferdeakteHuf.tsx:29`
   TODO: Befunde werden nur getoastet, nicht in DB persistiert. Aktiver Datenverlust.
   Fix: `hoof_entries`/`hoof_analyses`-Insert implementieren. Aufwand: < 1 Tag.

3. **Biometrie-Credential nur in localStorage** — kein Cross-Device, kein Backup.
   Fix: `user_profiles.webauthn_credentials` JSONB-Array speichern. Aufwand: < 1 Tag.
   Details: `docs/HUFAI_BIOMETRIC_IDENTITY.md`

### HufAI Core — nächste Schritte

4. **Multi-Turn Dialog** — `HeyHufi.tsx` sendet nur 1 Nachricht, kein Verlauf.
   Fix: Rolling-Window (max 10 Turns) in State + `ai-chat` Edge Function erweitern.

5. **Phase F-2** — `ai_status='pending'` in `horse_media` hat keinen Trigger.
   Fix: Supabase Trigger oder Edge Function → Claude Vision → Befund-JSON.

6. **Barge-In + Azure TTS** — Browser-Stimme und kein TTS-Unterbrechen.
   Fix: Azure TTS `de-DE-KatjaNeural`, `speechSynthesis.cancel()` bei SR-onresult.

### Infra / Doku

- **Phase F-1 Migration** (`20260511180000_horse_media.sql`) wartet auf `db push`.
- **PWA / Mobile Nav** noch nicht systematisch getestet.
- **Inventur `hufmanager`-Mentions** (~65 in `src/`) steht aus — P1.
- **`docs/PASCAL_CONTEXT.md`** wartet auf "System Context Export" von Pascal.
- **GA4-ID leer** — kein Analytics aktiv (`src/hooks/useGA4.tsx`).
- **0 Tests** — kein Vitest/Jest/Playwright konfiguriert.

## Bekannte Risiken

- **Disk-Auslastung** auf VPS: 71% belegt (136 GB von 193 GB).
- **Generierte Riesen-Assets**: Vorfall 2026-05-07 (11.8 MB PNGs), zurückgerollt.
  Details: `RECOVERY_LOG.md`.
- **Memory-Drift**: Code-Stand schlägt Memory-Aussagen.
- **`VITE_ANTHROPIC_API_KEY`** in `ai-routing.ts` lesen — aktuell nicht gesetzt
  (sicher), aber Architektur-Risiko wenn Key in `.env` landet.

## Was nicht angefasst werden soll

- `supabase/.temp/cli-latest` — generierter Marker.
- Bestehende `hufiapp.de`-Routing-Logik.
- Auth-Domain-Setup (`app.hufiapp.de` / `app.hufmanager.de`).
- Ollama-Modellbestand auf dem VPS, wenn nicht ausdrücklich gefragt.
- Supabase-Schema (keine Migrations ohne explizite Freigabe).

## Nächster sinnvoller Schritt

> Diese Liste ist bewusst kurz und wird bei jeder Aktualisierung dieser
> Datei neu geschrieben. Erledigtes wandert ins `RECOVERY_LOG.md`.

1. Security P0 patchen: `anthropic-proxy` Auth + Voice-Befund-Persistenz.
2. Doku-Dateien dieser Session reviewen und committen, sobald freigegeben.
3. Phase F-1 Migration freigeben: `supabase db push`.
4. Multi-Turn Dialog implementieren (Session-Memory, Rolling-Window).
5. `PASCAL_CONTEXT.md` mit Pascals "System Context Export" verdichten.
