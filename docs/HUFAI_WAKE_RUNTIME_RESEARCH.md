# HufAI — Wake Word & Background Runtime Research

> Stand: 2026-05-11. Forschungsdokument.
>
> Faktenbasiert. Keine falschen Versprechungen über Browser-Fähigkeiten.
>
> Ziel: Pascal und zukünftige Agenten sollen realistische Entscheidungen
> über Wake-Word-Implementierungen treffen können.

---

## Was heute in HufiApp implementiert ist

**Datei:** `src/components/voice/HeyHufi.tsx`

Implementierung:
- Browser `window.SpeechRecognition` / `window.webkitSpeechRecognition`
- Kein externes SDK, kein Modell
- Erkannte Phrasen: `"hufi"`, `"hey hufi"`, `"okay hufi"`, `"ok hufi"`
- Phasen-Modell: `off → ready → triggered → thinking → speaking`
- WakeLock beim aktiven Listening
- Läuft nur wenn HufiApp im Vordergrund und Tab aktiv

**Was das kann:**
- Zuverlässig erkennen wenn App geöffnet ist
- Deutsche Sprache
- Keine API-Kosten
- Keine externe Abhängigkeit

**Was das nicht kann:**
- App im Hintergrund = kein Wake Word
- Bildschirm aus = kein Wake Word
- iOS: stoppt nach ~30 Sekunden kontinuierlichem Listening
- Kein echter "immer an"-Wake-Modus
- Kein Vergleich mit Wake-Word-Modell — erkennt alle Sprache und filtert dann

---

## Warum echter Background-Wake im Browser nicht möglich ist

Browser-Sicherheitsmodell:
1. Mikrofon-Zugriff erfordert User-Gesture + Seite im Vordergrund
2. Tabs im Hintergrund werden throttled (CPU-Limits, Timer-Limits)
3. iOS Safari terminiert Service Worker aggressiv
4. Kein Browser erlaubt permanentes Mikrofon-Streaming aus Background-Tab

Dies ist **by design** — Datenschutz und Akkuschutz. Es gibt keinen Hack
der das reliable umgeht. Wer einen behauptet, lügt oder der Hack
bricht nach dem nächsten Browser-Update.

---

## Verfügbare Wake-Word-Engines (Übersicht)

### Picovoice Porcupine

**Plattform:** iOS, Android, Linux, macOS, Windows, Raspberry Pi,
Node.js, Web (WebAssembly), Python, Go, Rust

**Lizenz:** Kostenlos für 3 Wake Words (Entwicklung), Commercial ab ~$9/Monat

**Wie es funktioniert:**
- Trainiertes Wake-Word-Modell, läuft lokal
- Keine Cloud-Verbindung für Erkennung
- WebAssembly-Version: läuft im Browser (aber nur im Vordergrund!)
- Eigene Wake Words trainieren: kostenlos auf Picovoice Console
- "Hufi" / "Hey Hufi" als Custom Wake Words trainierbar

**Qualität:** Sehr hoch. Industry-Standard.

**Für HufiApp:**
- Kurz/mittelfristig: WebAssembly-Version statt Browser-SR-API
  (bessere Erkennungsrate, weniger false positives)
- Langfristig: Native SDK für iOS/Android

**Dokumentation:** https://picovoice.ai/docs/porcupine/

---

### OpenWakeWord

**Plattform:** Python, Node.js (community)

**Lizenz:** Apache 2.0 — vollständig Open Source

**Wie es funktioniert:**
- Machine-Learning-Modell (OpenCV + TensorFlow/ONNX)
- Eigenes Training möglich
- Läuft lokal, kein Cloud
- Qualität je nach trainiertem Modell: mittel bis gut

**Für HufiApp:**
- Gut für Server-seitigen Wake-Word-Dienst auf dem VPS
- Nicht für direkten Browser-Einsatz

---

### Whisper-basierter Wake Classifier

**Ansatz:** Lokales Whisper-Modell transkribiert kontinuierlich kurze
Audio-Fenster (1-2 Sekunden). Output wird per Keyword-Matching geprüft.

**Vor:** Bereits on VPS (Port 5000), kein neuer Infra-Bedarf
**Nachteil:** Latenz ~300-800ms pro Segment, zu langsam für echtes Wake Word
**Eignung:** Eher für Befehlserkennung nach Wake, nicht als Wake-Trigger

