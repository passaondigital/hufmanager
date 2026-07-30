# HUFI_TODO.md

Offene Punkte aus laufenden Sessions. Nächste Session: zuerst hier lesen.

## 🔧 Etappe 1B gebaut, NICHT deployed (30.07.2026) — Build grün

Entscheidungen Pascal, alle fünf Punkte umgesetzt. Deploy macht Pascal mit
`./deploy.sh`.

1. **Slot-Konfiguration ersatzlos gelöscht, Mic-Knopf in die Mitte.**
   `MobileBottomNav.tsx` neu: Kalender · Pferde · **[MIC 76px]** · Kunden ·
   Rechnungen. Kein Gedrückthalten, kein Picker, kein `hufmanager_nav4_*`
   in localStorage mehr. **Kein Home-Tab** — der Mic-Knopf führt selbst auf
   den Assistenten-Screen. Ist man schon dort, feuert er das Fenster-Event
   `hufi:mic` (`HUFI_MIC_EVENT`), auf das `MobileShell` hört und die
   Aufnahme startet bzw. sendet. Client-Leiste zeigte zweimal „Pferde"
   (l2 und r1 beide auf `/client-horses`) — jetzt eindeutig.
2. **Schlankes Menü, links oben.** Neu `HufiMenu.tsx`: Profil,
   Einstellungen, Voice-Guthaben, Abo, Hilfe & FAQ, Rechtliches, Impressum,
   Datenschutz, Abmelden. Auf dem Assistenten-Screen steht es **links**, wo
   vorher der Hufi-Knopf saß — der ist entfallen, weil der Mic-Knopf unten
   die Aufnahme startet. Glocke bleibt rechts, Wetter und Guthaben wurden
   leiser gestellt (grau statt orange, kleiner als der Name). Auf den
   Unterseiten (`AppTopBar.tsx`) ersetzt das Menü das alte 2-Punkt-Dropdown
   und bleibt rechts neben der Glocke — links ist dort der Zurück-Knopf.
   `/hilfe` ist jetzt geroutet (34 echte FAQ-Antworten, war nie erreichbar);
   die Idle-Karte zeigt auf `/hilfe` statt auf die dünne `/support`-Seite.
   Archiv/Steuer/Import/Website bleiben im ManagementHub.
3. **Freihand-Modus.** `useVoiceCapture.startRecording({ handsFree: true })`
   startet ohne VAD, nur mit 3-Minuten-Notbremse. Vom Nutzer selbst
   gestartete Aufnahmen laufen im Freihand-Modus; Follow-up und Voice-Loop
   bleiben unverändert auf VAD. Im Overlay gibt es jetzt einen echten
   **Stopp-Knopf** (beenden + senden) neben Verwerfen — vorher konnte man
   nur abbrechen oder stillschweigen.
