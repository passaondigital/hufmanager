# AUDIT_REPORT

## Phase 1A: RLS Prod

**Projekt:** `vnschgjxkzzwzefqlrji` (HufManager, Prod, eu-central-1)
**Datum:** 27.07.2026
**Methode:** Nur-Lese-Abfragen über die Supabase Management API
(`POST /v1/projects/{ref}/database/query` mit `read_only: true` — die
Verbindung war transaktional schreibgeschützt, ein Negativtest mit
`CREATE TABLE` wurde von Postgres mit
`cannot execute CREATE TABLE in a read-only transaction` abgelehnt).
Zusätzlich Live-Verifikation einzelner Befunde über die öffentliche REST-API
mit dem anon-Key (nur `SELECT`/`RPC`-Lesezugriffe, keine Schreibvorgänge).

**Es wurde nichts geändert.** Alle Handlungsvorschläge stehen als Empfehlung
am Ende und warten auf Freigabe.

### Gesamtbild

| Kennzahl | Wert |
|---|---|
| Tabellen in `public` | 286 |
| davon RLS aktiv | **286 (100 %)** |
| davon RLS aktiv, aber ohne jede Policy | **0** |
| Policies gesamt | 739 |
| Views / Materialized Views | 11 / 0 — **alle mit `security_invoker=on`** |
| SECURITY DEFINER Funktionen | 154 — **alle mit gepinntem `search_path`** |

Die Grundlage ist solide: keine Tabelle ohne RLS, keine Tabelle, die durch
fehlende Policies unerreichbar wäre, kein View, der RLS umgeht, keine
SECDEF-Funktion mit beweglichem `search_path`. Die gefundenen Lücken liegen
**nicht** in den Tabellen-Policies, sondern durchweg in
`SECURITY DEFINER`-Funktionen, die ohne Auth-Prüfung für `anon` ausführbar
sind — also an RLS vorbei.

### Mandantentrennung je Datentabelle

Sortiert nach Risiko.

| Tabelle | RLS | Policies | Mandantentrennung | Schweregrad |
|---|---|---|---|---|
| `horses` | an | 7 | **NEIN — über RPC umgehbar** (F-1) | **Hoch** |
| `profiles` | an | 15 | **NEIN — Verzeichnis öffentlich** (F-2, F-3) | **Hoch** |
| `feedbacks` | an | 4 | **NEIN — bei `provider_id IS NULL`** (F-4) | Mittel |
| `services` | an | 5 | NEIN bei `provider_id IS NULL` (F-4, aktuell 0 Zeilen) | Mittel |
| `offers` | an | 4 | NEIN bei `provider_id IS NULL` (F-4, aktuell 0 Zeilen) | Mittel |
| `appointments` | an | 11 | JA | — |
| `invoices` | an | 6 | JA (Lesepfad; Schreibpfad siehe F-6) | Niedrig |
| `invoice_items` | an | 1 | JA | — |
| `contacts` | an | 3 | JA | — |
| `conversations` | an | 4 | JA | — |
| `messages` | an | 4 | JA | — |
| `vault_documents` | an | 5 | JA | — |
| `vault_access_log` | an | 3 | JA | — |
| `partner_documents` | an | 3 | JA | — |
| `partner_treatment_notes` | an | 4 | JA | — |
| `hoof_entries` | an | 9 | JA | — |
| `horse_vaccinations` | an | 4 | JA | — |
| `horse_deworming` | an | 4 | JA | — |
| `horse_transfers` | an | 3 | JA | — |
| `horse_status_reports` | an | 2 | JA | — |
| `horse_partner_access` | an | 9 | JA | — |
| `horse_audit_log` | an | 3 | JA | — |
| `client_locations` | an | 3 | JA | — |
| `client_verification_documents` | an | 3 | JA | — |
| `business_settings` | an | 9 | JA | — |
| `expenses` | an | 4 | JA | — |
| `consent_log` | an | 3 | JA | — |
| `access_grants` | an | 12 | JA | — |
| `admin_invoices` / `admin_expenses` / `admin_notes` / `account_notes` | an | 1–2 | JA (bewusst nur Admin) | — |

Die Spalte „Mandantentrennung" beantwortet ausschließlich die Frage
**„Kann Provider A die Daten von Provider B sehen?"**. „JA" heißt: Trennung
greift. „NEIN" heißt: es existiert ein belegter Weg vorbei.

