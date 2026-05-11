# HufAI — Device & Platform Capability Matrix

> Stand: 2026-05-11. Forschungsdokument, kein Implementierungsauftrag.
>
> Ziel: Realistische Entscheidungsgrundlage für Wake-Word, Background-AI,
> Offline-AI und Cross-Device-Sessions.
>
> Quellen: MDN Web Docs, PWA-Spezifikation, Apple Developer Docs,
> Android Developer Docs, W3C-Spezifikationen.
>
> **Keine falschen Versprechungen. Keine Fantasie-Features.**

---

## Kategorien

Fähigkeiten werden bewertet nach:

- **Browser PWA (Chrome/Safari)** — aktuelle Realität
- **Android PWA** — Chrome + Android-Spezifika
- **iOS PWA (Safari)** — Safari + iOS-Beschränkungen
- **Electron/Tauri** — Desktop-Wrapper
- **Native Android App** — React Native / Kotlin / Flutter
- **Native iOS App** — React Native / Swift / Flutter

Bewertung: ✅ voll möglich | ⚠️ eingeschränkt | ❌ nicht möglich | `[?]` unklar/version-abhängig

---

## 1. Mikrofon-Zugriff

| Fähigkeit | Browser PWA | Android PWA | iOS PWA | Electron | Native Android | Native iOS |
|---|---|---|---|---|---|---|
| Mikrofon (Vordergrund, User-Gesture) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mikrofon (Hintergrund) | ❌ | ❌ | ❌ | ✅ | ⚠️ (Service-Erklärung nötig) | ⚠️ (Background Modes nötig) |
| Wake Word ohne User-Gesture | ❌ | ❌ | ❌ | ✅ | ⚠️ | ⚠️ |
| Kontinuierliches Listening im Hintergrund | ❌ | ❌ | ❌ | ✅ | ⚠️ Android Foreground Service | ⚠️ iOS Background Audio |

**Fazit:**
Echter Background-Wake ist in Browser/PWA **unmöglich**. Jede
"Wake Word im Hintergrund"-Funktion erfordert Electron (Desktop)
oder eine native App.

---

## 2. Sprach-APIs (STT / TTS)

| Fähigkeit | Browser PWA | Android PWA | iOS PWA | Electron | Native Android | Native iOS |
|---|---|---|---|---|---|---|
| `SpeechRecognition` (Web API) | ✅ Chrome | ✅ Chrome/Android | ✅ Safari 14.5+ | ✅ via Chromium | via WebView | via WebView |
| Kontinuierliches `SpeechRecognition` | ⚠️ Timeout nach ~60s | ⚠️ gleich | ⚠️ Safari stoppt nach ~30s | ⚠️ | native API | native API |
| `SpeechSynthesis` (TTS) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Neuronale TTS-Stimme (System) | ⚠️ OS-abhängig | ⚠️ Android 9+ | ⚠️ iOS 16+ besser | wie OS | native | native (AVSpeechSynthesizer) |
| Externe TTS (Azure, ElevenLabs) | ✅ via API | ✅ via API | ✅ via API | ✅ | ✅ | ✅ |
| Whisper lokal (browser-intern) | ❌ CPU-intensiv | ❌ | ❌ | ✅ whisper.cpp | ✅ | ✅ |

**Fazit für HufiApp:**
- Browser TTS: funktional, aber Qualität OS-abhängig.
- Azure TTS / ElevenLabs API: überall nutzbar, empfohlen für Qualität.
- Lokales Whisper: nur Electron oder Native.
- Aktuell: Whisper auf VPS Port 5000 (Server-seitig), das ist der richtige Weg für PWA.

---

## 3. Background-Prozesse

| Fähigkeit | Browser PWA | Android PWA | iOS PWA | Electron | Native Android | Native iOS |
|---|---|---|---|---|---|---|
| Service Worker (Basic) | ✅ | ✅ | ✅ iOS 11.3+ | ✅ | n/a | n/a |
| Service Worker Background Sync | ✅ Chrome | ✅ Android Chrome | ❌ iOS | ✅ | n/a | n/a |
| Service Worker Push Events (Hintergrund) | ✅ Chrome | ✅ | ⚠️ iOS 16.4+ Web Push | ✅ | ✅ via FCM | ✅ via APNs |
| Periodic Background Sync | ✅ Chrome (mit Permission) | ✅ | ❌ | ✅ | n/a | n/a |
| Background Fetch | ✅ Chrome | ✅ | ❌ | ✅ | n/a | n/a |
| Wake Lock API | ✅ Chrome | ✅ | ⚠️ iOS 16.4+ | ✅ | ✅ | ✅ |
| App läuft wenn Bildschirm aus | ❌ | ❌ | ❌ | ✅ | ⚠️ Foreground Service | ⚠️ Background Mode |

