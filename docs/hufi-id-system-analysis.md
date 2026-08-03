# Hufi-ID-System — Bestandsanalyse

> Stand: 2026-08-02. Reine Bestandsanalyse (Repository `/home/pascaladmin/hufiapp-dev`,
> Branch `feature/hufi-assistant-cockpit`). Keine Migration ausgeführt, keine
> RLS-Policy verändert, keine Live-Datenbankabfrage — alle Aussagen über
> lokale Migrationsdateien (`supabase/migrations/*.sql`) und die generierten
> Typen (`src/integrations/supabase/types.ts`) belegt. Fortsetzung von
> `docs/hufi-observation-workflow-analysis.md` und
> `docs/hufi-observation-phase-1-contracts.md`.
>
> Auslöser: eine abgebrochene Vorgängersession hatte drei vorläufige,
> ungeprüfte Thesen hinterlassen ("#prid existiert bereits", "#bid existiert
> noch nicht", "horses hat zwei konkurrierende Identitätsfelder eqid und
> readable_id/EQID"). Alle drei wurden hier gegen Migrationen, generierte
> Typen und Anwendungscode verifiziert — Ergebnis unten, teils bestätigt,
> teils präzisiert, ein Punkt korrigiert (#bid).

---

## 1. Zusammenfassung der Korrekturen gegenüber den vorläufigen Thesen

| Vorläufige These | Ergebnis |
|---|---|
| "#prid scheint bereits zu existieren" | **Bestätigt.** Real, aktiv generiert für `profiles.role='partner'` und `contacts.role IN ('partner','supplier')`. |
| "#bid scheint noch nicht zu existieren" | **Korrigiert — komplizierter als vermutet.** Ein `#BID-`-Präfix ist in einer Funktion (`generate_smart_id()`) vorbereitet, aber **nie als Trigger aktiviert** — es wird nirgends erzeugt. Die dazugehörige `businesses`-Tabelle existiert aber **live** (laut generierten Typen, ohne Migration im Repo — Schema-Drift), mit einer `readable_id`-Spalte, die nie befüllt wird. Zusätzlich taucht "BID" im Code an anderer Stelle auf (Botschafter/Ambassador-Programm) — dort aber als **komplett unabhängiges, nicht verwandtes Konzept** (siehe Abschnitt 7). |
| "horses hat zwei konkurrierende Identitätsfelder: eqid und readable_id/EQID" | **Bestätigt und im Detail belegt.** Zwei echte, gleichzeitig existierende Spalten, siehe Abschnitt 8. |

---

## 2. #kid

- **Bedeutung**: Kunden-ID ("Kunde" = `profiles.role='client'`).
- **Spalte**: `profiles.readable_id` (TEXT, UNIQUE).
- **Format**: `KID-123456` (Präfix + Bindestrich + 6-stellige Zufallszahl,
  kollisionsgeprüfte Schleife).
- **Generator**: `generate_profile_readable_id()` (zuerst
  `20251208130517_...sql:69`, seither zweimal per `CREATE OR REPLACE`
  angepasst: `20260109102001_...sql`, `20260219144114_...sql` — letztere
  Version ist aktuell). `KID` ist der **Default-Zweig** (`ELSE`), greift
  für `role='client'` und für jede unbekannte/fehlende Rolle.
- **Trigger**: `generate_profile_readable_id_trigger` — `BEFORE INSERT ON
  public.profiles` (`20251208130517_...sql:184`), seit Erstellung
  durchgehend aktiv, nie gedroppt.
- **Tatsächliche Nutzung**: `AdminKIDataHub.tsx` (Datenqualitäts-Übersicht,
  liest `row.kid`), diverse Such-/Verbindungsfunktionen
  (`search_profile_by_readable_id()`), `AGENT_ANALYSE`-Kontext (Menschen-
  Disambiguierung über `search_profiles_universal()` — durchsucht u. a.
  `readable_id`).
- **Altbestand**: eine frühere Version (`20251205064919_...sql`) generierte
  KIDs sequenzbasiert (`customer_id_seq`, Format `KID000001`) in eine
  Spalte namens `display_id`. Diese Spalte wurde in
  `20251208130517_...sql:17` per `RENAME COLUMN display_id TO
  readable_id` umbenannt, der Generator gleichzeitig auf das heutige
  Zufallsschema umgestellt. `customer_id_seq` existiert als Sequenz
  vermutlich weiter (kein `DROP SEQUENCE` gefunden), wird aber von keinem
  aktiven Trigger mehr genutzt — **totes Überbleibsel**.

## 3. #pid

- **Bedeutung**: Anbieter-ID (`profiles.role='provider'`).
- **Spalte**: `profiles.readable_id` — **dieselbe Spalte wie #kid**, nur
  anderes Präfix je nach Rolle. Es gibt keine separate PID-Spalte.
- **Format**: `PID-123456`.
- **Generator/Trigger**: identisch zu Abschnitt 2 (`generate_profile_readable_id`,
  `generate_profile_readable_id_trigger`), Zweig `role ILIKE '%provider%' OR
  role ILIKE '%profi%'` (siehe `20260109102001_...sql:52` bzw. aktualisiert
  `20260219144114_...sql:119`).
- **Bekannter Datenfix**: `20260109102001_...sql:2-11` korrigiert einen
  konkreten Demo-Account, dessen `readable_id` fälschlich mit `KID-` statt
  `PID-` generiert worden war — Beleg, dass die Präfixlogik früher
  mindestens einmal einen realen Fehlerfall hatte (rollenabhängige
  Generierung ist nicht narrensicher, falls `role` zum Insert-Zeitpunkt
  noch nicht gesetzt ist).
- **Tatsächliche Nutzung**: identisch zu #kid (gleiche Spalte, gleiche
  Suchpfade), zusätzlich `AGENT_ANALYSE`/`hufi-agent`-Kontext für
  Provider-Identifikation.

## 4. #eqid

**Der komplexeste Fund — zwei echte, gleichzeitig existierende Felder.**
Siehe volle Auflösung in Abschnitt 8 (dediziert, wegen Komplexität).
Kurzfassung:

1. `horses.eqid` (TEXT, UNIQUE) — die **ursprüngliche** Spalte
   (`20251203110750_...sql:27`, Teil der allerersten `horses`-Tabelle).
   **Wird von keinem gefundenen Trigger/keiner Migration jemals
   geschrieben** — bei jedem Insert bleibt sie NULL, außer sie wird von
   Anwendungscode explizit gesetzt (dafür wurde **keine** Schreibstelle
   gefunden, weder in Migrationen noch im `src/`-Code).
2. `horses.readable_id` (TEXT, UNIQUE) — später hinzugefügt
   (`20251208130517_...sql:24-27`, per `RENAME`/`ADD COLUMN`-Fallback wie
   bei Profiles), **aktiv befüllt** über
   `generate_horse_readable_id_trigger` mit Präfix `EQID` (Format
   `EQID-123456`).

## 5. #mid

- **Bedeutung laut Code-Kommentar**: Mitarbeiter-ID
  (`role ILIKE '%mitarbeiter%' OR role ILIKE '%employee%'`).
- **Tatsächlicher Stand: existiert nicht in der Praxis.** Der einzige Fund
  ist der `#MID-`-Zweig in `generate_smart_id()`
  (`20260212075740_...sql:12-14`) — diese Funktion wird per
  `CREATE OR REPLACE FUNCTION` definiert, aber **an keiner Stelle im
  gesamten Migrationsverzeichnis per `CREATE TRIGGER` an eine Tabelle
  gebunden** (verifiziert: `grep -rn "generate_smart_id" supabase/migrations/*.sql`
  liefert nur die Funktionsdefinition selbst, keinen Trigger).
- Die tatsächlich aktive Profil-ID-Generierung
  (`generate_profile_readable_id`, Abschnitte 2/3) kennt **keinen**
  MID-Zweig — nur `PID`/`PRID`/`KID` (Default).
- `employee_profiles` (die reale Mitarbeiter-Tabelle, siehe
  `docs/hufi-observation-workflow-analysis.md` Abschnitt 5/10) hat **keine
  `readable_id`-Spalte und keine eigene menschenlesbare ID** — nur die
  UUID `id` und `provider_id` (FK auf den anstellenden Provider).
- **Fazit**: `#mid` ist vorbereiteter, aber niemals aktivierter Code. Kein
  Mitarbeiter im System hat je eine `#MID-…`-ID erhalten oder kann sie
  bekommen, solange `generate_smart_id()` nicht an eine Tabelle gebunden
  wird.

## 6. #prid

- **Bedeutung**: Partner-/Zulieferer-ID — Rollen `partner`, `supplier`,
  `tierarzt`, `therapeut` (Wortlaut je nach Tabelle leicht unterschiedlich,
  siehe unten).
- **Zwei getrennte, aber konsistente Erzeugungsorte:**
  1. `profiles.readable_id`, Zweig `role ILIKE '%partner%' OR role ILIKE
     '%tierarzt%' OR role ILIKE '%therapeut%'` in `generate_smart_id()`
     (nur der **dort definierte**, nicht aktivierte Zweig — siehe
     Einschränkung unten) **sowie** — tatsächlich aktiv — in
     `generate_profile_readable_id()`, Zweig `role = 'partner'` →
     `PRID` (eingeführt in `20260219144114_...sql:84-131`, "PART 1:
     Partner Integration (#PRID) Migration").
  2. `contacts.readable_id` — `generate_contact_readable_id()`
     (`20251208130517_...sql:143-175`), Zweig `role IN ('partner',
     'supplier')` → `PRID`. `contacts` ist die providerseitige CRM-Liste
     (siehe `docs/hufi-observation-workflow-analysis.md` Abschnitt 5),
     **unabhängig von echten Accounts** — ein `PRID`-Kontakt muss keinen
     zugehörigen `profiles`-Eintrag haben.
- **Format**: `PRID-123456` (gleiches Zufallsschema wie KID/PID).
- **Trigger**: `generate_profile_readable_id_trigger` (Profiles) bzw.
  `generate_contact_readable_id_trigger` (Contacts) — beide seit
  `20251208130517_...sql` aktiv, unabhängig vom PRID-Zweig selbst
  aktualisiert.
- **Tatsächliche Nutzung**: `PartnerIntegration`-bezogener Code (Migration
  `20260219144114` deutet auf ein eigenständiges Feature — Partner-Zugriff
  auf freigegebene Pferde, vgl. `partner_treatment_notes`,
  `horses_medical`-View aus der Workflow-Analyse).

## 7. #bid

**Zwei völlig unabhängige, nicht verwandte Bedeutungen im Code — Verwechslungsgefahr.**

### 7a. `#BID-` als Präfix für eine `businesses`-Tabelle (vorbereitet, inaktiv)

- Definiert nur innerhalb von `generate_smart_id()`
  (`20260212075740_...sql:22-23`: `IF TG_TABLE_NAME = 'businesses' THEN
  prefix := '#BID-';`).
- **Wie bei #mid: kein `CREATE TRIGGER` bindet diese Funktion an
  irgendeine Tabelle.** Der Zweig ist totes Vorbereitungscode.
- Die `businesses`-Tabelle selbst **existiert aber live** — bestätigt über
  die generierten Typen (`src/integrations/supabase/types.ts:2861-2890`,
  Spalten `id, name, address, contact_email, owner_id, readable_id,
  created_at`). Im Migrationsverzeichnis findet sich **keine
  `CREATE TABLE public.businesses`** — nur eine spätere Migration
  (`20260212070226_...sql:5-13`), die RLS **auf** die bereits vorhandene
  Tabelle aktiviert (`ALTER TABLE public.businesses ENABLE ROW LEVEL
  SECURITY`). **Schema-Drift**, exakt das im Repo bereits dokumentierte
  Muster von `hufi_memory`/`hufi_context_log`
  (`supabase/migrations/20260509002234_hufi_memory_provenance.sql` als
  Präzedenzfall) — vermutlich per Dashboard angelegt, nie migriert.
- Da kein Trigger die `readable_id`-Spalte befüllt, ist sie für jede Zeile
  in `businesses` vermutlich durchgehend NULL (aus lokalen Dateien nicht
  live verifizierbar, aber keine einzige Schreibstelle gefunden).
- **Anwendungscode-Nutzung**: keine gefunden. `grep -rn "from(\"businesses\")"`
  über `src/` und `supabase/functions/` liefert null Treffer — die Tabelle
  wird vom Frontend/den Edge Functions aktuell nicht angesprochen.

### 7b. "BID" im Botschafter-/Ambassador-Programm (aktiv, aber unabhängig)

- `src/pages/botschafter/BotschafterWarten.tsx:113` und
  `supabase/functions/botschafter-welcome/index.ts:72` zeigen dem Nutzer
  einen Code `BID-{bidDisplay}` an.
- **Herkunft**: `bidDisplay = (data.bid || data.id).slice(0, 8).toUpperCase()`
  — das ist **keine `readable_id`-artige Fach-ID**, sondern schlicht die
  ersten 8 Zeichen der internen UUID-Spalte `bid` (bzw. Fallback `id`) der
  Tabelle `pferdeakte_botschafter`, großgeschrieben. Kein Generator, kein
  Präfix-Trigger, kein Bezug zu `generate_smart_id()` oder `readable_id`.
- **Fazit**: "BID" hat im Repository zwei Bedeutungen, die nichts
  miteinander zu tun haben — (a) ein nie aktiviertes `readable_id`-Präfix
  für `businesses`, (b) ein Ad-hoc-Anzeigeformat für Botschafter-Codes.
  Für den Observation-/Pferde-Flow ist **keine** der beiden relevant.

## 8. eqid versus readable_id/EQID — vollständige Auflösung

Beide Spalten existieren gleichzeitig auf `horses`, mit **unterschiedlichem
Lebenszyklus**:

| | `horses.eqid` | `horses.readable_id` |
|---|---|---|
| Eingeführt | `20251203110750_...sql:27` (Ur-Migration) | `20251208130517_...sql:24-27` (5 Tage später) |
| Typ | `TEXT UNIQUE`, kein Format erzwungen | `TEXT UNIQUE`, Format `EQID-123456` |
| Generator | **keiner** | `generate_horse_readable_id()` |
| Trigger | **keiner** | `generate_horse_readable_id_trigger`, aktiv seit Einführung |
| Wird bei INSERT befüllt? | Nein — bleibt NULL, außer explizit gesetzt | Ja, automatisch |
| Schreibstellen im Code | keine gefunden (`src/`, `supabase/functions/`, Migrationen) | nur der Trigger |
| Lesestellen im Code | `src/pages/BhsBalanceCockpit.tsx`, `src/pages/ClientBhsAbo.tsx` (BHS-Abo-Anzeige), `src/components/admin/AdminKIDataHub.tsx` (Datenqualitäts-Check) | `AdminKIDataHub.tsx`, Suchfunktionen, sämtliche EQID-Anzeigen in Pferdeakte/Verwaltung |

**Konkreter Beleg für den Konflikt**: `AdminKIDataHub.tsx:56` prüft
Datenqualität explizit gegen alle drei Felder (`!row.pid || !row.kid ||
!row.eqid`) und zeigt bei fehlendem `row.eqid` einen roten "fehlt"-Badge
(`AdminKIDataHub.tsx:157`). Da **kein** Schreibpfad `horses.eqid` befüllt,
wird dieser Badge für praktisch jedes Pferd erscheinen, das nach
Einführung von `readable_id` angelegt wurde — unabhängig davon, ob das
Pferd längst eine gültige `EQID-…`-Nummer über `readable_id` hat. Das ist
in der Admin-Ansicht vermutlich ein **Dauer-Fehlalarm**, kein echtes
Datenproblem.

**Zweck-Interpretation**: Es gibt keinen Hinweis auf zwei unterschiedliche
fachliche Zwecke (z. B. "internes Kürzel" vs. "öffentliche ID") — alles
deutet auf denselben ursprünglich beabsichtigten Zweck (menschenlesbare
Pferde-ID) hin, wobei `readable_id` das Feld ist, das nach der Umstellung
tatsächlich weitergepflegt wurde, während `eqid` als Altlast aus der
allerersten Tabellenversion stehen blieb. **Das wird hier nicht
eigenmächtig vereinheitlicht** (Auftrag: keine Migration, keine
Vereinheitlichung) — nur dokumentiert.

**Konsequenz für die Pferdesuche (Phase 2 dieses Auftrags)**: Der neue
horse-resolution-Service verwendet ausschließlich `horses.readable_id`
als fachliche Anzeige-ID ("EQID: …" gegenüber dem Nutzer), niemals
`horses.eqid` (faktisch leer) und niemals die interne UUID `horses.id`
als vermeintliche EQID.

## 9. Generatoren — Gesamtübersicht

| Funktion | Tabelle(n) | Aktiv? | Schema |
|---|---|---|---|
| `generate_profile_readable_id()` | `profiles` | ja | `PID`/`PRID`/`KID` (Default), Zufalls-6-stellig via `generate_random_id()` |
| `generate_horse_readable_id()` | `horses` | ja | `EQID`, Zufalls-6-stellig via `generate_random_id('EQID')` |
| `generate_contact_readable_id()` | `contacts` | ja | `KID`/`PRID` je nach Kontakt-Rolle |
| `generate_random_id(prefix)` | Hilfsfunktion (SECURITY DEFINER) | ja | `prefix || '-' || 6-stellige Zufallszahl (100000–999999)` |
| `generate_smart_id()` | keine (nicht gebunden) | **nein** | `#MID-`/`#PRID-`/`#PID-`/`#KID-`/`#BID-`/`#EQID-`, 6-stelliges Zufalls-Hex statt Zufallszahl — inkompatibles Format zum aktiven Schema |

**Wichtige Konsequenz**: Es gibt aktuell **zwei unterschiedliche
ID-Formate** im Code verankert — das aktive (`PREFIX-123456`, Ziffern) und
ein totes, abweichendes (`#PREFIX-A1B2C3`, Hex, zusätzlich mit
`#`-Zeichen). Sollte `generate_smart_id()` je aktiviert werden, würde das
zu zwei inkompatiblen ID-Formaten in derselben Spalte führen — als
offener Punkt in Abschnitt 18 vermerkt.

## 10. Unique Constraints

- `profiles.readable_id`, `horses.readable_id`, `horses.eqid`,
  `contacts.readable_id`, `businesses.readable_id` (laut Typen, keine
  Migration) — jeweils `TEXT UNIQUE`, DB-seitig hart erzwungen.
- Kollisionsvermeidung bei der Generierung erfolgt **zusätzlich**
  anwendungsseitig durch eine Schleife mit `EXISTS`-Check vor dem Setzen
  (`generate_profile_readable_id`, `generate_horse_readable_id`,
  `generate_contact_readable_id`) — der `UNIQUE`-Constraint ist die
  eigentliche Garantie, die Schleife nur eine Optimierung, um seltene
  Kollisionen ohne Fehler zu retryen.

## 11. Änderbarkeit

- Keine der `readable_id`-Spalten hat einen `IMMUTABLE`-artigen Schutz auf
  DB-Ebene (kein Trigger, der ein UPDATE auf eine bereits gesetzte
  `readable_id` verhindert) — **aus den Migrationen nicht ausschließbar**,
  dass ein `UPDATE profiles SET readable_id = ...` durch berechtigten Code
  (z. B. Admin-Werkzeug) eine bestehende ID ändern könnte. Kein
  Anwendungscode-Pfad dafür gefunden, aber auch kein DB-seitiges Verbot.
- Der Generator-Trigger selbst prüft `IF NEW.readable_id IS NOT NULL AND
  NEW.readable_id != '' THEN` **nur bei INSERT** (`BEFORE INSERT`-Trigger)
  — ein expliziter Wert beim Insert wird respektiert (nicht überschrieben),
  ein UPDATE danach triggert die Generierungslogik gar nicht erst (kein
  `BEFORE UPDATE`-Trigger gefunden).
- **Praktischer Stand**: IDs sind faktisch stabil (kein Code ändert sie
  nachträglich), aber nicht durch ein DB-Constraint als unveränderlich
  garantiert.

## 12. Tatsächliche Nutzung (Zusammenfassung)

| ID | Wird im Anwendungscode aktiv gelesen/angezeigt? |
|---|---|
| KID | ja — Admin-Datenqualität, Verbindungssuche (`search_profile_by_readable_id`), Kunden-Anzeige |
| PID | ja — identisch zu KID (gleiche Spalte/Suchpfade), Provider-Kontext |
| EQID (`readable_id`) | ja — Pferdeakte, Admin-Datenqualität, Suchfunktion (`search_horse_by_readable_id`, siehe Sicherheitsfund Abschnitt 16) |
| `eqid` (Altspalte) | ja, aber **nur lesend, nie befüllt** — faktisch überall NULL bei neueren Pferden (Abschnitt 8) |
| MID | **nein** — nirgends erzeugt, nirgends gelesen |
| PRID | ja — Partner-Integration, Contacts-CRM |
| BID (`businesses`) | **nein** — Tabelle unbenutzt im Anwendungscode |
| "BID" (Botschafter) | ja, aber unabhängiges Konzept (Abschnitt 7b) |

## 13. Altbestand

- `customer_id_seq`/`horse_id_seq` (Abschnitt 2) — tote Sequenzen aus dem
  ursprünglichen, seit `20251208130517_...sql` ersetzten Generierungsschema.
- `horses.eqid` (Abschnitt 4/8) — tote Spalte, nie befüllt seit Einführung
  von `readable_id`.
- `generate_smart_id()` (Abschnitt 9) — nie aktivierter, inkompatibler
  Zweitgenerator.
- `display_id`-Namensraum — vollständig durch `readable_id` ersetzt
  (`RENAME COLUMN`), keine Spur von `display_id` mehr in aktuellen
  Migrationen außer der historischen Umbenennung selbst.

## 14. Konflikte

1. **`eqid` vs. `readable_id`** auf `horses` — siehe Abschnitt 8,
   ausführlichste Behandlung.
2. **Zwei ID-Generierungsschemata** (`generate_random_id`-basiert, aktiv,
   vs. `generate_smart_id`, inaktiv, inkompatibles Format) — Abschnitt 9.
3. **`search_horse_by_readable_id()` prüft keine Autorisierung** — liefert
   Name/Foto/Rasse/`owner_id` für **jedes** Pferd, dessen `readable_id`
   der aufrufende (nur noch: eingeloggte) Nutzer kennt oder errät, ohne
   `is_provider_for_horse()`- oder `access_grants`-Prüfung. Nach der
   Härtungsmigration `20260727120000_close_anon_secdef_leaks.sql:24-25`
   ist die Funktion zwar nicht mehr für `anon` aufrufbar (`REVOKE ...
   FROM PUBLIC, anon` / `GRANT ... TO authenticated, service_role`), aber
   **jeder eingeloggte Nutzer** (unabhängig von Rolle oder Zugriffsrecht
   auf das konkrete Pferd) kann sie weiterhin für beliebige `readable_id`-
   Werte aufrufen. Das zufällige 6-stellige Format (100000–999999, also
   ≤ 900.000 mögliche Werte pro Präfix) ist zudem brute-force-anfällig.
   **Für diesen Auftrag entscheidend**: die neue horse-resolution-Schicht
   (Phase 2) **verwendet diese Funktion deshalb bewusst nicht**, siehe
   Abschnitt 16.
4. **`is_provider_for_horse(_provider_id, _horse_id)` bindet `_provider_id`
   nicht an `auth.uid()`** — die Funktion ist `SECURITY DEFINER`, prüft
   intern nicht, ob der aufrufende Nutzer tatsächlich der übergebene
   `_provider_id` ist, und wurde von der Härtungsmigration
   `20260727120000_...sql` **nicht** in die Liste der eingeschränkten
   Funktionen aufgenommen (nur `search_horse_by_readable_id`,
   `search_profiles_universal`, `get_user_role` wurden dort behandelt).
   Rein technisch könnte ein beliebiger eingeloggter Nutzer für eine
   fremde `_provider_id` prüfen lassen, ob diese Zugriff auf ein
   bestimmtes Pferd hat (Boolean-Oracle, keine Detaildaten). **Für Phase 2
   wird diese Funktion deshalb ausschließlich mit der ID des jeweils
   authentifizierten Nutzers selbst aufgerufen** (`auth.uid()` aus der
   Session, nie eine vom Client sonst übergebene ID) — als
   Nutzungsregel, nicht als Fix der zugrundeliegenden Funktion (keine
   Migration in diesem Auftrag erlaubt).

## 15. UUID versus Fach-ID

- Jede Kernentität hat eine interne `UUID PRIMARY KEY` (`profiles.id`,
  `horses.id`, `contacts.id`, `businesses.id`) — das ist die einzige ID,
  die für Fremdschlüssel/RLS/Joins verwendet wird.
- Die Fach-IDs (`readable_id` mit Präfix) sind **rein für Menschen**
  gedacht (Anzeige, mündliche/schriftliche Referenz, z. B. am Telefon) —
  kein einziger Fremdschlüssel im Schema referenziert eine `readable_id`
  statt der UUID (verifiziert: kein `REFERENCES ...(readable_id)`
  gefunden).
- **Für den Observation-Flow bindend** (bereits in
  `docs/hufi-observation-phase-1-contracts.md` Abschnitt 7 als Prinzip
  festgelegt, hier bestätigt): jede Autorisierungsprüfung und jeder
  Fremdschlüssel arbeitet ausschließlich mit der UUID; die `readable_id`/
  `EQID` wird **nur zur Anzeige** an den Nutzer zurückgegeben, niemals als
  Zugriffsschlüssel verwendet. Die interne UUID darf umgekehrt niemals als
  vermeintliche `#eqid` angezeigt werden (siehe Auftrag) — Abschnitt 16
  setzt das für die neue horse-resolution-Schicht um.

## 16. Pferdezugriff

- **RLS auf `horses`, aktuell gültige SELECT-Policies** (letzte
  `CREATE POLICY`, nicht durch spätere Migration gedroppt):
  1. `"Horse owner full access"` (`20260109123207_...sql:20-22`, `FOR
     ALL`): `owner_id = auth.uid() AND deleted_at IS NULL`.
  2. `"Provider can view client horses timed"`
     (`20260305212804_...sql:151-163`, ersetzt die ältere `"Provider can
     view client horses"`): `deleted_at IS NULL AND EXISTS (... FROM
     access_grants ag WHERE ag.client_id = horses.owner_id AND
     ag.provider_id = auth.uid() AND ag.is_active = true AND ag.status =
     'active' AND (ag.valid_until IS NULL OR ag.valid_until > now()))`.
  3. `"Admins can manage all horses"` (`is_admin(auth.uid())`).
- **Konsequenz**: Eine normale, RLS-gebundene `SELECT`-Query auf `horses`
  (ohne Umweg über eine ungeprüfte RPC) liefert **strukturell nie**
  fremde, nicht-autorisierte Pferde — die Datenbank selbst filtert das,
  nicht Anwendungscode. Das ist die sicherste verfügbare Grundlage für die
  neue Pferdesuche und wird in Phase 2 entsprechend genutzt (direkte
  RLS-gebundene Query statt der ungeprüften `search_horse_by_readable_id()`-RPC,
  Abschnitt 14 Punkt 3).
- **`is_provider_for_horse(_provider_id, _horse_id)`**
  (`20260306042520_...sql:3-25`, `SECURITY DEFINER`, `STABLE`): prüft
  `horses.deleted_at IS NULL AND (profiles.created_by_provider_id =
  _provider_id OR EXISTS access_grants mit is_active=true)`. Nützlich als
  gezielter Boolean-Check für einen einzelnen, bereits bekannten
  `horseId` (z. B. `currentHorseId` aus dem Seitenkontext), siehe
  Nutzungsregel in Abschnitt 14 Punkt 4. Prüft **zwei** Zugriffspfade:
  `access_grants` UND `profiles.created_by_provider_id` — Letzteres ist im
  RLS-Policy-Set von `horses` selbst (Abschnitt oben) **nicht** enthalten,
  d. h. die Funktion ist potenziell **großzügiger** als die reine
  RLS-Query. Für die Pferdesuche wird deshalb ausschließlich die
  RLS-Query als primäre Quelle verwendet (konservativer, keine
  Doppeldeutigkeit); `is_provider_for_horse()` dient nur als zusätzlicher,
  expliziter Check für den `currentHorseId`-Kontextfall.

## 17. Besitzer- und Providerbeziehungen

- **Besitz**: `horses.owner_id` — genau ein Besitzer pro Pferd (kein
  Mehrfachbesitz-Modell im Schema, bestätigt in
  `docs/hufi-observation-workflow-analysis.md` Abschnitt 5).
- **Provider-Zugriff auf fremde (Kunden-)Pferde**: ausschließlich über
  `access_grants` (`client_id`, `provider_id`, `is_active`, `status`,
  `valid_until`, `can_view_basic`, `can_view_medical`,
  `can_create_appointments`) — **kein** direkter FK von `horses` auf einen
  Provider.
- **Zweiter, in `is_provider_for_horse()` mitgeprüfter Pfad**:
  `profiles.created_by_provider_id` — vermerkt, welcher Provider ein
  Kundenprofil ursprünglich angelegt hat. Dieser Pfad ist **nicht** Teil
  der aktuellen `horses`-RLS-Policies (Abschnitt 16) — ein Provider, der
  ein Kundenprofil angelegt, aber (noch) keinen `access_grants`-Eintrag
  für ein bestimmtes Pferd dieses Kunden hat, würde laut reiner RLS-Query
  dieses Pferd **nicht** sehen, laut `is_provider_for_horse()` aber schon.
  **Nicht in diesem Auftrag aufzulösen** (keine Migration erlaubt) — als
  offener Punkt in Abschnitt 18 vermerkt.
- **Mitarbeiter-Zugriff**: `employee_profiles.provider_id` — Mitarbeiter
  erben (laut `docs/hufi-observation-phase-1-contracts.md` Abschnitt 3)
  konzeptionell den Zugriff ihres Providers, aber es wurde **keine**
  `horses`-RLS-Policy gefunden, die `employee_profiles` einbezieht — für
  den MVP dieses Auftrags ohne Bedeutung (Solo-Provider-Fokus, wie in
  Phase-1-Contracts festgelegt), aber technisch bedeutet das: ein
  angestellter Mitarbeiter hat laut aktueller RLS **keinen** eigenen
  Zugriff auf die Pferde seines Arbeitgebers, nur der Provider selbst.

## 18. Offene technische Entscheidungen

1. **`eqid` vs. `readable_id`**: Soll die tote `horses.eqid`-Spalte in
   einer künftigen Migration entfernt oder nachträglich aus `readable_id`
   befüllt werden? (Nicht in diesem Auftrag zu entscheiden — reine
   Dokumentation.)
2. **`generate_smart_id()`**: toter Code mit inkompatiblem Format
   (`#PREFIX-Hex` statt `PREFIX-Ziffern`) — löschen oder für `businesses`/
   Mitarbeiter (`#MID`/`#BID`) tatsächlich aktivieren? Falls aktiviert,
   müsste das Format an das etablierte Schema angeglichen werden, sonst
   entstehen zwei ID-Formate nebeneinander.
3. **`businesses`-Tabelle**: Schema-Drift ohne Migration — soll sie
   nachträglich migriert (Provenance-Migration analog `hufi_memory`) oder
   als ungenutzt entfernt werden? Aktuell ohne jede Anwendungscode-Anbindung.
4. **`search_horse_by_readable_id()`**: fehlende Autorisierungsprüfung
   (Abschnitt 14 Punkt 3) — bekannter, bereits in `HUFI_TODO.md`
   referenzierter, laut dortiger Notiz noch nicht freigegebener Fund.
   Sollte in einer künftigen Sicherheitsrunde um einen
   `is_provider_for_horse()`-Check ergänzt werden. Für den
   Observation-Flow umgangen (Abschnitt 16), aber als produktbreites
   Risiko weiterhin offen.
5. **`is_provider_for_horse()` ohne `auth.uid()`-Bindung** (Abschnitt 14
   Punkt 4) — sollte langfristig `_provider_id` intern gegen `auth.uid()`
   validieren, statt sich auf disziplinierte Aufrufer zu verlassen.
6. **`created_by_provider_id`-Lücke in der `horses`-RLS** (Abschnitt 17) —
   soll dieser Zugriffspfad in die RLS-Policies aufgenommen werden, oder
   ist er bewusst nur für interne Prüfzwecke (`is_provider_for_horse()`)
   gedacht und soll RLS-seitig nie direkten Zugriff gewähren? Nicht aus
   den Dateien beantwortbar, betrifft eine bestehende, produktive Policy.
7. **MID für Mitarbeiter**: Soll `#MID` überhaupt eingeführt werden, oder
   bleiben Mitarbeiter dauerhaft ohne eigene Fach-ID (nur UUID +
   `provider_id`-Zuordnung)? Für den Observation-Flow ohne Konsequenz
   (Mitarbeiter-Delegation ist laut Phase-1-Contracts kein MVP-Bestandteil).
