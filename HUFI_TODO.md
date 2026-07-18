# HUFI_TODO.md

Offene Punkte aus laufenden Sessions. Nächste Session: zuerst hier lesen.

## Hey Hufi — zentraler Mic-State-Manager (useMicArbiter), geparkt (18.07.2026)

**Kontext:** Hey Hufi (Wake-Word, `HeyHufi.tsx`) ist seit diesem Datum hinter
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