**Fazit:**
iOS ist die größte Einschränkung. Push Notifications auf iOS erfordern
iOS 16.4+ und "Zum Homescreen hinzufügen". Background Sync fehlt komplett.
Android Chrome ist deutlich leistungsfähiger als iOS Safari.

---

## 4. Push-Notifications

| Fähigkeit | Browser PWA | Android PWA | iOS PWA | Electron | Native Android | Native iOS |
|---|---|---|---|---|---|---|
| Push Notifications (Vordergrund) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Push Notifications (Hintergrund) | ✅ Chrome | ✅ | ⚠️ iOS 16.4+ / Homescreen | ✅ | ✅ FCM | ✅ APNs |
| Rich Notifications (Bild, Buttons) | ✅ Chrome | ✅ | ⚠️ iOS eingeschränkt | ✅ | ✅ | ✅ |
| Notification Click → App-Deep-Link | ✅ | ✅ | ⚠️ oft nur App-Start | ✅ | ✅ | ✅ |
| Scheduled Local Notifications | ❌ | ❌ | ❌ | ⚠️ via Timer | ✅ | ✅ |

**HufiApp heute:** `push_subscriptions`-Tabelle + `send-notification` Edge Function vorhanden.
Status auf iOS unklar — `[?]` ob iOS 16.4+ Cover bereits aktiv.

---

## 5. Kamera und Sensoren

| Fähigkeit | Browser PWA | Android PWA | iOS PWA | Electron | Native Android | Native iOS |
|---|---|---|---|---|---|---|
| Kamera-Zugriff (Foto) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kamera-Zugriff (Video) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kamera-Hintergrund | ❌ | ❌ | ❌ | ✅ | ⚠️ | ⚠️ |
| GPS / Geolocation | ✅ (HTTPS) | ✅ | ✅ | ✅ | ✅ | ✅ |
| GPS Hintergrund | ❌ | ❌ | ❌ | ✅ | ⚠️ Foreground Service | ⚠️ Location Permission |
| Accelerometer / Gyroscope | ✅ limitiert | ✅ | ✅ iOS 13+ (Genehmigung) | ✅ | ✅ | ✅ |
| Biometrie (WebAuthn) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 6. Lokale Datenspeicherung / Offline

| Fähigkeit | Browser PWA | Android PWA | iOS PWA | Electron | Native Android | Native iOS |
|---|---|---|---|---|---|---|
| IndexedDB | ✅ | ✅ | ✅ | ✅ | via WebView | via WebView |
| Cache API (Service Worker) | ✅ | ✅ | ✅ | ✅ | n/a | n/a |
| Storage Quota (unbegrenzt) | ❌ (Origin-Limit) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Datei-System-Zugriff | ⚠️ File System Access API | ⚠️ Chrome | ❌ Safari | ✅ | ✅ | ✅ |
| Lokales Modell (Ollama/Whisper) | ❌ | ❌ | ❌ | ✅ | ⚠️ ONNX/Llama.cpp | ⚠️ CoreML |

---

## 7. Wake Word — Optionen und Realität

### Browser (heute in HufiApp)

```
SpeechRecognition API (Web Speech API)
  + Kostenlos, kein SDK
  + Deutsche Sprachunterstützung
  - Timeout nach 30–60s → muss neu gestartet werden
  - Startet nur auf User-Gesture (erstes Mal)
  - iOS Safari: unzuverlässig, kurze Erkennungsfenster
  - Kein echter Wake-Word-Vergleich — erkennt alles,
    Software filtert dann auf "hufi"/"hey hufi"
  - Keine Background-Erkennung wenn App im Hintergrund
```

### Externe Wake-Word-Engines (für Electron/Native)

| Engine | Plattform | Lizenz | Custom Wake Word | Offline | Qualität |
|---|---|---|---|---|---|
| **Picovoice Porcupine** | Electron/Native/Web (WebAssembly!) | Freemium | Ja (kostenlos bis 3) | ✅ vollständig | Sehr hoch |
| **OpenWakeWord** | Python/Node | Apache 2 | Ja (Training nötig) | ✅ | Mittel |
| **Snowboy** | Python (deprecated) | Apache 2 | Ja | ✅ | Alt |
| **Whisper-based** | Python/Node | MIT | Via Prompt-Klassifikation | ✅ | Hoch, langsam |

