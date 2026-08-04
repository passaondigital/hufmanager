# HUFI Codex Handoff

Stand: 2026-08-04 (Terra, Hufi-Agent-503-P0)

## TTS-Status

- Ursache: Die normale Hufi-Kette konnte trotz Premium-Anspruch explizit Browser-TTS, Piper und für Client-Rollen erzwungen Piper wählen. Zusätzlich wurden erfolgreiche HTTP-Antworten vor der Blob-Wiedergabe nicht auf Audio-MIME-Type oder Bytegröße geprüft.
- Korrektur: `useHufiTTS` verwendet ausschließlich eine gespeicherte gültige ElevenLabs-Hufi-Voice oder die offizielle konfigurierte Hufi-Standardvoice. Browser-TTS und Piper sind aus Auswahl, Wiedergabekette und Client-Rollen-Sonderweg entfernt.
- `hufi-tts` prüft ElevenLabs nun mit 15-Sekunden-Timeout sowie Audio-Content-Type und Bytegröße. Der Client prüft die Response ebenfalls; JSON oder leere Antworten werden nie abgespielt. Fehler zeigen den sichtbaren Hinweis „Die ausgewählte Hufi-Stimme ist gerade nicht verfügbar.“; Textantworten bleiben erhalten.
- Mobile-Wiedergabe stoppt vorheriges Audio, wartet auf `audio.play()` und gibt Object-URLs erst bei Ende/Fehler frei. Der bestehende Nutzerinteraktions-Unlock in `MobileShell` bleibt aktiv.
- Lokal geprüft: TypeScript ohne Fehler, `npm run build` bestanden, keine verbliebenen Browser-/Piper-Ausgabepfade in der Hufi-TTS-Kette. ESLint der TTS-Dateien ohne Fehler; nur bestehende Fast-Refresh-Warnung im Selector. Zwei bestehende `any`-Fehler in der geringfügig bereinigten Onboarding-Datei bleiben unverändert.
- Smartphone-Test bestätigt: `hufi-tts` Version 13 antwortete mit POST 200; die ElevenLabs-Premiumstimme war hörbar.

## Hufi-Agent-503-P0

- Smartphone-Test: `hufi-agent` Version 32 erhielt OPTIONS 200 und POST 503 bei etwa 943 ms. Der TTS-Aufruf sprach anschließend nur die sichtbare Agenten-Fehlermeldung.
- Belegter Requestpfad: Mikrofon → Transkript → `processChatMessage(text, true)` → `askHufiAgent({ voiceMode: true })` → `selectModel()` → Fast-Modell. `voiceMode` geht nicht verloren.
- Vor dem Fix verwarf der Agent den tatsächlichen Anthropic-Status/Fehlertyp und antwortete nur mit generischem 503. Der konkrete Providerfehler ist deshalb aus den vorliegenden Version-32-Daten nicht rekonstruierbar.
- Fix-Kandidat: `hufi-agent` klassifiziert jetzt Anthropic-/Ollama-Fehler, loggt nur technische Daten (Request-ID, voiceMode, Modell, Status, Code, Dauer, Fallbackstatus), gibt einen nicht sensiblen `errorCode` zurück und versucht bei `anthropic_model_not_found` einmalig `ANTHROPIC_MODEL_FALLBACK`.
- Modellkonfiguration: `ANTHROPIC_MODEL_FAST`, `ANTHROPIC_MODEL_SMART` und `ANTHROPIC_MODEL_FALLBACK` sind Runtime-Secrets mit offiziellen Messages-API-Defaults. Beim Voice-Test wird der Fast-Wert verwendet.
- Lokaler direkter Anthropic-Smoke-Test ist nicht möglich, weil hier kein `ANTHROPIC_API_KEY` verfügbar ist. Kein Schlüssel wurde ausgegeben. Der Connector-Deploy und ein minimaler Live-Smoke-Test liefern danach den konkreten Fehlercode.

## Deploy-/Hörproben-Status

- Das lokale CLI konnte `hufi-tts` nicht deployen (kein `SUPABASE_ACCESS_TOKEN`); der danach gemeldete Smartphone-Test bestätigt jedoch die aktive Version 13 mit POST 200 und hörbarer Premiumstimme.
- Ein Repository-Skript für den Preview-Sync ist nicht vorhanden; die lokale Production-Build-Ausgabe wurde daher nicht nach Preview übertragen.
- Für die Hörprobe nach Function-Deploy und Preview-Sync: „Hallo Hufi, hörst du mich?“ sagen und nur mitteilen, ob die ElevenLabs-Premiumstimme hörbar war sowie die ungefähre Uhrzeit.

## Nächste Einheit

Über den Supabase-Connector ausschließlich `hufi-agent` deployen. Danach vom Smartphone eine minimale Hufi-Anfrage stellen und per Correlation-ID den `errorCode`, das Fast-Modell und einen eventuellen Fallback abgleichen.
