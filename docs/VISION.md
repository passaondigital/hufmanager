# Hufi Vision

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
| F | Multimodales Pferde-Gedächtnis (Foto, Audio, Kontext) | geplant |
| G | Lokale / Offline HufAI Runtime | später |

## Grenzen — was HufAI nicht tut

- Keine automatisierte medizinische Diagnose.
- Keine Empfehlungen ohne Fachmenschen-Kontext.
- Keine autonomen Aktionen ohne Nutzerbestätigung.
- Kein Erfinden von Fakten, Terminen oder Befunden.

## Kurzfristiger Fokus

- Proaktives Briefing stabil halten und verbessern (Phase E).
- Produktive Stabilität für bestehende Nutzer.
- Sauberes Routing zwischen HufiApp und HufManager-Legacy-Domains.
- Zuverlässige Lead-/Anfragen-Flows zwischen Provider- und Stall-Sicht.
- PWA-/Mobile-Stabilität.

## Nicht-Ziele für jetzt

- Keine zweite, komplett getrennte HufManager-Codebase.
- Keine großen Refactors während laufender Feature-Arbeit.
- Kein LLM-Aufruf im Briefing-Layer (Phase E bleibt regel-basiert).
- Keine komplexe Stimmerkennung vor echtem Team-/Shared-Device-Bedarf.

## Erfolgskriterien

- Weniger WhatsApp- und Zettel-Chaos.
- Schnellerer Terminabschluss.
- Weniger manuelle Nacharbeit.
- Klare Kommunikation zwischen Hufbearbeiter, Besitzer und Betrieb.
- Bessere Dokumentation am Pferd.
- Nutzer vertrauen dem System im Alltag.
