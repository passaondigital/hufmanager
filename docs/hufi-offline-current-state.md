# Hufi Offline – aktueller Stand

Stand: 2026-08-04. Diese Grundlage verändert weder Produktion noch Navigation oder Datenbankschema.

## Bereits vorhanden

- Vite PWA/Workbox precacht JavaScript, CSS und statische Assets. Navigations-HTML und Supabase-Requests werden bewusst nicht gecacht.
- `public/sw.js` cached Logos, Bilder, Fonts und OSM-Kacheln; für Kacheln gibt es offline einen neutralen Bild-Fallback.
- TanStack Query wird sieben Tage in IndexedDB persistiert und arbeitet mit `offlineFirst`; App-Requests werden online höchstens dreimal erneut versucht.
- Es existieren IndexedDB-Warteschlangen für einige Mutationen und Bild-Uploads. Sie werden beim `online`-Event verarbeitet und begrenzen Retries auf fünf.

## Bekannte Lücken und Risiken

- `navigator.onLine` zeigt nur eine Browser-Netzwerkroute an. Es bestätigt weder Supabase-Auth noch Function-, Anthropic- oder ElevenLabs-Erreichbarkeit. Diese Fehler dürfen nicht als Offline-Zustand erscheinen.
- Der Service Worker verarbeitet keine Auth- oder KI-POSTs offline. Hufi-Anfragen, Transkription, Agent und TTS können daher nur online ausgeführt werden.
- Die Mutationsliste in `offlineConfig.ts` ist breiter als die aktuell synchronisierbare Tabellenliste in `syncManager.ts`; nicht freigeschaltete Tabellen können in der Queue verbleiben.
- Es gibt bisher weder Nutzeroberfläche noch Aufbewahrungs-/Löschregel für lokale Audioaufnahmen. Eine automatische Audio-Synchronisation wäre ohne ausdrückliche Produktentscheidung riskant.

## Neue isolierte Grundlage

- `useConnectionState` kapselt die Browser-Events mit `useSyncExternalStore`. Es liefert ausschließlich `online` oder `offline`; HTTP-, Auth-, Timeout- und Providerfehler bleiben getrennte Zustände.
- `textDrafts` und `useTextDraft` bewahren bewusst gespeicherte Texte lokal pro übergebenem Scope. Sie senden nichts und begrenzen den Inhalt auf 20.000 Zeichen.
- `audioDraftStore` speichert einen fertigen Audio-Blob mit minimaler technischer Metadatenstruktur in IndexedDB. Es führt absichtlich weder Upload noch Transkription noch Retry aus.

## Ehrlich offline möglich

- Bereits geladene App-Assets, persistierte Query-Daten, unterstützte Mutation-/Bild-Queues und lokal gespeicherte Textentwürfe sind verfügbar.
- Bereits fertig aufgenommene Audio-Blobs können nach einer späteren UI-Integration lokal gegen Verbindungsverlust gesichert werden.

## Erst online möglich

- Anmeldung und Session-Erneuerung, Supabase-Funktionen, Hufi-Agentantworten, Whisper-Transkription, ElevenLabs-Audio, serverseitige Speicherung und jede Audio-Weiterverarbeitung.

## Vorgesehene Integrationspunkte

1. Der Lead bindet `useConnectionState` an die gemeinsame Hufi-UI, ohne „offline“ für HTTP-/Providerfehler zu verwenden.
2. Der Text-Submit speichert den aktuellen Eingabewert unter einem nutzerisolierten, nicht erratbaren Scope und löscht ihn erst nach bestätigter erfolgreicher Übermittlung.
3. Der Aufnahme-Handler speichert den finalen Blob bei Offline-Abbruch via `saveOfflineAudioDraft`; ein sichtbarer Wiederherstellen/Löschen-Flow und eine Aufbewahrungsregel müssen vor Aktivierung festgelegt werden.
4. Vor einer Synchronisationsengine: Auth-Kontext, explizite Nutzerfreigabe, Verschlüsselungs-/Datenschutzprüfung, Quoten, Konflikte und Löschverhalten entscheiden.
