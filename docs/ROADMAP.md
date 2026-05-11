# Hufi — Roadmap

> Priorisierte Realität, keine Wunschliste. Die einzige zulässige
> Bewegungsrichtung ist **Stabilität → täglicher Nutzen → Kontextsystem →
> Assistenz → proaktive Intelligenz**. Wer einen P2-Punkt vor einem P0-Punkt
> bewegt, baut am Fundament vorbei.

## Strategische Leitlinie

```
Stabilität → täglicher Nutzen → Kontextsystem → Assistenz → proaktive Intelligenz
   ▲                                                                          ▲
   |                                                                          |
   heute                                                              Big Picture
```

- **Stabilität** zuerst — bestehende Nutzer dürfen nicht über kaputte Flows
  oder Domains stolpern.
- **Täglicher Nutzen** schlägt Feature-Eleganz: Was Pascal und seinen Nutzern
  jeden Tag Zeit oder Stress spart, schlägt jede technische Schönheit.
- **Kontextsystem** kommt vor Assistenz: Hufi muss erst sauber wissen, *wer*
  *was* mit *welchem Pferd* in *welcher Rolle* tut, bevor KI helfen darf.
- **Assistenz** ist Begleitung, nicht Steuerung — sensible Aktionen werden
  bestätigt, nicht autonom ausgeführt.
- **Proaktive Intelligenz** ist Endpunkt, nicht Startpunkt.

---

## P0 — Sofort nutzerkritisch

> Trennung: **offene Aktionen** = was als Nächstes wirklich zu tun ist.
> **Stabilitätsverpflichtungen** = laufend, nie erledigt, gelten für jeden
> Agenten zu jeder Zeit.

### Security P0 (aus Jarvis-Audit 2026-05-11)

Diese Punkte sind vor jedem Nutzerzuwachs zu patchen:

1. **`anthropic-proxy` ohne Auth** (`supabase/functions/anthropic-proxy/index.ts`)
   Kein JWT-Check, CORS `"*"`. Jeder mit der URL kann API-Calls auf Projektkosten
   auslösen. Fix: Supabase JWT validieren vor Anthropic-Request. Aufwand: < 1 Tag.

2. **Voice-Befund-Persistenz** (`src/components/pferdeakte/PferdeakteHuf.tsx:29`)
   TODO: befunde werden nur getoastet, nicht in `hoof_entries`/`hoof_analyses`
   geschrieben. Aktiver Datenverlust in Core-Feature. Fix: < 1 Tag.

3. **`VITE_ANTHROPIC_API_KEY` Architektur** (`src/lib/ai-routing.ts`)
   Key wird aus `import.meta.env` gelesen — würde bei `.env`-Eintrag im
   JS-Bundle landen. Aktuell nicht gesetzt (sicher). Fix: alle AI-Calls
   über Edge Functions routen, Key nie ins Frontend.

### Offene Aktionen (Doku/Infra)

- Doku-Dateien dieser Session reviewen und committen, sobald freigegeben.
- Phase F-1 Migration (`20260511180000_horse_media.sql`) pushen wenn freigegeben.
- Biometrie-Credential-ID in `user_profiles` persistieren (Cross-Device-Fix).

### Stabilitätsverpflichtungen (laufend)

- Live-Auslieferung auf `hufiapp.de` darf nicht brechen.
- Legacy-Domain-Aliase (`hufmanager.de`, `www.hufmanager.de`,
  `app.hufmanager.de`) bleiben funktional.
- Lead-/Anfragen-Flows: Provider- und Stall-View sehen konsistente Status-Werte.
- Kein `git push`, kein Deploy, kein Schema-Change, keine Secret-Ausgabe
  ohne explizite Freigabe.

## P1 — Diese Woche / kurzfristig

- PWA-/Mobile-Nav-Verifikation systematisch durchgehen
  (Bottom-Nav-Zentrierung, Cache-Verhalten, iOS-/Android-Spezifika).
- Auth-Verhalten auf den Legacy-Hosts (`app.hufmanager.de` und
  `hufmanager.de`) live verifizieren — Login, Cookie/Session, Redirect
  zur richtigen Rollen-Home.
- Inventur der noch nicht-Domain-Hardcodes: in `src/` gibt es heute
  ~65 Mentions des Strings `hufmanager` (E-Mails, Affiliate-Links,
  UI-Strings). Klassifizieren in *legitim* (Branding/Affiliate) vs.
  *zu migrieren* — keine Massen-Replace-Aktion.
- `docs/PASCAL_CONTEXT.md` mit Pascal zusammen verdichten — offene
  Punkte (SmartHoof, PASSAON, Arbeitsrhythmen, Mitarbeitende,
  MyHorseDocs etc.) klären, sobald "System Context Export" vorliegt.
- Architektur-Memory aktualisieren (Aussagen wie `/` → Chat sind veraltet;
  aktueller Code routet `/` auf `<Index />`).
- VPS-Disk-Headroom beobachten (Stand: 71 % belegt). Wenn > 80 %: alte
  Build-Outputs unter `/var/www/hufiapps/` rotieren, Ollama-Modelle
  ausmisten.

## Sensor-Layer — Status

| Sensor | Modul | Integriert in |
|---|---|---|
| Biometrie (Fingerabdruck/Face ID/Iris) | `hufi-biometrics.ts` + `HufiBiometricGate` | `/management/sicherheit` |
| GPS Live-Tracking (Opt-in) | `useHufiGPS` | DayCockpit (Consent-Gate) |
| Kamera + Video | `HufiCam` | `ProviderHorseDetail` |
| Wetter-Widget | `HufiWeatherWidget` | `MobileShell` TopBar |

