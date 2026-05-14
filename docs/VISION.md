# Hufi Vision

> Zuletzt aktualisiert: 2026-05-11

## Die zentrale Verschiebung

**HufAI ist das Produkt. HufiApp ist die Manifestation.**

HufiApp ist die UI-Shell, die Workflow-Oberfläche, das Geräte-Gateway.
HufAI ist das persistente Pferde-Gedächtnis, die Intelligenzschicht,
die proaktive Assistenz, die Kontext-Engine.

Alles was gebaut wird, muss durch eine Frage:
**"Macht das HufAI intelligenter?"**

Vollständige Runtime-Vision: `docs/HUFAI_RUNTIME_VISION.md`

---

## Zweck

Hufi ist der digitale Assistent und Arbeitsbegleiter für Pferdemenschen,
Hufbearbeiter und Pferdebetriebe. Ziel ist nicht nur Software, sondern Ruhe,
Klarheit, Sicherheit und weniger organisatorisches Chaos im Pferdealltag.

## Ursprung

- Entstanden aus HufManager.
- Gewachsen aus realer Praxis von Barhufserviceschmid.
- Gebaut für echte Stallbedingungen, nicht für theoretische Büroprozesse.

## Nutzergruppen

- Hufbearbeiter / Hufschmiede / Provider
- Pferdebesitzer / Clients
- Stallbetreiber
- Mitarbeiter und Azubis
- Partner: Tierärzte, Physios, Osteopathen
- Interne Admin-/Mission-Control-Rolle

## Produktprinzipien

- Stabilität vor Feature-Flut.
- Pferdewohl vor Plattform-Eitelkeit.
- Kontext vor bloßem Chat.
- Mobile-first und stalltauglich.
- Datenschutz und Vertrauen.
- Ein Core, mehrere Rollen und Oberflächen.
- KI als Assistenz, nicht als Selbstzweck.

## Hufi Core

Der operative Kern, auf dem alle Rollen arbeiten:

- **Kunden** — Kontakte, Besitzer, Stallbetreiber, Partnerprofile.
- **Pferde** — Stammdaten, Akten, Zugriffsfreigaben.
- **Termine** — Einzeltermine und Tourenplanung.
- **Dokumentation** — Befunde, Hufanalysen, Verlaufseinträge.
- **Bilder & Dateien** — Pferdefotos, Dokumente, Vorlagen.
- **Kommunikation** — Nachrichten, Anfragen, Benachrichtigungen.
- **Rechnungen & Abos** — vorhandene Abrechnungs- und Aboflüsse.
- **Rollen & Rechte** — Provider, Client, Stall, Mitarbeiter, Admin.
- **Multi-Tenant-Struktur** — Daten sind pro Owner getrennt; Zugriff folgt Login,
  Rolle und expliziten Freigaben.

## HufiApp — Shell · Gerät · Workflow

HufiApp ist die tägliche Oberfläche und das Workflow-Werkzeug:

- Mobile-first, stalltauglich, offline-fähig.
- Vereint Termine, Pferde, Befunde, Rechnungen und Navigation.
- Sprach-First-Bedienung über "Hey Hufi" (Phase D, live).
- Proaktives Tages-Briefing bei App-Start (Phase E, live).
- Ein System für alle Rollen: Provider, Client, Stall, Tierarzt.

## HufAI — Die Intelligenz dahinter

HufAI ist das Kernprodukt — die echte Intelligenzschicht:

- Kennt Nutzerkontext, Rolle, Pferde, Termine und Betriebs-Rhythmus.
- Denkt mit, antizipiert, informiert — ohne dass man fragen muss.
- Unterstützt Sprache, Suche, Dokumentation, Erinnerungen und Entscheidungen.
- Assistenz, keine Automatisierung: sensible Aktionen brauchen immer Bestätigung.
- HufAI ersetzt keine Tierärzte, Therapeuten oder Fachleute —
  es ergänzt ihren Kontext mit Fakten, Verlaufsdaten, Zeitstempeln.
- Kein erfundenes Wissen. Keine medizinische Diagnose. Keine Garantien.

> Leitfrage für jede neue Funktion: **"Macht das HufAI intelligenter?"**

> Kern-Vision: **"Jedes Pferd bekommt eine Stimme."**

## Intelligenz-Roadmap (Phasen)

| Phase | Name | Status |
|---|---|---|
| A–C | Voice Greeting, Push-to-Talk, Navigation Actions | ✅ live |
| D | Wake-Layer — "Hey Hufi" mit opt-in Consent | ✅ live |
| E | Proaktives Tages-Briefing (Wetter, Termine, Pferde) | ✅ live |
| F-1 | Horse Media Pipeline (Upload, SignedURL, ai_status) | ✅ implementiert |
| F-2 | HufAI Medien-Analyse (Vision → Befund-JSON) | geplant |
| G | Lokale / Offline HufAI Runtime | später |