---

## Befunde im Detail

### F-1 — `search_horse_by_readable_id`: Pferdedaten ohne Login abrufbar

**Schweregrad: Hoch. Live gegen Prod verifiziert.**

Die Funktion ist `SECURITY DEFINER`, hat **keinerlei** Auth-Prüfung im Body
und ist für die Rolle `anon` ausführbar. Sie umgeht damit sämtliche
`horses`-Policies.

```sql
CREATE OR REPLACE FUNCTION public.search_horse_by_readable_id(search_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
...
  SELECT jsonb_build_object(
    'found', true, 'id', h.id, 'readable_id', h.readable_id,
    'name', h.name, 'photo_url', h.photo_url, 'breed', h.breed,
    'owner_id', h.owner_id )
  INTO result
  FROM public.horses h
  WHERE h.readable_id = clean_id AND h.deleted_at IS NULL;
$function$
```

Es gibt keine Prüfung auf `auth.uid()` und — anders als beim
Profil-Gegenstück — auch **kein `is_discoverable`-Flag**.

**Beleg (vollständig unauthentifiziert, nur anon-Key, kein Login):**

```
EQID-800144 -> {"id": "3ea17bc6-…", "name": "Sunny",  "found": true, "owner_id": "00787f97-…"}
EQID-262071 -> {"id": "a0272515-…", "name": "Fury K", "found": true, "owner_id": "925d0b2a-…"}
EQID-495547 -> {"id": "edd3cdcd-…", "name": "Anton",  "found": true, "owner_id": "f0016827-…"}
```

Zum Vergleich: der direkte Tabellenzugriff `GET /rest/v1/horses` liefert als
anon korrekt `[]`. Die RLS hält — die Funktion geht daran vorbei.

**Erratbarkeit:** Das Format ist `EQID-` + 6 Ziffern, also 1.000.000
Kombinationen bei aktuell 44 lebenden Pferden. Vollständiges Durchprobieren
ist aufwendig, aber weder theoretisch noch teuer; eine gezielte Abfrage bei
bekannter ID (z. B. aus einem geteilten Screenshot oder QR-Code) ist trivial.

**Verkettung mit F-2:** Die zurückgegebene `owner_id` ist für sich genommen
eine UUID. In Kombination mit F-2 (das komplette Profilverzeichnis inkl. `id`
ist anon abrufbar) lässt sich daraus lokal
„Pferd *Sunny* gehört *[Klarname]*, PLZ *[…]*" rekonstruieren. Damit ist es ein
Personenbezug im Sinne der DSGVO, nicht nur ein Pferdename.

### F-2 — `search_profiles_universal` / `search_profile_by_readable_id`: komplettes Nutzerverzeichnis ohne Login

**Schweregrad: Hoch. Live gegen Prod verifiziert.**

Beide Funktionen sind `SECURITY DEFINER`, für `anon` ausführbar und prüfen
`auth.uid()` **nicht**. Als einziges Gate dient `p.is_discoverable = true`.

Das Gate ist wirkungslos, weil das Flag standardmäßig gesetzt ist:

```
profiles: is_discoverable = true bei 72 von 72   (column_default = true)
```

Es haben also **alle** Profile das Flag — nicht, weil sich jemand dafür
entschieden hätte, sondern weil es der Spalten-Default ist. Ein Opt-in, das
nie jemand aktiv gesetzt hat, ist kein Opt-in.

**Beleg (ohne Login, anon-Key, Suchbegriff `"er"`):**

```
Treffer: 25
Felder: id, readable_id, name, avatar_url, role, postal_code, specialty, result_type
```

Der `ELSE`-Zweig der Funktion sucht mit
`p.full_name ILIKE '%' || clean_term || '%'` bereits ab 2 Zeichen Suchbegriff.
Mit einer Handvoll gängiger Buchstabenpaare lässt sich das Verzeichnis
praktisch vollständig abziehen — Klarname, PLZ, Rolle und interne UUID jedes
Nutzers, **auch der Kunden (Pferdebesitzer)**, nicht nur der Dienstleister.

