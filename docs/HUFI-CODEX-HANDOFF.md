# HUFI Codex Handoff

Stand: 2026-08-04 (Terra, Hufi-TTS-P0)

## TTS-P0-Änderung

- Ursache: Die normale Hufi-Kette konnte trotz Premium-Anspruch explizit Browser-TTS, Piper und für Client-Rollen erzwungen Piper wählen. Zusätzlich wurden erfolgreiche HTTP-Antworten vor der Blob-Wiedergabe nicht auf Audio-MIME-Type oder Bytegröße geprüft.
- Korrektur: `useHufiTTS` verwendet ausschließlich eine gespeicherte gültige ElevenLabs-Hufi-Voice oder die offizielle konfigurierte Hufi-Standardvoice. Browser-TTS und Piper sind aus Auswahl, Wiedergabekette und Client-Rollen-Sonderweg entfernt.
- `hufi-tts` prüft ElevenLabs nun mit 15-Sekunden-Timeout sowie Audio-Content-Type und Bytegröße. Der Client prüft die Response ebenfalls; JSON oder leere Antworten werden nie abgespielt. Fehler zeigen den sichtbaren Hinweis „Die ausgewählte Hufi-Stimme ist gerade nicht verfügbar.“; Textantworten bleiben erhalten.
- Mobile-Wiedergabe stoppt vorheriges Audio, wartet auf `audio.play()` und gibt Object-URLs erst bei Ende/Fehler frei. Der bestehende Nutzerinteraktions-Unlock in `MobileShell` bleibt aktiv.
- Lokal geprüft: TypeScript ohne Fehler, `npm run build` bestanden, keine verbliebenen Browser-/Piper-Ausgabepfade in der Hufi-TTS-Kette. ESLint der TTS-Dateien ohne Fehler; nur bestehende Fast-Refresh-Warnung im Selector. Zwei bestehende `any`-Fehler in der geringfügig bereinigten Onboarding-Datei bleiben unverändert.

## Deploy-/Hörproben-Status

- Der ausschließlich auf `hufi-tts` beschränkte Deploy wurde versucht, aber vom Supabase-CLI vor jeder Remote-Änderung abgelehnt: kein `SUPABASE_ACCESS_TOKEN` verfügbar. Es gab keinen Deploy.
- Ein Repository-Skript für den Preview-Sync ist nicht vorhanden; die lokale Production-Build-Ausgabe wurde daher nicht nach Preview übertragen.
- Für die Hörprobe nach Function-Deploy und Preview-Sync: „Hallo Hufi, hörst du mich?“ sagen und nur mitteilen, ob die ElevenLabs-Premiumstimme hörbar war sowie die ungefähre Uhrzeit.

## Nächste Einheit

Mit autorisiertem Supabase-CLI-Zugang ausschließlich `hufi-tts` deployen, Auth-Boot-Smoke-Test durchführen und den vorhandenen Preview-Release-Weg verwenden. Danach die Hörprobe und die korrelierten Logs prüfen.