## 4 Strategische Tracks (2026+)

### Track A — Proaktives HufAI
Intelligente Briefings, Wetter-Alerts, Überfall-Checks, LLM-generierte Texte.
Heute: Regel-basiert (Phase E). Ziel: LLM-Summarisierung + semantische Trigger.

### Track B — Multimodale Pferdeintelligenz
Foto → strukturierter Befund. Längsschnitt-Vergleich. Muster-Erkennung.
Heute: Upload-Pipeline bereit. Ziel: Phase F-2 — Vision-Analyse aktivieren.

### Track C — Runtime / Device Layer
CLI, Desktop, persistente Sessions, Cross-Device, Background-Listeners.
Heute: PWA mit Browser-Limits. Ziel: Stufen-Plan Browser → Electron → Native.
Realitäts-Check: `docs/HUFAI_WAKE_RUNTIME_RESEARCH.md`

### Track D — HufAI Memory
Long-term Pferde-Gedächtnis, Timeline-Reasoning, semantische Suche, pgvector.
Heute: 2 parallele Tabellen, kein Session-Memory. Ziel: 6-Schichten-Memory.

## Grenzen — was HufAI nicht tut

- Keine automatisierte medizinische Diagnose.
- Keine Empfehlungen ohne Fachmenschen-Kontext.
- Keine autonomen Aktionen ohne Nutzerbestätigung.
- Kein Erfinden von Fakten, Terminen oder Befunden.
- Kein echter Background-Wake im Browser (technisch unmöglich — ehrlich kommunizieren).

## Kurzfristiger Fokus (P0)

1. `anthropic-proxy` Auth-Patch — Sicherheitslücke (kein JWT, CORS `"*"`).
2. Voice-Befund-Persistenz — Datenverlust in `PferdeakteHuf.tsx`.
3. Multi-Turn Dialog — Session-Memory + Rolling-Window.
4. Phase F-2 — Horse Vision Analysis aktivieren.
5. Azure TTS + Barge-In — Voice-UX verbessern.

## Nicht-Ziele für jetzt

- Keine zweite, komplett getrennte HufManager-Codebase.
- Keine großen Refactors während laufender Feature-Arbeit.
- Kein Background-Wake-Hack der die Browser-Limits umgeht.
- Keine Stimmerkennung pro Person vor echtem Team-Bedarf.
- Keine öffentliche Kommunikation des 2030-Big-Picture.
- Kein "Jarvis"-Claim bis Multi-Turn, Vision-Analyse und TTS-Qualität ready.

## Erfolgskriterien

- Weniger WhatsApp- und Zettel-Chaos.
- Schnellerer Terminabschluss.
- Weniger manuelle Nacharbeit.
- Klare Kommunikation zwischen Hufbearbeiter, Besitzer und Betrieb.
- Bessere Dokumentation am Pferd.
- Nutzer vertrauen dem System im Alltag.
- HufAI erinnert sich korrekt an Pferd-Kontext zwischen Sessions.

---

## Aktueller Implementierungsstand (Mai 2026)

### Abgeschlossen
- Multi-Tenant localStorage-Isolation (user-storage.ts)
- Voice-First UI: Wave-Idle-State, goldener Splash-Screen, Auto-Listen nach Begrüßung
- Lokale Antworten: Datum/Zeit (TTS-freundlich), Wetter (Open-Meteo ohne Claude), Termine-Zählung
- Follow-up Konversation: 5 Runden, 800ms Pause
- Pferdeakten-Vollständigkeits-Engine (hufi-horse-completeness.ts)
- Persistente Konversations-Sessions (hufi-conversations.ts)
- WhatsApp + Email Entwurf-System (hufi-communication.ts)
- Proaktives Briefing-System (hufi-briefing.ts)
- Gesprächsbasiertes Onboarding (HufiOnboardingChat.tsx)

### Slogan
> "Hufi kennt dich, dein Pferd/e, dein Business und die Pferdewelt."

### Design-Prinzipien für Hufi-UI
- Orange #F97316 als primäre Akzentfarbe (keine anderen Farben für Wave/Pulse)
- Pferde-Silhouette (goldenes Pferd) als Identitäts-Anker
- Idle-State zeigt Wave (paused), nicht leeres UI
- Jede Antwort endet mit Bereitschaft (kein "Sitzung beendet"-Gefühl)
- Kein Chat-Spam: Systeminfos als Cards, nicht als Bubbles
