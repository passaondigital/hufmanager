# Hufi E2E — Nacht-Checkpoint

Stand: hufi-agent Version 29, Branch `feature/hufi-assistant-experience-preview`. Letzte lokale Build-Prüfung: 2026-08-04 bestanden.

## Erledigt
- `hufi-agent` Version 29 ist ACTIVE (Supabase Projekt `vnschgjxkzzwzefqlrji`).
- Ursprünglicher Fehler behoben: `MODEL_SMART` zeigte auf die ungültige/nicht mehr unterstützte Modell-ID `claude-sonnet-4-6`, dadurch schlug jeder nicht-Voice-Call mit einem 503 fehl, bevor Claude überhaupt antworten, nachfragen oder ein Tool aufrufen konnte. Jetzt: `claude-sonnet-5`.
- Deploy-Inhalt gegen lokalen Code verifiziert (Diff nur 2 rein kosmetische Abweichungen, keine funktionalen).
- Unauthentifizierter Smoke-Test: `POST /functions/v1/hufi-agent` ohne Auth-Header → 401 `UNAUTHORIZED_NO_AUTH_HEADER`. Function bootet sauber, kein Absturz.

## Noch offen
- **Authentifizierter Hufi-Test**: Noch nicht bestätigt, dass eine normale Frage mit echtem Login jetzt tatsächlich durchläuft (Antwort + ggf. Tool-Aufrufe wie search_entity/search_memory).
- **Voice/TTS End-to-End**: Noch nicht erneut getestet nach dem Fix.
- **Kamera / Bild / Dokument**: Separates, noch offenes Problem (client-seitig, nicht Teil dieses Fixes). Kamera soll laut Spezifikation real funktionieren, Nutzer meldet aber Fehler — Ursache noch nicht untersucht. Bild/Dokument-Upload war zuvor bewusst als "noch nicht verfügbar" dokumentiert.
- **Preview-Testmatrix A–G**: Noch nicht vollständig durchlaufen und ausgewertet (Wissensfrage, Hufi-Moment, Rückfrage, Voice, echte Schreib-Aktion inkl. Bestätigung, Abbruch, Fehlerzustand).
- **Produktion (Frontend)**: Unverändert, kein Deploy erfolgt. `feature/hufi-assistant-experience-preview` ist nicht gemerged.

## Erster Schritt morgen
Angemeldet in der Preview (`https://preview.hufiapp.de/home`) eine normale Hufi-Frage stellen, danach `hufi-agent`-Logs (Supabase, Projekt `vnschgjxkzzwzefqlrji`) für den Testzeitraum auswerten und mit dem tatsächlichen UI-Ergebnis abgleichen.

## Prüfeinheit 2026-08-04
- `npm run build` bestanden.
- Der authentifizierte Preview-Nachweis bleibt offen, da in dieser Workspace-Session kein zulässiger Preview-Login und kein Basic-Auth-Zugang vorliegt.

## TTS-P0 2026-08-04
- Browser-TTS, Piper und der Client-Rollen-Piper-Sonderweg sind aus Hufis normaler Sprachausgabe entfernt. Es bleiben gespeicherte gültige ElevenLabs-Hufi-Voice oder offizielle Hufi-Standardvoice; bei Fehler bleibt Text sichtbar.
- `hufi-tts` wurde lokal gehärtet (Timeout, Audio-MIME-Type, Bytegröße, maskierte Diagnostik), aber nicht deployt: Das Supabase-CLI hat keinen Access Token. Preview wurde daher nicht aktualisiert.
- Nächster Schritt: Nur `hufi-tts` mit autorisiertem CLI deployen, Boot-/Auth-Smoke-Test ausführen, Preview über den vorhandenen Release-Weg aktualisieren und dann die definierte Hörprobe durchführen.

## Hufi-Agent-503 2026-08-04
- Smartphone-Evidenz: `hufi-agent` Version 32 POST 503 trotz erfolgreichem OPTIONS; `hufi-tts` Version 13 POST 200, Premiumstimme hörbar. TTS ist nicht mehr der P0.
- `voiceMode` erreicht den Agenten und wählt den Fast-Pfad. Der bisherige Code verwirft den Anthropic-Fehlertyp vor dem generischen 503.
- Lokaler Fix klassifiziert Providerfehler, protokolliert nur technische Daten und bietet einen einmaligen Modell-Fallback bei `anthropic_model_not_found`. Deploy steht aus; danach ist eine minimale Smartphone-Preview-Anfrage mit Logabgleich nötig.
- Der gemeinsame Client-Textweg unterscheidet jetzt Auth, Netzwerk, Timeout, Function- und HTTP-Fehler. Ein Function-503 wird nicht mehr als „Kurz keine Verbindung“ angezeigt. Vor dem Voice-Retest muss eine eingetippte Preview-Frage eine sichtbare Textantwort liefern.
- P0-Review ergänzt: `empty_provider_response`, finaler Mehrproviderfehler und Timeout-Budgets sind korrigiert, jedoch noch nicht per Connector deployt. Der reale Provider-`errorCode` bleibt bis zum ersten Preview-Test offen.