Offen: Upload-Flow (Foto/Video → Supabase Storage), Biometrie im Tresor.

## HufAI Intelligenz-Phasen

Unabhängig von P0/P1/P2 verläuft die KI-Reifung in Phasen:

| Phase | Name | Status |
|---|---|---|
| A–C | Voice Greeting, Push-to-Talk, Navigation Actions | ✅ live |
| D | Wake-Layer — "Hey Hufi" mit opt-in Consent | ✅ live |
| E | Proaktives Tages-Briefing (Wetter, Termine, Pferde) | ✅ live |
| F-1 | Horse Media Pipeline (Foto/Video/Audio → horse_media) | ✅ implementiert, Migration ausstehend |
| F-2 | HufAI Medien-Analyse (Vision → Befund-JSON) | geplant — nächster USP-Sprint |
| G | Lokale / Offline HufAI Runtime | später |

**Phase F-1 Details:**
- `horse_media`-Tabelle + `horse-media`-Bucket (Migration erstellt, noch nicht gepusht).
- Upload via HufiCam → `hufai-media.ts` → DB-Record mit `ai_status = 'pending'`.
- HorseMediaTimeline zeigt letzte 6 Medien im ProviderHorseDetail.
- Keine automatisierte Diagnose. Kein LLM-Aufruf.
- Phase F-2: DB-Trigger oder Edge Function → Claude Vision → Befund-JSON mit
  Kategorie, Empfehlung, Konfidenz. `ai_status = 'analysiert'`.

> Leitfrage für jede KI-Funktion: **"Macht das HufAI intelligenter?"**

> Kern-Vision: **"Jedes Pferd bekommt eine Stimme."**

HufAI assistiert — ersetzt keine Tierärzte oder Fachleute.
Keine automatisierte medizinische Diagnose. Keine erfundenen Fakten.

## 4 Strategische Tracks (Neu ab 2026-05-11)

Diese Tracks ergänzen die Phasen-Logik und strukturieren die mittelfristige Arbeit.
Details: `docs/HUFAI_RUNTIME_VISION.md`

| Track | Name | Fokus | Status |
|---|---|---|---|
| A | Proaktives HufAI | LLM-Briefing, semantische Trigger, Wetter-Alerts | P1 |
| B | Multimodale Pferdeintelligenz | Phase F-2, Längsschnitt, Muster | P1 |
| C | Runtime / Device Layer | CLI, Electron, Background, Cross-Device | P2 |
| D | HufAI Memory | 6-Schichten-Memory, Timeline, pgvector, Multi-Turn | P1 |

## P2 — Später

- BHS-Command-Center (Tagesübersicht für Pascal, Ziel: < 60 Sekunden zur
  vollständigen Tagesplanung).
- Lead-Qualifizierungs-System mit BHS-Tier-Vorschlag (GO / BALANCE / INTENSIV).
- BHS BALANCE Abo-Verwaltung (Intervalle, Kündigung, Umsatzübersicht).
- BHS INTENSIV Bewerbungsflow (Formular, Video-Upload, KI-Zusammenfassung).
- Schnell-Terminabschluss (3-Minuten-Voice-First).
- Feature-Domain-Struktur (`src/features/...`) statt heutigem Pages-/Components-Mix.
- `src/lib/hufai/` Ordnerstruktur (Track A/B/C/D) einführen.
- God-Components aufteilen: MobileShell.tsx (1.383 Z.), App.tsx (1.007 Z.).
- Type-sichere DB-Calls für alle HufAI-Tabellen (`supabase gen types`).
- Error Monitoring (Sentry o.ä.) einführen.
- Analytics (GA4-ID setzen oder Posthog).
- Hufi CLI (`hufi today`, `hufi horse`, `hufi ask`) — nach Memory-API.
- Offline AI Phase G (Ollama in PWA-Kontext, Electron).
- CopeCart-Webhook Replay-Protection.
- Stallbetreiber-Suite echte Features (aktuell Placeholder).

## Nicht jetzt

- Keine zweite, getrennte HufManager-Codebase.
- Keine großen Refactors während aktiver Feature-Arbeit.
- Kein Background-Wake-Hack (Browser-Architektur-Limit — kein Workaround).
- Keine komplexe Stimmerkennung, solange Login + Gerät + Rolle reichen.
- Keine Branding-Migration "weg von HufManager" — Legacy bleibt parallel.
- Keine Supabase-Schema-Migrations ohne explizite Freigabe.
- Kein Commit von `supabase/.temp/cli-latest`.
- Keine öffentliche Kommunikation des 2030-Big-Picture.
- Kein "Jarvis"-Claim vor Multi-Turn + Phase F-2 + Azure TTS.

## Messbare Ziele (BHS-Kontext)

Aus dem Architektur-Memory; Stand Mai 2026, gilt für die BHS-Domäne:

- 50 % weniger WhatsApp- und Zettel-Chaos.
- 30 % weniger Organisationszeit.
- 90 % der Termine sauber dokumentiert.
- 95 % der Rechnungen innerhalb von 24 Stunden.
- Terminabschluss < 3 Minuten.
- Tagesplanung < 5 Minuten.

## Wie diese Datei lebt

- Bei jedem nicht-trivialen Recovery-/Sprint-Schritt prüfen: hat sich
  P0 oder P1 verschoben?
- Erledigtes wandert nicht ins Archiv, sondern wird in `RECOVERY_LOG.md`
  protokolliert und aus dieser Datei gestrichen.
- Wer P2 nach P1 hochzieht, schreibt in den Commit, *warum*.
