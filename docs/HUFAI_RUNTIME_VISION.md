# HufAI Runtime Vision

> Stand: 2026-05-11. Strategisches Kerndokument.
>
> Diese Datei beschreibt, **was HufAI werden soll** — nicht was es heute
> ist. Jede Aussage über heutigen Stand ist aus `CURRENT_STATE.md`
> und `HUFI_CORE_TARGET_ARCHITECTURE.md` zu verifizieren.
>
> Kein Marketing. Keine Buzzwords. Erreichbares.

---

## Die zentrale Verschiebung

HufiApp ist nicht mehr das Produkt.

**HufAI ist das Produkt.**

HufiApp ist:
- die UI-Shell
- die Identitätsschicht
- die Workflow-Oberfläche
- das Geräte-Gateway

HufAI ist:
- das persistente Pferde-Gedächtnis
- die multimodale Intelligenzschicht
- die proaktive Assistenzschicht
- die Kontext-Engine

Diese Trennung hat technische Konsequenzen:

```
Heute:
  HufiApp ── enthält HufAI als Feature

Ziel:
  HufAI Core ── manifestiert sich in HufiApp, CLI, Watch, Future Devices
```

---

## Was HufAI Core ist

HufAI Core ist ein **persistentes, multimodales Pferde-Intelligenz-Runtime**.

Das bedeutet konkret:

- Es kennt jedes Pferd über seine gesamte Lebensdauer.
- Es verbindet Termine, Befunde, Fotos, Wetter, GPS, Kontext.
- Es erinnert sich — geräteübergreifend, nach Session-Unterbrechungen.
- Es denkt mit — ohne dass der Nutzer fragen muss.
- Es spricht — aber nur, wenn es etwas zu sagen hat.
- Es erklärt sich — jede Aktion hat ein "warum".
- Es schützt — keine Daten außerhalb der Permission-Matrix.

**Kern-Vision:** "Jedes Pferd bekommt eine Stimme."

Nicht metaphorisch. Datenbasiert.

---

## Architektur-Zielstruktur

```
src/lib/hufai/

core/
  ├── memory/          — horse_memory, user_memory, relation_memory
  ├── context/         — Context-Resolution, Permission-Filter
  ├── identity/        — Auth-Integration, Biometrie, Rollen
  └── intelligence/    — AI-Router, Model-Selection, Credit-System

runtime/
  ├── session/         — Session-State, Multi-Turn-Konversation
  ├── device/          — Device-Capabilities, Platform-Detection
  ├── wake/            — Wake-Layer (Browser + Native Wege)
  └── offline/         — Ollama-Fallback, IndexedDB-Sync

layers/
  ├── voice/           — TTS, STT, Wake-Word, Barge-In
  ├── action/          — Action-Registry, Approval-Flow, Undo
  ├── recommendation/  — Vorschlags-Engine, Severity-Klassifikation
  ├── proactive/       — Briefing, Wetter-Alerts, Überfall-Checks
  ├── navigation/      — Intent, Nav-Actions, Routing
  ├── vision/          — Foto-Analyse, Huf-Pattern-Erkennung
  ├── weather/         — Open-Meteo, regionale Alerts
  └── horse/           — Horse-State, Timeline, Caregiver-Kontext

integrations/
  ├── calendar/        — iCal, Google Cal (future)
  ├── whatsapp/        — WhatsApp Business API (future)
  ├── email/           — Resend (heute), erweitert
  ├── weather/         — Open-Meteo (heute), DWD (future)
  ├── maps/            — Routing, Fahrtzeit (future)
  ├── accounting/      — Rechnungs-Export (future)
  └── stable-systems/  — PMS-Sync (heute: sync-vet-pms)

multimodal/
  ├── image/           — HufiCam, Upload-Pipeline
  ├── video/           — Video-Capture, Analysis (future)
  ├── movement/        — Gangbild-Analyse (future)
  ├── sensor/          — GPS, Wetter, Biometrie
  └── hoof-analysis/   — Phase F-2: Vision → Befund-JSON
```

---

## Manifestationen von HufAI

HufAI Core ist eine Engine. Sie manifestiert sich in verschiedenen Shells:

### HufiApp (heute, mobil)
- React PWA
- Voice-First für Stallbedingungen
- Proaktives Briefing bei App-Start
- Kamera, GPS, Biometrie
- Offline-fähig via TanStack + IndexedDB

### Hufi CLI (geplant)
- Terminal-Interface für technische Nutzer
- `hufi today`, `hufi horse bella`, `hufi ask "..."`
- Zugriff auf HufAI-Memory, Horse-Timelines
- Offline-Inference via Ollama
- Siehe `HUFAI_CLI_VISION.md`

### Hufi Desktop (future)
- Electron oder Tauri
- Persistentes Background-Listening möglich
- Wake Word ohne Browser-Limits
- Lokales Modell (Whisper, Ollama)