4. **Voice-Guthaben liegt an der Ausgabe, nicht an der Eingabe** (geprüft):
   Aufnahme und Whisper laufen lokal, es gibt keine Guthaben-Sperre vor der
   Aufnahme und es wird keine gebaut. Bei 402 von `hufi-tts` fällt
   `useHufiTTS` bereits auf Piper zurück — der Rückfall war schon da, nichts
   zu bauen. Geändert: Hinweis jetzt **einmal pro Sitzung** (vorher alle 5
   Minuten) mit neuem Text („Premium-Stimme aufgebraucht…"), und der
   Guthaben-Chip wird auch bei `monthly_base_cents = 0` rot.
5. **„Hey Hufi" bleibt aus.** `wakeWordEnabled` unverändert `false`,
   Testzugang weiter über `?wakeword=test`. Dafür verspricht die UI es nicht
   mehr: Presence-Chip sagt „tippen zum sprechen", das Eingabefeld „Frag
   Hufi…", solange das Flag aus ist.

**Noch offen / bewusst nicht angefasst:** Keine automatisierte Prüfung für
den Freihand-Pfad: MediaRecorder und AudioContext bräuchten Mocks, das ist
Playwright-Arbeit (Etappe 5, siehe unten — Playwright ist NICHT installiert).
`/support` bleibt bestehen und dünn; ihr „Chat starten" zielt weiter auf
einen FAB, der nirgends gerendert wird.

## 🪜 Etappe 2 — Ebenen-Leiter (30.07.2026, eigener Commit, NICHT deployed)

Die Leiter steht in `src/index.css` (`--z-bar` 40 < `--z-fab` 45 <
`--z-mode` 55 < `--z-dialog` 60 < `--z-menu` 70 < `--z-tour` 75 <
`--z-toast` 80) und als Tailwind-Klassen in **`tailwind.config.js`** — nur
diese Datei ist aktiv, `tailwind.config.ts` wird von Tailwind ignoriert.
88 Dateien umgestellt, dazu die Höhen `--hufi-nav-h` / `--hufi-header-h`
und die Hilfsklassen `pt-app-header`, `pb-bottom-nav`, `above-bottom-nav`.

**Bewusst festgelegte Reihenfolge der drei früheren `z-9999`-Kollisionen:**
Tages-Cockpit `z-mode` (55, Dialoge liegen also darüber) < Tour-Spotlight
`z-tour` (75, erklärt auch offene Dialoge) < Cookie-Banner `z-toast` (80,
muss immer erreichbar bleiben — DSGVO). Menüs liegen absichtlich ÜBER
Dialogen (70 > 60), sonst verschwindet jede Auswahlliste in einem Formular
hinter dem Dialog.

**Prüfung:** `npm run check:layers` (`scripts/check-layers.mjs`) — prüft
Vollständigkeit und Reihenfolge der Stufen, die Tailwind-Klassen und ob
irgendwo noch ein `fixed`-Element eine freie Zahl ≥ 40 benutzt. Läuft ohne
Browser und ohne Login, Stand 30.07. grün. Bewusst ausgenommen (eigene
Stapelkontexte mit lokalen Zahlen): `tour-manager/` (Leaflet-Panes),
`camera/HufiCam.tsx`, `office/canvas/`, `day-cockpit/CockpitUnderway.tsx`,
`ui/navigation-menu.tsx`.

**Was diese Prüfung NICHT kann:** sehen, ob etwas optisch hinter etwas
anderem liegt. Playwright ist in diesem Projekt nicht installiert (kein
`@playwright/test`, keine Config) — die Layoutprüfung aus Etappe 5 ist nie
gebaut worden. Bis dahin gilt die Klickliste unten.

## ✅ Klickliste nach dem Deploy (Reihenfolge nach Risiko)

1. `/home`: Mic-Knopf unten Mitte antippen → Overlay „Hufi hört zu",
   **Stopp** sendet, **Verwerfen** wirft weg. Ganz neu verkabelt.
2. Von `/kalender` aus Mic antippen → landet auf `/home`, ohne aufzunehmen;
   zweiter Tipp startet die Aufnahme.
3. Auf `/home` Tastatur öffnen und tippen → Eingabezeile und Senden-Knopf
   bleiben erreichbar, der Mic-Knopf verdeckt sie nicht.
4. Auswahlmenü INNERHALB eines Dialogs (z.B. Pferd wählen beim Termin) →
   Liste liegt über dem Dialog, nicht dahinter. Riskanteste Ebenen-Regel.
5. Langer Dialog (Kunde anlegen, Rechnung) → Kopf und Fuß kleben, Speichern
   erreichbar, X sichtbar.
6. Arbeitsmodus/Tages-Cockpit starten und darin einen Dialog öffnen →
   Dialog liegt über dem Cockpit.
7. Tour/Spotlight starten → liegt über allem außer Meldungen. Auf der
   Website: Cookie-Banner liegt über allem.
8. FABs prüfen: Mein Office und Termin-Schnellzugriff → Knopf liegt über
   der unteren Leiste, nicht darunter.
9. Menü links oben: alle acht Punkte öffnen wirklich eine Seite, `/hilfe`
   zeigt FAQ, Abmelden funktioniert.
10. Voice-Guthaben leer → Hufi antwortet mit Piper-Stimme, Hinweis kommt
    genau einmal, Chip im Kopf ist rot.

## 🔧 UI-Sanierung — Etappe 1 gebaut, NICHT deployed (28.07.2026)

5 Dateien geändert, `vite build` läuft durch, Deploy macht Pascal selbst
mit `./deploy.sh`:
- `ui/dialog.tsx` — Inhalt scrollt, Kopf + Fuß kleben, X bleibt sichtbar
  (betraf 126 Dialoge, deren unterer Teil samt Speichern-Knopf unerreichbar war)
- `ui/select.tsx` — `max-w-[calc(100vw-2rem)]` + `collisionPadding={16}`
- `MobileBottomNav.tsx` — Safe-Area kommt zur Höhe dazu statt abgezogen
- `MeinOffice.tsx` + `QuickAddAppointmentFAB.tsx` — FABs über die untere Leiste

**Noch offen (Etappen 2–5, freigegeben, noch nicht gebaut):**
2. Ebenen-Leiter (z-index-System 40/45/60/70/80 + benannte Leistenhöhen in
   `index.css`), ~60 Fundstellen umstellen; 3 Kollisionen auf `z-9999`
   (SpotlightTour, CookieConsentBanner, CockpitUnderway) brauchen eine
   bewusste Reihenfolge
3. 89 Tippflächen < 44px (Start: `WeekCalendarContent.tsx`, 7 Stück);
   doppeltes Meldungssystem (`ui/toaster` + `sonner`) auf eines reduzieren;
   `ui/popover.tsx` `bg-white` → Theme-Farbe
4. "Betreuung wieder aufnehmen" — Versprechen aus dem Bestätigungsdialog
   (`CustomerDetailModal.tsx:1115`) hat keinen Knopf; beendete Verknüpfungen
   fallen aus der Kundenliste (`Kunden.tsx:191-196`)
5. Playwright-Layoutprüfung (320/360/768px) fest ins Projekt + in CLAUDE.md

**Toter Code, bewusst nicht angefasst:** `SpeedDialFAB`, `HelpCenterFAB`,
`OnboardingAssistant`, `client/WhatsAppFAB`, `horse-detail/FeedbackFAB`,
`feedback/FeedbackWidget` werden nirgends gerendert.

## ✅ ERLEDIGT 27.07.2026 — Sicherheits-Fixes sind auf Prod

Begründungen je Punkt: `AUDIT_REPORT.md`, Phase 1A + 1B.

- ✅ **SQL-Migration** `20260727120000_close_anon_secdef_leaks.sql` von Pascal
  im Supabase-SQL-Editor ausgeführt ("Success, no rows returned"). Damit
  geschlossen: F-1 (Pferdedaten ohne Login), F-2 (Nutzerverzeichnis ohne
  Login), F-3 (Rollen-Enumeration), F-4 (`provider_id IS NULL`-Schlupfloch),
  F-14 (doppelte Guthaben-Gutschrift). Die 3 herrenlosen
  `feedbacks`-Zeilen wurden gelöscht (Entscheidung Pascal).
- ✅ `send-email` deployed (v27) — offenes Mail-Relay zu. Gegenprobe live:
  Freitext-Mail → `400 Missing or unknown template`.
- ✅ `send-invoice-email` deployed (v120) — Absender jetzt `info@hufmanager.de`
  statt `onboarding@resend.dev`.
- ✅ `copecart-webhook` deployed (v157) — unbekannte Produkt-ID vergibt keinen
  Pro-Zugang mehr, IPN-Passwort nicht mehr im Log und nicht mehr in
  `admin_revenue_log.raw_payload`. Gegenprobe: `401` ohne Passwort.
- ✅ `hash-password` deployed (v35) mit `verify_jwt = true`. Gegenprobe:
  `401 Missing authorization header`.
- ✅ `create-demo-stallbetreiber-user` gelöscht. Gegenprobe: `404`.

### ⚠️ Noch offen aus diesem Block

- ✅ **IPN-Passwort rotiert** (27.07.2026 abends): bei CopeCart geändert und
  als Supabase-Secret `COPECART_IPN_PASSWORD` neu gesetzt. Verifiziert: der
  Webhook antwortet auf ein falsches Passwort mit `401` — bei fehlendem
  Secret käme laut Code `500 Server configuration error`, das Secret ist also
  gesetzt und nicht leer. **Noch nicht verifiziert:** ob CopeCart und
  Supabase denselben Wert haben. Das zeigt erst ein echter Kauf oder ein
  Test-IPN aus dem CopeCart-Dashboard.
- **`hufiapp.de` bei Resend verifizieren** — nur `hufmanager.de` ist
  verifiziert, alle Mails gehen weiter von dort raus.
- **IPN-URL im CopeCart-Dashboard prüfen** (alle 4 Produkte). Ohne sie wird
  bezahlt, aber in der App passiert nichts.
- **Trial-Cron prüfen:** `SELECT jobname, schedule, active FROM cron.job;`
- `copecart.com/affiliate/hufmanager` ist 404 (verlinkt in
  `GeldVerdienen.tsx:25`, `Hufrente.tsx:336`) — richtige URL nötig.

## ✅ 28.07.2026 00:36 — CopeCart-Zahlungsweg funktioniert (erstmals verifiziert)

Fix deployed (v159) und mit einer **Testbestellung** über CopeCarts
Verkäufer-Testmodus ("Testbestellungen erlauben" am Produkt) verifiziert:
Bestell-ID `A6KN7eaf`, Produkt `0a0921ba`, 9,95 € netto / 11,84 € brutto.
Ergebnis: Signatur akzeptiert, `payment.made` erkannt, Konto steht in der
App auf "Profi Paket — Aktiv". Die Kette CopeCart → Webhook → Freischaltung
ist damit zum ersten Mal durchgängig.

**Testmodus-Guard verifiziert:** Abfrage auf `admin_revenue_log` und
`admin_invoices` der letzten 2 Stunden → "no rows returned". Die
Testbestellung hat also freigeschaltet, ohne eine erfundene Einnahme in die
Bücher zu schreiben. Buchhaltung sauber.

**Ebenfalls offen:** Fehler `42501 permission denied for table users`, in den
Logs zeitgleich mit der Bestellung (00:36:29). Herkunft ungeklärt — die App
fragt `auth.users` nirgends direkt ab, ein Zusammenhang mit der Migration von
heute ist nicht erkennbar, aber auch nicht ausgeschlossen. Braucht die
umliegenden Logzeilen.

## 🔴 ERLEDIGT 27.07.2026 — Der CopeCart-Webhook passte nicht zur echten IPN-Spec

Quelle: offizielle Doku `IPN_CopeCart_v_1.6.7_.pdf`
(https://s3.eu-central-1.amazonaws.com/shared.copecart.com/IPN_CopeCart_v_1.6.7_.pdf,
verlinkt aus dem Intercom-Artikel 9055020). Ausgewertet 27.07.2026.

**Befund: `supabase/functions/copecart-webhook/index.ts` kann eine echte
CopeCart-Benachrichtigung nicht verarbeiten. Kein Kauf wäre je in der App
angekommen.** Fünf unabhängige Fehler:

1. **Authentifizierung komplett falsch.** Der Code liest `payload.password /
   ipn_password / secret` aus dem Body. CopeCart schickt kein solches Feld,
   sondern eine **HMAC-SHA256-Signatur im Header `X-Copecart-Signature`**
   (Base64 von HMAC-SHA256 über den ROH-Body mit dem Shared Secret).
   → `receivedPassword` ist immer undefined → **jede echte IPN endet in 401.**
   Für den Fix: `await req.text()` statt `await req.json()`, sonst stimmt die
   Signatur über den re-serialisierten Body nicht.

2. **Event-Namen existieren nicht.** Der Code prüft auf `order_created`,
   `payment_completed`, `purchase`, `sale`, `subscription_cancelled` …
   CopeCart kennt nur: `payment.made`, `payment.trial`, `payment.failed`,
   `payment.pending`, `payment.refunded`, `payment.charged_back`,
   `payment.recurring.cancelled`, `payment.recurring.upcoming`.
   Der Feldname `event_type` stimmt immerhin. → Selbst mit korrekter Auth
   landet jeder Kauf im `default:`-Zweig ("Event type not handled").

3. **Betragsfeld falsch.** Code rät `amount ?? total ?? price`. Echt heißt es
   `line_item_amount` (bzw. `first_payment`,
   `transaction_amount_per_product[].amount`). → `parsedAmount = 0`, keine
   `admin_invoices`-Zeile, Umsatzlog mit 0 €. Damit ist auch F-16
   entscheidbar: der Betragsabgleich kann ein harter Guard werden statt nur
   einer Warnung.

4. **Käufername falsch.** Code sucht `customer.name / buyer.name / buyer_name`.
   Echt: `buyer_firstname` + `buyer_lastname`. (`buyer_email`, `product_id`,
   `order_id`, `transaction_id` stimmen dagegen.)

5. **Antwortformat falsch.** CopeCart wertet eine IPN nur als erfolgreich,
   wenn der Body exakt `OK` ist (Großbuchstaben, ohne Anführungszeichen).
   Der Webhook antwortet JSON. → CopeCart wiederholt **10× über 3 Stunden**.
   Die Doppelbuchungs-Absicherung aus der Migration (F-14) ist damit keine
   Vorsichtsmaßnahme, sondern Pflicht.

**Rechnungs-Zahlungen:** der Code liest das Kundenfeld als
`payload.custom / custom_field / metadata.custom`. CopeCart hat ein Feld
`metadata` (String, vom Verkäufer gesetzt) — `metadata.custom` greift ins
Leere. Beim Fix auf `payload.metadata` umstellen und im CopeCart-Produkt die
Rechnungs-UUID dort hinterlegen.

**Fix gebaut 27.07.2026, NICHT deployed** (liegt uncommittet in
`supabase/functions/copecart-webhook/index.ts`):
- Signaturprüfung über `X-Copecart-Signature` (HMAC-SHA256/Base64 über den
  ROH-Body, `req.text()` vor `JSON.parse`). Die Base64-HMAC-Berechnung wurde
  gegen die Ruby/PHP-Referenz aus der Doku gegengerechnet — identisch.
- Zentrale Listen `PAYMENT_EVENTS` / `CANCELLATION_EVENTS` / `FAILURE_EVENTS`
  mit den echten Namen; `switch` durch if/else ersetzt.
- Feldnamen: `buyer_email`, `buyer_firstname`+`buyer_lastname`, `order_id`
  (Abo-Kennung), `transaction_id` (Idempotenz), `line_item_amount`, `metadata`.
- Alle Erfolgsantworten über `okResponse()` → Body exakt `OK`.
- Betragsabgleich bei Rechnungs-Zahlungen ist jetzt ein echter Riegel.
- Bei ungültiger Signatur wird eine Diagnose geloggt, die NUR Header- und
  Feld-NAMEN enthält, keine Werte — damit lässt sich an einem einzigen echten
  Aufruf ablesen, ob die Zuordnung stimmt, ohne Käuferdaten zu protokollieren.

**Verifikation ohne Testkauf:** Die Doku listet bei `payment_method` den Wert
`test` "(for the vendor only)" und bei `payment_status` die Werte `test_paid`,
`test_trial`, `test_successed_refunded`. CopeCart hat also einen Testmodus für
den Verkäufer — damit lässt sich ein echter IPN-Aufruf ohne Geld auslösen.
Im CopeCart-Dashboard nach "Testkauf"/"Testzahlung"/"Testmodus" suchen.

**Achtung beim Deploy:** Ab diesem Deploy weist der Webhook alles ab, was
nicht korrekt signiert ist. Das Secret in Supabase (`COPECART_IPN_PASSWORD`)
MUSS identisch mit dem IPN-Secret bei CopeCart sein — vorher war es egal,
weil es ohnehin nie benutzt wurde.

---

## 🟡 Rechnungsversand + Betreuungsverhältnis — gebaut 27.07.2026, NICHT deployed

Frontend-Änderungen im Arbeitsverzeichnis, warten auf `./deploy.sh` (Pascal).

**Rechnungsversand** (`ClientInvoicesSection.tsx`, `ClientInvoices.tsx`)
- Es gab auf der Provider-Seite überhaupt keinen Weg, eine Rechnung zu
  verschicken — nur PDF ansehen/herunterladen. WhatsApp verschickte einen
  reinen Ankündigungstext ohne Rechnung.
- Neu: „Per E-Mail senden" (PDF im Anhang, Adress-Dialog mit Speichern beim
  Kunden) + „Per WhatsApp senden" über `navigator.share` mit der PDF-Datei
  (Muster aus `HufCamGalleryReport.tsx`, kein Bucket/kein Upload nötig).