Der `@`-Zweig durchsucht zusätzlich `auth.users.email` per `ILIKE`. Die
E-Mail wird zwar nicht ausgegeben, aber sie ist damit **orakelbar**: Wer eine
E-Mail-Adresse vermutet, bekommt bei Treffer das zugehörige Profil zurück und
hat die Adresse damit bestätigt.

### F-3 — `get_user_role` / `is_admin`: Rollen-Enumeration ohne Login

**Schweregrad: Mittel. Live gegen Prod verifiziert.**

Beide Funktionen nehmen eine beliebige `user_id` entgegen und sind für `anon`
ausführbar:

```
is_admin(<uuid>)      als anon -> false
get_user_role(<uuid>) als anon -> "client"
```

Für sich genommen harmlos. In Verbindung mit F-2 — das die UUIDs aller Nutzer
frei Haus liefert — wird daraus eine vollständige Rollenübersicht des Systems
inklusive der Antwort auf die Frage „welches Konto ist Admin?". Das ist genau
die Vorarbeit, die einem gezielten Angriff auf ein Admin-Konto vorausgeht.

Zur Einordnung: die *zeilenbezogenen* Funktionen verhalten sich korrekt.
`get_provider_clients` und `get_owner_horse_ids` liefern als anon jeweils `[]`,
weil sie intern gegen `auth.uid()` prüfen. Das Muster ist also im Code
vorhanden — es wurde bei F-1, F-2 und F-3 nur nicht angewandt.

### F-4 — `provider_id IS NULL` als Schreib-Schlupfloch

**Schweregrad: Mittel.**

Bei `services`, `offers` und `feedbacks` lauten die UPDATE- und
DELETE-Policies jeweils:

```sql
((auth.uid() IS NOT NULL) AND ((provider_id = auth.uid()) OR (provider_id IS NULL)))
```

Der zweite Zweig hebt die Mandantentrennung für alle Zeilen ohne
`provider_id` auf: **jeder eingeloggte Nutzer** darf sie ändern und löschen.
`auth.uid() IS NOT NULL` bedeutet nur „eingeloggt" und ist keine Trennung.

**Aktueller Bestand:**

| Tabelle | Zeilen mit `provider_id IS NULL` | gesamt |
|---|---|---|
| `services` | 0 | 29 |
| `offers` | 0 | 6 |
| `feedbacks` | **3** | 7 |

Bei `feedbacks` ist der Fall also nicht theoretisch: drei Bewertungen sind
aktuell für jeden beliebigen eingeloggten Nutzer änder- und löschbar.

### F-5 — `profiles` INSERT nur rollen-, nicht zeilengeprüft

**Schweregrad: Niedrig.**

```sql
-- Policy "Providers and partners can create client profiles", INSERT
CHECK: (has_role(auth.uid(), 'provider'::app_role) OR has_role(auth.uid(), 'partner'::app_role))
```

Die Bedingung schränkt die **einzufügende Zeile** in keiner Weise ein — weder
`id` noch `created_by_provider_id`. Jeder Provider darf damit formal beliebige
Profilzeilen anlegen. Praktisch begrenzt wird das durch den Primärschlüssel
(für bereits existierende Nutzer schlägt der Insert fehl) und dadurch, dass
`handle_new_user` Profile ohnehin automatisch anlegt. Siehe offene Frage U-1.

### F-6 — `invoices` INSERT erlaubt `provider_id IS NULL`

**Schweregrad: Niedrig.**

```sql
CHECK: (has_role(auth.uid(), 'provider'::app_role) AND ((provider_id = auth.uid()) OR (provider_id IS NULL)))
```

Anders als bei F-4 entsteht hier **kein** Leseleck: alle SELECT-Policies auf
`invoices` verlangen `provider_id = auth.uid()` bzw. `client_id = auth.uid()`.
Eine Rechnung mit `provider_id IS NULL` wäre danach für niemanden mehr
sichtbar außer dem Master-Admin — also verwaiste Daten statt offener Daten.
Ein Datenintegritäts-, kein Vertraulichkeitsproblem.

### F-7 — Anonyme INSERT-Endpunkte nur längenvalidiert

**Schweregrad: Niedrig (Missbrauch, kein Datenabfluss).**

17 Policies sind explizit `TO anon` gesetzt. Die Lesenden sind sauber
gescoped (`is_published = true`, `is_active = true`, `expires_at > now()`).
Die Schreibenden validieren nur Feldlängen:

