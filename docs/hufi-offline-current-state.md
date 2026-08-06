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
- `audioDraftStore` speichert einen fertigen Audio-Blob mit minimaler technischer Metadatenstruktur in IndexedDB. Es führt absichtlich weder Upload noch Transkription noch Retry aus. `save`/`get`/`list`/`remove` verlangen zwingend einen `AudioDraftScope` (`{ userId, orgId? }`); ein leerer oder nur aus Leerzeichen bestehender `userId` wird abgelehnt. Der tatsächliche IndexedDB-Key enthält keine Klardaten, sondern einen SHA-256-Hash des Scopes (`hufi-audio-draft:<scopeHash>:<draftId>`). `list` liefert ausschließlich Drafts des exakt übergebenen Scopes; `get`/`remove` unter einem fremden Scope treffen keinen bestehenden Key und sind dadurch automatisch folgenlos. Alte Drafts aus dem früheren globalen Schlüsselformat (ohne Scope-Hash) werden von der neuen API nicht mehr gefunden.

## Ehrlich offline möglich

- Bereits geladene App-Assets, persistierte Query-Daten, unterstützte Mutation-/Bild-Queues und lokal gespeicherte Textentwürfe sind verfügbar.
- Bereits fertig aufgenommene Audio-Blobs können nach einer späteren UI-Integration lokal gegen Verbindungsverlust gesichert werden.

## Erst online möglich

- Anmeldung und Session-Erneuerung, Supabase-Funktionen, Hufi-Agentantworten, Whisper-Transkription, ElevenLabs-Audio, serverseitige Speicherung und jede Audio-Weiterverarbeitung.

## Vorgesehene Integrationspunkte

1. Der Lead bindet `useConnectionState` an die gemeinsame Hufi-UI, ohne „offline“ für HTTP-/Providerfehler zu verwenden.
2. ~~Der Text-Submit speichert den aktuellen Eingabewert unter einem nutzerisolierten, nicht erratbaren Scope und löscht ihn erst nach bestätigter erfolgreicher Übermittlung.~~ **Erledigt (Priorität 4, 2026-08-05):** `HufiAssistantExperience.tsx` speichert den Eingabewert debounced (400ms) unter `assistant-input:${user.id}`, zeigt bei vorhandenem Entwurf und leerem Feld einen "Entwurf gefunden"-Hinweis mit expliziten Aktionen "Wiederherstellen"/"Verwerfen" (kein automatisches Befüllen), und löscht den Entwurf beim erfolgreichen Absenden (unabhängig vom späteren Agent-Ergebnis).
3. ~~Der Aufnahme-Handler speichert den finalen Blob bei Offline-Abbruch via `saveOfflineAudioDraft`; ein sichtbarer Wiederherstellen/Löschen-Flow und eine Aufbewahrungsregel müssen vor Aktivierung festgelegt werden.~~ **Teilweise erledigt (Priorität 4, 2026-08-05):** Der sichtbare Lösch-Flow existiert jetzt (`HufiOfflineAudioDrafts` im Swipe-Workspace-Drawer, zeigt Datum/Größe/Dauer pro Draft, echtes Löschen via `removeOfflineAudioDraft`, "Später erneut verarbeiten" sichtbar aber bewusst deaktiviert). **Weiterhin offen:** Es speichert bislang NICHTS im echten Aufnahme-Abbruch-Pfad einen Draft — kein Aufrufer von `saveOfflineAudioDraft` existiert im Voice-Capture-Flow. Die Liste ist deshalb in der Praxis aktuell leer; das Verdrahten des Aufnahme-Handlers selbst sowie die Aufbewahrungsregel (wie lange bleiben Drafts, automatisches Aufräumen?) sind eigene, noch offene Entscheidungen.
4. Vor einer Synchronisationsengine: Auth-Kontext, explizite Nutzerfreigabe, Verschlüsselungs-/Datenschutzprüfung, Quoten, Konflikte und Löschverhalten entscheiden.
5. **Erledigt (2026-08-06):** `HufiAssistantExperience.tsx` zeigt bei `category === "billing"` oder `"provider"` (siehe `hufi-agent-error-messages.ts`) statt der reinen Fehlerzeile eine ruhige Erklärung ("Hufi kann gerade nicht antworten" / "Der verbundene KI-Dienst ist momentan nicht verfügbar. Du kannst HufiApp weiterhin manuell benutzen.") plus die Aktionen "Workspace öffnen" (nur sichtbar, wenn `VITE_HUFI_SWIPE_WORKSPACE=true`; feuert `HUFI_OPEN_WORKSPACE_EVENT` aus `HufiSwipeWorkspace.tsx`, MobileShell bleibt unverändert) und "Später erneut versuchen". Für Rolle `admin` wird zusätzlich der bereits bestehende, sanitierte Klassifizierungstext eingeblendet ("Nur für Admin sichtbar: …"), für alle anderen Rollen nicht. Der bestehende, testgepinnte Kurztext aus `classifyHufiAgentError` bleibt unverändert (kein Bruch von `hufi-agent-error-messages.test.ts`) — er ist jetzt Teil des Admin-Zusatzes statt der alleinigen Nutzermeldung. Kein neuer Provider-Test möglich (Anthropic-Billing-Block, siehe Memory), daher nur TypeScript/ESLint/Build geprüft, kein Live-Smoke-Test.