---

## Platform-spezifische Realität

### Android (Chrome PWA)

Was möglich ist:
- Push Notifications (FCM-basiert, Chrome zeigt sie auch ohne App)
- Background Sync (Service Worker)
- Mikrofon im Hintergrund: nur als Native App mit Foreground Service

Was fehlt für echtes Wake:
- Native App mit `android.permission.FOREGROUND_SERVICE_MICROPHONE`
- Foreground Service (zeigt permanente Notification in Status Bar)

Praktisch: Akzeptabel für professionelle Nutzung (Notification im Stall
zeigt "Hufi hört"). Android-Nutzer gewohnt.

### iOS (Safari PWA)

Was möglich ist:
- Push Notifications ab iOS 16.4 wenn "Zum Homescreen"
- IndexedDB, Service Worker (eingeschränkt)
- Wake Lock ab iOS 16.4

Was nicht möglich ist:
- Background Mikrofon
- Background App Refresh für Mikrofon
- Push ohne Homescreen-Installation

Konsequenz: iOS-Nutzer müssen App-Icon auf Homescreen haben für Push.
Wake Word im Hintergrund: nicht ohne native iOS-App.

### Electron/Tauri (Desktop)

Vollzugriff:
- Mikrofon im Hintergrund
- Wake Word engine (Porcupine native)
- Ollama lokal integrierbar
- Whisper lokal
- Unbegrenzter Dateisystem-Zugriff

**Empfehlung für "Jarvis im Büro"-Szenario:**
Electron/Tauri wäre der richtige Weg. Für Stallbedingungen (outdoor,
Hände voll, nass) bleibt Mobile First die richtige Entscheidung.

---

## Empfohlene Strategie für HufiApp

### Phase 1 (jetzt, 0–30 Tage)
Nichts ändern am Wake-Layer.

Stattdessen das Multi-Turn-Problem lösen — denn ein gutes Wake Word
das zu einem amnesischen AI führt ist nutzlos.

Priorität: Session Memory, nicht besseres Wake.

### Phase 2 (30–90 Tage)
Porcupine WebAssembly testen.

Tausch von Browser-`SpeechRecognition` gegen Porcupine WASM:
- Bessere Erkennungsrate
- Weniger false positives
- Custom "Hufi" Wake Word
- Immer noch Vordergrund-only

### Phase 3 (3–12 Monate)
Push als "Wake Proxy".

Wenn Nutzer die App nicht offen hat aber Hufi etwas mitteilen muss:
- Proaktive Push Notification sendet
- Nutzer tippt → App öffnet → Session startet
- Das ist kein echter Wake-Mode, aber praktisch das Gleiche für
  Pflege-Workflows

### Phase 4 (12+ Monate)
Native App oder Electron.

Für echtes "immer an": kein Weg dran vorbei.
Android: Foreground Service + Porcupine native
iOS: Background Audio Mode + Porcupine iOS SDK
Desktop: Electron + Porcupine Node.js SDK

---

## Voiceless Wake Pattern (Alternative)

Anstatt permanentes Mikrofon-Listening gibt es einen praktischen
Mittelweg für Stallbedingungen:

1. **Handgelenks-Tap / Watch** (future): Kurzes Tippen auf Smartwatch
   öffnet HufiApp im Sprachmode — kein Wake Word nötig.

2. **Widget / Quicklaunch**: iOS Widget-Tap oder Android-Widget öffnet
   HufiApp direkt in Voice-Mode — kein Wake Word nötig.

3. **Push-Notification-Tap**: Hufi sendet Notification, Tap öffnet App
   in Voice-Mode.

Diese Patterns sind *sofort* umsetzbar und praktisch für die Zielgruppe.

---

## Wichtige ehrliche Aussage

Für das Briefing 2026 gilt:

> HufiApp kann Wake Word wenn die App offen und im Vordergrund ist.
> Hintergrund-Wake ist in der Browser-PWA-Version technisch nicht möglich.
> Das ist eine Browser-Architektur-Grenze, kein Hufi-Feature-Fehler.
> Eine native App würde das lösen — das ist ein möglicher zukünftiger Schritt.

Das ist keine Schwäche. Das ist Ehrlichkeit die Vertrauen aufbaut.