| Tabelle | Bedingung |
|---|---|
| `website_leads` | `email` ≤ 255 **und `dsgvo_consent = true`** |
| `funnel_leads` | `email IS NOT NULL AND length ≤ 255` |
| `leads` | `provider_id IS NOT NULL AND length(email) ≤ 255` |
| `preview_feedback` | `provider_id IS NOT NULL AND length(comment) ≤ 2000` |
| `pferdeakte_waitlist` | `email IS NOT NULL AND length ≤ 255` |
| `demo_activity_logs` | `activity_type` ≤ 100 |
| `botschafter_clicks` | `referral_code` ≤ 20 |

Das ist für öffentliche Formulare vertretbar — die DSGVO-Einwilligung ist bei
`website_leads` erfreulicherweise auf DB-Ebene erzwungen, und für die
Lead-Pfade existieren Rate-Limit-Trigger (`check_lead_rate_limit`,
`check_funnel_lead_rate_limit`, `check_website_lead_rate_limit`). Bleibt als
Restrisiko Spam auf den Pfaden ohne solchen Trigger.

### F-8 — Bedingungslos lesbare Tabellen (geprüft, unkritisch)

10 Policies haben die Bedingung `true`. Alle betreffen Referenz- und
Redaktionsdaten, keine personenbezogenen Daten:

| Tabelle | Rolle | Zeilen | Inhalt |
|---|---|---|---|
| `equine_clinics` | public | 23 | Klinikverzeichnis |
| `got_positions` | public | 25 | GOT-Gebührenpositionen |
| `equine_ontology` | public | 3 | Fachbegriffe |
| `help_articles` | authenticated | 14 | Hilfetexte |
| `pferdeakte_community_milestones` | authenticated | 9 | Meilensteine |
| `system_settings` | authenticated | 10 | nur `app_version_*`, `maintenance_mode_*`, `force_reload_all` |
| `botschafter_updates` | authenticated | 0 | leer |
| `ecosystem_apps` | authenticated | 0 | leer |
| `email_signup_forms` | public | 0 | leer |
| `review_reactions` | authenticated | 0 | leer |

`system_settings` wurde wegen des Namens gezielt geprüft — es enthält
ausschließlich Versions- und Wartungsflags, keine Schlüssel oder Endpunkte.

### F-9 — Nebenwege: geprüft und sauber

**Views:** Alle 11 Views in `public` haben `security_invoker=on` und laufen
damit unter den Rechten des Aufrufers, erben also die RLS der Basistabellen.
Materialized Views: keine. Der klassische „View umgeht RLS"-Weg ist hier
**nicht** offen.

```
appointments_partner_view, horses_basic, horses_medical, invoices_client_view,
pferdeakte_global_stats, safe_appointments, safe_business_settings,
safe_feedbacks, safe_horses, safe_provider_profiles, safe_reviews
```

**SECURITY DEFINER:** 154 Funktionen, **alle 154** mit
`SET search_path TO 'public'`. Kein `search_path`-Hijacking möglich. (Der
Befund aus dem Audit vom 19.07.2026 zu `function_search_path_mutable` ist
damit vollständig erledigt.)

**Tabellen mit RLS ohne Policy:** keine. Der umgekehrte Fehler — Daten, an
die niemand mehr herankommt — liegt nicht vor.

**Destruktive RPCs:** `delete_client_cascade`, `delete_horse_safe`,
`delete_provider_cascade` und `delete_employee_account` sind zwar ebenfalls
für `anon` ausführbar, prüfen aber alle intern gegen `auth.uid()` und werfen
bei fehlender Berechtigung eine Exception. Hier besteht **kein** Handlungsbedarf.

---

## Unklar — manuell prüfen

**U-1 — `profiles` INSERT (zu F-5):** Kann ein Provider tatsächlich eine
Profilzeile für eine fremde `auth.users`-ID anlegen, die noch kein Profil hat,
und diese anschließend über `created_by_provider_id = auth.uid()` lesen?
Das ließe sich nur durch einen echten Schreibversuch klären — der war durch
die Nur-Lese-Leitplanke ausgeschlossen.
**Konkrete offene Frage:** Existiert auf `profiles` ein `BEFORE INSERT`-Trigger,
der `created_by_provider_id` oder `id` erzwingt, oder greift ausschließlich der
Primärschlüssel?