**Wichtig:** Picovoice Porcupine hat eine **Web-SDK mit WebAssembly** —
das bedeutet theoretisch browser-seitiges Wake Word ohne Server. Aber:
- Erfordert Tab im Vordergrund
- Safari-Kompatibilität eingeschränkt
- Kein echter Background-Mode

**Empfehlung für HufiApp kurzfristig:**
Aktuellen Browser-`SpeechRecognition`-Ansatz beibehalten.
Für echtes persistentes Wake Word: Electron/Tauri Desktop-App oder native App
ist notwendig. Kein Browser-Hack der das reliable löst.

---

## 8. Empfohlene Stufenplanung

```
Stufe 1 (heute — Browser PWA)
  ├── Voice: SpeechRecognition + Whisper-VPS + Browser TTS
  ├── Wake: SpeechRecognition keyword-filter (läuft wenn App offen)
  ├── Background: Service Worker + Push Notifications
  ├── Offline: IndexedDB + TanStack Query Cache
  └── Biometrie: WebAuthn (localStorage-Credential, bekanntes Limit)

Stufe 2 (3–6 Monate — PWA verbessert)
  ├── TTS: Azure TTS de-DE-KatjaNeural statt Browser-Stimme
  ├── Push: iOS Push via iOS 16.4+ + "Zum Homescreen"
  ├── Wake: Porcupine WebAssembly (Vordergrund-Only, besser als SR API)
  ├── Biometrie: Credential-ID in Supabase user_profiles (Cross-Device)
  └── Offline: robustere Sync-Strategie

Stufe 3 (6–12 Monate — Electron/Tauri Desktop)
  ├── Wake: Porcupine native + Mikrofon-Hintergrund-Zugriff
  ├── TTS: Lokal (Kokoro TTS / Coqui TTS)
  ├── STT: Lokal (whisper.cpp)
  ├── AI: Ollama integriert in Desktop-App
  └── Background: volle Desktop-Background-Prozesse

Stufe 4 (12+ Monate — Native Mobile)
  ├── Wake: Porcupine native SDK (iOS/Android)
  ├── Background Audio: iOS Background Modes / Android Foreground Service
  ├── GPS Background: native Permissions
  ├── Lokale Modelle: CoreML (iOS) / ONNX (Android)
  └── APNs / FCM: volle Push-Integration
```

---

## 9. iOS PWA — Spezifische Einschränkungen (wichtig für Pascal)

iOS Safari ist die restriktivste Plattform. Konkret für HufiApp:

| Feature | Status iOS PWA |
|---|---|
| Push Notifications | Nur iOS 16.4+ + "Zum Homescreen" hinzufügen |
| Web Push im Browser (ohne Homescreen) | ❌ |
| Background Sync | ❌ |
| Mikrofon im Hintergrund | ❌ |
| `SpeechRecognition` continuous | ⚠️ stoppt nach ~30s, muss neu gestartet werden |
| `SpeechSynthesis` unterbrochen wenn App in Hintergrund | ✅ (wird gestoppt) |
| Service Worker | ✅ aber eingeschränkte Lifetime |
| IndexedDB | ✅ |
| Wake Lock | ✅ iOS 16.4+ |

**Konsequenz:** Eine native iOS-App würde alle Limits aufheben.
PWA auf iOS funktioniert für Vordergrund-Use-Cases, aber kein echtes
persistentes AI-Assistenz-Erlebnis ohne "Zum Homescreen".

---

## 10. Zusammenfassung für Entscheidungen

| Entscheidung | Empfehlung |
|---|---|
| Background Wake Word heute | Nicht möglich ohne Native/Electron. PWA bleibt Vordergrund-only. |
| TTS-Qualität verbessern | Azure TTS API — sofort möglich, kein Plattform-Wechsel |
| Persistente Sessions | Server-seitig (Supabase session_memory), sofort möglich |
| iOS Push Notifications | iOS 16.4+ + Homescreen-Installation, testen ob schon aktiv |
| Lokales AI (Offline) | Erst Electron/Desktop-App, dann Native. Nicht im Browser. |
| Cross-Device Biometrie | Credential-ID in DB speichern, sofort möglich |
| Erste native App | Android zuerst (weniger Einschränkungen), dann iOS |
