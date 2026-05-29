# Hufi Skills — Vollständige Fähigkeiten-Dokumentation

> Stand: 2026-05-14. Wird nach jedem Sprint aktualisiert.

## Implementierte Skills (Live)

| Skill | Trigger-Beispiele | Ausgabe | Datei |
|-------|-------------------|---------|-------|
| Datum/Uhrzeit | "was für ein datum", "wie spät", "welcher wochentag" | Lokale Antwort (kein AI-Call) | MobileShell.tsx |
| Wetter | "wetter in [Stadt]", "regnet es morgen", "temperatur kaiserslautern" | Open-Meteo Direktantwort | MobileShell.tsx + answerWithWeather |
| Navigation | "öffne kalender", "geh zu kunden", "zeig rechnungen" | Route-Action, kein Chat | hufi-nav-actions.ts |
| Agent Task | "erstelle rechnung", "neuer termin für [Pferd]", "erinnere mich" | Confirm-UI mit Bestätigen/Ablehnen | hufi-agent-tasks.ts |
| Termine heute | "wie viele termine heute", "was steht an" | Direkt aus hufiCtx | MobileShell.tsx |
| Emergency | "lahmt stark", "kolikt", "liegt nicht auf" | Notfall-Card + Tierarzt-Link | hufi-intent.ts |
| Navigation zu Pferd | "öffne Akte von [Name]", "zeig [Pferdename]" | Navigation zur Pferdeakte | hufi-nav-actions.ts |
| Wissenfragen | "was ist ein Hufabszess", "wie oft Hufpflege" | Claude/Groq Knowledge-Antwort | hufi-brain.ts |

## In Entwicklung (aktueller Sprint)

| Skill | Trigger-Beispiele | Ausgabe | Status |
|-------|-------------------|---------|--------|
| Gespräch speichern | "speichere dieses gespräch", persistent mode toggle | Supabase hufi_conversations | 🔨 |
| Pferdeakten-Score | "wie vollständig ist [Pferd]", "was fehlt bei [Name]" | Score + nächste Frage | 🔨 |
| WhatsApp-Entwurf | "schreib [Name]", "erinnere Frau Schmidt an..." | DraftMessageCard + wa.me Link | 🔨 |
| Email-Entwurf | "mail an [Name] wegen Rechnung" | DraftMessageCard + mailto Link | 🔨 |
| Tagesroute | "route für heute", "optimiere meine route für morgen" | DayRouteCard + Google Maps Link | 🔨 |
| Morgenbriefing | Automatisch 7–9 Uhr | BriefingCard mit Tagesübersicht | 🔨 |
| Tool-Chain | "erstelle für alle Termine von heute Rechnungen" | Multi-Step mit Bestätigung | 🔨 |
| Memory-Viewer | "was weißt du über mich" | /hufi/memory Seite | 🔨 |

## Geplant (P1/P2)

| Skill | Beschreibung | Abhängigkeiten |
|-------|-------------|----------------|
| Eingehende Nachrichten | Webhook von WA/Email als Feed | Backend-Webhook-Infrastruktur |
| Google Calendar Sync | Termine bidirektional mit Google Calendar | OAuth Google |
| SMTP Email Send | Direkt Email senden (nicht nur mailto) | SMTP Backend |
| Stimmenmemorierung | Hufi merkt sich wer spricht (Voice-ID) | Biometrie-System |
| Foto-Analyse Huf | Hufbild hochladen → AI-Befund | Vision-API |

## Skill-Architektur

```
User-Input (Text/Voice)
    ↓
detectIntent() → Intent-Klassifikation
    ↓
┌───────────────────────────────────────┐
│ LOCAL SKILLS (kein AI-Call):           │
│  - Datum/Zeit                          │
│  - Wetter (Open-Meteo)                 │
│  - Navigation                          │
│  - Kontext-Zählungen                   │
│  - WhatsApp/Email Drafts (Templates)   │
└───────────────────────────────────────┘
    ↓ (falls kein Local Skill)
┌───────────────────────────────────────┐
│ AI SKILLS (Claude/Groq):              │
│  - Wissensfragen Pferdewelt            │
│  - Agent Tasks (Planen + Bestätigen)   │
│  - Komplexe Anfragen                   │
└───────────────────────────────────────┘
```

## Trigger-Phrase-Liste (für Intent-Detection)

### Kommunikation
- "schreib [Name]", "whatsapp an [Name]", "erinnere [Name] an"
- "mail an [Name]", "email wegen [Thema]"
- "sende Zahlungserinnerung an [Name]"

### Route
- "route für heute/morgen", "optimiere meine route", "tagesroute"
- "wie fahre ich heute", "stopps heute"

### Pferdeakten
- "wie vollständig ist [Pferdename]", "was fehlt bei [Name]"
- "unvollständige akten", "pferdeakten vervollständigen"
- score unter [X]%, "akte von [Name] öffnen"

### Briefing
- "was steht heute an", "tagesüberblick", "briefing"
- "was habe ich heute", "wie ist mein tag"