**U-2 — `is_discoverable` (zu F-2):** Ist das öffentliche Profilverzeichnis
gewollt (Dienstleistersuche als Produktfeature) oder ein Nebeneffekt des
Spalten-Defaults `true`? Die Antwort entscheidet, ob F-2 ein Bug oder eine
fehlende Einwilligung ist — technisch identisch, rechtlich nicht.
**Konkrete offene Frage:** Sollen Kunden-/Pferdebesitzer-Profile überhaupt
auffindbar sein, oder nur Dienstleisterprofile?

**U-3 — Reichweite der `anon`-EXECUTE-Rechte:** 152 der 154 SECDEF-Funktionen
sind für `anon` ausführbar (Postgres-Default `GRANT EXECUTE TO PUBLIC`). Der
Großteil davon sind Trigger-Funktionen, die PostgREST gar nicht als RPC
exponiert. Ich habe die risikoreichen Kandidaten einzeln gelesen und die
kritischen live getestet — aber **nicht alle 152**.
**Konkrete offene Frage:** Soll ein vollständiger Durchlauf über alle
Nicht-Trigger-SECDEF-Funktionen mit anon-Testaufruf folgen (eigener Schritt)?

**U-4 — `horse_status_reports`:** Die einzige Nicht-Admin-Policy lautet
`reported_by = auth.uid()`. Der Pferdebesitzer sieht damit Statusberichte zu
seinem eigenen Pferd nur, wenn er sie selbst erfasst hat. Das ist kein
Sicherheits-, sondern vermutlich ein Funktionsproblem.
**Konkrete offene Frage:** Ist das so gewollt?

---

## Empfehlungen — nichts davon wurde umgesetzt

Nach Priorität. Alle Punkte brauchen deine Freigabe, bevor irgendetwas
angefasst wird.

1. **F-1:** In `search_horse_by_readable_id` eine Auth-Prüfung ergänzen und
   das `EXECUTE`-Recht für `anon` entziehen. Fachlich zu klären: Soll die
   Funktion überhaupt für Fremde erreichbar sein (QR-Code-Szenario)? Falls ja,
   gehört ein Flag analog zu `is_discoverable` auf `horses` — und dann mit
   Default `false`.
2. **F-2/F-3:** `EXECUTE` für `anon` bei `search_profiles_universal`,
   `search_profile_by_readable_id`, `get_user_role` und `is_admin` entziehen,
   sodass mindestens ein Login nötig ist. Unabhängig davon `is_discoverable`
   auf Default `false` umstellen und aktiv einholen — beides greift erst nach
   Klärung von U-2.
3. **F-4:** `OR (provider_id IS NULL)` aus den UPDATE-/DELETE-Policies von
   `services`, `offers` und `feedbacks` entfernen. Vorher die 3 verwaisten
   `feedbacks`-Zeilen einem Provider zuordnen oder löschen, sonst sind sie
   danach für niemanden mehr erreichbar.
4. **F-6:** `OR (provider_id IS NULL)` auch aus dem `invoices`-INSERT-CHECK
   entfernen, damit keine unsichtbaren Rechnungen entstehen können.
5. **F-5/U-1:** `profiles`-INSERT-Policy um einen Zeilenbezug ergänzen, z. B.
   `created_by_provider_id = auth.uid()`.

Punkt 1 und 2 sind die einzigen, bei denen aktuell echte Personendaten ohne
jeden Login abfließen. Wenn du nur eine Sache freigibst, dann diese beiden.

---

# Phase 1B: CopeCart-Checkouts, Edge Functions, Code

**Datum:** 27.07.2026
**Methode:** Statische Code-Analyse im Repo + unauthentifizierte Live-Checks
gegen `copecart.com` und `vnschgjxkzzwzefqlrji.supabase.co`. Es wurden keine
E-Mails versendet, keine Käufe ausgelöst und nichts auf Prod geschrieben.
Codeänderungen liegen als Diff im Arbeitsverzeichnis, die DB-Änderungen als
Migration `20260727120000_close_anon_secdef_leaks.sql` — **nichts davon ist
deployed.**

## Teil 1 — CopeCart-Checkouts