### Hufi Watch (future)
- Schnell-Interaktion am Handgelenk
- Voice-Micro-Inputs
- Benachrichtigungs-Empfang
- Kein selbstständiger Kontext

### Hufi Stable Display (future)
- Stallgebundenes Ambient-Display
- Heutiger Tagesplan, Pferde-Status
- Hands-free Interaktion
- Keine personenbezogenen Daten sichtbar ohne Auth

---

## 10 Langzeit-Runtime-Ziele

| # | Ziel | Heute | Aufwand |
|---|---|---|---|
| 1 | Persistentes Wake-Listening | Browser-SR (begrenzt) | Mittel–Groß |
| 2 | Cross-Device-Sessions | Nicht vorhanden | Mittel |
| 3 | Lokale Runtime-Fallback | Ollama vorhanden, nicht in PWA | Groß |
| 4 | Offline-Modus | Basis (TanStack+IndexedDB), kein Offline-AI | Groß |
| 5 | Ambient Intelligence | Nicht vorhanden | Groß |
| 6 | Kontinuierliches Pferde-Gedächtnis | Rudimentär (2 Tabellen) | Mittel |
| 7 | Proaktive Empfehlungen | Regel-basiert (Phase E) | Mittel |
| 8 | Voice-First UX | Phasen A–E live, Multi-Turn fehlt | Klein |
| 9 | Event-driven Intelligence | Nicht vorhanden | Mittel |
| 10 | Identity-linked Horse Context | Ansatz vorhanden | Mittel |

---

## 4 Strategische Tracks

### Track A — Proaktives HufAI

Was ist das Ziel?

HufAI bricht das Schweigen von sich aus — wenn es Gründe hat.

Kern-Fähigkeiten:
- Intelligente Tagesbriefings (LLM-generiert, nicht Template)
- Pferde-Überfall-Checks (Befund-Lücken, Termin-Gaps)
- Wetter-Alerts mit regionalen Besonderheiten
- Workload-Awareness (zu voller Tag → Puffer-Vorschlag)
- Rechnungs-Mahnungs-Vorbereitung
- Proaktive Lead-Klassifikation

Heute: `hufai-proactive.ts` regel-basiert, TTL-Gate, kein LLM.
Ziel: LLM-generierter Text + semantische Trigger.

### Track B — Multimodale Pferdeintelligenz

Was ist das Ziel?

HufAI versteht Pferde aus Bildern, Videos, Bewegung.

Kern-Fähigkeiten:
- Huf-Foto → strukturierter Befund (Phase F-2)
- Längsschnitt-Vergleich: Foto vom Mai vs. November
- Video-Gangbild-Analyse (long-term)
- Muster-Erkennung über Pferde-Populationen (anonymisiert)
- Audio-Notizen direkt verknüpft mit Pferd und Termin

Heute: Upload-Pipeline (Phase F-1). `ai_status='pending'` wartet.
Ziel: Trigger → Vision-Analyse → Befund-JSON → Timeline-Eintrag.

**Grenze:** Keine medizinische Diagnose. Befunde sind immer
"Beobachtung, kein Urteil". Tierarzt-Empfehlung bei Severity 4+.

### Track C — Runtime / Device Layer

Was ist das Ziel?

HufAI läuft überall — auch wenn der Browser zu ist.

Kern-Fähigkeiten:
- Persistente Sessions (Cross-Device, Cross-Browser)
- CLI-Mode (`hufi` Terminal-Interface)
- Lokale Assistenz-Runtime (Ollama in Desktopumgebung)
- Background-Listeners (Service Worker + Native)
- Wake-Word-Systeme (Realität vs. Erwartung dokumentiert)

Heute: PWA mit Browser-Limits. Keine Cross-Device-Sessions.
Ziel: Stufenplan Browser → Electron/Tauri → Native.

Realitäts-Check: Siehe `HUFAI_WAKE_RUNTIME_RESEARCH.md`.
Gerätematrix: Siehe `HUFAI_DEVICE_CAPABILITY_MATRIX.md`.

### Track D — HufAI Memory

Was ist das Ziel?

HufAI erinnert sich — richtig, strukturiert, persistent.

Kern-Fähigkeiten:
- Long-term Pferde-Gedächtnis (pferd-zentriert, nicht user-zentriert)
- Timeline-Reasoning ("Was hat sich seit letztem Monat geändert?")
- Semantische Suche auf Pferd-Memory (pgvector)
- Event-Verständnis (nicht nur Log, sondern Kontext-Graph)
- Saisonaler Vergleich (November vs. Mai, Jahresrhythmus)
- Behaviorale Kontinuität (Pferd-Muster über Jahre)
- Strukturiertes Forget/Delete/Export (DSGVO)

