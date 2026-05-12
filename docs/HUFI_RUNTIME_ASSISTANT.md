# Hufi Runtime Assistant — Architektur & Komponenten

> Stand: 2026-05-12 (Sprint-Update: Voiceflow v2, Consent Gate, Runtime Presence)
> Ziel: Vollständige Referenz für den proaktiven, sprachgesteuerten Runtime Assistant

---

## 1. Vision

Hufi ist kein Chat-Bot. Der Runtime Assistant verkörpert:

- **Ruhe** — kein Chaos, kein WhatsApp-Ping-Pong, alles an einem Ort
- **Klarheit** — Hufi kennt den Kontext, fragt nicht nach was er weiß
- **Sicherheit** — Niemand ist alleine. Hufi begleitet, warnt, erinnert.

Kernbotschaft: *"Die wichtigste Zeit ist die am Pferd — Hufi gibt sie zurück."*

**Systemarchitektur:**
- **HufiApp** = UI-Gateway, PWA-Shell, Device-Wrapper, Workflow-Oberfläche
- **HufAI** = Kern-Intelligenz (Spracherkennung, Befund-Analyse, Intent, Memory)
- **Voiceflow v2** = primäre Interaktionsebene (kein Chat-First, Voice-First)

---

## 2. Komponenten-Übersicht

```
MobileShell (/home)
  ├── First-Run Consent Gate (HufiFirstRunConsent)
  │   ├── Schritt 1: Willkommen & Überblick
  │   ├── Schritt 2: DSGVO + KI-Einwilligung (mit Checkboxen)
  │   └── Schritt 3: Berechtigungen (Mikrofon, Kamera, Standort, Push)
  │
  ├── TOP BAR (kompakt, safe-area-aware, max. 430px)
  │   ├── Hufi-Logo (30x30)
  │   ├── "Hufi" + Runtime Presence Chip (Zustandsanzeige)
  │   │   States: bereit | hört zu | transkribiert | denkt | führt aus | spricht | offline
  │   ├── HufiWeatherWidget (compact)
  │   ├── Replay-Button (TTS Begrüßung wiederholen) — nur wenn Begrüßung vorhanden
  │   ├── HeyHufi (Wake-Word, opt-in) — nur wenn aktiviert
  │   ├── Profi/Privat-Toggle (Provider only)
  │   ├── NotificationBell
  │   ├── Credits-Anzeige → /management/abo (kein 404 mehr)
  │   └── Grid-Menü → /management (kein 404 mehr)
  │
  ├── CHAT AREA (scrollbar, overflow-x: hidden)
  │   ├── ChatBubbles (user / ai / action-chips)
  │   ├── HufiSearchCard (externe Suchergebnisse)
  │   └── Intent-aware Antworten
  │
  ├── VOICE STATUS BANNER (fixed, bottom+138)
  │   ├── recording  → rot + HufiPulse + "Hufi hört zu..."
  │   ├── transcribing → grau + Spinner + "Hufi transkribiert..."
  │   └── speaking   → dunkel + HufiVoiceWave + "Hufi spricht..."
  │
  ├── BOTTOM INPUT (fixed, bottom+68)
  │   ├── text → Input + Send-Button
  │   └── voice → Mic-Button
  │       ├── idle        → orange + Mic-Icon
  │       ├── recording   → rot + WaveBars (white)
  │       ├── transcribing → grau + Spinner
  │       └── isTtsSpeaking → orange + HufiVoiceWave (white)
  │
  ├── ProactiveBriefing (fixed overlay, Phase E)
  │   ├── Orb: Volume2 (idle) | HufiVoiceWave (speaking)
  │   ├── Briefing-Lines (Greeting, Termine, Pferde, Wetter, Rechnungen)
  │   └── QuickAction-Buttons (→ /kalender, /pferde, /rechnungen, /anfragen)
  │
  └── MobileBottomNav
      └── onTranscript → handleVoiceTranscript
```

---

## 3. Voiceflow v2

### Fluss

```
Tap Mic
  → startRecording() → Presence: "hört zu"
  → Release / Tap nochmals → stopRecording() → Presence: "transkribiert"
  → transcript empfangen
  → Auto-Send wenn: wordCount ≥ 3 ODER manualConfirm deaktiviert
  → Nur Korrektur-Ansicht wenn: wordCount < 3 AND manualConfirm = true
  → detectIntent() → Presence: "denkt" / "führt aus"
  → processTranscribedText() / runNavAction()
  → addMsg() → Presence: "bereit"
  → wenn Voice-Session aktiv → TTS sprechen → Presence: "spricht" → "bereit"
```