Alle produktiv verlinkten Checkouts wurden live abgerufen.

| Verlinkt in | URL / Produkt | Status | Preis auf der Seite | Preis in der App |
|---|---|---|---|---|
| AboSettings, PricingModal, UpgradeModal, ProGateDialog, ClientAppUpgradeModal | `products/0a0921ba/checkout` — Early Bird | **200 OK** | 9,95 €/Monat (statt regulär 19,95 €) | 9,95 € ✓ |
| ManagementGuthaben | `products/d0cdf68a/checkout` — 5 € Guthaben | **200 OK** | 5,00 € netto / 5,95 € brutto | 5 € ✓ |
| ManagementGuthaben | `products/023890f8/checkout` — 10 € Guthaben | **200 OK** | 10,00 € netto / 11,90 € brutto | 10 € ✓ |
| ManagementGuthaben | `products/2556cac0/checkout` — 25 € Guthaben | **200 OK** | 25,00 € netto / 29,75 € brutto | 25 € ✓ |
| GeldVerdienen.tsx:25, Hufrente.tsx:336 | `copecart.com/affiliate/hufmanager` | **404 — tot** | — | — |
| BotschafterProfil.tsx:11 | `copecart.com/users/sign_up?cp=barhufserviceschmid` | **422** | — | — |

Alle vier Kauf-Links funktionieren, tragen den Produktnamen „Hufi" und die
Preise stimmen mit der App überein. Die Produkt-IDs im Code stimmen mit den
Maps im Webhook überein. Der Webhook selbst antwortet auf einen Aufruf ohne
IPN-Passwort korrekt mit `401 Unauthorized`.

**Nicht prüfbar ohne CopeCart-Login** (bitte selbst im Dashboard nachsehen):
ob die IPN-URL bei allen vier Produkten hinterlegt ist, ob das IPN-Passwort
mit `COPECART_IPN_PASSWORD` übereinstimmt und welche Event-Namen CopeCart
tatsächlich sendet. Ohne hinterlegte IPN-URL wird ein Kauf zwar bezahlt, aber
in der App passiert nichts.

## Teil 2 — Befunde, nach Schweregrad

### F-11 — `send-email` ist ein offenes Mail-Relay
**Schweregrad: KRITISCH. Live verifiziert (ohne Mailversand).**

Die Function läuft mit `verify_jwt = false`, ist ACTIVE seit 12.07.2026 und
prüft den Aufrufer mit keiner einzigen Zeile. Sie nimmt `to`, `subject` und
`html` frei entgegen und versendet über Resend von der verifizierten Adresse
`noreply@hufmanager.de`.

```
POST /functions/v1/send-email  (ohne Token, ohne apikey)
{}  ->  400 {"error":"Missing required fields: to, subject, html ..."}
```

Die 400 belegt: die Anfrage erreicht die Feldprüfung, es gibt kein Auth-Gate.
Jeder im Internet kann damit beliebige HTML-Mails an beliebige Empfänger von
deiner Domain aus verschicken — technisch eine fertige Phishing-Infrastruktur
auf `hufmanager.de`, mit deinem Resend-Kontingent und deiner Domain-Reputation.

**Fix im Arbeitsverzeichnis:** nur noch bekannte Templates, kein freies
`subject`/`html` mehr, alle Variablen HTML-escaped (sie wurden vorher roh in
das Template interpoliert — HTML-Injection auch über den Template-Pfad). Der
einzige echte Aufrufer (öffentliche Newsletter-Anmeldung auf `/pferdeakte`)
funktioniert unverändert weiter. **Restrisiko bleibt:** `to` ist weiter frei
wählbar, ein Fremder kann also die Willkommensmail an Beliebige schicken —
fester Text, kein Phishing. Ein Rate-Limit wäre der nächste Schritt.

### F-12 — Rechnungsmails erreichen keinen Kunden
**Schweregrad: Hoch (Funktion, nicht Sicherheit).**

Drei Stellen versendeten über `onboarding@resend.dev`:
`send-invoice-email` (jede Rechnung an jeden Kunden), sowie im
`copecart-webhook` die Zahlungsbestätigung und die BHS-Willkommensmail.

