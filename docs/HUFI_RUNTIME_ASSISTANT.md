# Hufi Runtime Assistant — Architektur & Komponenten

> Stand: 2026-05-12  
> Ziel: Vollständige Referenz für den proaktiven, sprachgesteuerten Runtime Assistant

---

## 1. Vision

Hufi ist kein Chat-Bot. Der Runtime Assistant verkörpert:

- **Ruhe** — kein Chaos, kein WhatsApp-Ping-Pong, alles an einem Ort
- **Klarheit** — Hufi kennt den Kontext, fragt nicht nach was er weiß
- **Sicherheit** — Niemand ist alleine. Hufi begleitet, warnt, erinnert.

Kernbotschaft: *"Die wichtigste Zeit ist die am Pferd — Hufi gibt sie zurück."*

---

## 2. Komponenten-Übersicht

```
MobileShell (/)
  ├── TOP BAR
  │   ├── Hufi-Logo + "Proaktiver KI-Assistent"
  │   ├── HufiWeatherWidget (compact)
  │   ├── Replay-Button (TTS Begrüßung wiederholen)
  │   ├── HeyHufi (Wake-Word, opt-in)
  │   ├── Profi/Privat-Toggle (Provider only)
  │   ├── NotificationBell
  │   └── Credits-Anzeige
  │
  ├── CHAT AREA (scrollbar)
  │   ├── ChatBubbles (user / ai / action-chips)
  │   ├── HufiSearchCard (externe Suchergebnisse)
  │   └── Intent-aware Antworten
  │
  ├── VOICE STATUS BANNER (fixed, bottom+138)
  │   ├── recording  → rot + HufiPulse + "Hufi hört zu…"
  │   ├── transcribing → grau + Spinner + "Hufi transkribiert…"
  │   └── speaking   → dunkel + HufiVoiceWave + "Hufi spricht…"
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

## 3. Voice-Layer (Phasen)

| Phase | Komponente | Trigger | Verhalten |
|---|---|---|---|
| A | `useHufiTTS` | Greeting nach DSGVO-Consent | Spoken greeting, 1× pro Tag |
| B | `useVoiceCapture` | Mic-Button tap | Whisper-Transcription → AI-Pipeline |
| C | `hufi-intent.ts` | Jede Nachricht | Intent-Klassifizierung vor AI-Roundtrip |
| D | `HeyHufi` | Wake-Word "Hufi" | SpeechRecognition, Wake-Lock, opt-in |
| E | `ProactiveBriefing` | TTL-Gate (4h) | Overlay mit Weather + Kontext |

---

## 4. AI-Pipeline (pro Nachricht)

```
Text/Transcript
    │
    ▼
detectIntent() ──► navigation? ──► runNavAction() → spoken confirm + navigate
    │
    │ (else)
    ▼
checkDsgvoConsent / KiHinweisModal
    │
    ▼
intent.type:
  knowledge      → KNOWLEDGE_SYSTEM_PROMPT + Claude haiku
  agent_lookup   → fetchRelevantContext() + Claude sonnet
  agent_action   → planAndConfirmAction() + action-chips
  emergency      → checkHorseWelfare() + alert message
  default        → processBefundMessage() (AutoFlow)
    │
    ▼
addMsg() → broadcast (Supabase Realtime)
    │
    ▼ (wenn voice session aktiv)
hufiSpeak(response) → isVoiceSpeaking = true → HufiVoiceWave visible
```

---

## 5. HufiVoiceWave Komponente

`src/components/voice/HufiVoiceWave.tsx`

Wiederverwendbare animierte Wave-Bars. Selbst-enthaltend (eigene `@keyframes`).

```tsx
<HufiVoiceWave color="#FFFFFF" barCount={5} height={22} />
```

**Verwendungsorte:**
- `MobileShell` — Mic-Button bei `isTtsSpeaking`
- `MobileShell` — Voice-Status-Banner bei `isVoiceSpeaking`
- `ProactiveBriefing` — Orb-Icon bei `isSpeaking`

---

## 6. Proactive Briefing (Phase E)

`src/lib/hufai-proactive.ts` + `src/components/voice/ProactiveBriefing.tsx`

**TTL-Gate:** 1× alle 4h (localStorage `hufi_briefing_last_shown`)

**Briefing-Inhalt (in Reihenfolge):**
1. Begrüßung (Morgen/Tag/Abend) + Terminanzahl heute
2. Erstes überfälliges Pferd (letzte Hufbearbeitung)
3. Wetter morgen (Open-Meteo, kostenlos, kein API-Key)
4. Offene Rechnungen (nur wenn > 2)
5. Offene Leads (nur Provider)

**QuickActions:** max. 4, dedupliziert nach Route

---

## 7. Memory-Layer

`src/lib/hufi-brain.ts` (1023 Zeilen)

**Zentrale Funktionen:**
- `fetchHufiContext(userId)` → Termine, Leads, Rechnungen, Memory, Befunde
- `generateHufiGreeting(ctx)` → Personalisierter Begrüßungstext
- `learnFromInteraction(userId, query, response, feedback)` → DB-Logging
- `checkHorseWelfare(userId)` → Emergency-Erkennung (Kolik, Notfall, Blutung)
- `checkDsgvoConsent(userId)` → Consent-Gate vor KI-Aufrufen

**DB-Tabellen:** `hufi_memory`, `hufi_permissions`, `hufi_context_log`

---

## 8. Technische Schulden (offen)

- [ ] `profiles.salutation` DB-Migration (`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salutation text`)
- [ ] `profiles.voice_enabled` DB-Migration für Voice-Opt-in Persistenz
- [ ] 27 `hufmanager.de` Hardcodes (Sprint 3)
- [ ] CSP-Header fehlt
- [ ] Error-Tracking fehlt (Sentry o.ä.)
- [ ] `SELECT *` auf `profiles` vermeiden

---

## 9. Messbare Ziele (Stand Mai 2026)

| Ziel | Stand |
|---|---|
| 50% weniger WhatsApp-Chaos | Infrastruktur bereit, Adoption offen |
| Tagesplanung < 5 Min | ProactiveBriefing live, Command Center fehlt |
| Terminabschluss < 3 Min | Voice vorhanden, Gesamtflow in Arbeit |
| 90% Termine dokumentiert | AutoFlow/Befund live |
| 95% Rechnungen in 24h | autoflow-auto-invoice Edge Function live |