### Kein Review-Screen als Standard
Die Korrekturansicht ist deaktiviert. Kurze Transkripte (<3 Wörter) werden nur dann
zur Korrektur angeboten, wenn der Nutzer `hufi_voice_manual_confirm = "1"` in
localStorage gesetzt hat (zukünftige UI-Einstellung).

### Voice-Fehler
Fehler werden als Toast angezeigt (kein Chat-Bubble). Presence reset zu "bereit".

---

## 4. Runtime Presence Layer

Persistent im Top Bar sichtbar als kleiner Chip neben dem Hufi-Titel.

| Zustand | Farbe | Beschreibung |
|---|---|---|
| bereit | grau | Warte auf Eingabe |
| hört zu | rot | Mikrofon aktiv |
| transkribiert | orange | Audio wird verarbeitet |
| denkt | orange | KI analysiert |
| führt aus | grün | Navigation/Action läuft |
| spricht | violett | TTS aktiv |
| offline | grau | Fallback-Modus |

---

## 5. Consent & Permissions-Modell

### First-Run Gate (HufiFirstRunConsent)

Einmalig beim ersten App-Start nach dem Login. Speichert Entscheidungen in:
- `localStorage.hufi_firstrun_consent_v1` (JSON mit Zeitstempel)
- `localStorage.hufi_ki_consent` (Kompatibilität mit bestehendem KI-Modal)
- Supabase `hufi_dsgvo_log` (via `logDsgvoConsent`)

### Berechtigungs-Hierarchie

1. Browser-API-Permission (Mikrofon, Kamera, Standort, Notifications)
2. App-Level-Toggle (Hey Hufi, Sprach-Begrüßung, KI-Funktionen)
3. Alle Entscheidungen jederzeit änderbar unter: /management

### Settings-Seite: "Berechtigungen & Hufi"

Erreichbar unter `/management` → HufiPermissionsSettings-Komponente.
- Mikrofon, Kamera, Standort, Benachrichtigungen (Browser-Permission-Request)
- Hey Hufi Toggle (localStorage: `hufi_hey_hufi_enabled`)
- Gesprochene Begrüßung Toggle (localStorage: `hufi_voice_greeting_enabled`)
- KI-Funktionen Toggle (localStorage: `hufi_ki_consent`)

---

## 6. Routing / 404-Fixes

| Route | Früher | Jetzt |
|---|---|---|
| `/credits` | 404 | Redirect → `/management/abo` |
| `/meine-zentrale` | 404 | Redirect → `/management` |
| `/einstellungen` | 404 | Redirect → `/management` |

Header-Buttons in MobileShell navigieren jetzt zu validen Routen.
Alle restlichen `/einstellungen`-Links (MobileBottomNav, Archiv, OnboardingAssistant)
werden durch Redirects in App.tsx transparent aufgelöst.

---

## 7. PWA / App-Start-Routing

```
/ (root)
  ├── hufiapp.de / www.hufiapp.de → WebsiteHome (Marketing-LP)
  └── app.hufiapp.de / localhost
        ├── user + role → getPostLoginPath(role) → /home | /employee | /client-home | …
        └── kein user → /auth
```

Authenticated Provider/Admin → `/home` → MobileShell (Runtime Assistant)
Kein Umweg über Marketing-LP bei installierten PWAs.

---

## 8. Premium Voice (Vorbereitung)

Browser TTS ist der Fallback. Für Premium Voice:
- Env-Variable: `VITE_CLOUD_TTS_PROVIDER = "elevenlabs" | "google" | "openai"`
- API-Key: Server-seitig in Supabase Edge Function, nie im Client-Bundle
- Fallback: automatisch Browser TTS wenn Env-Variable fehlt
- Implementierungs-Hook: `src/hooks/useHufiTTS.ts` — Kommentar-Platzhalter vorhanden

---

## 9. Sicherheitsgrenzen (Gesundheit)

- Hufi kann: strukturieren, erinnern, triagieren, Tierarzt-Suche starten
- Hufi darf nicht: Diagnose stellen, Behandlung empfehlen, Tierarzt ersetzen
- Notfall-Pattern: `checkHorseWelfare()` → escalates zu Tierarzt-Finder
- Kurze Sicherheitsphrase nur wenn relevant, nicht als Standard

---

## 10. Phase-Roadmap

| Phase | Name | Status |
|---|---|---|
| D | Wake Word + Consent | Live |
| E | Proactive Hufi | Live |
| E+ | Runtime Assistant v2 | Dieser Sprint (2026-05-12) |
| F | Multimodal Horse Intelligence | Geplant |
| G | Local/Offline Runtime | Geplant |