`onboarding@resend.dev` ist Resends Test-Absender. Er stellt **ausschließlich
an die eigene Kontoadresse zu**; alles andere wird verworfen. Das heißt: die
Rechnungsmail, die ein Hufbearbeiter in der App abschickt, kommt bei dessen
Kunde nie an — ohne Fehlermeldung in der App. Für ein Programm, dessen
Kernnutzen Rechnungsstellung ist, ist das ein K.-o.-Kriterium und ein
plausibler Grund, warum Tester nach Tag eins nicht wiederkommen.

**Fix im Arbeitsverzeichnis:** alle drei auf `info@hufmanager.de` umgestellt
(die einzige verifizierte Domain). **Offen:** `hufiapp.de` ist bei Resend
weiterhin nicht verifiziert, die App heißt aber Hufi — Absender und Marke
passen nicht zusammen. Domain in Resend verifizieren.

### F-13 — Unbekannte Produkt-ID = geschenkter Pro-Zugang
**Schweregrad: Hoch (Umsatz).**

```ts
function getPlanFromProductId(productId: string): string {
  return PRODUCT_PLAN_MAP[productId] || 'pro';   // <- Default
}
```

Jeder Kauf eines CopeCart-Produkts, das nicht in der Map steht, führte zu
`subscription_plan = 'pro'` inklusive Auto-Provisionierung aller
Pro-Feature-Flags. Betrifft jedes künftige Produkt: E-Book, Kurs, die noch
nicht angelegten BHS- und Tresor-Produkte, ein 1-€-Testkauf. Guthaben- und
Vault-Produkte sind nicht betroffen, sie werden vorher abgefangen.

**Fix im Arbeitsverzeichnis:** Zahlungsevent mit unbekannter Produkt-ID wird
protokolliert und mit 200 quittiert, ohne einen Plan zu vergeben.
Kündigungen und Refunds laufen bewusst weiter.

### F-14 — Guthaben wird bei Webhook-Wiederholung doppelt gutgeschrieben
**Schweregrad: Mittel (Geld).**

`add_purchased_voice_credits` prüft die `copecart_order_id` nicht. CopeCart
wiederholt IPN-Zustellungen, bis eine 200 zurückkommt — bei einem Timeout
oder einem Deploy während der Zustellung wird derselbe Kauf zweimal
gutgeschrieben. Bei 0 Käufen bisher folgenlos, aber es trifft den ersten
zahlenden Kunden.

**Fix in der Migration:** `EXISTS`-Check auf die Order-ID plus partieller
Unique-Index gegen die Race Condition zweier gleichzeitiger Zustellungen.

### F-15 — IPN-Passwort und Käuferdaten im Klartext-Log
**Schweregrad: Mittel.**

```ts
console.log("Webhook payload received:", JSON.stringify(payload, null, 2));
```

Das Payload enthält das IPN-Passwort, mit dem sich der Webhook fälschen lässt,
sowie Name, E-Mail und Kaufdaten des Käufers. Supabase-Function-Logs sind für
jeden mit Dashboard-Zugang lesbar. Dasselbe Payload wurde zusätzlich
ungefiltert in `admin_revenue_log.raw_payload` gespeichert.

**Fix im Arbeitsverzeichnis:** Passwortfelder an beiden Stellen entfernt.
**Zusatz:** Das IPN-Passwort sollte rotiert werden — es stand bisher in jedem
Log-Eintrag.

### F-16 — Rechnung wird ohne Betragsabgleich als bezahlt markiert
**Schweregrad: Mittel.**

Enthält das `custom`-Feld eine Rechnungs-UUID, setzt der Webhook die Rechnung
auf `paid` — unabhängig vom gezahlten Betrag. Ein falsch konfigurierter
Checkout (5-€-Guthabenprodukt mit Rechnungs-UUID im custom-Feld) tilgt damit
eine 500-€-Rechnung.

**Fix im Arbeitsverzeichnis: bewusst nur eine Warnung im Log, kein Abbruch.**
Der Feldname für den Betrag im CopeCart-IPN ist nicht verifiziert (der Code
rät bereits mit `amount ?? total ?? price`). Ein harter Guard auf einem
geratenen Feldnamen würde im Zweifel legitime Zahlungen still verschlucken —
das wäre schlimmer als das Problem. Sobald ein echtes IPN-Payload vorliegt:
auf Ablehnung umstellen (im Code als `ponytail:`-Kommentar markiert).

