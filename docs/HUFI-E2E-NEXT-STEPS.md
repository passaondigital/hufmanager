# Hufi E2E — Nacht-Checkpoint

Stand: hufi-agent Version 29, Branch `feature/hufi-assistant-experience-preview`.

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