Heute: 2 parallele Tabellen, kein Session-Memory, kein Multi-Turn.
Ziel: 6-Schichten-Memory (system/org/horse/user/relation/session).
Fundament liegt in `HUFI_CORE_TARGET_ARCHITECTURE.md` §5.

---

## Das neue Nutzererlebnis

Nutzer interagiert von:
- Telefon (heute: produktiv)
- Tablet (heute: funktional)
- Desktop Browser (heute: funktional)
- CLI Terminal (geplant: Hufi CLI)
- Smartwatch (future)
- Stable Display (future)
- Future Wearable (future)

Beispiele für typische Interaktionen:

```
"Hey Hufi, öffne Bella."
"Hey Hufi, was hat sich seit letzter Woche geändert?"
"Hey Hufi, fasse den heutigen Tag zusammen."
"hufi today"
"hufi horse bella"
"hufi scan huf.jpg"
```

Proaktiv-Beispiele (kein Aufruf nötig):

```
"Pascal, du hast eine neue Kundenanfrage."
"Bella ist seit 9 Wochen ohne Termin."
"Morgen Regen — plane mehr Pufferzeit ein."
"Lou: letzter Befund zeigt Veränderung, Vergleich anhängen?"
```

---

## HufAI darf — HufAI darf nicht

### Darf

- Fakten aus der Datenbank zeigen
- Muster aus Verlaufsdaten benennen
- Vorschläge machen (mit Erklärung)
- Erinnern und kontextualisieren
- Proaktiv informieren (mit TTL-Gate)
- Voice-Interaktion führen
- Navigation steuern (read-only)
- Bilder beschreiben und strukturieren (kein Urteil)

### Darf nicht

- Medizinische Diagnosen stellen
- Medikamente empfehlen
- Autonome Mutations-Aktionen ohne Approval
- Daten außerhalb der Permission-Matrix sehen
- Pferde-Daten ohne Owner-Consent an externe APIs senden
- Fakten erfinden
- Zahlungen auslösen
- Account-Operationen ohne explizite User-Aktion

---

## Philosophischer Rahmen

HufAI ist kein Chatbot mit Pferden-Kontext.

HufAI ist ein **Pferd-Betriebssystem**: eine permanente, kontextbewusste
Software-Schicht, in der das Pferd die kanonische Entität ist.

Nicht der Nutzer steht im Mittelpunkt.
Das Pferd steht im Mittelpunkt.

Mehrere Menschen (Besitzer, Hufbearbeiter, Tierarzt, Stall) arbeiten an
*derselben Wahrheit* über ein Pferd — mit klar definierten Rechten,
nachvollziehbarer Geschichte, und einer KI-Schicht, die erinnert,
vorbereitet und vorschlägt — aber **niemals autonom** sensible Aktionen
auslöst.

---

## Was zuerst gebaut werden muss

Reihenfolge ist absolut:

1. **P0 Security:** `anthropic-proxy` Auth-Patch. Keine Ausnahme.
2. **P0 Data:** Voice-Befund-Persistenz in `PferdeakteHuf.tsx`. Datenverlust stoppen.
3. **Multi-Turn Dialog:** Session-Memory + Rolling-Window in `HeyHufi.tsx`.
4. **Phase F-2:** Horse Vision Analysis aktivieren (`ai_status='pending'` → Trigger → Befund).
5. **Barge-In + Azure TTS:** Voice-UX auf 2026-Standard heben.
6. **src/lib/hufai/ Struktur:** Ordner anlegen, bestehende Libs einordnen.

Erst wenn diese 6 Punkte erledigt sind, ist Track C und D sinnvoll.

---

## Was nicht zu früh gebaut werden soll

- Native App (Electron/Tauri) vor stabilem Browser-Core
- Wake Word Engine vor Multi-Turn Dialog
- Offline-AI (Phase G) vor Online-AI-Stabilität
- pgvector vor Memory-Konsolidierung
- Cross-Device vor Session-Memory
- Hufi CLI vor Memory-API
- Hufi Watch vor HufiApp-Stabilität

---

## Verbindung zu anderen Docs

| Thema | Dokument |
|---|---|
| Aktueller Code-Stand | `CURRENT_STATE.md` |
| Priorisierte Aufgaben | `ROADMAP.md` |
| Architektur-Detail | `HUFI_CORE_TARGET_ARCHITECTURE.md` |
| Wake/Background-Realität | `HUFAI_WAKE_RUNTIME_RESEARCH.md` |
| Gerätematrix | `HUFAI_DEVICE_CAPABILITY_MATRIX.md` |
| CLI-Konzept | `HUFAI_CLI_VISION.md` |
| Biometrie-Strategie | `HUFAI_BIOMETRIC_IDENTITY.md` |
| Landing-Page-Messaging | `HUFAI_LANDING_PAGE_MESSAGING.md` |