- **Bug gefixt:** `ClientInvoices.tsx` rief `send-invoice-email` mit
  camelCase auf (`recipientEmail`), die Function liest snake_case
  (`recipient_email`) → der Versand ist seit jeher mit "Missing required
  fields" abgebrochen. Diese Funktion hat nie eine Mail verschickt.

**Betreuungsverhältnis** (`CustomerDetailModal.tsx`)
- **Kritisch war:** `delete_client_cascade` soft-löscht Profil UND Pferde der
  Kundin — ein Dienstleister löschte damit die Daten seines Kunden, auch bei
  echten registrierten Nutzern. Der Dialog nannte „Archivieren"/„Übergeben"
  als Alternativen, die es nicht gab.
- Neu: „Betreuung beenden" (kappt nur den eigenen access_grant, sagt
  zukünftige Termine ab, archiviert die Karteikarte — Profil und Pferde der
  Kundin bleiben unangetastet), „Pausieren/Fortsetzen" (`status='paused'`,
  Zugriff bleibt), und „Kunde löschen" ist bei `has_logged_in = true`
  gesperrt.
- **Noch offen (Schritt B):** Einwilligungs-Flow. Entscheidung Pascal:
  Mittelweg — Betreuung startet sofort mit Grunddaten (`can_view_basic`),
  Gesundheitsdaten (`can_view_medical`) erst nach Freigabe des Besitzers,
  Frist 7 Tage. Annahme mangels Vorgabe: nach Ablauf verfällt nur die
  Medical-Anfrage, die Betreuung läuft mit Grunddaten weiter.
  Ebenfalls offen: Betreuungs-Historie am Pferd („betreut von X von–bis"),
  Übergabe an Kollegen an `HorseTransferWizard` anschließen.
- Datenmodell kann das fast alles schon: `access_grants` hat `granted_at`,
  `revoked_at`, `status`, `valid_until`; `horse_partner_access` zusätzlich
  `owner_approved` + `owner_approved_at`. Keine neuen Tabellen nötig.
- **DB-seitiger Schutz fehlt noch:** `delete_client_cascade` selbst prüft
  nicht, ob der Client ein echter Nutzer ist. Die Sperre sitzt bisher nur im
  Frontend. Gehört in eine eigene Migration.

**Passwort-Reset kaputt** (offen, keine Codeänderung)
- Erst `403 otp_expired`, dann im Firefox „Beschädigter Inhalt" → der Token
  war beim zweiten Mal gültig, die Weiterleitung lief ins Leere.
- Geprüft und in Ordnung: Auslieferung von `hufiapp.de/reset-password`
  (nginx, gzip sauber), Supabase-Verify-Endpunkt, Site URL = `https://hufiapp.de`.
- **Nächster Schritt:** Authentication → URL Configuration → **Redirect URLs**
  prüfen, muss `https://hufiapp.de/**` enthalten.
- Falls das passt: Mail von Klick-Link auf 6-stelligen Code umstellen
  (Mailanbieter verbrauchen Einmal-Links beim Sicherheits-Scan).

---

## ⏸️ Keine neuen Features, bis Jan Buch antwortet

Mail ging am 27.07.2026 raus („Was hat dich aufhören lassen?"). Bis dahin nur
Sicherheit und offensichtlich Kaputtes. Hintergrund: 0 zahlende Kunden,
13 von 22 Providern waren nur am Registrierungstag da.

---

## Hey Hufi — zentraler Mic-State-Manager (useMicArbiter), gebaut (22.07.2026), wartet auf Gerätetest

**Update 22.07.2026:** `useMicArbiter` ist fertig gebaut und verkabelt —
`src/hooks/micArbiterCore.ts` (framework-unabhängige Kernlogik, Promise-Mutex,
Sicherheits-Timeouts) + `src/hooks/useMicArbiter.tsx` (React-Context-Wrapper,
Provider in `App.tsx`). `HeyHufi.tsx` und `useVoiceCapture.ts` laufen
vollständig über den Arbiter (`acquire`/`release`, echte `onend`-Bestätigung
statt Timing-Puffer). Consent-Gating (`USER_STORAGE_KEYS.HEY_HUFI`) ist
strukturell in den Arbiter gezogen (`canAcquire` in `useMicArbiter.tsx`) —
keine zweite Wahrheit mehr über einen Boolean-Prop in `MobileShell.tsx`.
Zusätzlich beim Bau gefunden und mitgefixt: der Wake-Word-Treffer in
`HeyHufi.tsx` rief bisher `recRef.current.stop()` roh auf (Kommentar "onend
will auto-restart") statt über den Arbiter freizugeben — das hätte
`useVoiceCapture`s `acquire("capture")` bis zum 6s-Sicherheits-Timeout
blockiert. Jetzt geht der Wake-Word→Aufnahme-Übergang komplett über
`stopRecognitionAndRelease()`. Ebenso ergänzt: `useVoiceCapture`s
Unmount-Cleanup gab das Mikrofon vorher nur roh frei, ohne den Arbiter zu
informieren.

**Test-Zugang (NICHT für alle Nutzer scharf):** `wakeWordEnabled` in
`featureFlags.ts` bleibt `false`. URL-Parameter `?wakeword=test` setzt
`initWakeWordTestOverride()` (aufgerufen in `main.tsx`, vor dem Render)
einen `sessionStorage`-Override — gilt nur für die aktuelle Browser-Session
(Tab schließen = weg), kein Effekt für andere Nutzer/Sessions.
`isWakeWordEnabled()` (statt der rohen Flag-Prüfung) wird jetzt überall
gelesen: `HeyHufi.tsx`, `MobileShell.tsx`, `KiSettingsCard.tsx`. Das
Consent-Gating im Arbiter (`canAcquire`) ist davon unabhängig — der
Test-Override schaltet nur den Pfad sichtbar/nutzbar frei, ersetzt aber
NICHT die aktive Zustimmung über den Toggle in den Einstellungen.

**Reaktivierung erst nach bestandenem Gerätetest** (echtes Android/ChromeOS,
Kollisionsverhalten reproduziert sich auf Desktop-Chrome nicht zuverlässig):
`wakeWordEnabled` in `featureFlags.ts` auf `true` setzen. Bis dahin: NICHT
scharf schalten.

---

**Ursprünglicher Befund (18.07.2026), zur Historie erhalten:** Hey Hufi
(Wake-Word, `HeyHufi.tsx`) war seit diesem Datum hinter
`featureFlags.ts` → `wakeWordEnabled` (default `false`) deaktiviert, weil
`webkitSpeechRecognition` (Wake-Word-Listener) und `MediaRecorder`
(eigentliche Sprachaufnahme, `useVoiceCapture.ts`) um dasselbe Mikrofon
konkurrieren — auf Chrome/Android/ChromeOS führt das zu Kollisionen
(Mic-Ping-Loop, im schlimmsten Fall ein React-Error-Boundary-Crash, da die
App-weite Boundary in `App.tsx` keine lokale Abgrenzung hatte — dafür gibt
es seit diesem Fix immerhin schon eine lokale `ErrorBoundary` NUR um
`<HeyHufi>` mit leerem Fallback, das mindert die Symptome, behebt aber
nicht die Ursache).

**Bisheriger Workaround (bleibt bestehen):** Fail-Counter in `HeyHufi.tsx`
(`MAX_CONSECUTIVE_FAILURES`), der eine *unendliche* Neustart-Schleife
verhindert. Verhindert aber nicht die eigentliche Kollision in den ersten
Sekunden nach dem Wake-Word.

**Kern-Learning für den richtigen Fix:** `SpeechRecognition.stop()` gibt
KEINE Fertigstellungs-Garantie — `onend` feuert irgendwann, aber ob die
Audio-Session auf OS-Ebene zu diesem Zeitpunkt wirklich freigegeben ist,
ist nicht beobachtbar. Ein reiner Timing-Puffer (z. B. "warte 500ms nach
onend, dann starte MediaRecorder") ist daher bestenfalls Symptom-Linderung,
keine Garantie. Es gibt aktuell KEINE zentrale Instanz, die weiß "wer hat
gerade das Mikrofon" — `HeyHufi` (eigener `recRef`/`runningRef`) und
`useVoiceCapture` (eigener `streamRef`/`recorderRef`) verwalten ihren
Zustand komplett unabhängig voneinander, nur lose über einen aus fünf
Booleans abgeleiteten `enabled`-Prop in `MobileShell.tsx` verbunden.

**Der eigentliche Fix (nicht jetzt, eigener Task):** Ein zentraler
`useMicArbiter`-Hook/Context, der Mikrofon-Zugriffe serialisiert: nur ein
Consumer darf gleichzeitig "das Mikrofon halten", Consumer melden sich
an/ab, Übergänge laufen über echte Promises mit Bestätigung statt über
verstreute Boolean-Kombinationen mit Zeitpuffer. Sollte auch das
Consent-Gating gleich mit übernehmen (ein Ort, der entscheidet "darf
gerade jemand lauschen"). Geschätzter Aufwand: knapp 1 Tag inkl. Testzeit
auf echtem Android/ChromeOS-Gerät (das Kollisionsverhalten lässt sich auf
Desktop-Chrome nicht zuverlässig reproduzieren).

**Reaktivierung, wenn `useMicArbiter` fertig ist:** `wakeWordEnabled` in
`featureFlags.ts` auf `true`. Die komplette Consent-Infrastruktur
(`KiSettingsCard.tsx`, `USER_STORAGE_KEYS.HEY_HUFI` in localStorage) ist
unverändert erhalten geblieben — bereits erteilte Zustimmungen bleiben
gespeichert und greifen sofort wieder, kein Re-Consent nötig. Der Toggle
in den Einstellungen zeigt bis dahin "Bald verfügbar" und ist eingefroren
(nicht klickbar), verändert aber den gespeicherten Consent-Wert nicht.

## Store-Fahrplan Schritt 3C — 🟡-Funde abgearbeitet (19.07.2026)

**Gefixt + verifiziert (Angriff-vorher/-nachher + Legit-Check), Migrationen in
`supabase/migrations/`:**
- Punkt 9, 10, 11 (IDOR-Funktionen `get_owner_horse_ids`, `get_user_organization`,
  `get_active_emergency_for_provider`, `get_hufi_voice_credits`,
  `get_storage_usage`, `sync_affiliate_stats`, `log_emergency_action`,
  `search_profiles_universal`, `search_profile_by_readable_id`): alle auf
  `auth.uid()`-Bezug umgestellt. `search_profiles_universal` hatte zusätzlich
  einen vorbestehenden, unabhängigen Bug (`p.plz` statt `p.zip_code` —
  Funktion schlug für ALLE Aufrufer fehl), mitgefixt.
  Migrationen: `20260718173742_fix_minor_idor_functions`,
  `20260718174039_fix_search_profiles_universal_column_bug` (Prod bereits
  vorher angewendet, lokale Dateien in dieser Session nachgezogen).
- **Punkt 13, erweitert (🔴-würdiger Zusatzfund):** Policy „Authenticated
  select global" auf `storage.objects` hatte KEINEN `bucket_id`-Filter
  (`USING (true)`) — dadurch konnte JEDER eingeloggte Nutzer Objekte in JEDEM
  privaten Bucket lesen/auflisten (horse-vault, verification-docs,
  admin-invoices, partner-documents, legal-documents, …), nicht nur
  `hufcam-images` wie im Audit dokumentiert. Live bewiesen: Nicht-Admin-
  Testnutzer konnte beide Objekte im `admin-invoices`-Bucket sehen. Policy
  entfernt, `hufcam-images` bekam eine eigentümer-gescopte Ersatz-Policy.
  Migration: `20260719090000_fix_storage_global_select_policy`.
  **Offen/vorgelegt:** `hufcam-images` ist weiterhin ein `public`-Bucket
  (Direkt-Download per bekanntem Pfad ohne Login möglich) — Bucket ist aktuell
  leer, kein Schreibpfad im Code gefunden. Ob der Bucket auf privat gestellt
  werden soll, muss Pascal entscheiden (echter Datenfluss-Change).
- Punkt 14 (`function_search_path_mutable`): `add_hufi_credits`,
  `set_agent_tasks_updated_at`, `update_ai_befunde_updated_at` bekamen
  `SET search_path TO 'public'` (`use_hufi_credit` war schon gefixt).
  Migration: `20260719091000_fix_search_path_mutable_functions`.
- Punkt 21 (Impressum-Überschrift „Umsatzsteuer-ID" bei tatsächlichem
  Steuernummer-Inhalt): Überschrift zu „Steuernummer" korrigiert, Hinweis
  ergänzt dass mangels USt-Pflicht keine USt-IdNr vorliegt.
- Punkt 17 (.env in Git): war bereits in einer vorherigen (abgebrochenen)
  Session aus dem Tracking entfernt + `.gitignore` ergänzt (unstaged Rest
  dieser Session gefunden, nicht neu gemacht). **Historien-Check ergänzt:**
  `.env` enthielt in BEIDEN historischen Commits (03.12.2025, 22.12.2025)
  ausschließlich `VITE_`-Variablen (Supabase-Projekt-ID, anon-Key, URL,
  VAPID-Public-Key) — keine Service-Role-/Resend-/CopeCart-/OpenAI-Keys,
  weder aktuell noch historisch. **Keine Rotation nötig.**
- Punkt 18 (WebsiteTrustBadges „Verifiziert"/„DSGVO Konform"): war bereits in
  der vorherigen Session behoben (Badges ohne echte Prüfung dahinter entfernt,
  nur noch daten-gestützte Badges: Bewertung, Aktiv-seit, Pferde-Anzahl).
  Uncommitted im Arbeitsverzeichnis gefunden, Pascal-Bestätigung ausstehend.

**Vorgelegt, nicht selbst entschieden (STOP-Regel):**
- Punkt 19 (ORS in Datenschutzerklärung fehlt): noch nicht umgesetzt, siehe
  Rückfrage an Pascal in der Session-Zusammenfassung.
- Punkt 20 (Verarbeitungsverzeichnis nur localStorage → Supabase): als eigener
  Schritt geparkt, zu groß für Quick-Win im Rahmen von 3C.

**Bewusst geparkt (Hygiene, kein akutes Risiko):**
- Punkt 12 (154 Funktionen pauschal `anon`-ausführbar): kein Big-Bang, bleibt
  offen für eine spätere, tabellenweise Session.
- Punkt 15 (`pg_net` im `public`-Schema): kosmetisch.
- Punkt 16 (`auth_leaked_password_protection` deaktiviert): reiner
  Dashboard-Schalter (Auth → Policies), kein Code-Fix — Pascal muss das
  manuell aktivieren.

## Store-Fahrplan Schritt 3 — Sicherheits-/Rechts-Audit (18.07.2026)

Vollständiger Audit gegen Supabase-Projekt `vnschgjxkzzwzefqlrji` (HufManager,
EU/Frankfurt — MCP-Standardprojekt `xsainjhyuhccavbleclj` ist das leere Staging,
NICHT verwenden, siehe `supabase-mcp-projekt-warnung`-Memory).

**Update 18.07.2026 (Schritt 3B):** Alle 8 🔴-Funde sind gefixt, per echtem
Angriff-vorher/-nachher + Legit-Check verifiziert (Details: HUFI_ROADMAP.md
Schritt 16). Markierungen unten aktualisiert. Die 🟡-Funde sind weiterhin
offen (bewusst nicht angefasst, siehe Roadmap Schritt 16 Schlussabsatz).

### 🔴 KRITISCH (Datenleck / Betrug / Abmahnung möglich)

1. **✅ GEFIXT (18.07.2026, Migration `20260718090000_...`).** War:
   **`get_partner_shared_data(p_partner_email)`** (SQL-Funktion, SECURITY DEFINER,
   ausführbar von `anon`): Kein `auth.uid()`-Check. Jeder — auch ohne Login —
   kann mit einer beliebigen E-Mail-Adresse alle `access_grants` dieses Partners
   abfragen: Provider-Name, Klienten-Name, `can_view_medical`-Flag, Status. Echter
   PII-Leak ohne Authentifizierung.
   **Fix-Vorschlag:** Funktion um `WHERE p_partner_email = auth_user_email()`
   ergänzen (Caller muss selbst der Partner sein) oder ganz auf `authenticated`
   beschränken + Ownership-Check.

2. **✅ GEFIXT (18.07.2026, Migration `20260718090000_...`).** War:
   **`get_provider_clients(_provider_id)`** (SECURITY DEFINER, `anon`+`authenticated`):
   Kein Auth-Check. Beliebige `_provider_id` liefert vollständige Kundenliste
   inkl. **E-Mail-Adressen** und Namen dieses Providers. Provider-IDs sind nicht
   geheim (z. B. aus Profil-URLs ableitbar).
   **Umgesetzt:** Provider selbst, Admin, oder Partner während aktiver
   Notfall-Situation (Rückfrage an Pascal beantwortet: "nur bei aktivem
   Notfall") — deckt den EmergencyDashboard-Partner-Flow ab.

3. **✅ GEFIXT (18.07.2026, Migration `20260718090000_...`).** War:
   **`admin_repair_user_role(p_user_id, p_new_role, p_admin_id, ...)`**: Prüft
   `is_admin(p_admin_id)` — aber `p_admin_id` ist ein vom Aufrufer frei wählbarer
   Parameter, nicht `auth.uid()`! Wer irgendeine Admin-UUID kennt (z. B. aus
   `admin_activity_log`-Einträgen), kann sich selbst oder jeden anderen User zu
   `provider`/`admin` machen. Klassischer Broken-Access-Control-Bug.
   **Umgesetzt:** `is_admin(p_admin_id)` → `is_admin(auth.uid())`. Zusätzlich
   beim Pentest gefunden und mitgefixt: `target_id`-Spalte in
   `admin_activity_log` ist `uuid`, Funktion castete `p_user_id::text` —
   das machte die Funktion auch für echte Admins kaputt (jeder Aufruf
   scheiterte am INSERT).

4. **✅ GEFIXT (18.07.2026, Migrationen `20260718091500_...` +
   `20260718091600_...`).** War: **`add_hufi_credits`, `add_purchased_voice_credits`** (SECURITY DEFINER,
   `anon`+`authenticated`, keine Auth-Prüfung): Jeder kann sich selbst (oder
   anderen) beliebige KI-/Voice-Guthaben gutschreiben — direkter Betrugsvektor
   gegen ein bezahltes Feature. Diese Funktionen sollten NUR vom
   `copecart-webhook` (service_role, server-seitig) aufgerufen werden, sind aber
   für normale Nutzer direkt callable.
   **Umgesetzt:** EXECUTE für PUBLIC/anon/authenticated entzogen, nur noch
   `service_role`. Achtung beim Nachbauen: Supabase grantet bei
   `CREATE FUNCTION` zusätzlich direkt an `anon`/`authenticated` (eigene
   ACL-Einträge, nicht nur PUBLIC) — ein reines `REVOKE ... FROM PUBLIC`
   reicht NICHT, alle drei Rollen müssen explizit genannt werden (erster
   Versuch scheiterte genau daran, zweiter Versuch behob es).

5. **✅ GEFIXT (18.07.2026, Migration `20260718091500_...`).** War:
   **`use_hufi_credit`, `consume_hufi_voice_credit`**: gleiches Muster ohne
   Auth-Check, aber umgekehrte Wirkung — jeder kann das Guthaben eines
   BELIEBIGEN anderen Nutzers (Parameter `p_user_id`) verbrauchen/leeren
   („Guthaben-Sabotage" gegen zahlende Kunden).
   **Umgesetzt:** `p_user_id`-Parameter bleibt in der Signatur (Frontend/
   hufi-tts übergeben ohnehin schon die eigene auth.uid()), die eigentliche
   Verbuchung nutzt aber intern `auth.uid()` statt des Parameters.

6. **✅ GEFIXT (18.07.2026, Migration `20260718093000_...`).** War:
   **`create_emergency_otp(_provider_id, _client_id)`** (SECURITY DEFINER,
   `anon`+`authenticated`, kein Auth-Check): Jeder kann für ein beliebiges
   Provider/Klient-Paar ein gültiges Notfall-OTP erzeugen und den Klartext-Code
   zurückbekommen. Falls dieses OTP an anderer Stelle Zugriff auf Klienten-/
   Pferdedaten ohne normalen Login gewährt (Notfall-Bypass), ist das ein voller
   Auth-Bypass. **Muss vor Fix zusammen mit der Redemption-Logik geprüft werden**
   — hier nur die fehlende Autorisierung beim Erzeugen dokumentiert.
   **Umgesetzt:** gleiche Autorisierung wie Fund 2 (Provider/Admin/Partner-
   im-Notfall). Beim Pentest zusätzlich entdeckt und mitgefixt: `SET
   search_path TO 'public'` schloss das `extensions`-Schema aus, in dem
   pgcrypto (`gen_salt`/`crypt`) lebt — die Funktion scheiterte deshalb
   VORHER schon für ALLE Aufrufer (auch legitime Provider) mit "function
   gen_salt(unknown) does not exist". War schon vor dieser Session kaputt.
   Bestätigt: es gibt keinen Einlöse-/Verifizierungspfad für das erzeugte
   OTP im Code (nur Anzeige zum Vorlesen per Telefon/SMS) — praktische
   Ausnutzbarkeit war dadurch schon vorher begrenzt.

7. **✅ GEFIXT (18.07.2026, Edge Function neu deployed).** War:
   **`check-overdue-invoices` Edge Function**: Der Auth-Guard ist toter Code —
   `if (!authHeader || !authHeader.includes("service_role")) { /* nur Kommentar,
   kein return */ }` — die Prüfung greift NIE, die Funktion läuft für JEDEN
   Aufruf durch und nutzt intern den Service-Role-Key (voller DB-Zugriff),
   verschickt Mahn-E-Mails an echte Kunden. Einzige Edge Function im Projekt mit
   diesem Bug (alle anderen `service_role`-only Functions vergleichen korrekt
   `token !== supabaseServiceKey`).
   **Umgesetzt:** echter Vergleich `token !== serviceKey` wie in
   `check-domain-waitlist`. **Separater Fund (kein Sicherheitsthema, bewusst
   nicht selbst entschieden):** `cron.job` geprüft — es gibt AKTUELL KEINEN
   Cron-Job, der diese Funktion aufruft. Das Mahnwesen (Zahlungserinnerung/
   1./2. Mahnung) läuft seit unbekannter Zeit nie automatisch, nur bei
   manuellem Aufruf. Falls das laufen soll: eigener `cron.job`-Eintrag nötig
   (Muster siehe andere `net.http_post`-Jobs in `cron.job`) — Pascal
   entscheidet Frequenz/ob überhaupt gewünscht.

8. **✅ GEFIXT (18.07.2026).** War:
   **Impressum: fehlender Link zur EU-Streitschlichtungsplattform (OS-Plattform,
   Art. 14 Abs. 1 ODR-VO)** — `src/pages/website/Impressum.tsx` enthält nur den
   VSBG-Opt-out-Satz ("nicht bereit... teilzunehmen"), aber keinen Link zu
   ec.europa.eu/consumers/odr. Das ist eine der am häufigsten abgemahnten
   Impressum-Lücken bei B2C-Online-Verkauf (CopeCart-Checkout).
   **Umgesetzt:** Pflicht-Satz + Link in `Impressum.tsx` ergänzt.

### 🟡 SOLLTE GEFIXT WERDEN

9. **`get_owner_horse_ids`, `get_user_role`, `get_user_organization`,
   `get_active_emergency_for_provider`, `get_hufi_voice_credits`,
   `get_storage_usage`, `increment_magic_link_uses`, `sync_affiliate_stats`**:
   SECURITY DEFINER ohne Auth-Check, Parameter frei wählbar. Geringere
   Sensitivität (Boolean/Zahl/IDs, keine Namen/Kontakt/Medizin), aber alle sind
   IDOR-Muster (Insecure Direct Object Reference). Empfehlung: bei Gelegenheit
   alle auf `auth.uid()`-Bezug umstellen, kein Big-Bang nötig.

10. **`search_profiles_universal` und `search_horse_by_readable_id` /
    `search_profile_by_readable_id`**: Die Namens-/PLZ-Suche filtert korrekt auf
    `is_discoverable = true`, aber die ID-Präfix-Suche (`#PID-...`) und die
    E-Mail-Suche in `search_profiles_universal` NICHT — wer eine ID errät oder
    eine E-Mail kennt, bekommt Name/Avatar/Rolle/PLZ auch für nicht-discoverable
    (private) Profile. Inkonsistent zu den anderen Zweigen der gleichen Funktion.
    **Fix-Vorschlag:** `AND is_discoverable = true` auch in ID- und
    E-Mail-Zweig ergänzen (ggf. mit Ausnahme für exakten Ownership-Match).

11. **`log_emergency_action(_actor_id, ...)`**: Kein Check, dass `_actor_id =
    auth.uid()` — jeder kann Audit-Log-Einträge im Namen eines anderen Users
    fälschen. Kein Datenleck, aber untergräbt die Beweiskraft des
    Notfall-Audit-Logs. Fix: `_actor_id` intern auf `auth.uid()` erzwingen.

12. **154 SECURITY-DEFINER-Funktionen sind für `anon` UND `authenticated`
    ausführbar** (Supabase-Security-Advisor, `anon_security_definer_function_
    executable` / `authenticated_security_definer_function_executable`). Die
    meisten sind harmlose Trigger- oder Boolean-Helper-Funktionen (siehe oben),
    aber die pauschale `anon`-Grant-Praxis ist Supabase-Default-Verhalten, nicht
    bewusste Entscheidung. Fix-Vorschlag: schrittweise `REVOKE EXECUTE ... FROM
    anon` für alle reinen Trigger-Funktionen (die ohnehin nie direkt aufrufbar
    funktionieren) und alle Funktionen, die nicht bewusst als öffentliches RPC
    gedacht sind — kein Big-Bang, tabellenweise mit Tests.

13. **Storage-Bucket `hufcam-images`**: Policy "Authenticated select global"
    erlaubt JEDEM eingeloggten Nutzer, den kompletten Bucket zu listen — nicht
    nur eigene Huf-Fotos. `blog-images`/`gallery`/`logos` sind unkritisch (ohnehin
    öffentliches Marketing-Material), `hufcam-images` enthält aber
    Kunden-/Pferdefotos verschiedener Provider-Accounts.
    **Fix-Vorschlag:** Bucket-Policy auf pfadbasierten Zugriff umstellen (z. B.
    `storage.foldername(name) = auth.uid()::text` analog zu anderen privaten
    Buckets), globale "select all" Policy entfernen.

14. **`function_search_path_mutable`** bei 4 Funktionen
    (`update_ai_befunde_updated_at`, `set_agent_tasks_updated_at`,
    `add_hufi_credits`, `use_hufi_credit`) — kein `SET search_path`, theoretisches
    Schema-Hijacking-Risiko. Fix: `SET search_path = public` ergänzen (bei
    `add_hufi_credits`/`use_hufi_credit` ohnehin im selben Zug wie Fund #4/#5 zu
    beheben).

15. **`extension_in_public`**: `pg_net` liegt im `public`-Schema statt in einem
    eigenen Extension-Schema. Kosmetisch/Hygiene, kein akutes Risiko.

16. **`auth_leaked_password_protection` deaktiviert**: Supabase Auth prüft
    Passwörter aktuell NICHT gegen HaveIBeenPwned. Fix: in Supabase
    Dashboard/Auth-Settings aktivieren (kein Code-Fix, Konfigurationsschalter).

17. **`.env` ist von Git getrackt** (`git ls-files` zeigt `.env`). Inhalt selbst
    ist unkritisch (nur `VITE_`-Variablen: Supabase-Projekt-ID, ANON-Key, URL,
    VAPID Public Key — alles ohnehin im Frontend-Bundle sichtbar), aber
    schlechte Praxis: `.gitignore` hat KEINEN `.env`-Eintrag, Risiko dass später
    versehentlich ein echtes Secret in dieselbe Datei rutscht und mitgecommittet
    wird. Fix: `.env` zu `.gitignore` hinzufügen, `git rm --cached .env`.

18. **`WebsiteTrustBadges.tsx`**: zeigt unconditional (nicht an echte Prüfung
    gekoppelt) die Badges "Verifiziert" (Hufi) und "DSGVO Konform" auf JEDER
    Provider-Landingpage — unabhängig davon, ob eine echte Verifizierung
    stattgefunden hat. Potenziell irreführende Werbung (§5 UWG), da eine
    Prüfung suggeriert wird, die pauschal für alle gilt.
    **Fix-Vorschlag:** "Verifiziert"-Badge an ein echtes Verifizierungs-Flag
    koppeln (nur anzeigen wenn tatsächlich geprüft) oder entfernen; "DSGVO
    Konform"-Badge entfernen oder durch neutralere Formulierung ersetzen (die
    eigene Rechtskonformität sollte nicht als Werbe-Badge für Dritte auf deren
    Kundenseite auftauchen).

19. **Datenschutzerklärung: OpenRouteService (ORS) nicht gelistet.** Die Edge
    Function `get-route` sendet Tour-Stopp-Koordinaten (Kundenadressen) an
    `api.openrouteservice.org` zur Routenoptimierung — dieser Auftragsverarbeiter
    fehlt in `src/pages/website/Datenschutz.tsx` (im Gegensatz zu wttr.in,
    Nominatim/OSM und Tankerkönig, die alle sauber gelistet sind). Bereits in
    einer früheren Session als offen vermerkt (`hufi-inventur-20260614`), noch
    nicht behoben.
    **Fix-Vorschlag:** Absatz analog zu Nominatim/wttr.in ergänzen (Anbieter,
    verarbeitete Daten = Adressen/Koordinaten, Zweck, Rechtsgrundlage).

20. **DSGVO-Verarbeitungsverzeichnis (Art. 30) nur in localStorage** (bestätigt,
    Datei `src/pages/admin/Verarbeitungsverzeichnis.tsx`, hartcodiertes
    `DEFAULT_ENTRIES`-Array als Start, kein Supabase-Persistenz). Kein
    Kunden-Datenleck (nur admin-intern), aber: keine Backups, kein
    geräteübergreifender Zugriff, Verlust bei Cache-Löschung — riskant für ein
    Dokument, das bei einer Datenschutz-Prüfung vorgelegt werden muss.
    **Fix-Vorschlag:** In eigene Supabase-Tabelle migrieren (admin-only RLS).

21. **Impressum-Abschnitt "Umsatzsteuer-ID" listet tatsächlich eine
    Steuernummer** (nicht die USt-IdNr, andere Nummer/Format). Bei
    Kleinunternehmer-Status (§19 UStG) rechtlich meist ausreichend/korrekt, aber
    die Überschrift ist irreführend benannt. Fix: Überschrift zu "Steuernummer"
    ändern oder Hinweis ergänzen, dass gemäß §19 UStG keine USt-IdNr vorliegt.

### 🟢 IN ORDNUNG (geprüft, keine Aktion nötig)

- **RLS-Grundstatus**: alle 286 Tabellen im `public`-Schema haben RLS aktiviert
  (0 mit deaktiviertem RLS). Kein `USING (true)` auf INSERT/UPDATE/DELETE
  irgendwo; die 10 gefundenen `USING (true)`-SELECT-Policies betreffen
  ausschließlich unkritische Referenz-/Katalogdaten (`equine_ontology`,
  `got_positions`, `help_articles`, `ecosystem_apps`, `email_signup_forms`,
  `equine_clinics`, `botschafter_updates`, `pferdeakte_community_milestones`,
  `review_reactions`, `system_settings` — letzteres geprüft: enthält nur
  App-Versions-/Wartungsmodus-Flags, keine Secrets).
- **Kern-Tabellen mit Personendaten geprüft** (`profiles`, `horses`,
  `appointments`, `invoices`, `messages`, `employee_profiles`, `access_grants`,
  `contacts`, `user_roles`, `client_connections`, `horse_medications`,
  `horse_documents`, `partner_business_settings`, `business_settings`,
  `vault_documents`): alle Policies durchgängig an `auth.uid()` über
  Owner-/Provider-/Client-Spalte oder `access_grants`/`employee_profiles`-Joins
  gebunden. Kein Cross-Account-Leck gefunden.
  `get_horse_medical_data`, `get_admin_auth_metadata`, `get_agent_data_hub`,
  `delete_client_cascade`, `delete_employee_account`, `delete_horse_safe`,
  `delete_provider_cascade` (alle SECURITY DEFINER): korrekt auf `auth.uid()`
  plus Berechtigungsprüfung gebunden.
- **Alle `get_public_*`-Funktionen** (Landingpage/FAQ/Reviews/Offers/Services):
  korrekt auf `is_active`/`is_approved`/`is_visible`/`public_profile_visible`
  gescoped — bewusst öffentliche Marketing-Daten, kein Leck.
- **Secrets im Frontend-Bundle**: Build geprüft (`VITE_APP_FLAVOR=hufiapp npm
  run build`), `dist/` durchsucht — kein `service_role`-String, kein
  Drittanbieter-API-Key gefunden. Der einzige JWT im Bundle ist korrekt der
  `anon`-Key (Payload-Check: `role: anon`, `ref: vnschgjxkzzwzefqlrji`). Alle
  Edge Functions lesen Secrets ausschließlich über `Deno.env.get(...)` (75
  Dateien), keine hartcodierten Keys im Quellcode gefunden.
- **Account-Löschung (Art. 17)**: `delete-my-account` Edge Function ist echt —
  prüft JWT über Anon-Client, löscht danach mit Service-Role explizit alle
  bekannten personenbezogenen Datensätze (nicht nur Cascade-Delete). Kein
  Fake.
- **Datenexport (Art. 15)**: `data-export` Edge Function ist echt — validiert
  JWT, exportiert Daten des authentifizierten Users. Kein Fake.
- **Fake-Testimonials/UWG (Schritt 2 gegengeprüft)**: `TestimonialsSection.tsx`
  zeigt ehrlich "Bald teilen hier echte Nutzer ihre Erfahrungen" statt
  erfundener Zitate. Kontaktformular-Fake (PartnerPublicProfile) und
  Steuerberater-Fake-Link (SteuerberaterAccess) aus Schritt 2 bestätigt
  entfernt (kein Treffer mehr im Code). Keine erfundenen Nutzerzahlen
  ("500+ zufriedene Nutzer" o. ä.) auf Landingpages gefunden. Echte
  Review-Widgets (`ReviewsCarousel`/`ReviewsGrid`/`ReviewsMarquee`) sind
  daten-/prop-gesteuert, keine hartcodierten Fake-Reviews.
  `vet-pms-connect` (OAuth) ist bereits ehrlich "kommt in Kürze" gelabelt.
- **Datenschutzerklärung ist ansonsten sehr vollständig**: Supabase (mit
  AVV+SCC-Hinweis), Anthropic/Claude, Google Fonts, CopeCart, Whisper/Piper/
  Ollama (korrekt als self-hosted markiert), ElevenLabs (mit SCC-Hinweis),
  wttr.in, OpenStreetMap/Nominatim, Tankerkönig, Resend — alle mit Anbieter,
  verarbeiteten Daten, Zweck und Rechtsgrundlage gelistet. Nur ORS fehlt
  (siehe 🟡 #19).
- **Impressum ansonsten vollständig nach §5 DDG**: Name, Anschrift, Telefon,
  E-Mail, Steuernummer + §19-UStG-Hinweis, Gewerbeerlaubnis-Behörde,
  redaktionell Verantwortlicher, VSBG-Opt-out. Nur ODR-Link fehlt (🔴 #8).

### Zusammenfassung
- **RLS/Tabellen:** 286 gesamt · 0 mit deaktiviertem RLS · Kern-Tabellen mit
  Personendaten alle 🟢 · 6 SECURITY-DEFINER-Funktionen 🔴 (davon 3 echte
  Datenlecks, 2 Guthaben-Betrug/-Sabotage, 1 Rollen-Eskalation) · 1 Edge
  Function 🔴 (toter Auth-Check) · ~10 Funktionen 🟡 (IDOR-Muster, geringe
  Sensitivität) · 154 Funktionen pauschal `anon`-ausführbar (🟡 Hygiene) · 1
  Storage-Bucket 🟡 (`hufcam-images` global listbar).
- **Secrets:** 🟢 sauber — kein Service-Role-Key, kein Drittanbieter-Key im
  Bundle oder Quellcode. Einziger Nebenbefund: `.env` fälschlich in Git (🟡,
  Inhalt selbst unkritisch).
- **UWG:** 🟢 keine Fake-Testimonials/erfundenen Zahlen gefunden (Schritt-2-
  Fixes bestätigt). 1 🟡-Fund: pauschale "Verifiziert"/"DSGVO Konform"-Badges
  ohne echte Prüfung dahinter.
- **Impressum/Datenschutz:** 1 🔴 (fehlender ODR-Link im Impressum — häufigster
  Abmahn-Trigger überhaupt), 1 🟡 (ORS-Prozessor in Datenschutzerklärung
  fehlt), ansonsten beide Dokumente ungewöhnlich vollständig für einen
  Solo-Founder. Art. 15/17 (Export/Löschung) beide echt implementiert, kein
  Fake. Art. 30-Verzeichnis technisch vorhanden aber nur lokal persistiert (🟡).

**NICHTS wurde in diesem Schritt geändert** — RLS-Policies, Funktionen und
Rechtstexte sind unangetastet. Fix-Priorisierung und Umsetzung folgen in
Schritt 3B, sobald Pascal die 🔴/🟡-Liste gesichtet hat.

## Aus UI-Cleanup Phase 2 (17.07.2026) übrig geblieben

### 1. Kommunikationsmodus nicht verkabelt
`communication_mode` (WhatsApp vs. Hufi-Chat, gesetzt über
CommunicationModeSelector in /management/kommunikation) wird gespeichert,
aber von keiner Backend-Logik gelesen. Es gibt aktuell keine automatisierte
Nachricht (Erinnerung, Terminbestätigung o.ä.), die sich nach diesem Feld
richtet. Entweder:
- verkabeln (z.B. Terminerinnerungen/Broadcasts prüfen `communication_mode`
  und routen entsprechend), oder
- als reine Kontaktangabe umlabeln, damit UI keine falsche Erwartung weckt.

### 2. DesktopBigCalendarView (Wochenraster) technisch/überladen
Die react-big-calendar-basierte Wochenansicht (Tablet/Desktop, >768px)
wirkt laut User-Feedback "technisch" mit vielen übereinandergestapelten
Terminblöcken. Mobile Default wurde bereits auf Tagesansicht umgestellt
(siehe HUFI_ROADMAP.md Schritt 11), aber ein echtes visuelles Redesign der
Desktop-Wochenansicht selbst (Kartenoptik statt reiner react-big-calendar-
Blöcke) wurde NICHT gemacht — kein Quick-Win, eher eigener Task.

### 3. Ursache des ursprünglichen "Etwas ist schiefgelaufen"-Crashs
Ein konkreter Fall wurde gefunden und gefixt: ImportCenter.tsx rief
`useAuth()` ohne Import auf (ReferenceError). Es ist nicht sicher belegt,
ob das der EINZIGE Auslöser des vom User beobachteten Crashes war — falls
der schwarze/weiße Fehlerscreen weiterhin bei anderen Aktionen auftritt,
bitte die genaue Aktion + Browser-Konsole (jetzt macht ErrorBoundary schon
`console.error` mit Komponenten-Stack) mitschicken, damit der nächste Fall
gezielt reproduzierbar ist.

### 4. Instagram-Launch-Post (aus HUFI_ROADMAP.md Schritt 9, weiterhin offen)
Handle-Wechsel @derhufmanager + Ankündigungs-Post noch nicht gemacht.

## Aus App-Struktur-Map (18.07.2026) übrig geblieben

### 5. Hufi-Support-Layer auf appMap.ts noch nicht angeschlossen
`src/config/appMap.ts` (247 Einträge, Reifegrad + keywords + zweck + route pro
Eintrag) existiert und ist gepflegt, aber es gibt noch KEINEN Such-/Antwort-Layer,
der sie zur Laufzeit abfragt. Zu bauen: Nutzer sagt/tippt ein Ziel ("wie kündige
ich"), ein Matching gegen `keywords[]` findet den passenden Eintrag, Hufi antwortet
mit Text + klickbarem Deeplink zur `route`. WICHTIG beim Bau: dieser Pfad muss
technisch keine TTS-Ausgabe auslösen (nicht nur "spricht standardmäßig nicht") —
bei aktivem Voice-Loop würde sonst jede Support-Frage das 10-Min-Voice-Guthaben
auffressen.

### 6. ✅ ERLEDIGT (18.07.2026): Mitarbeiter-Einladungslink führte ins Leere
Route `/employee-invite` fehlte in `src/App.tsx`. Import + `<Route
path="/employee-invite" element={<EmployeeInvite />} />` ergänzt, Query-Param
`token` gegen `send-employee-invitation` verifiziert (übereinstimmend). Der
seit 29.06.2026 bekannte "Employee-404"-Blocker ist damit behoben. appMap.ts
entsprechend auf `reife: "live"` aktualisiert.

Zusätzlich geprüft (CopeCart-Checkout-URLs, Store-Fahrplan Schritt 1 Fix 2):
Vermuteter 404 bei Abo-/Guthaben-Checkout-Links (`AboSettings.tsx`,
`ManagementGuthaben.tsx`, `PricingModal.tsx`, `UpgradeModal.tsx`,
`ProGateDialog.tsx`, `ClientAppUpgradeModal.tsx`) konnte NICHT reproduziert
werden — automatisierter Check zeigte gültige CopeCart-Checkout-Seiten
(kein 404), Produkt-IDs vom User als korrekt bestätigt. Kein Codeeingriff
nötig, kein neuer Blocker.

### 7. ✅ ERLEDIGT (18.07.2026, Store-Fahrplan Schritt 2): Tote UI-Links auf nicht existierende Routen
`/angebote`, `/autoflow`, `/blog`, `/status`, `/vertrauen`, `/hufi/faq`,
`/hufanalyse`, `/faq`, `/hilfe` entfernt bzw. auf existierende Ziele korrigiert
(`/support`, `/work-mode`, `/mein-angebot`). `/partner-management/botschafter`
und `/partner-management/{oeffentlich, kommunikation, rechtliches}`: Buttons
aus PartnerManagementHub/BusinessHub entfernt, hinter Feature-Flag
`partnerManagementExtras` geparkt. `/portal/galerie` und `/portal/bewerben`:
Teil des kompletten Portal-Whitelabel-Produkts, jetzt hinter Feature-Flag
`portalWhiteLabel` versteckt (siehe Punkt 8) — beide Routen bleiben technisch
unregistriert (nur über feste Demo-E-Mails erreichbar, kein Kundenrisiko),
nicht separat gefixt. Details: HUFI_ROADMAP.md Schritt 15.

### 8. ✅ ENTSCHIEDEN (18.07.2026, Pascal): Botschafter-Dashboard-Rolle, Stallbetreiber-Rolle und Portal-Whitelabel-Produkt = Zukunft
Alle drei Cluster sind geplante Features (nicht "nie"), aber noch nicht fertig.
Entscheidung: hinter `src/config/featureFlags.ts` verstecken statt fertigbauen
oder löschen (Store-Fahrplan Schritt 2). Code bleibt vollständig erhalten,
Flags stehen auf `enabled: false`. Nicht verwechseln mit `/botschafter/login`,
`/botschafter/warten` und `/ref/:code` — die SIND live und erreichbar und sind
nicht Teil des Flags. Beim Fertigstellen: Flag auf `true`, appMap.ts-Reifegrad
entsprechend auf `live` aktualisieren.

## Offen nach Session 27.07.2026 — Sicherheit + Nutzungs-Realität

**Warten auf Jan Buch (27.07.2026):** Mail an janhbuch@web.de raus, eine Frage:
"Was hat dich aufhören lassen?". Er hatte am 10.06. an einem Tag 6 Pferde und
26 Termine eingetragen und ist nie wiedergekommen. 13 von 22 Providern haben
Registrierungsdatum = letzter Login — der Abbruch passiert am ersten Tag.
**Vor der Antwort keine neuen Features bauen.**

**RLS-Audit Prod abgeschlossen, nichts gefixt** (siehe `AUDIT_REPORT.md`,
"Phase 1A: RLS Prod"). Alles wartet auf Pascals Freigabe, nach Priorität:
1. `search_horse_by_readable_id` — ohne Login abrufbar, gibt Pferdename +
   owner_id heraus. Auth-Prüfung ergänzen, EXECUTE für anon entziehen.
2. `search_profiles_universal`, `search_profile_by_readable_id`,
   `get_user_role`, `is_admin` — EXECUTE für anon entziehen.
   Fachlich zu klären: Ist das öffentliche Profilverzeichnis gewollt?
   `is_discoverable` steht per Spalten-Default auf true (72 von 72).
3. `OR (provider_id IS NULL)` aus UPDATE/DELETE von `services`, `offers`,
   `feedbacks` entfernen. Vorher die 3 verwaisten `feedbacks`-Zeilen zuordnen.
4. `OR (provider_id IS NULL)` aus dem `invoices`-INSERT-CHECK entfernen.
5. `profiles`-INSERT-Policy um Zeilenbezug ergänzen (created_by_provider_id).

**Trial-Automatik läuft nicht:** 12 von 13 abgelaufenen Trials stehen weiter
auf `trialing`, ältester seit 31.12.2025. Kein Kaufmoment für niemanden.

**`.claude/settings.local.json`:** enthielt im Klartext das DB-Passwort und
einen Supabase-Management-Token. Datei ist gitignored und war nie in Git.
Aufgeräumt am 28.07.2026: die Regeln mit Geheimnissen ersatzlos gestrichen
(CLI und psql lesen ihre Zugangsdaten selbst aus `~/.supabase/access-token`
bzw. `~/.pgpass`). Passwort und alle fünf gefundenen Token werden von Pascal
im Dashboard neu vergeben. Keine Zugangsdaten mehr in dieser Datei.

**Claude-Code-Konfiguration neu angelegt** (27.07.2026): `CLAUDE.md`,
`.claude/settings.json` (Permissions + Hook), `.claude/commands/audit-rls.md`,
`.claude/agents/auditor.md`, `.claude/hooks/block-prod-write.sh` (getestet:
blockiert Schreib-SQL gegen Prod und Secret-Zugriffe). Noch offen: die
Commands `audit-daten.md`, `audit-luecken.md`, `audit-code.md` — dafür fehlen
die Phasen-Prompts.