### F-17 — Debug-Function legt öffentlich Konten an
**Schweregrad: Mittel.**

`create-demo-stallbetreiber-user` ist ACTIVE, ohne Auth erreichbar und ein
offensichtliches Wegwerf-Skript („Test with a completely different email to
see if it's a general issue"). Jeder Aufruf legt ein Wegwerfkonto an, löscht
es wieder und erstellt anschließend `hufmanagerstallbetreiber@gmail.com`.
**Empfehlung: löschen** (`supabase functions delete create-demo-stallbetreiber-user`).
Dasselbe für `create-demo-business-user` prüfen.

### F-18 — `hash-password` ist ohne Login erreichbar
**Schweregrad: Niedrig-Mittel.**

```
POST /functions/v1/hash-password {"action":"invalid"} -> 400 (kein Auth-Gate)
```

Alle sechs Aufrufer (Tresor, VaultTab, HorseTransfer) sind eingeloggt. Der
Endpunkt taugt als kostenloser PBKDF2-Rechendienst auf deine Rechnung und als
Verifikations-Orakel für einen bereits erbeuteten Hash.
**Empfehlung:** in `config.toml` auf `verify_jwt = true` — Einzeiler, bricht
laut Aufruferprüfung nichts. Bewusst nicht von mir geändert, weil eine
falsche Annahme hier den Tresor sperrt.

### F-19 — Migrationshistorie auf Prod ist unvollständig
**Schweregrad: Hoch (Betriebsrisiko, keine Lücke).**

`supabase migration list --linked` zeigt für den Großteil der lokalen
Migrationen keinen Remote-Eintrag — das Schema wurde großteils über Lovable
bzw. das Dashboard aufgebaut, ohne die Migrationstabelle zu füllen.

**Konsequenz: `supabase db push` ist gefährlich.** Der Befehl würde versuchen,
über 60 nicht registrierte Migrationen gegen die Live-Datenbank nachzufahren
— darunter zahlreiche `DROP POLICY`. Die Migration aus dieser Session gehört
**einzeln über den SQL-Editor oder die Management API** eingespielt, nicht
über `db push`.

### F-20 — Affiliate-Link ist tot
**Schweregrad: Niedrig.**

`https://www.copecart.com/affiliate/hufmanager` liefert 404, verlinkt in
`GeldVerdienen.tsx:25` und `Hufrente.tsx:336` — beides Seiten, auf denen ein
Nutzer Geld verdienen soll. **Nicht von mir korrigiert:** die richtige URL ist
nicht erratbar, und ein geratener Link ist der zweite Bug.

### F-21 — Widersprüchliche Trial-Dauer im Text
**Schweregrad: Niedrig.**

Die gesamte Website und alle Upgrade-Dialoge nennen 14 Tage.
`BotschafterHufmanager.tsx:70` verspricht „90 statt 30 Tage".

## Offen — nicht prüfbar oder Entscheidung nötig

1. **Trial-Automatik.** Die Migration `20260610091000_trial_expiry_cron.sql`
   ist im Repo, aber nicht als angewandt registriert (F-19), und 12 von 13
   Trials stehen weiter auf `trialing`. Zu prüfen mit
   `SELECT jobname, schedule, active FROM cron.job;` auf Prod. Ist der Job
   nicht da, gibt es weiterhin keinen Moment, in dem jemand kaufen müsste.
2. **`kleinunternehmer: true`** wird in `admin_invoices` fest gesetzt, während
   CopeCart als Reseller Umsatzsteuer ausweist (5,00 € → 5,95 €). Steuerlich
   von deinem Steuerberater bestätigen lassen — keine Programmierfrage.
3. **`PLAN_ITEMS` im Webhook** nennt Pro mit 29,00 €, verkauft wird für
   9,95 €. Der Betrag wird zwar aus dem Payload genommen, aber die
   Rechnungsposition heißt „HufManager Pro – Monatslizenz". Text anpassen.
4. **Demo-Zugänge** stehen im Klartext in `DemoAccessCards.tsx` — das ist so
   gewollt (Demo zum Ausprobieren). Zu prüfen bleibt, dass in den
   Demo-Konten keine echten Kundendaten liegen; das Konto
   „Demo-Hufbearbeiter" hat 192 der 238 Termine erzeugt.
