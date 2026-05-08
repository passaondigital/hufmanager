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

## Hufi AI / Assistenz

Zielrichtung, nicht heutiger Endzustand:

- Persönlicher digitaler Assistent für Pferdemenschen.
- Kennt Nutzerkontext, Rolle, Pferde, Termine und Arbeitsfluss.
- Unterstützt Sprache, Suche, Dokumentation, Erinnerungen und Entscheidungen.
- Erkennt nicht primär „wer spricht", sondern arbeitet mit Login, Gerät, Rolle
  und Kontext.
- Sensible Aktionen müssen bestätigt werden — die Assistenz ist nie Herr über
  die Kerndaten.

## Kurzfristiger Fokus

- Produktive Stabilität für bestehende Nutzer.
- Sauberes Routing zwischen HufiApp und HufManager-Legacy-Domains.
- Zuverlässige Lead-/Anfragen-Flows zwischen Provider- und Stall-Sicht.
- PWA-/Mobile-Stabilität.
- Vertrauen bestehender Nutzer zurückholen.

## Nicht-Ziele für jetzt

- Keine zweite, komplett getrennte HufManager-Codebase.
- Keine großen Refactors während Recovery.
- Keine KI-Spielereien vor stabilen Kernflows.
- Keine komplexe Stimmerkennung vor echtem Team-/Shared-Device-Bedarf.

## Erfolgskriterien

- Weniger WhatsApp- und Zettel-Chaos.
- Schnellerer Terminabschluss.
- Weniger manuelle Nacharbeit.
- Klare Kommunikation zwischen Hufbearbeiter, Besitzer und Betrieb.
- Bessere Dokumentation am Pferd.
- Nutzer vertrauen dem System im Alltag.
