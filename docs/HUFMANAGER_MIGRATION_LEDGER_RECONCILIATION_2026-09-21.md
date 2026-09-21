# HufManager — Migrations-Ledger-Abgleich (Repo ↔ Production ↔ Schema)

**Erstellt:** 2026-09-21
**Status:** `RECONCILED_READ_ONLY`
**Production wurde nicht verändert.** Alle Abfragen waren lesend. Kein `db push`,
keine `apply_migration`, kein Edge-Deploy, kein Webroot-Deploy.

Projekt: `vnschgjxkzzwzefqlrji` (HufManager, eu-central-1)
Repo: `/home/administrator/hufmanager`, Branch `release/hufmanager-lifecycle-2026-09-11`, HEAD `5b284ce8`

---

## 0. Kernbefund (korrigiert eine Annahme aus dem Release-Plan-Verlauf)

**Es ist bisher KEINE einzige der 9 Release-Migrationen in Production angewendet — auch Migration #1 nicht.**

Belege (Live-Schema, read-only):

| Objekt | erwartet aus | in Production |
|---|---|---|
| `create_customer_with_contact` | #1 | ❌ nicht vorhanden |
| `invoice_appointments.source` + `idx_invoice_appointments_autoflow_unique` | #2 | ❌ nicht vorhanden |
| `create_invoice_with_items_for_provider` | #3 | ❌ nicht vorhanden |
| `autoflow_on_appointment_completed` liest Vault | #4 | ❌ alte Fassung ohne Vault |
| `hm_pending_client_invites`, `create_pending_client_invite_v1`, `_hm_normalize_email` | #5 | ❌ nicht vorhanden |
| `handle_new_user` mit Pending-Invite-Zweig | #5/#8/#9 | ❌ alte Fassung |
| `create_invited_customer_with_contact` | #7 | ❌ nicht vorhanden |

Ledger-Kopf Production unverändert: **`20260911191418`** (`add_hm_reconciler_scheduler_objects_only_part_a`) —
identisch zum Stand des Pre-Release-Backups vom 2026-09-20 21:19.

**Konsequenz:** Die nächste sichere Migration ist **#1**, nicht #2.

---

## 1. Mengengerüst

| Menge | Wert |
|---|---|
| Repo-Dateien `supabase/migrations/*.sql` | 481 (480 mit 14-stelligem Timestamp + 1 mit fehlerhaftem Namen) |
| Einträge `supabase_migrations.schema_migrations` (Production) | 434 |
| Version-Strings, die in beiden identisch sind | 77 |
| Nur lokal (was `supabase db push` anwenden würde) | **404** |
| Nur remote | 357 |

Die CLI bestätigt das unabhängig: `supabase migration list --linked` → 838 Zeilen,
77 beidseitig, 404 nur lokal, 357 nur remote.

---

## 2. Methodik — warum der Abgleich beweisbar ist, nicht geraten

`supabase_migrations.schema_migrations` enthält die Spalte `statements text[]` mit dem
**tatsächlich angewendeten SQL-Text**. Für alle 434 Ledger-Einträge wurde
`md5(array_to_string(statements, E'\n'))` gezogen und gegen den md5 jeder Repo-Datei
(roh / ohne trailing newline / getrimmt) verglichen.

Damit ist "gleiche Migration unter anderem Namen" **inhaltlich bewiesen** und nicht aus
Dateinamen erschlossen.

Ergänzend wurde für jede Repo-Datei ohne Ledger-Treffer der **Schema-Effekt** direkt gegen
das Live-Schema geprüft (Existenz von Tabellen, Funktionen, Spalten, Enums, Policies).

---

## 3. Klassifikation aller 434 Ledger-Einträge

| Klasse | Anzahl | Bedeutung |
|---|---|---|
| **A** | 71 | Version *und* Inhalt identisch zur Repo-Datei |
| **B** | 317 | **Inhalt byte-identisch**, Timestamp abweichend |
| **C** | 46 | Kein byte-identisches Repo-File |

### B — Timestamp-Drift (Kategorie 5: reine Ledger-/Naming-Abweichung)

Verteilung `lokal − remote`: **+1s: 263 · +2s: 50 · +3s: 2 · +4s: 2** — kein einziger Fall > 5s.

Das ist die systematische Lovable-Signatur: die Migration wird auf dem Server mit Sekunde *n*
registriert, die exportierte Datei trägt Sekunde *n+1*.

**SCHEMA-EFFEKT: keiner. BEREITS ANGEWENDET: ja, inhaltlich bewiesen. RISIKO bei Neuanwendung: hoch
(367 dieser Migrationen sind nicht idempotent). EMPFOHLENE BEHANDLUNG: niemals erneut anwenden.**

### C — 46 Ledger-Einträge ohne byte-gleiches Repo-File

| Untergruppe | Anzahl | Erklärung |
|---|---|---|
| Repo-Datei **umbenannt** (Name gleich, Timestamp anders) | 8 | z. B. Ledger `20260718165536 fix_idor_partner_provider_admin` ↔ Repo `20260718090000_fix_idor_partner_provider_admin.sql` |
| Repo-Datei **inhaltlich nachbearbeitet** bei gleichem Timestamp | 6 | `20260511180000 horse_media`, `20260718210220`, `20260718210309`, `20260814140333`, `20260814141500`, `20260814144956` |
| Monolith im Repo, **in Einzelschritte gesplittet** angewendet | 27 | `20260910213951` → 7 Steps · `20260910223627` → 6 Steps · `20260911055452` → 8 Steps · plus 6 Einzel-Umbenennungen |
| **Nur im Ledger, kein Repo-File** | 3 | `20251205090232` (3316 B), `20260322090021` (698 B), `20260426104809 create_hufi_memories_markdown_table`, `20260908220636 hufi_data_core_event_store` |

Sonderfall `20260911191418`: Ledger-Name `add_hm_reconciler_scheduler_objects_only_part_a`,
Repo-Datei `20260911072233_add_hm_reconciler_scheduler.sql`.
**Nur Part A wurde angewendet** — `cron.schedule` (Part B) bewusst ausgelassen. Repo und Production
unterscheiden sich hier inhaltlich mit Absicht.

---

## 4. Klassifikation der 93 Repo-Dateien ohne Ledger-Inhaltstreffer

| Klasse | Anzahl | Behandlung |
|---|---|---|
| Über Namen einem Ledger-Eintrag zugeordnet (umbenannt/gesplittet/nachbearbeitet) | 23 | angewendet — nicht erneut anwenden |
| **Legacy, ohne Ledger-Eintrag, Schema-Effekt aber in Production vorhanden** | 36 | angewendet — nicht erneut anwenden |
| **Nie angewendet, nicht Release-Scope** | 8 | liegen lassen, separate Entscheidung |
| **Release-Migrationen #1–#9** | 9 | echte fehlende Migrationen |
| Historisch, Status nicht einzeln verifiziert | 17 | außerhalb der Release-Kette, keine Aktion |

### 4a — Kategorie 3: Legacy bereits angewendet, aber ohne Ledger-Eintrag (36)

Diese Migrationen wurden per SQL-Editor/manuell eingespielt. Der Ledger kennt sie nicht,
das Schema schon. Auswahl mit Beleg:

| Repo-Datei | Beleg im Live-Schema |
|---|---|
| `20260911204057…_entitlement_schema_v1` | `product_entitlements`, `touch_product_entitlements_updated_at_v1` |
| `20260911204058…_entitlement_writer_v1` | `hm_project_hufmanager_entitlement_v1` |
| `20260911204059…_entitlement_reconciler_v1` | `hm_reconcile_hufmanager_entitlements_v1` |
| `20260911204100…_access_context_api_v1` | `has_hufmanager_access_v1`, `get_hufmanager_access_context_v1` |
| `20260912051500…_rls_direct_api_enforcement_v1` | **10** Policies `hufmanager_slim_entitlement_gate*` |
| `20260912051600…_legacy_backfill_v1` | `hm_backfill_hufmanager_slim_legacy_entitlements_v1` |
| `20260912051700_fix_create_invoice_with_items_entitlement_gate_v1` | `create_invoice_with_items` enthält `hufmanager_access`-Gate |
| `20260908155536_atomic_invoice_with_items` | `create_invoice_with_items` |
| `20260908221000_p0_invoice_schema_reconstruction` | `invoices.payment_status` |
| `20260909135707_make_invoice_number_atomic` | `generate_invoice_number` |
| `20260910150139/150140` Lifecycle-Prereqs | Enums + `hm_lifecycle_events` |
| `20260911061736_add_hufi_data_staging_foundation` | `hufi_data_events`, `hufi_data_apply_state` |
| HufiApp-Flavor (`agent_tasks`, `hufi_task_queue`, `hufi_voice_credits`, `bhs_horse_subscriptions`, `hufi_followup_suggestions`, `vault_premium_gate`, `profiles.salutation/profession_slug/onboarding_step/signup_app`, `business_settings.new_client_days`, `leads.metadata`, `emergency_otp`, `pg_cron`) | jeweils Objekt vorhanden |
| `20260610090000_drop_hufi_memories` | `hufi_memories` **nicht** vorhanden → Drop wirksam |

**Der komplette HufManager-Slim-Entitlement-Layer läuft in Production, steht aber in keinem
Ledger-Eintrag.** Das ist die größte Ledger-Lücke und der Hauptgrund, warum `db push` gefährlich ist.

### 4b — Kategorie: nie angewendet, außerhalb Release-Scope (8)

| Repo-Datei | fehlendes Objekt |
|---|---|
| `20260503193000_add_leads_plan_tier` | `leads.plan_tier` |
| `20260629140000_profession_insights` | `profession_insights` |
| `20260812231000_product_membership_splitter` | `product_memberships`, `product_membership_decisions` |
| `20260812233100_security_definer_body_hardening_prepared` | PREPARED, nie angewendet |
| `20260812233200_canonical_readable_id_guard_prepared` | `prevent_canonical_readable_id_change` |
| `20260813102303_product_entitlements_trial_billing_prepared` | `saas_billing_events`, `expire_hufmanager_trials` |
| `20260813152833_ghost_customer_access_grant_repair` | `finalize_ghost_customer_access` (teilweise vorhanden) |
| `20260908215000_p0_trusted_app_role_sync` | `sync_trusted_app_role` |

Diese sind **nicht** Teil des Releases und dürfen nicht mitgeschleppt werden.

### 4c — Status nicht einzeln verifiziert (17)

Reine Policy-/Grant-/ACL-Migrationen ohne eindeutig prüfbares Einzelobjekt, alle historisch und
außerhalb der Release-Kette. Sie beeinflussen die Entscheidung über #1/#2 nicht:

`20260226120000_emergency-client-recovery-system`, `20260513120000_hufi_routines_cron`,
`20260528130000_hufi_faq_bhs_balance`, `20260610091000_trial_expiry_cron`,
`20260716120000_consolidate_task_queue`, `20260812233000_function_execute_privilege_hardening_prepared`,
`20260813001000_storage_policy_hardening_prepared`, `20260814160400/163800/172700/182100/190500/191300_p1_storage_*`,
`20260908213500_p0_invoice_rpc_acl_correction`, `20260908222500_p0_db_lint_corrections`,
`20260909125347_fix_supplier_purchase_order_rls`, `20260910063819_tenant_scope_invoice_number_uniqueness`

(Kontext: `storage` hat 80 aktive Policies, `invoice_items` 1 — die Hardening-Reihe ist also
zumindest teilweise wirksam.)

---

## 5. Die 9 echten fehlenden Migrationen (Kategorie 1 + 4)

| # | Migration | SCHEMA-EFFEKT | ANGEWENDET | RISIKO | BEHANDLUNG |
|---|---|---|---|---|---|
| 1 | `20260917120000_add_create_customer_with_contact_v1` | `CREATE OR REPLACE FUNCTION create_customer_with_contact(jsonb,jsonb)` + REVOKE/GRANT | **NEIN** | niedrig — rein additiv, kein bestehendes Objekt berührt | **als nächstes anwenden** |
| 2 | `20260917125000_add_autoflow_invoice_appointment_idempotency_v1` | `invoice_appointments.source` (nullable) + partieller UNIQUE-Index + Index auf `appointment_id` | **NEIN** | niedrig — Tabelle hat **0 Zeilen**, Index kann nicht an Altdaten scheitern | nach #1 |
| 3 | `20260917130000_add_create_invoice_with_items_for_provider_v1` | neue RPC | NEIN | niedrig | nach #2 |
| 4 | `20260917140000_fix_autoflow_trigger_auth_vault_v1` | ersetzt `autoflow_on_appointment_completed/_signed`, neu `_autoflow_trigger_endpoint` | NEIN | mittel — ersetzt aktiven Trigger; Vault ist leer → HTTP-Call wird übersprungen (`RAISE WARNING`), `UPDATE appointments` schlägt nie fehl | nach #3 |
| 5 | `20260917150000_add_pending_client_invite_contract_v1` | `hm_pending_client_invites` + 3 RPCs + ersetzt `handle_new_user` | NEIN | mittel — ersetzt aktiven Auth-Trigger | nach #3 |
| 6 | `20260917155000_fix_invite_tenant_auto_assign_v1` | ersetzt `auto_assign_client_to_provider` | NEIN | mittel | nach #5 |
| 7 | `20260917160000_add_create_invited_customer_with_contact_v1` | neue RPC | NEIN | niedrig | nach #5, #6 |
| 8 | `20260920120000_fix_pending_invite_ghost_merge_v1` | ersetzt `create_invited_customer_with_contact`, `create_pending_client_invite_v1`, `handle_new_user` | NEIN | mittel | nach #7 |
| 9 | `20260920190000_fix_cross_provider_ghost_takeover_v1` | ersetzt `create_invited_customer_with_contact` (CASE-B-Guard) | NEIN | mittel | **zwingend nach #8** |

`#1` und `#2` sind voneinander unabhängig; `#3` setzt `#2` voraus.

---

## 6. `supabase db push` ist verboten

`db push` wendet **jede lokale Migration an, deren Version nicht im Remote-Ledger steht** — hier **404 Stück**,
davon **395 bereits angewendet**.

Konkrete Folgen bei Ausführung:

* 263 + 50 + 4 Migrationen mit 1–4 s Timestamp-Drift würden ein zweites Mal laufen — darunter
  `CREATE TYPE`, `CREATE TABLE` ohne `IF NOT EXISTS`, `ALTER TABLE … ADD CONSTRAINT`, `CREATE POLICY`.
  Erster Fehler bricht ab, hinterlässt aber einen teil-angewendeten Stand.
* Der gesamte Entitlement-Layer (7 Dateien) würde erneut ausgeführt und die 10 aktiven
  RLS-Gate-Policies neu angelegt bzw. kollidieren.
* Die 8 nie angewendeten `_prepared`-Migrationen würden **ungewollt scharf geschaltet** —
  darunter `product_membership_splitter` und `product_entitlements_trial_billing_prepared`,
  die Abrechnungslogik verändern.

**Regel: keine Migration erneut anwenden, nur weil der Ledger-Name abweicht.**

---

## 7. Kanonischer Zielzustand — zwei Wege

### Weg A — empfohlen: Ledger unangetastet, Release migrationsweise

Die 9 Release-Migrationen einzeln anwenden (`apply_migration` bzw. SQL-Editor), jede registriert
ihren eigenen Ledger-Eintrag. Die historische Drift bleibt als dokumentierte Altlast bestehen —
sie ist harmlos, solange `db push` nie benutzt wird.

* Production-Schreibvorgänge: nur die 9 Migrationen.
* Risiko: minimal, jede Migration einzeln verifizierbar.
* Nachteil: `db push` bleibt dauerhaft gesperrt.

### Weg B — vollständige Ledger-Sanierung (nur mit separater Freigabe)

`supabase migration repair --status applied <version>` für die **395 lokal vorhandenen, nachweislich
bereits angewendeten** Versionen. Das schreibt **ausschließlich in `supabase_migrations.schema_migrations`
und verändert kein Schema**. Danach wären genau die 9 Release-Migrationen offen und `db push` wieder sicher.

* Production-Schreibvorgänge: 395 Ledger-Zeilen.
* Der Ledger wächst auf 829 Einträge, 395 davon semantisch doppelt (alt: gedriftete Version, neu: Repo-Version).
* Zusätzlich zu klären: die 8 nie angewendeten Nicht-Release-Migrationen müssten als
  `--status reverted` markiert oder aus dem Repo entfernt werden, sonst zieht `db push` sie mit.

**Weg B ist nicht Voraussetzung für den Release.** Empfehlung: Weg A jetzt, Weg B später separat.

---

## 8. Reproduzierbarkeit

Der Abgleich ist vollständig reproduzierbar:

```sql
-- Remote-Fingerprint (read-only, in Blöcken ≤ 20 Zeilen wegen MCP-Timeouts)
select version, name,
       md5(array_to_string(statements, E'\n'))   as h,
       length(array_to_string(statements, E'\n')) as len
from supabase_migrations.schema_migrations
order by version;
```

```bash
# Lokaler Fingerprint
cd supabase/migrations && for f in *.sql; do
  printf '%s %s\n' "$(md5sum < "$f" | cut -d' ' -f1)" "$f"
done
```

Gleicher md5 ⇒ dieselbe Migration, unabhängig vom Dateinamen.

---

## 9. Offene Punkte

1. **Fehlerhafter Dateiname:** `20260226_emergency_first_aid_system.sql` hat keinen 14-stelligen
   Timestamp. Die CLI interpretiert das als Version `20260226`. Schema-Effekt (`emergency_otp`)
   ist in Production vorhanden. Umbenennen auf `20260226000000_…` wäre sauber — reine Repo-Änderung.
2. **4 Ledger-Einträge ohne Repo-File** (`20251205090232`, `20260322090021`, `20260426104809`,
   `20260908220636`): in Production angewendet, Quelltext existiert nur im Ledger. Bei Bedarf aus
   `statements` zurück ins Repo schreiben.
3. **17 historische Policy-/Grant-Migrationen** ohne Einzelverifikation (§4c).
4. **Vault leer** (`0 secrets`) — Autoflow bleibt nach #4 inaktiv. Kein Blocker, siehe Release-Plan §6.

---

## 10. Ergebnis

```
LEDGER_RECONCILED=YES
SAFE_FOR_MIGRATION_2=NO
```

`SAFE_FOR_MIGRATION_2=NO`, weil **Migration #1 nicht angewendet ist**. Die Release-Kette hat noch
nicht begonnen. Technisch wäre #2 isoliert unbedenklich (`invoice_appointments` ist leer), aber die
nächste korrekte Aktion ist **#1**, danach **#2**.

**Production ist unverändert. Nächster Schritt erfordert Pascals Freigabe.**

---

# NACHTRAG — Migration #1 angewendet (2026-09-21)

**Status:** `MIGRATION_1_APPLIED`
Angewendet: **ausschließlich** `20260917120000_add_create_customer_with_contact_v1.sql`.
Kein `db push`, kein `migration repair`, keine `_prepared`-Migration, keine Migration #2,
keine Edge-/Scheduler-/Service-Aktion.

## N.1 Artefakt-Integrität (vor Anwendung)

| Prüfung | Ergebnis |
|---|---|
| `git status` der Datei | leer — unverändert gegenüber HEAD |
| letzter Commit | `110dffc5` (Release-Freeze 2026-09-20) |
| `git diff HEAD` | leer |
| md5 (roh, mit trailing NL) | `370f44b7e6ee790f431de23727795a92` |
| md5 (ohne trailing NL) | `5df63e4ff759f7df487080626a9b683f` |
| erwarteter Function-Body-md5 | `7bea6a4333eb55a8a9bb314fa9f586a4` (2106 Zeichen) |

**Übertragungsbeweis:** Vor dem Schreiben wurde der SQL-Text in einem reinen Lese-Statement
an Production gesendet und dort gehasht → `md5 = 5df63e4ff759f7df487080626a9b683f`.
Damit war die Byte-Gleichheit des übertragenen Textes zum Repo-Artefakt bewiesen, bevor
irgendetwas geschrieben wurde.

## N.2 Pre-State (read-only)

```
create_customer_with_contact = 0 (nicht vorhanden)
public functions             = 186
public tables                = 292
public policies              = 753   (pg_policy gesamt: 835)
public columns               = 4005
ledger entries               = 434   head = 20260911191418
profiles / contacts rows     = 103 / 44

fn_md5 [proname <  'g']      = fa38acc466d668ac4d20f4e9e0ec21d3  (n=44)
fn_md5 ['g' <= name < 'p']   = 5b334824a4ea94f1ae2f9591d2878253  (n=87)
fn_md5 [proname >= 'p']      = 9f6a484b15368822e23c3a5bece4d875  (n=55)
policy_catalog_md5           = d70606ead91dbc071b021335186b6c99  (n=835)
column_catalog_md5           = 250670baa2d7cb94aa11bdd1625e019c  (n=4005)
```

Abhängigkeiten vorab geprüft: `has_role(uuid, app_role)` ✅, Typ `contact_category` ✅,
Typ `app_role` ✅, `profiles` 10/10 benötigte Spalten ✅, `contacts` 7/7 ✅.

## N.3 Anwendungsverlauf — zwei sauber zurückgerollte Fehlversuche

Zwei Versuche über `execute_sql` mit expliziter `begin; … commit;`-Klammer liefen in einen
Client-Timeout. **Beide wurden vollständig zurückgerollt** — unmittelbar danach verifiziert:
`create_customer_with_contact` nicht vorhanden, Ledger unverändert bei 434, Kopf unverändert
`20260911191418`. Die Atomarität hat in beiden Fällen gegriffen; Production war zu keinem
Zeitpunkt in einem Teilzustand.

Der dritte Versuch über `apply_migration` (serverseitig selbst transaktional) meldete ebenfalls
einen Client-Timeout, war aber **committed** — anschließend durch Ledger-Abfrage festgestellt,
nicht angenommen.

> **Lehre für die nächsten Migrationen:** Nach jedem Timeout **erst den Zustand abfragen**,
> niemals blind wiederholen. Ein Retry wäre hier gefahrlos gewesen (PK-Konflikt auf der
> Ledger-Version hätte die gesamte Transaktion zurückgerollt), aber das ist nicht allgemein
> garantiert.

## N.4 Post-State und Postcheck

| Prüfung | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| Signatur | `create_customer_with_contact(jsonb,jsonb)` | identisch | ✅ |
| Rückgabetyp | `jsonb` | `jsonb` | ✅ |
| Sprache | `plpgsql` | `plpgsql` | ✅ |
| `SECURITY DEFINER` | true | true | ✅ |
| `proconfig` | `search_path=public` | `search_path=public` | ✅ |
| Function-Body md5 | `7bea6a4333eb55a8a9bb314fa9f586a4` | identisch | ✅ |
| Function-Body Länge | 2106 | 2106 | ✅ |
| Owner | `postgres` | `postgres` | ✅ |
| Ledger `statements` md5 | `5df63e4ff759f7df487080626a9b683f` | identisch | ✅ |
| neue Ledger-Zeilen | 1 | 1 | ✅ |

### Grants (ACL nach Anwendung)

```
postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres
```

| Rolle | EXECUTE | Soll |
|---|---|---|
| `PUBLIC` | ❌ nein | revoked ✅ |
| `anon` | ❌ nein | revoked ✅ |
| `authenticated` | ✅ ja | granted ✅ |
| `service_role` | ✅ ja | granted ✅ |
| `postgres` (Owner) | ✅ ja | Owner-Default ✅ |

Gegengeprüft über `has_function_privilege()`: anon/public = 0, authenticated = 1, service_role = 1.

### Seiteneffekte

| Katalog | Pre | Post | Ergebnis |
|---|---|---|---|
| fn_md5 [`<'g'`] **ohne** die neue Funktion | `fa38acc466d668ac4d20f4e9e0ec21d3` (44) | `fa38acc466d668ac4d20f4e9e0ec21d3` (44) | ✅ unverändert |
| fn_md5 [`'g'…'p'`] | `5b334824a4ea94f1ae2f9591d2878253` (87) | identisch (87) | ✅ unverändert |
| fn_md5 [`>='p'`] | `9f6a484b15368822e23c3a5bece4d875` (55) | identisch (55) | ✅ unverändert |
| policy_catalog_md5 | `d70606ead91dbc071b021335186b6c99` (835) | identisch (835) | ✅ unverändert |
| column_catalog_md5 | `250670baa2d7cb94aa11bdd1625e019c` (4005) | identisch (4005) | ✅ unverändert |
| public functions | 186 | **187** | ✅ exakt +1 |
| public tables | 292 | 292 | ✅ unverändert |
| profiles / contacts | 103 / 44 | 103 / 44 | ✅ keine Datenänderung |

Der Nachweis über „Bucket A **ohne** die neue Funktion ist bit-identisch zum Pre-State" zeigt:
in diesem Namensbereich wurde **keine** bestehende Funktion überschrieben, ersetzt oder in ihren
Attributen verändert. Kein `CREATE OR REPLACE` hat eine Fremdfunktion getroffen.

### Nichts anderes aktiviert

| Objekt | vorhanden |
|---|---|
| `product_memberships`, `product_membership_decisions`, `saas_billing_events`, `profession_insights` | ❌ nein — keine `_prepared`-Migration aktiviert |
| `expire_hufmanager_trials`, `classify_legacy_billing_state`, `sync_trusted_app_role`, `prevent_canonical_readable_id_change`, `finalize_ghost_customer_access` | ❌ nein |
| `invoice_appointments.source` (#2) | ❌ nein |
| `create_invoice_with_items_for_provider` (#3), `_autoflow_trigger_endpoint` (#4), `hm_pending_client_invites` / `create_pending_client_invite_v1` (#5), `create_invited_customer_with_contact` (#7) | ❌ nein |

### Security-Lints

Der Advisor-Endpoint (`get_advisors`) war über mehrere Versuche serverseitig nicht erreichbar
(scheitert bereits an seinem eigenen „project user check"). Die relevanten Lints wurden deshalb
direkt als SQL ausgeführt:

| Lint | Ergebnis |
|---|---|
| SECURITY-DEFINER-Funktionen in `public` **ohne** gesetztes `search_path` | **0** ✅ |
| neue Funktion für `anon`/`PUBLIC` ausführbar | **0** ✅ |
| neue Funktion für `authenticated` / `service_role` ausführbar | 1 / 1 ✅ |

### Funktionaler Negativtest

Aufruf ohne Auth-Kontext (`auth.uid() = NULL`):

```
ERROR: P0001: Authentication required
CONTEXT: PL/pgSQL function create_customer_with_contact(jsonb,jsonb) line 14 at RAISE
```

Fail-closed vor jedem INSERT. Danach verifiziert: `profiles` 103, `contacts` 44,
0 Datensätze mit Testnamen — **keine Testdaten in Production**.

## N.5 Abweichung vom kanonischen Ziel (bewusst nicht korrigiert)

`apply_migration` erlaubt keine Vorgabe der Ledger-Version und hat serverseitig
**`20260921073500`** vergeben. Die Repo-Datei heißt `20260917120000_…`.

| | |
|---|---|
| Ledger-Version | `20260921073500` |
| Repo-Dateiname | `20260917120000` |
| `statements` | byte-identisch zum Repo-Artefakt ✅ |
| Schema-Effekt | korrekt und vollständig ✅ |

**Folge:** ein zusätzliches Drift-Paar. `supabase migration list` zeigt künftig
`20260917120000` als „nur lokal" und `20260921073500` als „nur remote".
Funktional harmlos, solange `db push` gesperrt bleibt — inhaltlich aber nicht kanonisch.

**Nicht eigenmächtig korrigiert.** Die Korrektur wäre ein einzeiliges
`UPDATE supabase_migrations.schema_migrations SET version='20260917120000'
WHERE version='20260921073500';` — eine reine Ledger-Änderung ohne Schema-Wirkung,
jederzeit nachholbar. Sie fällt unter „keine Ledger-Sanierung ohne Freigabe" und wartet
deshalb auf eine Entscheidung.

## N.6 Aktualisiertes Mengengerüst

| | vorher | jetzt |
|---|---|---|
| Ledger-Einträge | 434 | **435** |
| Ledger-Kopf | `20260911191418` | **`20260921073500`** |
| Release-Migrationen offen | 9 | **8** (#2–#9) |
| `db push` würde anwenden | 404 | 404 (unverändert, da #1 unter anderer Version registriert) |

## N.7 Ergebnis

```
MIGRATION_1_APPLIED=YES
MIGRATION_1_POSTCHECK=PASS
PRODUCTION_SCHEMA_SIDE_EFFECTS=NONE
LEDGER_DRIFT_UNCHANGED=NO   (+1 neues Drift-Paar, siehe N.5)
SAFE_FOR_MIGRATION_2=YES
```

**STOPP vor Migration #2.** Keine weitere Anwendung ohne ausdrückliche Freigabe.

---

# NACHTRAG 2 — Gezielte Ledger-Korrektur der Migration-#1-Version (2026-09-21)

**Status:** `MIGRATION_1_LEDGER_CANONICALIZED`
**Umfang:** genau **ein** `UPDATE` auf **eine** Zeile in `supabase_migrations.schema_migrations`.
Ausschließlich die Spalte `version`. **Kein** Schemaobjekt berührt, **keine** Migration #2,
**kein** `db push`, **kein** `migration repair`, **keine** allgemeine Ledger-Sanierung,
**keine** automatische Reparatur historischer Drift.

## N2.1 Ursache

`apply_migration` (MCP) erlaubt keine Vorgabe der Ledger-Version und vergibt serverseitig einen
eigenen Timestamp aus der Ausführungszeit. Bei der Anwendung von Migration #1 am 2026-09-21
entstand dadurch der Ledger-Eintrag `20260921073500`, obwohl das kanonische Repo-Artefakt
`20260917120000_add_create_customer_with_contact_v1.sql` heißt.

Ergebnis war ein zusätzliches Drift-Paar (siehe N.5): `20260917120000` „nur lokal",
`20260921073500` „nur remote" — funktional harmlos, inhaltlich nicht kanonisch.

## N2.2 Alter / neuer Wert

| | Wert |
|---|---|
| **alter Wert** `version` | `20260921073500` |
| **neuer Wert** `version` | `20260917120000` |
| geänderte Spalten | **ausschließlich** `version` |
| unverändert | `name`, `statements`, `created_by`, `idempotency_key`, `rollback` |

## N2.3 Beweis der Zuordnung (read-only, vor der Änderung)

| # | Bedingung | Prüfung | Ergebnis |
|---|---|---|---|
| 1 | Welcher Ledger-Datensatz stammt aus Migration #1? | Volle Zeile abgefragt: `version=20260921073500`, `name=add_create_customer_with_contact_v1`, `array_length(statements,1)=1`, `created_by=passaondigital@gmail.com`, `idempotency_key=NULL`, `rollback=NULL` | eindeutig ✅ |
| 2 | Inhalt entspricht Migration #1 | `md5(array_to_string(statements,E'\n'))` = **`5df63e4ff759f7df487080626a9b683f`** = md5 der Repo-Datei ohne trailing newline. Länge `5568` Zeichen = 5582 Bytes der Repo-Datei (14 Bytes Differenz = UTF-8-Mehrbyte-Zeichen, lokal per Python gegengerechnet: `bytes 5582 / chars 5568`). Name-Suffix identisch zum Dateinamen. | byte-identisch ✅ |
| 3 | `20260917120000` noch nicht im Ledger | `count(*) where version='20260917120000'` → **0**; zusätzlich kein Treffer auf `version like '2026091712%'` | frei ✅ |
| 4 | `20260921073500` keinem anderen Schema-Effekt zugeordnet | `statements` enthält **genau 1 Element**, und dieses ist die Repo-Datei #1 — nichts sonst. Gegenprobe über den gesamten Ledger: Treffer auf `md5=5df63e…` **oder** `name='add_create_customer_with_contact_v1'` **oder** `statements ilike '%create_customer_with_contact%'` → **genau 1 Zeile**, keine Dublette. Schema-Effekt verifiziert: `create_customer_with_contact(jsonb,jsonb)`, Body-md5 `7bea6a4333eb55a8a9bb314fa9f586a4`, Länge 2106 — identisch zu N.4. | eindeutig ✅ |
| 5 | Anzahl zu ändernder Zeilen = 1 | `PRIMARY KEY (version)` auf der Tabelle, `WHERE` trifft den PK → maximal 1 Zeile; Existenz mit 1 belegt | exakt 1 ✅ |

Zusätzlich geprüft (Isolationsnachweis): **0** eingehende Foreign Keys auf
`supabase_migrations.schema_migrations`, **0** User-Trigger auf der Tabelle.
Constraints: `PRIMARY KEY (version)`, `UNIQUE (idempotency_key)`.

Repo-Artefakt vorab verifiziert: `git status` leer, md5 roh `370f44b7e6ee790f431de23727795a92`,
md5 ohne trailing NL `5df63e4ff759f7df487080626a9b683f` — identisch zu N.1.

## N2.4 Backup / Restore-Weg

Vor der Änderung gesichert unter `docs/backups/`:

| Datei | Inhalt |
|---|---|
| `ledger_row_20260921073500_backup_2026-09-21.sql` | vollständiges, lauffähiges Restore-Skript (alle 6 Spalten, `statements` wörtlich dollar-quoted eingebettet) |
| `ledger_row_20260921073500_statements.exact.txt` | exakter `statements`-Inhalt, 5582 Bytes, md5 `5df63e4ff759f7df487080626a9b683f` |
| `ledger_row_20260921073500_statements.sql` | Kopie des Repo-Artefakts |

Integrität des Backups verifiziert: der aus dem Restore-Skript **zurückextrahierte**
Dollar-Quote-Block hat md5 `5df63e4ff759f7df487080626a9b683f` — also bit-identisch zum
gesicherten Ledger-Inhalt. Keine Delimiter-Kollision (`LEDGERBK` kommt im Quelltext 0× vor).

**Restore** (stellt exakt den Zustand vor der Korrektur wieder her):

```bash
psql "$DB_URL" -f docs/backups/ledger_row_20260921073500_backup_2026-09-21.sql
```

Alternativ minimal, solange `statements` unangetastet ist:

```sql
update supabase_migrations.schema_migrations
   set version = '20260921073500'
 where version = '20260917120000';
```

## N2.5 Durchgeführte Änderung

Ein einziges Statement, atomar (Einzelstatement = eigene Transaktion), mit Inhalts-Guard
in der `WHERE`-Klausel und `RETURNING` als Zeilennachweis:

```sql
update supabase_migrations.schema_migrations
   set version = '20260917120000'
 where version = '20260921073500'
   and name = 'add_create_customer_with_contact_v1'
   and md5(array_to_string(statements, E'\n')) = '5df63e4ff759f7df487080626a9b683f'
returning version, name, md5(array_to_string(statements, E'\n'));
```

`RETURNING` lieferte **genau 1 Zeile** → `ROWS_CHANGED=1`.

Der `PRIMARY KEY (version)` war die zusätzliche Absicherung: hätte `20260917120000` wider
Erwarten bereits existiert, wäre das Statement mit Unique-Violation vollständig
zurückgerollt worden.

### Anmerkung zum Ausführungsweg

Zwei vorherige Versuche mit einem `DO $$ … $$`-Block (mit denselben Guards plus
`GET DIAGNOSTICS`-Prüfung auf `row_count = 1`) liefen in einen Client-Timeout des
MCP-Connectors. Gemäß der Lehre aus N.3 wurde **nach jedem Timeout erst der Zustand
abgefragt, nicht blind wiederholt** — beide Male war der Ledger nachweislich unverändert
(`20260921073500` vorhanden, `20260917120000` nicht vorhanden), die Transaktionen waren
also sauber zurückgerollt. Production war zu keinem Zeitpunkt in einem Teilzustand.
Der Connector war während der gesamten Sitzung flaky; auch reine Lesequeries timeouteten
wiederholt und lieferten beim Retry korrekt.

## N2.6 Postcheck

| Prüfung | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| `20260921073500` vorhanden | 0 | **0** | ✅ |
| `20260917120000` vorhanden | genau 1 | **1** | ✅ |
| Ledger-Einträge gesamt | 435 (unverändert) | **435** | ✅ |
| Ledger-Kopf | `20260917120000` | `20260917120000` | ✅ |
| `name` | `add_create_customer_with_contact_v1` | identisch | ✅ |
| `statements` md5 / Länge | `5df63e4ff759f7df487080626a9b683f` / 5568 | identisch | ✅ |
| `array_length(statements,1)` | 1 | 1 | ✅ |
| `created_by` | `passaondigital@gmail.com` | identisch | ✅ |
| `idempotency_key` / `rollback` | NULL / NULL | NULL / NULL | ✅ |

### Keine weiteren Ledger-Zeilen verändert

Fingerprint über **alle übrigen** Einträge
(`md5(string_agg(version‖name‖md5(statements)‖created_by order by version))`):

| | Pre | Post |
|---|---|---|
| `ledger_others_md5` | `843ccd2744276f447ca949286f52d5c5` | **`843ccd2744276f447ca949286f52d5c5`** ✅ |
| `n_others` | 434 | **434** ✅ |

**Bit-identisch** → keine andere Ledger-Zeile wurde angefasst, **keine historische Drift
automatisch repariert**.

### Production-Schema unverändert

| Katalog | Pre | Post | Ergebnis |
|---|---|---|---|
| public functions | 187 | **187** | ✅ |
| public tables | 292 | **292** | ✅ |
| Policies (`pg_policy` gesamt) | 835 | **835** | ✅ |
| `profiles` / `contacts` Zeilen | 103 / 44 | **103 / 44** | ✅ |

### Funktion aus Migration #1 weiterhin vorhanden und identisch

| Attribut | Pre | Post | Ergebnis |
|---|---|---|---|
| Signatur | `create_customer_with_contact(jsonb,jsonb)` | identisch | ✅ |
| Body md5 | `7bea6a4333eb55a8a9bb314fa9f586a4` | identisch | ✅ |
| Body Länge | 2106 | 2106 | ✅ |
| `SECURITY DEFINER` | true | true | ✅ |
| `proconfig` | `search_path=public` | `search_path=public` | ✅ |
| Owner | `postgres` | `postgres` | ✅ |

### Grants unverändert

```
postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres
```

| Rolle | EXECUTE Pre | EXECUTE Post |
|---|---|---|
| `anon` / `PUBLIC` | ❌ nein | **❌ nein** ✅ |
| `authenticated` | ✅ ja | **✅ ja** ✅ |
| `service_role` | ✅ ja | **✅ ja** ✅ |

Gegengeprüft über `has_function_privilege()`: `anon=false`, `authenticated=true`, `service_role=true`.

### Nichts anderes angewendet

| Repo-Version | Migration | im Ledger |
|---|---|---|
| `20260917120000` | **#1** | **1** ✅ (kanonisch) |
| `20260917125000` | #2 | 0 ✅ |
| `20260917130000` | #3 | 0 ✅ |
| `20260917140000` | #4 | 0 ✅ |
| `20260917150000` | #5 | 0 ✅ |
| `20260917155000` | #6 | 0 ✅ |
| `20260917160000` | #7 | 0 ✅ |
| `20260920120000` | #8 | 0 ✅ |
| `20260920190000` | #9 | 0 ✅ |
| `20260921073500` | (Kunstversion) | **0** ✅ |

Zusätzlich: `invoice_appointments.source` (#2) → **nicht vorhanden**;
`create_invoice_with_items_for_provider` (#3), `create_pending_client_invite_v1` (#5),
`create_invited_customer_with_contact` (#7) → **0 von 3 vorhanden**.

## N2.7 Aktualisiertes Mengengerüst

| | nach N.6 | jetzt |
|---|---|---|
| Ledger-Einträge | 435 | **435** (unverändert) |
| Ledger-Kopf | `20260921073500` | **`20260917120000`** |
| Release-Migrationen offen | 8 (#2–#9) | **8 (#2–#9)** (unverändert) |
| Drift-Paar aus N.5 | vorhanden | **aufgelöst** |

Abgeleitet (Arithmetik aus §1, nicht per CLI neu erhoben — für `supabase migration list`
fehlt in dieser Umgebung das DB-Passwort): „nur lokal" 404 → **403**, beidseitig 77 → **78**,
„nur remote" 358 → **357**. Das durch `apply_migration` erzeugte Drift-Paar ist damit
vollständig beseitigt; die **historische** Drift (§3 Klasse B, 317 Einträge) besteht
unverändert fort und wurde bewusst nicht angefasst.

**`db push` bleibt weiterhin gesperrt** — die Begründung aus §6 gilt unverändert.

## N2.8 Ergebnis

```
MIGRATION_1_LEDGER_MAPPING_VERIFIED=YES
LEDGER_ROW_CHANGED=YES
ROWS_CHANGED=1
PRODUCTION_SCHEMA_CHANGED=NO
MIGRATION_1_CANONICAL_VERSION=20260917120000
SAFE_FOR_MIGRATION_2=YES
```

**STOPP.** Migration #2 erst nach ausdrücklicher Freigabe durch Pascal.

---

# NACHTRAG 3 — Migration #2 angewendet (2026-09-21)

**Status:** `MIGRATION_2_APPLIED`
Angewendet: **ausschließlich** `20260917125000_add_autoflow_invoice_appointment_idempotency_v1.sql`.
Kein `db push`, kein `migration repair`, keine `_prepared`-Migration, keine Migration #3–#9,
keine Edge-/Scheduler-/Service-Aktion, kein GitHub-Push.

## N3.1 Ausführungsweg — Ledger-Version diesmal *gesetzt*, nicht nachträglich repariert

Lehre aus N.5/NACHTRAG 2: `apply_migration` (MCP) erlaubt keine Vorgabe der Ledger-Version
und vergibt serverseitig einen Timestamp aus der Ausführungszeit. Es hätte erneut Drift erzeugt.

**`apply_migration` wurde deshalb nicht verwendet.** Stattdessen `execute_sql` mit einer
expliziten Transaktion, die die DDL ausführt **und** den Ledger-Eintrag mit der kanonischen
Version selbst schreibt. Die Version ist damit Teil der Migration, nicht ein Nebenprodukt
des Werkzeugs. Keine nachträgliche Ledger-Reparatur.

Der Migrationstext steht in der Transaktion **genau einmal** (in einer `temp table … on commit drop`).
Von dort wird er (a) per `EXECUTE` ausgeführt und (b) in `statements` geschrieben. Ausgeführter und
protokollierter Text sind damit nicht „gleich geprüft", sondern **derselbe Wert**. Zusätzlich hat
ein Guard im selben Block abgebrochen, falls `md5(text) <> f1c006ac7ec2b3eb923277977a35927b`.

## N3.2 Precheck (read-only) — PASS

| Prüfung | Ergebnis |
|---|---|
| `git status` / `git diff HEAD` des Artefakts | leer — unverändert seit Release-Freeze `110dffc5` |
| md5 roh | `a6bdadce689b8f382a42bcbc7010ec28` |
| **md5 ohne trailing NL** | **`f1c006ac7ec2b3eb923277977a35927b`** (Ledger-Sollwert) |
| sha256 roh | `35ccbf3dd0c80127c723ca080c9c5fab3be4088248df75b8499971dfd02245c9` |
| Größe | 3510 B roh / 3509 B ohne NL / **3464 UTF-8-Zeichen** |
| Quoting-Risiken | 0× `$`, 0× CR, 0× TAB, 0× Backslash |
| Migration #1 Body-md5 | `7bea6a4333eb55a8a9bb314fa9f586a4` — unverändert ✅ |
| Ledger #1 kanonisch | `20260917120000` genau **1×** ✅ |
| `20260917125000` vorab | **0×** ✅ |
| Kunstversion `20260921073500` | **0×** ✅ (bleibt beseitigt) |
| Ledger-Kopf vorher | `20260917120000` |

**Übertragungsbeweis:** Vor jedem Schreibvorgang wurde der SQL-Text in einem reinen
Lese-Statement an Production gesendet und dort gehasht → `md5 = f1c006ac7ec2b3eb923277977a35927b`.
Byte-Gleichheit des übertragenen Textes war damit bewiesen, bevor irgendetwas geschrieben wurde.
(Relevant, weil das Artefakt 45 Nicht-ASCII-Bytes enthält: `ß`, `ä`×9, `ö`, `ü`×22, `—`×4, `→`×2.)

### Zieltabelle `public.invoice_appointments` — Pre-State

**0 Zeilen, 0 distinct `appointment_id`** — die im Migrationskopf dokumentierte Datenlage vom
2026-09-17 gilt unverändert. Der partielle Unique-Index kann nicht an Altdaten scheitern.

6 Spalten (**keine** Spalte `source`) · 3 Indizes · 4 Constraints · RLS aktiv · 3 Policies · 0 User-Trigger.

| bestehende Indizes | |
|---|---|
| `invoice_appointments_pkey` | UNIQUE (id) |
| `invoice_appointments_invoice_id_appointment_id_key` | UNIQUE (invoice_id, appointment_id) |
| `idx_invoice_appointments_invoice` | (invoice_id) |

**Kein Index mit gleichem semantischem Zweck vorhanden:** kein Index auf `appointment_id` allein,
kein partieller Unique-Index. **Keine Namenskollision** — beide neuen Namen 0× im Schema `public`.

## N3.3 Analyse von #2 — SQL gelesen, nicht aus dem Dateinamen geschlossen

Erzeugte/geänderte Objekte — **vier Statements**, alle additiv:

| # | Statement | Wirkung |
|---|---|---|
| 1 | `ALTER TABLE public.invoice_appointments ADD COLUMN IF NOT EXISTS source text` | neue **nullable** Spalte, **ohne** DEFAULT → reine Katalogänderung, kein Table-Rewrite |
| 2 | `COMMENT ON COLUMN … .source` | reine Metadaten |
| 3 | `CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_appointments_autoflow_unique ON … (appointment_id) WHERE source = 'autoflow'` | der Idempotenz-Schlüssel |
| 4 | `CREATE INDEX IF NOT EXISTS idx_invoice_appointments_appointment ON … (appointment_id)` | Lese-Index |

* **Nur additiv/idempotency-bezogen:** ja. Alle vier mit `IF NOT EXISTS` bzw. idempotent.
* **Bestehende Daten verändert:** nein. Kein `UPDATE`, `INSERT`, `DELETE`, kein DEFAULT-Backfill.
  Alle bestehenden Zeilen erhielten `source = NULL` (es gab ohnehin keine).
* **Locks:** `ALTER TABLE` nimmt kurz `ACCESS EXCLUSIVE` (metadata-only, PG11+),
  `CREATE INDEX` ohne `CONCURRENTLY` nimmt `SHARE` und blockiert Schreiber.
  Bei **0 Zeilen** beides praktisch instantan. Genau deshalb ist `CONCURRENTLY` hier unnötig —
  und nur so ist die Migration überhaupt transaktional anwendbar.
* **Passt der partielle Unique-Index zu den aktuellen Daten:** ja, trivialerweise —
  die Spalte entsteht in derselben Migration, alle Zeilen sind `NULL`, der Index-Prädikatsbereich
  (`source = 'autoflow'`) ist leer.
* **Funktionen/Trigger/Policies/Grants betroffen:** **nein.** Keins der vier Statements berührt sie.

## N3.4 Backup / Rollback

`docs/backups/mig2_20260917125000_prestate_rollback_2026-09-21.sql` —
vollständiger Pre-State (Spalten, Indizes, Constraints, Policies, ACL, globale Kennzahlen,
Ledger-Fingerprint) **plus** lauffähiges Rollback-Skript.

Rollback: beide Indizes droppen, Spalte `source` droppen (entfernt implizit den COMMENT),
Ledger-Zeile `20260917125000` löschen — in einer Transaktion.

> **Vorbehalt im Skript dokumentiert:** Der Rollback ist nur gefahrlos, solange keine Zeile
> `source IS NOT NULL` trägt. Vorher `select count(*) … where source is not null` prüfen;
> ist das > 0, wäre der Rollback ein Datenverlust und erfordert eine eigene Entscheidung.

Keine Kundendaten im Backup — der Pre-State enthält nur Katalog-Metadaten (0 Datenzeilen).

## N3.5 Apply-Verlauf — ein sauber zurückgerollter Fehlversuch

Der erste Versuch (Transaktion mit dem Migrationstext **doppelt** eingebettet, ~7 KB Nutzlast)
lief in einen Connector-Timeout. Gemäß der Lehre aus N.3 wurde **nicht blind wiederholt**,
sondern zuerst read-only der Zustand erhoben:

```
col_source = 0 | new_idx = 0 | ledger_mig2 = 0 | ledger_total = 435
```

→ **vollständig zurückgerollt, kein Teilzustand.** Erst danach der zweite Versuch mit der
kompakteren `temp table`-Variante (N3.1). Auch dieser meldete einen Client-Timeout, war aber
**committed** — wie bei Migration #1 durch Abfrage festgestellt, nicht angenommen.

Der MCP-Connector war über die gesamte Sitzung flaky; auch reine Lesequeries timeouteten
wiederholt und lieferten beim Retry korrekt.

## N3.6 Postcheck — PASS

### Ledger

| Prüfung | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| `version` | `20260917125000` | `20260917125000` | ✅ **kanonisch** |
| Häufigkeit | genau 1 | 1 | ✅ |
| `name` | `add_autoflow_invoice_appointment_idempotency_v1` | identisch | ✅ |
| `array_length(statements,1)` | 1 | 1 | ✅ |
| `statements` md5 | `f1c006ac7ec2b3eb923277977a35927b` | identisch | ✅ |
| `statements` Länge | 3464 Zeichen | 3464 | ✅ |
| `idempotency_key` / `rollback` | NULL / NULL | NULL / NULL | ✅ |
| Ledger gesamt | 436 | 436 | ✅ exakt +1 |
| Ledger-Kopf | `20260917125000` | `20260917125000` | ✅ |

### Schemaobjekte

Spalte 7 `source` — `text`, **nullable**, **kein** Default, COMMENT korrekt gesetzt
(Umlaute unversehrt → UTF-8-Transport fehlerfrei). Spalten 1–6 unverändert.

```
CREATE UNIQUE INDEX idx_invoice_appointments_autoflow_unique
  ON public.invoice_appointments USING btree (appointment_id)
  WHERE (source = 'autoflow'::text)
CREATE INDEX idx_invoice_appointments_appointment
  ON public.invoice_appointments USING btree (appointment_id)
```

Semantisch exakt der Vertrag aus dem Migrationskopf: Eindeutigkeit **nur** für
`source = 'autoflow'`, manuelle Verknüpfungen (`source IS NULL`) unbeschränkt.
Beide Indizes `indisvalid AND indisready` → kein invalider Index-Rest.

| Prüfung | Pre | Post | Ergebnis |
|---|---|---|---|
| Indizes auf der Tabelle | 3 | **5** | ✅ exakt +2, die 3 alten unverändert |
| Constraints | 4 | **4** | ✅ unverändert |
| Policies auf der Tabelle | 3 | **3** | ✅ unverändert |
| RLS enabled | true | **true** | ✅ |
| Table-ACL md5 | `caf3992086c391320d592320f5b4a787` | identisch | ✅ Grants unverändert |
| Zeilen `invoice_appointments` | 0 | **0** | ✅ keine Datenänderung |

### Globale Seiteneffekte

| Katalog | Pre | Post | Ergebnis |
|---|---|---|---|
| public functions | 187 | **187** | ✅ unverändert |
| public tables | 292 | **292** | ✅ unverändert |
| Policies (`pg_policy` gesamt) | 835 | **835** | ✅ unverändert |
| Migration #1 Body-md5 | `7bea6a4333eb55a8a9bb314fa9f586a4` | identisch | ✅ **#1 unverändert** |
| `invoices` / `appointments` / `profiles` / `contacts` | 11 / 295 / 103 / 44 | identisch | ✅ keine Datenänderung |

### Legacy-Ledger-Drift nicht angetastet

Fingerprint über **alle übrigen** Ledger-Zeilen
(`md5(string_agg(version‖name‖md5(statements)‖created_by order by version))`,
erhoben mit `where version <> '20260917125000'` — vor und nach dem Apply dieselbe Zeilenmenge):

| | Pre | Post |
|---|---|---|
| `ledger_others_md5` | `c8e82d6ccda1b07740bb6b94e63b3b13` | **`c8e82d6ccda1b07740bb6b94e63b3b13`** ✅ |
| `n_others` | 435 | **435** ✅ |

**Bit-identisch** → keine andere Ledger-Zeile verändert, **keine historische Drift automatisch repariert**.

### Nichts anderes aktiviert

| Objektgruppe | vorhanden |
|---|---|
| `product_memberships`, `product_membership_decisions`, `saas_billing_events`, `profession_insights` | **0** ✅ keine `_prepared`-Migration aktiviert |
| `expire_hufmanager_trials`, `sync_trusted_app_role`, `prevent_canonical_readable_id_change`, `finalize_ghost_customer_access`, `classify_legacy_billing_state` | **0** ✅ |
| `leads.plan_tier` | **0** ✅ |
| `create_invoice_with_items_for_provider` (#3), `_autoflow_trigger_endpoint` (#4), `_hm_normalize_email` / `create_pending_client_invite_v1` (#5), `create_invited_customer_with_contact` (#7) | **0 von 5** ✅ |
| `hm_pending_client_invites` (#5) | **0** ✅ |

### Security-/Schema-Lints (direkt als SQL)

| Lint | Ergebnis |
|---|---|
| RLS auf `invoice_appointments` weiterhin aktiv | **true** ✅ |
| Beide neuen Indizes `indisvalid AND indisready` | **2 von 2** ✅ |
| SECURITY-DEFINER-Funktionen in `public` **ohne** `search_path` | **0** ✅ |
| Grants/ACL der Tabelle verändert | **nein** (md5 identisch) ✅ |

### `get_advisors` — TOOLING BLOCKED

Drei Versuche, drei serverseitige Fehlschläge:

```
1) Failed to run project user check: Connection terminated due to connection timeout
2) The operation timed out.
3) Failed to run project advisor lints: Query read timeout
```

**Das ist KEIN Advisor-PASS.** Der Endpoint war — wie schon bei Migration #1 (N.4) — nicht
erreichbar. Die oben genannten Lints wurden ersatzweise direkt als SQL ausgeführt; sie decken
den Advisor nicht vollständig ab. Offener Punkt, siehe §9.

## N3.7 Idempotenz-Funktionstest — PASS

Ausgeführt in **einer Transaktion, die sich per `RAISE EXCEPTION` zwingend selbst zurückrollt**;
das Ergebnis kam über die Fehlermeldung zurück. Dadurch konnte **kein** Testdatensatz überleben —
vor und nach dem Test verifiziert: `invoice_appointments = 0 Zeilen`.
Verwendet wurden ausschließlich bestehende `invoices`/`appointments`-IDs als FK-Partner;
diese Tabellen wurden nur gelesen.

| Test | Fall | Erwartet | Ergebnis |
|---|---|---|---|
| **T1** | erster Autoflow-Link für Termin A | erlaubt | `OK` ✅ |
| **T2** | **zweiter Autoflow-Link für Termin A, andere Rechnung** | **blockiert** | `BLOCKED(idx_invoice_appointments_autoflow_unique)` ✅ |
| **T3** | manueller Link (`source IS NULL`) für Termin A neben dem Autoflow-Link | erlaubt | `ERLAUBT` ✅ |
| **T4** | zweiter manueller Link für Termin A, dritte Rechnung | erlaubt | `ERLAUBT` ✅ |
| **T5** | Autoflow-Link für Termin B | erlaubt | `ERLAUBT` ✅ |
| **T6** | exaktes Duplikat (gleiche invoice + appointment) | blockiert | `BLOCKED(invoice_appointments_invoice_id_appointment_id_key)` ✅ |
| **T7a** | Autoflow-Links für Termin A nach abgefangener Unique-Verletzung | genau 1 | **1** ✅ |
| **T7b** | Links gesamt für Termin A | 3 (1 autoflow + 2 manuell) | **3** ✅ |
| **T7c** | Zeilen in der Testtransaktion | 4 | **4** ✅ |

Damit ist belegt:

* **Derselbe fachliche Vorgang kann nicht doppelt denselben Autoflow-Link erzeugen** (T2) —
  und zwar genau durch den neuen Index, nicht zufällig durch einen anderen Constraint:
  der zurückgemeldete `CONSTRAINT_NAME` ist `idx_invoice_appointments_autoflow_unique`.
* **Erlaubte unterschiedliche Datensätze bleiben möglich** (T3, T4, T5) — Storno/Neuausstellung
  und Teilrechnungen zum selben Termin bleiben zulässig, wie im Migrationskopf gefordert.
* **Der bestehende Normalfall funktioniert** (T1) und das **Altverhalten** des vorhandenen
  `UNIQUE (invoice_id, appointment_id)` ist intakt (T6).
* **Die Unique-Verletzung hinterlässt keinen halbfertigen Folgezustand** (T7a = 1, T7b = 3):
  nach dem abgefangenen Fehler ist exakt der Stand vor dem gescheiterten INSERT wirksam.

## N3.8 Aktualisiertes Mengengerüst

| | nach NACHTRAG 2 | jetzt |
|---|---|---|
| Ledger-Einträge | 435 | **436** |
| Ledger-Kopf | `20260917120000` | **`20260917125000`** |
| Release-Migrationen offen | 8 (#2–#9) | **7 (#3–#9)** |
| durch das Werkzeug erzeugte Drift | 0 | **0** ✅ |

Abgeleitet (Arithmetik, nicht per CLI erhoben — für `supabase migration list` fehlt in dieser
Umgebung das DB-Passwort): „nur lokal" 403 → **402**, beidseitig 78 → **79**, „nur remote" **357**
unverändert. Die **historische** Drift (§3 Klasse B, 317 Einträge) besteht unverändert fort.

**`db push` bleibt gesperrt** — §6 gilt unverändert.

## N3.9 Ergebnis

```
MIGRATION_2_PRECHECK=PASS
MIGRATION_2_APPLIED=YES
MIGRATION_2_POSTCHECK=PASS
MIGRATION_2_CANONICAL_VERSION=20260917125000
ROWS_CHANGED=0            (Ledger: +1 Zeile; Nutzdaten: 0)
IDEMPOTENCY_TEST=PASS
PRODUCTION_UNEXPECTED_SIDE_EFFECTS=NONE
LEGACY_LEDGER_DRIFT_UNCHANGED=YES
ADVISOR_CHECK=TOOLING_BLOCKED
SAFE_FOR_NEXT_RELEASE_STEP=YES
```

**Nächster Release-Schritt:** Migration **#3**
`20260917130000_add_create_invoice_with_items_for_provider_v1` — setzt #2 voraus (jetzt erfüllt).

**STOPP vor Migration #3.** Keine weitere Anwendung ohne ausdrückliche Freigabe.

---

# NACHTRAG 4 — Migration #3 angewendet (2026-09-21)

**Status:** `MIGRATION_3_APPLIED`
Angewendet: **ausschließlich** `20260917130000_add_create_invoice_with_items_for_provider_v1.sql`,
unter der kanonischen Ledger-Version **`20260917130000`**.
Kein `db push`, kein `migration repair`, keine `_prepared`-Migration, keine Migration #4–#9,
keine Edge-/Scheduler-/Service-Aktion, kein Commit, kein Push.
## N4.1 Analyse von #3 — SQL vollständig gelesen

Erzeugtes Objekt — **eine** neue Funktion, sonst nichts:

```
public.create_invoice_with_items_for_provider(
  p_provider_id uuid, p_appointment_id uuid, p_invoice jsonb, p_items jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
```

| Aspekt | Befund |
|---|---|
| **Gelesene Tabellen** | `profiles`, `access_grants`, `horses`, `appointments`, `inventory_items` |
| **Geschriebene Tabellen** | `invoices`, `invoice_items`, `invoice_appointments` |
| **Aufgerufene Funktionen** | `_hm_has_hufmanager_access_v1(uuid)`, `is_admin(uuid)` |
| **Grants** | `REVOKE ALL … FROM PUBLIC, anon, authenticated` · `GRANT EXECUTE … TO service_role` |
| **Abhängigkeit #2** | **hart** — schreibt `invoice_appointments.source='autoflow'` und verlässt sich auf `idx_invoice_appointments_autoflow_unique` |
| **Abhängigkeit #1** | keine direkte — `create_customer_with_contact` wird nicht aufgerufen |
| **Überschreibt Bestehendes?** | **nein** — `CREATE OR REPLACE`, aber die Signatur existiert in Production nicht (0 Treffer). Die kanonische `create_invoice_with_items(jsonb,jsonb)` hat einen anderen Namen und wird nicht berührt. |

## N4.2 Precheck — PASS

| Prüfung | Ergebnis |
|---|---|
| `git status` / `git diff HEAD` des Artefakts | leer — unverändert seit `110dffc5` |
| md5 roh | `216b7b4827f452c4b6a51ee5a9be34d9` |
| **md5 ohne trailing NL** | **`427b0dfbfa98b518f92eaeacc6d3b086`** |
| sha256 roh | `7b15c78ab1a78904f6a18892fb33e939850ade147c3b848ed934d42cd8a24670` |
| Größe | 12375 B roh / 12374 B ohne NL / **12342 UTF-8-Zeichen** |
| Ledger #1 `20260917120000` | genau **1×** ✅ |
| Ledger #2 `20260917125000` | genau **1×** ✅ |
| Ledger #3 `20260917130000` | **0×** ✅ |
| Ledger gesamt / Kopf | 436 / `20260917125000` |
| Signaturkollision | **0** ✅ |
| Abhängige Funktionen vorhanden | `_hm_has_hufmanager_access_v1(uuid)`→bool ✅, `is_admin(uuid)`→bool ✅ |
| Benötigte Spalten (12 geprüft) | **12 von 12 vorhanden** ✅ |
| `invoices`-Zielspalten (13) | **13 von 13 vorhanden**, `invoice_number` nullable ✅ |
| `invoice_items`-Zielspalten (6) | **6 von 6 vorhanden** ✅ |
| Strukturen aus #2 | `source` + beide Indizes vorhanden ✅ |

**Trigger-Vorprüfung:** `invoices` trägt 3 Trigger (`trg_validate_invoice`,
`trg_invoice_notification`, `update_invoices_updated_at`). Alle drei wurden gegen
`net.http*` / `pg_net` geprüft — **keiner macht HTTP-Aufrufe**, alle sind rein
transaktional. Ein Rollback-Test kann also keine Mail/Webhook auslösen.
`validate_invoice_data` erlaubt Status `draft` und verbietet negative Totals.

## N4.3 Security- und Money-Review — PASS, kein P0

### AUTH / TENANT

| Anforderung | Umsetzung in #3 | Bewertung |
|---|---|---|
| `anon` darf die RPC nicht nutzen | `REVOKE ALL … FROM PUBLIC, anon, authenticated`, nur `service_role` | ✅ |
| Provider-Identität nicht clientseitig fälschbar | `p_provider_id` ist Parameter — die Isolation ruht **vollständig auf dem Grant**. `authenticated`/`anon` haben kein EXECUTE und können `service_role` nicht erlangen. | ✅ (siehe Anmerkung) |
| Provider A darf nicht für Provider B abrechnen | `v_provider_id <> p_provider_id` → Abbruch | ✅ |
| Kunde gehört zum Provider | `profiles.created_by_provider_id = p_provider_id` **oder** aktiver `access_grants`-Eintrag; zusätzlich `deleted_at IS NULL` | ✅ |
| Pferd gehört zum Kunden | `horses.owner_id = v_client_id AND deleted_at IS NULL` | ✅ |
| Material gehört zum Provider | `inventory_items.user_id = p_provider_id` | ✅ |
| Appointment gehört zum Provider | `appointments.provider_id = p_provider_id` | ✅ |
| Entitlement-Gate | `_hm_has_hufmanager_access_v1(p_provider_id) OR is_admin(p_provider_id)` | ✅ |

> **Anmerkung (bewusste Designentscheidung, kein Fund):** Anders als die kanonische
> `create_invoice_with_items` leitet diese Funktion den handelnden Provider **nicht**
> aus `auth.uid()` ab, sondern aus einem Parameter — weil es im Trigger-/Edge-Kontext
> keine Session gibt. Die Mandantentrennung hängt damit am Grant. Das ist im
> Migrationskopf explizit begründet. `is_master_admin()` wird bewusst **nicht**
> wiederverwendet; das entfernt einen möglichen Bypass, statt einen hinzuzufügen.

### MONEY

| Anforderung | Umsetzung | Bewertung |
|---|---|---|
| `quantity > 0` | `IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN RAISE` | ✅ |
| `price >= 0` | `IF v_item.unit_price IS NULL OR v_item.unit_price < 0 THEN RAISE` | ✅ |
| `line_total` nicht manipulierbar | Client-Wert wird gegen `round(qty*price,2)` geprüft (`IS DISTINCT FROM` → Abbruch) **und** beim INSERT wird der **serverseitig berechnete** Wert geschrieben, nicht der Client-Wert | ✅ doppelt abgesichert |
| `invoice_total` serverseitig | Client-Wert wird gegen die Positionssumme geprüft; geschrieben wird `v_items_total` (serverseitig) | ✅ |
| keine negativen/inkonsistenten Totals | `< 0` verboten, max. 2 Nachkommastellen, Summengleichheit erzwungen; zusätzlich Trigger `validate_invoice_data` | ✅ |

### ATOMICITY

Rechnungskopf, Positionen und Autoflow-Verknüpfung liegen in **einer** plpgsql-Funktion,
also in einer Transaktion. Jedes `RAISE` rollt alles zurück. Der innere
`EXCEPTION WHEN unique_violation`-Block bei der Verknüpfung fängt **nicht ab**, sondern
**re-raised** mit `HINT='autoflow_duplicate'` — es gibt also bewusst kein
`ON CONFLICT DO NOTHING` und damit keine Rechnung ohne Verknüpfung.

### SECURITY DEFINER

`SET search_path = public` ✅ · **alle** Objektreferenzen schema-qualifiziert
(`public.profiles`, `public.horses`, …) → auch ein untergeschobenes `pg_temp`-Objekt
kann nichts shadowen ✅ · Grants minimal (`service_role` only) ✅.

## N4.4 Ausführungsweg — drei blockierte MCP-Versuche, dann psql

`apply_migration` hätte erneut eine serverseitige Version vergeben → **nicht verwendet**.

Der erste Weg war derselbe wie bei #2: eine Transaktion über den MCP-`execute_sql`,
Migrationstext einmal in einer `temp table`, von dort ausgeführt **und** in `statements`
geschrieben, mit md5-Guard. **Drei Versuche, drei Connector-Timeouts.** Nach jedem Versuch
wurde gemäß N.3 erst read-only der Zustand erhoben, nie blind wiederholt:

| Versuch | Zustandsprüfung danach |
|---|---|
| 1–3 | `fn_da=0 · ledger_mig3=0 · ledger_total=436 · fns=187` → jeweils vollständig zurückgerollt |

Nutzlast ~13 KB. Beobachtet in dieser Sitzung: ~4 KB ging durch (#2), ~7 KB scheiterte,
~13 KB scheiterte 3/3 — strukturell, nicht transient. Der MCP-`execute_sql`-Pfad ist für ein
Artefakt dieser Größe nicht zuverlässig.

**Bewusst nicht ausgewichen** auf `apply_migration` (Drift), auf ein Aufteilen in DDL-Call +
Ledger-Call (gäbe die Atomarität auf und erzeugte die „Kategorie 3"-Lücke aus §4a) oder auf
das Strippen des Kommentarkopfs (bräche `md5(statements) = md5(Repo-Datei)`, die Invariante
der gesamten Abgleichmethodik aus §2/§8).

Gewählter Weg: **direktes `psql` über den Session-Pooler**, mit dem lokal aus den echten
Repo-Bytes generierten Skript `docs/backups/mig3_20260917130000_apply_canonical.sql`.

### N4.4a Zwei Fehler auf dem Weg dorthin — beide gefunden und behoben

**1. Wrapper meldete Erfolg bei Fehlschlag.** Die erste Fassung des Runners wertete
`RC=${PIPESTATUS[1]}` aus — das ist der Exitcode von `tee`, nicht von `psql`. `tee` liefert 0,
auch wenn `psql` mit `FATAL: password authentication failed` abbricht. Der Wrapper meldete
deshalb „COMMIT erfolgreich", obwohl nichts angewendet wurde. Der tatsächliche DB-Zustand
(read-only geprüft) war zu keinem Zeitpunkt betroffen.

Behoben mit `set -o pipefail` + `PSQL_RC=${PIPESTATUS[0]}`, und **nachgewiesen statt behauptet**
gegen ein simuliert fehlschlagendes `psql`:

| Muster | simuliertes `psql` exit 2 | Meldung |
|---|---|---|
| alt (`PIPESTATUS[1]`, kein pipefail) | RC=0 | „COMMIT erfolgreich" — falsch |
| neu (`pipefail` + `PIPESTATUS[0]`) | RC=2 | „FEHLER, nicht erneut ausführen" — korrekt |
| neu, Erfolgsfall | RC=0 | Erfolg korrekt erkannt |

**2. `sslmode` fehlte.** Der Connection-String kam ohne `sslmode`, der Pooler verlangt SSL.
Behoben durch `sslmode=require`; damit ist eine zustande gekommene Verbindung zwingend
verschlüsselt. Host, Port, User und DB werden seitdem aus `supabase/.temp/pooler-url`
**geparst** statt konstruiert, mit Abbruch falls der User nicht exakt `postgres.<project-ref>` ist.

### N4.4b Verbindungsdiagnose (read-only, keine Writes)

| Prüfung | Ergebnis |
|---|---|
| `db.<ref>.supabase.co` DNS | nur **AAAA** — der Direct Host ist IPv6-only, kein A-Record |
| Pooler DNS | nur **A** (3 Adressen), IPv4-only |
| IPv6 des Servers | globale Adresse + Default-Route, Internet-IPv6 funktioniert |
| TCP :5432 Direct / Pooler | **beide offen** (6543 ebenfalls) |
| `DIRECT_CONNECTION_TEST` | **PASS** (`current_user=postgres`, PostgreSQL 17.6) |
| `POOLER_CONNECTION_TEST` | **PASS** (`current_user=postgres`) |

Damit war `UNREACHABLE_IPV6` ausgeschlossen und das Passwort validiert. Nebenbefund, der die
ursprüngliche Fehlermeldung erklärt: der Pooler meldet als `current_user` die zugrundeliegende
Rolle **`postgres`** — daher stand im FATAL „for user postgres", obwohl korrekt
`postgres.vnschgjxkzzwzefqlrji` übergeben wurde. Das war also nie ein falscher Benutzer.

Das Passwort wurde ausschließlich interaktiv über `/dev/tty` eingelesen, nur an `psql`
übergeben und danach aus der Umgebung entfernt — es erscheint nicht am Bildschirm, nicht in
der History, nicht in einer Datei, nicht im Log und in keiner Dokumentation.

## N4.5 Apply

`psql` über den Session-Pooler (`Port 5432`, `postgres.vnschgjxkzzwzefqlrji`, `sslmode=require`),
genau **ein** Versuch, kein Retry. Client-Protokoll:

```
BEGIN
CREATE TABLE
INSERT 0 1
DO
INSERT 0 1
COMMIT
```

Das ist die Client-Sicht; maßgeblich ist der anschließend read-only erhobene DB-Zustand (N4.6).

Das Skript enthält den Migrationstext **einmal**: er wird von dort per `EXECUTE` ausgeführt
**und** von dort in `statements` geschrieben — ausgeführter und protokollierter Text sind
derselbe Wert, nicht zwei verglichene Kopien. Ein md5-Guard hätte vor jedem Commit abgebrochen,
falls der Text nicht `427b0dfbfa98b518f92eaeacc6d3b086` entspricht.

> Bei der Generierung des Skripts hatten sich zunächst ein führendes und ein abschließendes
> `\n` in den dollar-quoted Text geschmuggelt (Zeilenumbrüche um die Marker). Das fiel bei der
> md5-Verifikation auf und wurde vor jedem Produktionskontakt korrigiert.

## N4.6 Postcheck — PASS

### Ledger

| Prüfung | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| `version` | `20260917130000` | `20260917130000` | ✅ **kanonisch** |
| Häufigkeit | genau 1 | 1 | ✅ |
| **zusätzliche automatisch erzeugte Version** | 0 | **0** | ✅ kein Drift |
| `name` | `add_create_invoice_with_items_for_provider_v1` | identisch | ✅ |
| `statements` md5 / Länge | `427b0dfbfa98b518f92eaeacc6d3b086` / 12342 | identisch | ✅ |
| `array_length(statements,1)` | 1 | 1 | ✅ |
| `idempotency_key` / `rollback` | NULL / NULL | NULL / NULL | ✅ |
| Ledger gesamt | 437 | **437** | ✅ exakt +1 |
| Ledger-Kopf | `20260917130000` | identisch | ✅ |
| #1 `20260917120000` / #2 `20260917125000` | je 1 | je **1** | ✅ |

### Funktion

| Attribut | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| Signatur | `create_invoice_with_items_for_provider(uuid,uuid,jsonb,jsonb)` | identisch | ✅ |
| Parameter | `p_provider_id, p_appointment_id, p_invoice, p_items` | identisch | ✅ |
| Rückgabetyp / Sprache | `jsonb` / `plpgsql` | identisch | ✅ |
| **Body md5** | `31ff1f228992a5b3ee2e6093ee773c45` (6853 Zeichen) | identisch | ✅ **byte-identisch zum Artefakt** |
| `SECURITY DEFINER` | true | true | ✅ |
| `proconfig` | `search_path=public` | identisch | ✅ |
| Owner | `postgres` | `postgres` | ✅ |

Der Body-md5 wurde lokal aus dem Repo-Artefakt zwischen `AS $$` und `$$;` extrahiert und gegen
`pg_proc.prosrc` verglichen — keine Namensgleichheit, sondern Inhaltsgleichheit.

### Grants — vorher / nachher

| | vor #3 | nach #3 |
|---|---|---|
| Funktion existierte | **nein** (0 Treffer) | ja |
| ACL | — | `postgres=X/postgres \| service_role=X/postgres` |

| Rolle | EXECUTE | Soll |
|---|---|---|
| `anon` | **false** | revoked ✅ |
| `authenticated` | **false** | revoked ✅ |
| `PUBLIC` | nicht in der ACL | revoked ✅ |
| `service_role` | **true** | granted ✅ |
| `postgres` (Owner) | true | Owner-Default ✅ |

### Keine unerwarteten Schemaänderungen

| Katalog | Pre | Post | Ergebnis |
|---|---|---|---|
| public functions | 187 | **188** | ✅ exakt +1 |
| public tables | 292 | **292** | ✅ |
| Policies gesamt | 835 | **835** | ✅ |
| `invoices` / `invoice_items` / `invoice_appointments` | 11 / 12 / 0 | identisch | ✅ keine Datenänderung |
| Migration #1 Body-md5 | `7bea6a4333eb55a8a9bb314fa9f586a4` | identisch | ✅ **#1 unverändert** |
| Migration #2 Indizes | 2 | **2** | ✅ **#2 unverändert** |
| kanonische `create_invoice_with_items` Body-md5 | `dcc2f55383ab7a207a7ced61167e7896` | identisch | ✅ **nicht überschrieben** |
| Temp-Reste (`_mig%`, `pg_temp%`) | — | **0** | ✅ |
| `_prepared`-Objekte | 0 | **0** | ✅ nichts aktiviert |
| #4–#9: Funktionen / Ledger-Einträge | 0 / 0 | **0 / 0** | ✅ kein weiterer Release-Step |

### Legacy-Ledger-Drift unverändert

Fingerprint über alle übrigen Ledger-Zeilen (`where version <> '20260917130000'`):

| | Pre | Post |
|---|---|---|
| `ledger_others_md5` | `b6c94dd83ef0891b8131202eadd3f5c3` | **`b6c94dd83ef0891b8131202eadd3f5c3`** ✅ |
| `n_others` | 436 | **436** ✅ |

**Bit-identisch** → keine andere Ledger-Zeile verändert, keine historische Drift repariert.

## N4.7 Testmatrix — PASS

Eine Transaktion, die sich per `RAISE EXCEPTION` zwingend selbst zurückrollt; Ergebnis über die
Fehlermeldung. Fixtures: **zwei verschiedene echte Provider** mit je eigenem Kunden, Pferd,
Material und Termin — Cross-Tenant wurde also gegen echte Mandantengrenzen geprüft, nicht simuliert.

| # | Fall | Erwartet | Ergebnis |
|---|---|---|---|
| **T1** | Erfolgsfall: eigener Provider, Kunde, Pferd, Material, 2 Positionen, Termin | Rechnung + Positionen + Autoflow-Link | `OK` — `total=35.00` **serverseitig berechnet**, `provider_id` korrekt, **2** Positionen, **1** Autoflow-Link ✅ |
| **T2** | Aufruf als `anon` | verweigert | `DENIED(insufficient_privilege)` ✅ |
| **T3** | fremder Kunde (Provider A → Kunde von B) | verweigert | `DENIED(Invoice client is not accessible…)` ✅ |
| **T4** | fremdes Pferd | verweigert | `DENIED(Invoice horse does not belong…)` ✅ |
| **T5** | fremdes Material | verweigert | `DENIED(Invoice material does not belong…)` ✅ |
| **T6** | fremder Termin | verweigert | `DENIED(Appointment does not belong…)` ✅ |
| **T7** | manipuliertes `line_total` | verweigert | `DENIED(Invoice item total does not match…)` ✅ |
| **T8** | manipuliertes `invoice_total` | verweigert | `DENIED(Invoice total does not match…)` ✅ |
| **T9** | negative Menge | verweigert | `DENIED(quantity must be greater than zero)` ✅ |
| **T10** | negativer Preis | verweigert | `DENIED(price cannot be negative)` ✅ |
| **T11** | Atomicity: 2. Position ungültig | kein Kopf, keine Teil-Position | `DENIED` ✅ |
| **T12** | Idempotenz-Integration mit #2: derselbe Termin erneut | verweigert | `DENIED(autoflow_duplicate)` ✅ |

**Bilanz innerhalb der Testtransaktion:** `INV=12 (soll 12)`, `ITEMS=14 (soll 14)`, `LINKS=1 (soll 1)` —
nur T1 hat geschrieben, **alle** fehlgeschlagenen Aufrufe haben nichts hinterlassen. Das ist der
Atomicity-Nachweis: kein kopfloser Rechnungskopf, keine verwaiste Position.

**Nach dem Rollback verifiziert:** `invoices=11`, `invoice_items=12`, `invoice_appointments=0`,
0 Positionen mit Testtiteln, `profiles=103`, `contacts=44` — **keine Testdaten in Production,
keine Kundendaten verändert.**

## N4.8 Advisors — diesmal erreichbar

Anders als bei #1 und #2 lieferte `get_advisors` diesmal Ergebnisse. **`TOOLING_BLOCKED=NO`.**

| Advisor | Gruppen | Findings | ERROR-Level | betrifft #3 |
|---|---|---|---|---|
| Security | 5 | 311 | **0** | **0** |
| Performance | 6 | 2188 | **0** | **0** |

Security-Verteilung: `anon_security_definer_function_executable` 149 · `authenticated_…` 156 ·
`rls_enabled_no_policy` 4 (INFO) · `extension_in_public` 1 · `auth_leaked_password_protection` 1.
Performance: `multiple_permissive_policies` 1085 · `auth_rls_initplan` 668 ·
`unindexed_foreign_keys` 267 · `unused_index` 160 · `duplicate_index` 7 · `table_bloat` 1.

**Entscheidend:** `create_invoice_with_items_for_provider` taucht in **keinem** Finding auf —
insbesondere **nicht** in den beiden SECURITY-DEFINER-Listen. Das bestätigt unabhängig, dass die
`REVOKE`-Anweisung gegriffen hat. Auch die #2-Indizes werden weder als `unused_index` noch als
`duplicate_index` geführt.

Sämtliche 2499 Findings sind projektweite Altlasten, die vor #3 bestanden; #3 hat kein einziges
hinzugefügt. Sie sind nicht Gegenstand dieses Release-Schritts.

## N4.9 Ergebnis

```
MIGRATION_3_FILE_INTEGRITY=PASS
MIGRATION_3_PRECHECK=PASS
MIGRATION_3_SECURITY_REVIEW=PASS
MIGRATION_3_APPLIED=YES
MIGRATION_3_APPLY_METHOD=PSQL
MIGRATION_3_POSTCHECK=PASS
MIGRATION_3_CANONICAL_VERSION=20260917130000

INVOICE_SUCCESS_TEST=PASS
ANON_TEST=PASS
CROSS_TENANT_CLIENT_TEST=PASS
CROSS_TENANT_HORSE_TEST=PASS
CROSS_TENANT_INVENTORY_TEST=PASS
CROSS_TENANT_APPOINTMENT_TEST=PASS
LINE_TOTAL_MANIPULATION_TEST=PASS
INVOICE_TOTAL_MANIPULATION_TEST=PASS
NEGATIVE_VALUE_TEST=PASS
ATOMICITY_TEST=PASS
IDEMPOTENCY_INTEGRATION_TEST=PASS

TOOLING_BLOCKED=NO
PRODUCTION_UNEXPECTED_SIDE_EFFECTS=NONE
LEDGER_DRIFT_CREATED=NO
LEGACY_LEDGER_DRIFT_UNCHANGED=YES
SAFE_FOR_NEXT_RELEASE_STEP=YES
```

## N4.10 Aktualisiertes Mengengerüst

| | nach NACHTRAG 3 | jetzt |
|---|---|---|
| Ledger-Einträge | 436 | **437** |
| Ledger-Kopf | `20260917125000` | **`20260917130000`** |
| Release-Migrationen offen | 7 (#3–#9) | **6 (#4–#9)** |
| durch das Werkzeug erzeugte Drift | 0 | **0** ✅ |

Abgeleitet (Arithmetik, nicht per CLI erhoben): „nur lokal" 402 → **401**, beidseitig 79 → **80**,
„nur remote" **357** unverändert. Die historische Drift (§3 Klasse B, 317 Einträge) besteht fort.
**`db push` bleibt gesperrt** — §6 gilt unverändert.

**Nächster Release-Schritt:** Migration **#4**
`20260917140000_fix_autoflow_trigger_auth_vault_v1` — ersetzt den aktiven Trigger
`autoflow_on_appointment_completed/_signed`; laut §5 Risiko **mittel**, Vault ist leer, der
HTTP-Call wird also übersprungen (`RAISE WARNING`).

**STOPP vor Migration #4.** Keine weitere Anwendung ohne ausdrückliche Freigabe.

---

# NACHTRAG 5 — Migration #4: Read-only Preflight (2026-09-21)

**Status:** `MIGRATION_4_PREFLIGHT_ONLY — NICHT ANGEWENDET`
Kein Production-Write, kein Vault-Write, kein Secret gesetzt, kein Trigger ersetzt,
kein `CREATE OR REPLACE`, kein Ledger-Write, kein Edge-Deploy, kein Push.

Artefakt `20260917140000_fix_autoflow_trigger_auth_vault_v1.sql`, unverändert seit `110dffc5`:
md5 roh `be1854ea7e8d6b304a1d3edc6eafede5` · md5 ohne NL `3056567c716fd7a318254042f6e878a4` ·
sha256 `f93a408a357d4e6c08afad78f8b15b9f93226312de9e7c3b8449338f4795be23` · 8038 B / 169 Zeilen.

## N5.1 Was #4 tatsächlich ändert

| Objekt | Art der Änderung |
|---|---|
| `public._autoflow_trigger_endpoint()` | **neu**, `RETURNS TABLE(function_url text, service_key text)`, SECURITY DEFINER, `search_path=public` |
| `REVOKE ALL ON _autoflow_trigger_endpoint FROM PUBLIC, anon, authenticated` | neu |
| `public.autoflow_on_appointment_completed()` | **Body ersetzt** (`CREATE OR REPLACE`, gleiche Signatur) |
| `public.autoflow_on_appointment_signed()` | **Body ersetzt** (dito) |

**Trigger selbst werden nicht angefasst** — kein `DROP`/`CREATE TRIGGER`. Verifiziert:
beide Trigger hängen als `AFTER UPDATE … FOR EACH ROW` an `public.appointments`, beide aktiv
(`tgenabled='O'`), beide **ohne** `WHEN`-Klausel. Keine Policy, kein Grant auf Tabellen,
keine Tabelle, keine Spalte.

## N5.2 Ist-Zustand in Production (read-only erhoben)

| | `autoflow_on_appointment_completed()` | `autoflow_on_appointment_signed()` |
|---|---|---|
| returns / Sprache | `trigger` / plpgsql | `trigger` / plpgsql |
| SECURITY DEFINER | true | true |
| `search_path` | `public` | `public` |
| Owner | `postgres` | `postgres` |
| Body md5 (Länge) | `92910008ac054d1741829613ca2c0155` (710) | `ab5ddbc4edd28ceee007421c83ce0aa3` (691) |
| ACL | `=X/postgres \| postgres \| anon \| authenticated \| service_role` | identisch |
| `anon` EXECUTE | **true** | **true** |

`_autoflow_trigger_endpoint()` existiert noch nicht.

**Root-Cause der Migration unabhängig bestätigt:** das in beiden Bodies hartcodierte Bearer-Token
wurde serverseitig dekodiert (ohne es auszugeben) — `role = anon`, `ref = vnschgjxkzzwzefqlrji`.
Die deployte Edge Function prüft `token !== SUPABASE_SERVICE_ROLE_KEY → 401` (Zeile 19).
Beide Trigger laufen also seit jeher in ein 401. Und: der aktuelle Trigger zeigt fest auf
**Production**, was die Cross-Environment-Kritik im Migrationskopf belegt.

```
CURRENT_COMPLETED_ANON_EXECUTE=YES
CURRENT_SIGNED_ANON_EXECUTE=YES
```

## N5.3 Beseitigt #4 den Advisor-Befund? — **NEIN**

`CREATE OR REPLACE FUNCTION` **erhält bestehende ACLs**. #4 enthält für die beiden
Triggerfunktionen **kein** `REVOKE`. Nach #4 hätten `anon` und `authenticated` also weiterhin
EXECUTE, und `anon_security_definer_function_executable` würde beide weiterhin melden.

**Ausnutzbar ist das nicht.** Empirisch geprüft (`set local role anon` + Direktaufruf):

```
0A000: trigger functions can only be called as triggers
```

PostgreSQL verweigert den Direktaufruf einer `RETURNS trigger`-Funktion unabhängig vom Grant.
Der Service-Key kann darüber also nicht abfließen.

Die **wirklich gefährliche** neue Funktion ist `_autoflow_trigger_endpoint()`: sie gibt den
Service-Key als Spalte zurück und ist eine normale Funktion, also direkt aufrufbar. Genau
dafür enthält #4 den `REVOKE` — **das ist korrekt und notwendig.**

**Empfehlung (nicht Teil des Artefakts):** zwei zusätzliche `REVOKE`-Zeilen für die beiden
Triggerfunktionen würden den Advisor-Befund sauber schließen. Das wäre eine Artefaktänderung
und damit eine eigene Entscheidung — hier bewusst nicht eigenmächtig vorgenommen.

## N5.4 Vault-Vertrag

| Prüfung | Ergebnis |
|---|---|
| Extension `supabase_vault` / `pg_net` | vorhanden / vorhanden |
| Schema `vault` | vorhanden |
| **Secrets gesamt** | **0** — Vault ist komplett leer |
| `autoflow_service_key` | **existiert nicht** |
| `autoflow_functions_base_url` | **existiert nicht** |
| `anon` / `authenticated`: `USAGE` auf `vault` | **false / false** |
| `anon` / `authenticated`: `SELECT` auf `vault.decrypted_secrets` | **false / false** |
| `current_setting('app.settings.supabase_url', true)` | **NULL** — der im Migrationskopf dokumentierte Defekt besteht real |

**Erwarteter Secret-Typ:** `autoflow_service_key` = der **service_role key dieser Umgebung**
(nicht anon, nicht ein User-JWT) — er muss byte-genau dem `SUPABASE_SERVICE_ROLE_KEY` der Edge
Function entsprechen, sonst bleibt es beim 401. `autoflow_functions_base_url` = die Functions-
Basis-URL **dieses** Projekts; die Funktion hängt `/autoflow-auto-invoice` an.

**Fehlt eines der Secrets:** `_autoflow_trigger_endpoint()` liefert eine leere Menge, der
Aufrufer loggt `RAISE WARNING` und überspringt den HTTP-Call. Das `UPDATE` auf `appointments`
läuft normal durch. **Ungültiges Secret:** der Aufruf geht raus, die Edge Function antwortet
401 — für den Trigger folgenlos, weil `net.http_post` asynchron ist.

**Secret-Wert wird nie geloggt:** die `RAISE WARNING`-Texte enthalten nur Secret-*Namen* und die
Appointment-ID, nie den Wert. Der Key fließt ausschließlich in den `Authorization`-Header.

## N5.5 Environment-Isolation — PASS

Das Artefakt enthält **keine** Projekt-URL und **kein** Token; beide Werte kommen aus Vault.
Auf einer frischen Staging-Umgebung ohne Secrets ruft der Trigger **nichts** auf — insbesondere
nicht die Produktion. Damit ist die ursprüngliche Kritik behoben.

Zu beachten: die Kommentarzeilen 29–32 beschreiben die alte PROD-URL nur redigiert
(`https://<prod-ref>.supabase.co/…`), also ohne verwendbaren Wert. **Die echte PROD-URL und das
anon-JWT stehen dagegen weiterhin im Klartext in der bereits getrackten Ursprungsmigration
`20260219153151_…sql`** — eine Altlast, die #4 nicht beseitigt und die außerhalb dieses
Release-Schritts liegt.

## N5.6 Trigger-Vertrag

* **Doppeltes Feuern ist möglich.** Beide Trigger sind `AFTER UPDATE` ohne `WHEN`, die Bedingung
  steckt im Body: `completed` prüft `NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed'`,
  `signed` prüft `NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL`. Setzt **ein** UPDATE beides
  gleichzeitig, feuern **beide** Funktionen und senden **zwei** HTTP-Requests für denselben Termin.
* **Das ist durch #2 abgesichert:** der zweite Lauf scheitert am partiellen Unique-Index
  `idx_invoice_appointments_autoflow_unique`, und #3 rollt dabei Rechnungskopf **und** Positionen
  zurück (kein `ON CONFLICT DO NOTHING`). Es entsteht keine Doppelrechnung — genau der in
  NACHTRAG 4 als **T12** live nachgewiesene Pfad.
* **Trigger-Fehler blockieren keine Termin-Transaktion.** `net.http_post` schreibt nur in die
  pg_net-Queue; HTTP-Fehler, Timeouts und 401/500 der Edge Function erreichen die Trigger-
  Transaktion nicht. Fehlende Secrets führen zu `RAISE WARNING`, nicht zu `RAISE EXCEPTION`.
  Das `UPDATE appointments` kann durch #4 also nicht fehlschlagen.

## N5.7 **Blocker: die deployte Edge Function ist veraltet**

| | |
|---|---|
| `autoflow-auto-invoice` Status | ACTIVE, **Version 79**, `verify_jwt=false` |
| **deployt am** | **2026-08-08** |
| Repo-Stand (ruft `create_invoice_with_items_for_provider`) | Commit `110dffc5`, **2026-09-20** |

Der deployte Quelltext wurde gelesen und ist die **alte** Fassung. Sie ruft den #3-RPC **nicht**
auf, sondern schreibt direkt in `invoices` mit den Spalten `appointment_id`, `subtotal`,
`tax_amount`, `total`, `items`, `client_name`, `client_email`, `client_address` — von denen
**0 von 8** in Production existieren (read-only geprüft). Zusätzlich setzt sie
`client_id = contacts.id`, obwohl `invoices.client_id` per FK auf `profiles` zeigt.

**Konsequenz:** #4 repariert die Trigger-Credentials, sodass der Aufruf die Edge Function zum
ersten Mal überhaupt erreicht. Dort läuft dann die alte Logik in einen PostgREST-Fehler beim
INSERT, loggt `autoflow_log.status='failed'` und antwortet 500. **#4 allein stellt Auto-Invoicing
also nicht her** — dafür muss `autoflow-auto-invoice` neu deployt werden.

**Aktuelle Sprengweite ist dennoch null:** `autoflow_settings` hat 2 Zeilen, davon
**0 mit `auto_invoice_enabled = true`**. Die Function steigt für jeden Provider vorher mit
„Auto-invoice disabled" aus. `appointments`: 5 `completed`, 0 signiert.

## N5.8 Kompatibilität mit #2 und #3

| Prüfung | Ergebnis |
|---|---|
| #2 Idempotenz | **PASS** — der Autoflow-Link ist der Schlüssel; Doppelfeuern erzeugt keine zweite Rechnung |
| #3 Invoice-RPC | **PASS auf Artefaktebene** — der Repo-Stand der Edge Function ruft `create_invoice_with_items_for_provider` mit `p_provider_id`/`p_appointment_id` auf, genau der in NACHTRAG 4 getestete Vertrag; `service_role`-Grant passt zum Aufrufer |
| #3 Invoice-RPC, **deployt** | **nicht erfüllt** — die laufende Version ruft den RPC nicht auf (N5.7) |

## N5.9 Rollback

`docs/backups/mig4_20260917140000_prestate_rollback_2026-09-21.sql`

Die beiden PROD-Bodies sind **byte-identisch** zur bereits getrackten Ursprungsmigration
`20260219153151_c6f406a7-109f-4ad7-9610-fe5761d53104.sql` — verifiziert über die extrahierten
Bodies (`92910008…` / `ab5ddbc4…`). Das Rollback wird deshalb **deterministisch aus dieser
Quelldatei erzeugt** statt das historische anon-JWT und die PROD-URL in ein zweites Artefakt zu
kopieren. Der Generator bricht ab, wenn ein extrahierter Body nicht exakt dem Pre-State
entspricht; die erzeugte Datei wird nicht committet.

Rollback-Transaktion: beide Alt-Bodies per `CREATE OR REPLACE` zurück (erhält die ACLs
automatisch), `drop function _autoflow_trigger_endpoint()`, Ledger-Zeile `20260917140000`
löschen. Triggerbindung bleibt unberührt, da #4 sie nicht ändert. #1/#2/#3 nicht betroffen.

**Generierung und Hash-Gegenprobe wurden durchgeführt** — beide Bodies ergaben exakt die
PROD-Hashes. `ROLLBACK_EXACT_PROD_STATE=YES`.

## N5.10 Testplan für #4 (vor Apply definiert)

Voraussetzung für A–J: beide Vault-Secrets gesetzt **und** Edge Function neu deployt.
Ohne das sind nur K–O sinnvoll.

| # | Test | Methode | Erwartung |
|---|---|---|---|
| **M** | `anon` ruft Triggerfunktionen direkt auf | read-only, `set local role` | `0A000 trigger functions can only be called as triggers` |
| **N** | `anon`/`authenticated` rufen `_autoflow_trigger_endpoint()` auf | read-only | `42501 insufficient_privilege` — **Service-Key darf nicht abfließen** |
| **O** | `service_role`-Vertrag | read-only ACL-Prüfung | nur `postgres` + Triggerkontext |
| **D** | Vault-Secret fehlt | Rollback-Transaktion: Termin auf `completed` | `RAISE WARNING`, **kein** HTTP-Call, `UPDATE` erfolgreich |
| **L** | Statusänderung bleibt fachlich korrekt | dito | `appointments.status` korrekt gesetzt, Transaktion committed |
| **A** | completed-Termin | Rollback-Transaktion | genau **ein** `net.http_post` in der pg_net-Queue |
| **B** | signierter Termin | dito | genau ein Request, `trigger_type='after_signature'` |
| **C** | ein UPDATE setzt `status` **und** `signed_at` | dito | zwei Requests — erlaubt; Schutz greift erst in #2/#3 |
| **E** | ungültiges Secret | Secret bewusst falsch | Edge Function 401, Trigger-Transaktion unbeeinflusst |
| **F/G/H** | Edge Function 401 / 500 / Timeout | pg_net-Response prüfen | Termin-UPDATE in allen Fällen erfolgreich |
| **I** | #2-Idempotenz | zwei Läufe für denselben Termin | zweiter endet in `autoflow_duplicate` |
| **J/K** | #3-Integration, keine Doppelrechnung | nach Redeploy | genau eine Rechnung, ein Autoflow-Link |

Alle DB-seitigen Tests laufen im bewährten Muster: eine Transaktion, die sich per
`RAISE EXCEPTION` zwingend selbst zurückrollt. **Achtung:** `net.http_post` ist bei Rollback
*nicht* zwingend folgenlos — die pg_net-Queue-Zeile wird zwar mit zurückgerollt, aber Tests
A–C sollten trotzdem gegen einen Termin ohne aktiviertes `auto_invoice_enabled` laufen, damit
selbst ein durchgerutschter Request fachlich nichts auslöst.

## N5.11 Empfohlene Rollout-Reihenfolge

1. **Edge Function `autoflow-auto-invoice` neu deployen** (Repo-Stand `110dffc5`, ruft #3).
   Vorher unwirksam, danach wirksam — vgl. CLAUDE.md: HTTP 200 ist kein Erfolgskriterium.
2. Migration **#4** anwenden (kanonische Version `20260917140000`, gleicher Weg wie #3).
3. Vault-Secrets setzen — **manuell, Werte niemals ins Repo**:
   `autoflow_service_key` (service_role key **dieser** Umgebung) und
   `autoflow_functions_base_url` (Functions-Basis-URL **dieses** Projekts).
4. Tests M/N/O, dann D/L, dann A–C.
5. Erst danach `auto_invoice_enabled` für **einen** Pilot-Provider aktivieren und J/K prüfen.

Schritt 2 ist von 1 und 3 unabhängig **anwendbar**, aber ohne beide **wirkungslos**.
Reihenfolge 1 vor 3 ist wichtig: sonst erreicht der erste echte Trigger-Aufruf die alte Function.

## N5.12 Ergebnis

```
MIG4_LEDGER_PRESENT=NO
MIG4_PROD_FUNCTIONS_BACKED_UP=YES
MIG4_ROLLBACK_READY=YES
ROLLBACK_EXACT_PROD_STATE=YES

CURRENT_COMPLETED_ANON_EXECUTE=YES
CURRENT_SIGNED_ANON_EXECUTE=YES
MIG4_FIXES_ANON_EXECUTE_FINDING=NO   (nicht ausnutzbar, siehe N5.3)

MIG4_SECURITY_REVIEW=PASS
MIG4_TRIGGER_CONTRACT=PASS
MIG4_VAULT_CONTRACT=PASS
MIG4_ENVIRONMENT_ISOLATION=PASS
MIG4_IDEMPOTENCY_COMPATIBILITY=PASS
MIG4_INVOICE_RPC_COMPATIBILITY=WARN  (Artefakt PASS, deployte Function veraltet — N5.7)

VAULT_SECRET_EXISTS=NO
VAULT_SECRET_REQUIRED_BEFORE_APPLY=NO
VAULT_SECRET_REQUIRED_BEFORE_FUNCTIONAL_TEST=YES

TEST_PLAN_READY=YES
MIGRATION_4_APPLIED=NO
SAFE_TO_CONSIDER_MIGRATION_4=YES  (mit Rollout-Reihenfolge aus N5.11)
```

**STOPP.** Migration #4 nicht angewendet. Keine Anwendung ohne ausdrückliche Freigabe.

---

# NACHTRAG 6 — Edge-Function-Cutover `autoflow-auto-invoice` (2026-09-21)

**Status:** `EDGE_FUNCTION_DEPLOYED`
Eigener Release-Schritt, **keine** Migration. Migration #4 weiterhin **nicht** angewendet,
**keine** Vault-Änderung, **kein** `auto_invoice_enabled` aktiviert, kein Push.
Ausschließlich `autoflow-auto-invoice` deployt — keine andere Edge Function, keine Config-Änderung.

## N6.1 Warum dieser Schritt vor #4 kommt

NACHTRAG 5 (N5.7) hatte aufgedeckt: die in Production laufende Fassung stammte vom
**2026-08-08** und war älter als der Repo-Stand, der #2/#3 nutzt. Migration #4 repariert die
Trigger-Credentials und lässt den Aufruf zum ersten Mal überhaupt durch — er wäre damit auf der
alten, defekten Logik gelandet. Deshalb zuerst der Cutover, dann #4.

## N6.2 Alt gegen Neu

| | vorher | nachher |
|---|---|---|
| Version | **79** | **80** |
| deployt am | 2026-08-08 23:49 UTC | **2026-09-21 13:06 UTC** |
| Rechnungspfad | `.from("invoices").insert(invoiceData)` — direkter, nicht-atomarer Write | **`rpc("create_invoice_with_items_for_provider", …)`** (#3) |
| Spalten im Write | `appointment_id`, `subtotal`, `tax_amount`, `total`, `items`, `client_name`, `client_email`, `client_address` — **0 von 8 existieren** | entfällt, die RPC schreibt |
| `client_id` | `contacts.id` (falsch — FK zeigt auf `profiles`) | `horse.owner_id`, also `profiles.id` |
| Duplikatsprüfung | `invoices.appointment_id` — Spalte existiert nicht, konnte nie greifen | `invoice_appointments` mit `source='autoflow'`, spiegelt den #2-Index |
| Idempotenz | keine | `autoflow_duplicate` / SQLSTATE `23505` → 200 ohne Rechnung |
| Status / `verify_jwt` | ACTIVE / false | ACTIVE / **false (unverändert)** |

## N6.3 Predeploy-Audit (12 Punkte)

| # | Prüfung | Ergebnis |
|---|---|---|
| 1 | kein `.from("invoices").insert(...)` | ✅ **0** `.from("invoices")`-Zugriffe überhaupt |
| 2 | kein separater `invoice_items`-Write | ✅ **0** Zugriffe |
| 3 | Rechnung über `create_invoice_with_items_for_provider` | ✅ Zeile 142/143 |
| 4 | `p_appointment_id` korrekt übergeben | ✅ Zeile 146, `appointment.id` |
| 5 | #2-Idempotenzvertrag respektiert | ✅ Vorab-SELECT filtert `source='autoflow'` (spiegelt den partiellen Index); verlorenes Rennen → 200 |
| 6 | #3-Provider-/Tenant-Vertrag | ✅ `p_provider_id`, `client_id`, `horse_id` stammen **alle aus der DB-Zeile**, nie aus dem Request |
| 7 | Fehlerbehandlung | ✅ `autoflow_duplicate`/`23505` → 200 no-op; sonstige RPC-Fehler → `autoflow_log('failed')` + 500 mit generischer Meldung |
| 8 | keine Secrets geloggt | ✅ kein `console.*` und kein `logAction`-Feld enthält Key/Token |
| 9 | Authorization auf service-role begrenzt | ✅ `token !== supabaseServiceKey → 401` |
| 10 | Key nur aus ENV | ✅ `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`, kein Literal |
| 11 | kein fremder Tenant abrechenbar | ✅ Request liefert nur `appointment_id` + `trigger_type`; alle Tenant-Werte kommen aus der Appointment-Zeile |
| 12 | disabled-Pfad erhalten | ✅ `!settings?.auto_invoice_enabled` → 200 „skipped", keine Rechnung |

**Abhängigkeiten:** keine relativen Imports — nur `deno.land/std@0.190.0` und
`esm.sh/@supabase/supabase-js@2`. Die Function ist eine einzelne, in sich geschlossene Datei.

### Klassifikation aller Tabellenzugriffe

| Zeile | Tabelle | Klasse |
|---|---|---|
| 42 | `appointments` | READ |
| 61 | `autoflow_settings` | READ |
| 101 | `invoice_appointments` | **READ** |
| 193, 203 | `notifications` | PRODUCTIVE_DIRECT_WRITE |
| 243 | `autoflow_log` | PRODUCTIVE_DIRECT_WRITE |

`invoices` und `invoice_items`: **kein Zugriff**. Rechnungsschreiben läuft ausschließlich
RPC-INDIRECT über #3. → **`PRODUCTIVE_DIRECT_INVOICE_WRITE=NONE`**

Die beiden verbleibenden Direktwrites (`notifications`, `autoflow_log`) laufen **nach** der
Rechnung und sind nicht Teil ihrer Transaktion — schlagen sie fehl, existiert die Rechnung
trotzdem. Das ist unkritisch, aber bewusst festgehalten.

## N6.4 Statische Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `deno check` (Deno 2.9.6, Remote-Deps geladen) | **Exitcode 0**, keine Typfehler |
| `npm run scan:secrets:hufmanager` | **`HUFMANAGER_SECRET_SCAN=PASS files=2763`** |
| `vitest run` (Invoice-/Tenant-Tests) | **4 Dateien, 76 Tests, alle grün** |
| `git diff --check` | sauber (Datei unverändert gegenüber `110dffc5`) |
| Secret-Muster in der Function | 0 JWT · 0 `sbp_` · 0 `supabase.co`-URL · `SERVICE_ROLE_KEY` nur als ENV-Name |

> **Einschränkung, ehrlich festgehalten:** für `autoflow-auto-invoice` existieren **keine eigenen
> Tests**. Die 76 gelaufenen Tests sind Frontend-Lib-Tests (`invoiceLineItems`, `invoiceTax`,
> `invoiceStatus`, `inviteTenantBinding`) und decken diese Function nicht ab. Die Absicherung
> dieses Schritts ruht auf dem statischen Audit, `deno check` und den Live-Tests in N6.6.

## N6.5 Deploy

Vor dem Deploy Sprengweite geprüft: **kein** Cron-Job ruft `autoflow-auto-invoice`
(16 Jobs gesamt; die autoflow-Jobs betreffen `monthly-checkin` und `feedback-check`).
Einzige Aufrufer sind die beiden Trigger — und die laufen bis Migration #4 in ein 401.
Ein fehlerhafter Deploy hätte also praktisch keine Wirkung gehabt.

`config.toml` deklariert bereits `[functions.autoflow-auto-invoice] verify_jwt = false`;
der bestehende Auth-Vertrag wurde **nicht** angefasst, die Function validiert weiterhin selbst.

Deployt: nur `index.ts`, Entrypoint `index.ts`, `verify_jwt=false`.

| Fingerprint | Wert |
|---|---|
| Repo-Artefakt md5 | `0eba6a7e20cfa262527c50d955d430c4` |
| Repo-Artefakt sha256 | `fe943083f0a9a309f88eb0e8c194c5c8064b527046f2cf6deeac7ad34eb7290a` |
| Größe | 10424 Bytes / 254 Zeilen |
| Bundle `ezbr_sha256` (von Supabase) | `7aa60d2558242d58daf75bca51ef9c6b02b46872c64200119fce759f15436f56` |

## N6.6 Postdeploy-Verifikation

Der deployte Source wurde **zurückgelesen** und gegen die Sollwerte geprüft:

| Prüfung | Ergebnis |
|---|---|
| Status / Version | **ACTIVE / 80** (> 79) ✅ |
| `verify_jwt` | **false** — unverändert ✅ |
| `create_invoice_with_items_for_provider` | vorhanden ✅ |
| `p_appointment_id: appointment.id` | vorhanden ✅ |
| `autoflow_duplicate` / `23505`-Handling | vorhanden ✅ |
| Auth-Guard `token !== supabaseServiceKey` | vorhanden ✅ |
| alter `.from("invoices").insert`-Pfad | **entfernt** ✅ |
| `.from("invoice_items")` | nicht vorhanden ✅ |
| hardcodierte Keys / Projekt-URLs | **keine** ✅ |

### Live-Tests gegen die deployte Function

| Test | Erwartung | Ergebnis |
|---|---|---|
| **A** Request ohne `Authorization` | 401 | **HTTP 401** `{"error":"Unauthorized"}` ✅ |
| **B** falscher Bearer-Token | 401 | **HTTP 401** `{"error":"Unauthorized"}` ✅ |
| OPTIONS-Preflight (CORS) | 200 | **HTTP 200** ✅ |
| **C** gültige Auth, fehlende `appointment_id` → 400 | — | **BLOCKED** |
| **D** nicht existierende `appointment_id` → 404 | — | **BLOCKED** |
| **E** Provider mit `auto_invoice_enabled=false` → 200/skipped | — | **BLOCKED** |

C/D/E benötigen den echten `service_role`-Key. Der wird hier weder angefordert noch gehalten
noch protokolliert, deshalb bleiben sie offen. Sie lassen sich später gefahrlos nachholen:
C und D erzeugen keinerlei Writes, E erzeugt genau eine `autoflow_log`-Zeile mit
`status='skipped'` und **keine** Rechnung, kein `invoice_item`, keinen Link.

## N6.7 Prod-State nach dem Deploy

| Prüfung | Soll | Ist |
|---|---|---|
| Migration #4 `20260917140000` | 0 | **0** ✅ |
| Ledger gesamt / Kopf | 437 / `20260917130000` | identisch ✅ |
| `_autoflow_trigger_endpoint` | nicht vorhanden | **0** ✅ |
| public functions | 188 | **188** ✅ |
| Vault-Secrets | 0 | **0** ✅ unverändert |
| `autoflow_settings` Zeilen / davon aktiv | 2 / 0 | **2 / 0** ✅ |
| `invoices` / `invoice_items` / `invoice_appointments` | 11 / 12 / 0 | **11 / 12 / 0** ✅ |
| `autoflow_log` gesamt | 0 | **0** ✅ — kein Aufruf kam je an der Auth vorbei |

**`UNEXPECTED_PROD_WRITES=NONE`.**

## N6.8 Ergebnis

```
AUTOFLOW_PROD_BEFORE_VERSION=79
LOCAL_AUTOFLOW_REVIEW=PASS
CANONICAL_INVOICE_RPC_USED=YES
PRODUCTIVE_DIRECT_INVOICE_WRITE=NONE
IDEMPOTENCY_COMPATIBLE=YES
TENANT_CONTRACT_COMPATIBLE=YES
AUTH_GUARD=PASS
SECRET_SCAN=PASS
PREDEPLOY_TESTS=PASS

AUTOFLOW_DEPLOYED=YES
AUTOFLOW_PROD_AFTER_VERSION=80
DEPLOYED_SOURCE_MATCHES_REPO=YES
POSTDEPLOY_AUTH_TEST=PASS
DISABLED_PROVIDER_TEST=BLOCKED   (service_role-Key nicht verfuegbar)
UNEXPECTED_PROD_WRITES=NONE

MIGRATION_4_APPLIED=NO
VAULT_CHANGED=NO
AUTO_INVOICE_ENABLED_COUNT=0

SAFE_TO_PREPARE_MIGRATION_4=YES
```

**Nächster Schritt laut Rollout-Reihenfolge (N5.11):** Schritt 1 ist erledigt. Es folgen
Migration #4, danach die beiden Vault-Secrets, danach Tests, danach ein Pilot-Provider.

**STOPP.** Keine Migration #4, keine Vault-Secrets, kein `auto_invoice_enabled`, kein Push.

---

# NACHTRAG 7 — Migration #4 angewendet (2026-09-21)

Ausgeführt wurde genau **ein** Schritt: Migration **#4**
`20260917140000_fix_autoflow_trigger_auth_vault_v1` gegen Production
`vnschgjxkzzwzefqlrji`. **Keine Vault-Secrets, kein `auto_invoice_enabled`, keine Migration #5,
kein Push.**

## N7.1 Artefakt-Integrität

| | |
|---|---|
| Datei | `docs/backups/mig4_20260917140000_apply_canonical.sql` |
| sha256 | `78ba4d763a2b790983548bd26392b5929ee5630dc94a96412f1c14844c61cf96` |
| Größe | 9571 Bytes |
| **eingebetteter Migrationstext md5** | **`3056567c716fd7a318254042f6e878a4`** (7864 Zeichen) |
| Rollback-Artefakt | `docs/backups/mig4_20260917140000_prestate_rollback_2026-09-21.sql` (bereits getrackt) |

Wie bei #2 und #3 steht der Migrationstext im Skript **einmal**: er wird von dort per `EXECUTE`
ausgeführt **und** von dort in `statements` geschrieben — ausgeführter und protokollierter Text
sind derselbe Wert, nicht zwei verglichene Kopien. Zwei Guards hätten vor jedem
Produktionskontakt abgebrochen: der md5-Check im Shell-Wrapper und der `raise exception`-Guard
innerhalb der Transaktion.

**Kein `apply_migration`, kein `migration repair`, kein `db push`** — deshalb keine serverseitig
vergebene Version und keine neue Drift.

## N7.2 Apply

`psql` über den Session-Pooler (`Port 5432`, `postgres.vnschgjxkzzwzefqlrji`, `sslmode=require`),
genau **ein** Versuch, kein Retry. Das DB-Passwort wurde ausschließlich über `/dev/tty` gelesen,
nicht gespeichert, nicht geloggt, nicht an ein Werkzeug übergeben; das Skript verweigert den
Start ohne steuerndes Terminal. Client-Protokoll:

```
BEGIN
CREATE TABLE
INSERT 0 1
DO
INSERT 0 1
COMMIT
```

Das ist die Client-Sicht. **Maßgeblich ist der anschließend read-only erhobene DB-Zustand**
(N7.3 ff.) — dieser wurde nach dem Apply unabhängig über die Supabase-API erhoben, nicht aus
dem Log abgeschrieben.

## N7.3 Postcheck — Ledger

| Prüfung | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| `version` | `20260917140000` | `20260917140000` | ✅ **kanonisch** |
| Häufigkeit | genau 1 | **1** | ✅ |
| **zusätzliche automatisch erzeugte Version** | 0 | **0** | ✅ kein Drift |
| `name` | `fix_autoflow_trigger_auth_vault_v1` | identisch | ✅ |
| `statements` md5 / Länge | `3056567c716fd7a318254042f6e878a4` / 7864 | identisch | ✅ |
| `array_length(statements,1)` | 1 | **1** | ✅ |
| `created_by` | `passaondigital@gmail.com` | identisch | ✅ |
| `idempotency_key` / `rollback` | NULL / NULL | **NULL / NULL** | ✅ |
| Ledger gesamt | 438 | **438** | ✅ exakt +1 |
| Ledger-Kopf | `20260917140000` | identisch | ✅ |

### Keine andere Ledger-Zeile verändert

| Eintrag | dokumentierter Sollwert | jetzt gemessen | |
|---|---|---|---|
| #1 `20260917120000` | `5df63e4ff759f7df487080626a9b683f` (5568) | identisch | ✅ |
| #2 `20260917125000` | `f1c006ac7ec2b3eb923277977a35927b` (3464) | identisch | ✅ |
| #3 `20260917130000` | `427b0dfbfa98b518f92eaeacc6d3b086` (12342) | identisch | ✅ |
| übrige Zeilen (`version not in (#3,#4)`) | 436 | **436** | ✅ |

> **Abweichung zur Methodik der Nachträge 3/4 — offen ausgewiesen:** dort wurde ein
> Gesamt-Fingerprint `ledger_others_md5` geführt, dessen **exakter SQL-Ausdruck im Dokument nicht
> festgehalten** ist (nur die Kurzform `md5(string_agg(version‖name‖md5(statements)‖created_by …))`).
> Er ließ sich hier nicht bit-genau reproduzieren — u. a. weil 4 Zeilen `created_by IS NULL`
> haben und das Verhalten von der genauen Klammerung/Coalescierung abhängt. Statt einen
> nicht vergleichbaren Wert als „unverändert" auszugeben, steht oben der **Zeilennachweis pro
> Release-Migration** plus die unveränderte Restmenge. Neuer, ab jetzt reproduzierbarer
> Fingerprint für Folgeschritte, Ausdruck explizit:
>
> ```sql
> select md5(string_agg(version||name||md5(statements::text)||coalesce(created_by,''), ''
>                       order by version)), count(*)
> from supabase_migrations.schema_migrations
> where version not in ('20260917130000','20260917140000');
> -- = d5d60e2b50d9ce5f8f120eb2a81b4eba / 436
> ```

## N7.4 Postcheck — Schemaobjekte

Alle drei Bodies wurden lokal aus dem Repo-Artefakt zwischen `AS $$` und `$$;` extrahiert und
gegen `pg_proc.prosrc` gehasht — **Inhaltsgleichheit, nicht Namensgleichheit**:

| Funktion | erwartetes `md5(prosrc)` | gemessen | Länge | SECDEF | `search_path` | Owner |
|---|---|---|---|---|---|---|
| `_autoflow_trigger_endpoint()` | `922245f9f39cde4fecdf6370f632c08d` | **identisch** ✅ | 513 | true | `public` | `postgres` |
| `autoflow_on_appointment_completed()` | `83e452510cd0e70bae468209b527ea6d` | **identisch** ✅ | 842 | true | `public` | `postgres` |
| `autoflow_on_appointment_signed()` | `d03154a74218793df5fce0ddaa7ed7d6` | **identisch** ✅ | 822 | true | `public` | `postgres` |

### Vorher / nachher

| | vor #4 (N5.2) | nach #4 |
|---|---|---|
| `autoflow_on_appointment_completed` md5 (Länge) | `92910008ac054d1741829613ca2c0155` (710) | **`83e452510cd0e70bae468209b527ea6d`** (842) |
| `autoflow_on_appointment_signed` md5 (Länge) | `ab5ddbc4edd28ceee007421c83ce0aa3` (691) | **`d03154a74218793df5fce0ddaa7ed7d6`** (822) |
| `_autoflow_trigger_endpoint` | existierte nicht | **vorhanden** |

| Prüfung | Ergebnis |
|---|---|
| JWT-Literal (`eyJ`) in einem der drei Bodies | **nein** ✅ — das hartcodierte anon-Token ist weg |
| `supabase.co`-URL in einem der drei Bodies | **nein** ✅ — keine Projekt-URL mehr im Code |
| Umgebungsauflösung | ausschließlich über `vault.decrypted_secrets` ✅ |

### Trigger-Bindung unverändert

| Trigger | Tabelle | Event | Funktion | `tgenabled` |
|---|---|---|---|---|
| `trg_autoflow_appointment_completed` | `public.appointments` | `AFTER UPDATE FOR EACH ROW` | `autoflow_on_appointment_completed()` | `O` (aktiv) ✅ |
| `trg_autoflow_appointment_signed` | `public.appointments` | `AFTER UPDATE FOR EACH ROW` | `autoflow_on_appointment_signed()` | `O` (aktiv) ✅ |

Kein `DROP`/`CREATE TRIGGER` nötig gewesen und keiner erfolgt — `CREATE OR REPLACE FUNCTION`
bei gleicher Signatur genügt.

## N7.5 Grants — der eine Punkt, der wirklich zählt, und ein bleibender Restbefund

Gemessen über `has_function_privilege(role, oid, 'EXECUTE')`, nicht über ACL-Textparsing:

| Funktion | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| **`_autoflow_trigger_endpoint()`** | **false** ✅ | **false** ✅ | true |
| `autoflow_on_appointment_completed()` | **true** ⚠️ | **true** ⚠️ | true |
| `autoflow_on_appointment_signed()` | **true** ⚠️ | **true** ⚠️ | true |

**Der `REVOKE` in #4 hat gegriffen — für die einzige Funktion, die ihn braucht.**
`_autoflow_trigger_endpoint()` gibt den Service-Key als Spalte zurück und ist eine normale,
direkt aufrufbare Funktion; sie ist für `anon` und `authenticated` gesperrt.

> **RESTBEFUND — durch #4 ausdrücklich NICHT behoben.**
> `autoflow_on_appointment_completed()` und `autoflow_on_appointment_signed()` haben
> **weiterhin** `EXECUTE` für `anon` und `authenticated`. `CREATE OR REPLACE FUNCTION` erhält
> bestehende ACLs, und #4 enthält für diese beiden **kein** `REVOKE` — exakt wie in **N5.3**
> vor dem Apply vorhergesagt. Der Zustand ist unverändert gegenüber N5.2
> (`CURRENT_COMPLETED_ANON_EXECUTE=YES`, `CURRENT_SIGNED_ANON_EXECUTE=YES`), also **keine
> Verschlechterung**, aber auch **keine Behebung**.
>
> Ausnutzbarkeit bleibt wie in N5.3 empirisch geprüft: PostgreSQL verweigert den Direktaufruf
> einer `RETURNS trigger`-Funktion (`0A000: trigger functions can only be called as triggers`)
> unabhängig vom Grant, der Service-Key kann darüber nicht abfließen. Die saubere Schließung
> (zwei zusätzliche `REVOKE`-Zeilen) wäre eine Artefaktänderung und damit eine eigene
> Entscheidung — hier weiterhin nicht eigenmächtig vorgenommen.

## N7.6 Keine unerwarteten Schemaänderungen, keine Prod-Writes

| Katalog | Pre (N6.7) | Post | Ergebnis |
|---|---|---|---|
| public functions | 188 | **189** | ✅ exakt +1 (`_autoflow_trigger_endpoint`) |
| public tables | 292 | **292** | ✅ |
| Policies gesamt (`pg_policy`, alle Schemas) | 835 | **835** | ✅ (davon `public`: 753) |
| **Vault-Secrets** | 0 | **0** | ✅ **nichts angelegt** |
| `autoflow_settings` Zeilen / davon aktiv | 2 / 0 | **2 / 0** | ✅ `auto_invoice_enabled` nicht angefasst |
| `autoflow_log` | 0 | **0** | ✅ kein Trigger-Aufruf ausgelöst |
| `invoices` / `invoice_items` / `invoice_appointments` | 11 / 12 / 0 | **11 / 12 / 0** | ✅ keine Datenänderung |
| Temp-Reste (`_mig%`, `pg_temp%`) | — | **0** | ✅ `on commit drop` hat gegriffen |
| Edge Function `autoflow-auto-invoice` | v80 (Deploy 15:06:45) | **v80, ACTIVE** | ✅ durch #4 unverändert |

**`UNEXPECTED_PROD_WRITES=NONE`.**

## N7.7 Advisors — #4 hat kein einziges Finding hinzugefügt

| Advisor Security | nach #3 (N4.8) | nach #4 |
|---|---|---|
| Gruppen / Findings | 5 / 311 | **5 / 311** ✅ |
| `anon_security_definer_function_executable` | 149 | **149** ✅ |
| `authenticated_security_definer_function_executable` | 156 | **156** ✅ |
| `rls_enabled_no_policy` (INFO) / `extension_in_public` / `auth_leaked_password_protection` | 4 / 1 / 1 | **4 / 1 / 1** ✅ |
| ERROR-Level | 0 | **0** ✅ |

* **`_autoflow_trigger_endpoint` taucht in keinem einzigen Finding auf** — unabhängige
  Bestätigung, dass der `REVOKE` wirksam ist.
* `autoflow_on_appointment_completed` und `autoflow_on_appointment_signed` werden in **beiden**
  SECURITY-DEFINER-Listen weiterhin geführt — der Restbefund aus N7.5, wie in N5.3 angekündigt.

## N7.8 Wirkung: angewendet, aber bewusst noch nicht scharf

`vault.secrets` ist **leer** (0 Zeilen), `autoflow_functions_base_url` und `autoflow_service_key`
existieren nicht. `_autoflow_trigger_endpoint()` liefert damit die leere Menge, beide Trigger
gehen in den `RAISE WARNING`-Pfad und setzen **keinen** `net.http_post` ab. Das `UPDATE` auf
`appointments` läuft unverändert durch.

**Automatische Rechnungsstellung bei Completion/Signatur feuert weiterhin nicht.** Das ist der
geplante Fail-Safe-Zustand und **keine Regression**: vorher scheiterte jeder Aufruf am 401 der
Edge Function (`autoflow_log` = 0 belegt, dass nie einer durchkam). #4 hat den Mechanismus
korrekt, umgebungsisoliert und ohne Secret im Repo bereitgestellt — scharf wird er erst mit
Schritt 2 der Rollout-Reihenfolge aus N5.11.

## N7.9 Ergebnis

```
MIG4_ARTEFACT_INTEGRITY=PASS
MIG4_APPLIED=YES
MIG4_APPLY_STATE=COMMITTED
MIG4_APPLY_METHOD=PSQL_TTY
MIG4_LEDGER_VERSION=20260917140000
MIG4_LEDGER_STATEMENTS_MD5=3056567c716fd7a318254042f6e878a4
LEDGER_DRIFT_CREATED=NO
LEGACY_LEDGER_ROWS_UNCHANGED=YES

ENDPOINT_FN_PROSRC_MD5=922245f9f39cde4fecdf6370f632c08d
ENDPOINT_FN_SECURITY_DEFINER=YES
ENDPOINT_FN_SEARCH_PATH=public
ENDPOINT_FN_ANON_EXECUTE=NO
ENDPOINT_FN_AUTHENTICATED_EXECUTE=NO
ENDPOINT_FN_SERVICE_ROLE_EXECUTE=YES

COMPLETED_FN_PROSRC_MD5=83e452510cd0e70bae468209b527ea6d
SIGNED_FN_PROSRC_MD5=d03154a74218793df5fce0ddaa7ed7d6
COMPLETED_FN_ANON_EXECUTE=YES     (Restbefund, durch #4 NICHT behoben)
SIGNED_FN_ANON_EXECUTE=YES        (Restbefund, durch #4 NICHT behoben)
HARDCODED_JWT_REMOVED=YES
HARDCODED_PROD_URL_REMOVED=YES
TRIGGER_BINDINGS_UNCHANGED=YES

VAULT_SECRET_COUNT=0
VAULT_CHANGED=NO
AUTO_INVOICE_ENABLED_COUNT=0
AUTO_INVOICE_LIVE=NO
EDGE_FUNCTION_AUTOFLOW_AUTO_INVOICE_VERSION=80
AUTOFLOW_LOG_ROWS=0

ADVISORS_SECURITY_FINDINGS=311   (unveraendert)
ADVISORS_ADDED_BY_MIG4=0
UNEXPECTED_PROD_WRITES=NONE
PRODUCTION_UNEXPECTED_SIDE_EFFECTS=NONE

MIGRATION_5_APPLIED=NO
PUSHED=NO
```

## N7.10 Aktualisiertes Mengengerüst

| | nach NACHTRAG 4 | jetzt |
|---|---|---|
| Ledger-Einträge | 437 | **438** |
| Ledger-Kopf | `20260917130000` | **`20260917140000`** |
| Release-Migrationen offen | 6 (#4–#9) | **5 (#5–#9)** |
| public functions | 188 | **189** |
| durch das Werkzeug erzeugte Drift | 0 | **0** ✅ |

Abgeleitet (Arithmetik, nicht per CLI erhoben): „nur lokal" 401 → **400**, beidseitig 80 → **81**,
„nur remote" **357** unverändert. Die historische Drift (§3 Klasse B, 317 Einträge) besteht fort.
**`db push` bleibt gesperrt** — §6 gilt unverändert.

Noch nicht in Production, im Repo vorhanden (read-only gegengeprüft, alle 5 **nicht** im Ledger):
`20260917150000`, `20260917155000`, `20260917160000`, `20260920120000`, `20260920190000`
— die Invite-/Ghost-Kette.

**Nächster Schritt laut Rollout-Reihenfolge (N5.11):** Schritt 2 — die beiden Vault-Secrets
dieser Umgebung setzen. Der `service_role`-Key wird dabei **nicht** durch ein Werkzeug, ein
Skript oder dieses Dokument geführt; das ist ein manueller Einzelschritt.

**STOPP.** Keine Vault-Secrets, kein `auto_invoice_enabled`, keine Migration #5, kein Push.

---

# NACHTRAG 8 — Migration #5 Production Apply (2026-09-21)

`20260917150000_add_pending_client_invite_contract_v1`

Erste Migration der Invite-/Ghost-Kette. Angewendet als **Einzelschritt**; #6–#9 bleiben
bewusst aus. Ergebnis: **COMMITTED**, Ledger ohne Drift, Bestandsdaten unverändert,
zwei neue Advisor-Befunde klassifiziert (einer davon empirisch geprüft).

## N8.1 Artefakt-Integrität

| Größe | Wert |
|---|---|
| `MIG5_FILE` | `supabase/migrations/20260917150000_add_pending_client_invite_contract_v1.sql` |
| `MIG5_MD5` | `d0f8b9bd274a61b775f36c5e2711d45c` |
| `MIG5_SHA256` | `43845b642545af55e3bd7c2b778acfd5415e953c49dfc8f2a816fc87f555c13d` |
| `MIG5_BYTES` | 16586 |
| `MIG5_LINES` | 412 |
| Apply-Artefakt | `docs/backups/mig5_20260917150000_apply_canonical.sql` |
| `APPLY_ARTIFACT_MD5` | `4e9a57fbd96db3392bd2e501159ea67b` |
| `APPLY_ARTIFACT_BYTES` | 18530 |
| Rollback | `docs/backups/mig5_20260917150000_prestate_rollback_2026-09-21.sql` (`b1dff683f42a384d50fe32a9e5bcbd16`) |

Das Apply-Artefakt wurde **aus den Repo-Bytes generiert**, nicht abgeschrieben. Nachweis vor
dem Apply: der eingebettete Text kommt genau einmal vor (`REPO_TEXT_OCCURRENCES=1`), ist
byte-identisch (`EMBEDDED_MD5 == REPO_MD5`), und die md5-Guard-Konstante im Artefakt stimmt
mit der Repo-Datei überein. Genau ein `begin;`, genau ein `commit;`, genau eine Ledger-Version.

### Statisches Audit — bestätigt

| Behauptung | Messung |
|---|---|
| 24 DDL-Statements | **24** ✅ |
| 0 DML-Statements | **0** ✅ |
| 5 SECURITY DEFINER | **5** ✅ |
| keine Trigger-/Vault-/Edge-/Extension-Änderung | **keine** ✅ |
| kein `DROP`/`TRUNCATE` | **keins** ✅ |

**Präzisierung:** Die Datei *enthält* vier `UPDATE`-Statements. Sie liegen ausnahmslos in den
**Funktionskörpern** von #5 und betreffen ausschließlich die neue Tabelle. Beim Apply wird
davon nichts ausgeführt. „0 DML" gilt für die Migration, nicht für den Dateitext.

## N8.2 Pre-State (read-only, vor dem Apply)

Ledger: `total=438`, `max=20260917140000`, #1–#4 je exakt 1, **#5 = 0**, keine Phantomversion
(`version LIKE '2026091715%'` → 0), #6–#9 = 0.

Negativer Objekt-Prestate — alle 8 #5-Objekte nachweislich **nicht vorhanden**: Tabelle,
Indizes, und die sechs Funktionen. Abhängigkeiten vorhanden: `public.profiles`,
`public.has_role(_user_id uuid, _role app_role)`, Enum `app_role` (mit Label `provider`),
`auto_assign_client_to_provider`.

### Datenbasis vor dem Apply

| Metrik | Wert |
|---|---|
| profiles (gesamt / nicht gelöscht) | 103 / 93 |
| contacts | 44 |
| access_grants (gesamt / aktiv) | 57 / 43 |
| hm_connect_invitations | 0 |
| user_roles | 64 |
| auth.users | 64 |
| **Ghost-Profile** | **39** |
| **Duplikat-E-Mail-Gruppen** | **4** |

Die beiden bekannten Befunde reproduzieren exakt. Die Definitionen wurden **aus Migration #8
abgeleitet**, nicht geraten:

- **Ghost-Profil** = `profiles`-Zeile ohne zugehörige `auth.users`-Zeile (inkl. soft-deleted);
  #8 selektiert mit `NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)`. → **39**
  (davon 35 nicht soft-deleted)
- **Duplikat-Gruppe** = normalisierte E-Mail über alle Profile mit `count(*) > 1` → **4**
  (bei Einschränkung auf nicht-gelöschte Profile: 2)

## N8.3 Vorab-Probelauf in isolierter Instanz

Vor dem Production-Apply wurde das Artefakt vollständig in `mig34-isolated-test` geprobt
(Schemaklon, 289 Tabellen, identischer negativer Prestate). Alle 24 Statements liefen
fehlerfrei, md5-Guard bestanden, Commit sauber. Anschließend lief die Rollback-Datei und
meldete `ROLLBACK #5 OK` — die Instanz war wieder bei 0 Objekten.

**Fund aus dem Probelauf:** Der Ledger-Insert scheiterte dort an Rechten (Ledger gehört in
diesem Container `supabase_admin`). Für Production wurde das **vorab read-only geklärt**:
`supabase_migrations.schema_migrations` gehört dort `postgres` und ist beschreibbar. Der
Apply-Pfad war damit vor dem ersten Schreibversuch als frei nachgewiesen.

## N8.4 Apply

Ausführungsweg: `psql` über den Session Pooler, genau ein Aufruf, keine Retry-Schleife,
Passwort ausschließlich interaktiv über `/dev/tty` (nie gespeichert, geloggt, in eine Datei
geschrieben oder in die Shell-History aufgenommen). Kein `supabase db push`, kein
`apply_migration`, kein `_prepared`, kein Migration-Repair.

`PSQL_EXIT=0` — dieser Wert wurde **nicht** als Beweis akzeptiert; der gesamte Postcheck
unten ist unabhängig read-only gegen Production erhoben.

## N8.5 Post-State — Ledger

| Prüfung | Ergebnis |
|---|---|
| `20260917150000` | exakt **1** ✅ |
| Phantom-/Doppelversion (`LIKE '2026091715%'`) | **1** (nur die kanonische) ✅ |
| `ledger_max` | `20260917150000` ✅ |
| `ledger_total` | 438 → **439** (+1) ✅ |
| #1–#4 | je weiterhin exakt 1 ✅ |
| `LEDGER_DRIFT_CREATED` | **NO** ✅ |

Ledger-Zeile: `name=add_pending_client_invite_contract_v1`,
`created_by=passaondigital@gmail.com`, `idempotency_key=NULL`, `rollback=NULL`,
`array_length(statements)=1`.

**Beweis der Textidentität:** `md5(statements[1]) = d0f8b9bd274a61b775f36c5e2711d45c` —
identisch mit der Repo-Datei. `octet_length(statements[1]) = 16586`, ebenfalls exakt die
Dateigröße. (`length()` liefert 15607, das sind Zeichen statt Bytes — die Datei enthält
UTF-8-Mehrbytezeichen.)

Die md5 von #3 (`427b0dfbfa98b518f92eaeacc6d3b086`) und #4 (`3056567c716fd7a318254042f6e878a4`)
wurden vor und nach dem Apply erhoben und sind unverändert.

## N8.6 Post-State — Objektvertrag

Alle Fingerprints stimmen mit dem isolierten Probelauf **exakt** überein. Production ==
Probelauf == Repo-Bytes.

### Tabelle `public.hm_pending_client_invites`

| Eigenschaft | Wert |
|---|---|
| Owner | `postgres` |
| RLS | **enabled** |
| FORCE RLS | **enabled** |
| Policies | **0** (beabsichtigt, siehe N8.8) |
| ACL | `postgres=arwdDxtm/postgres \| service_role=arwdDxtm/postgres` |
| `anon` / `authenticated` / `authenticator` | **kein einziges Tabellenprivileg** |
| Zeilen | **0** |
| Table-Comment | vorhanden |
| Spalten | 13, exakt wie in der Migration |

Constraints: `hm_pending_client_invites_pkey` (PK), `_provider_id_fkey`
(FK → `profiles(id)` ON DELETE CASCADE), `_email_normalized` (CHECK), `_ttl` (CHECK),
`_consumed_needs_user` (CHECK).

Indizes (5): `_pkey`, `_active_email_uniq` (partiell UNIQUE), `_provider_request_uniq`
(UNIQUE), `_expires_idx` (partiell), `_user_idx`.

### Funktionen

| Funktion | SECDEF | `search_path` | `prosrc` md5 | anon | auth | service_role |
|---|---|---|---|---|---|---|
| `_hm_normalize_email(text)` | **nein** (INVOKER) | **(keiner)** | `4f7063e091f7c6a30525e78ce68da4ae` | ✗ | ✗ | ✓ |
| `_hm_expire_pending_client_invites(text)` | ja | `public` | `480bc9207014cf8b06b18f6dc12cf951` | ✗ | ✗ | ✓ |
| `_hm_has_active_pending_client_invite(text)` | ja | `public` | `2d7a311cc74468f65c7b099acc8dbeb2` | ✗ | ✗ | ✓ |
| `create_pending_client_invite_v1(uuid,text,text,integer)` | ja | `public` | `098ba120e40e3e51019e74c827959d84` | ✗ | ✗ | ✓ |
| `bind_pending_client_invite_v1(uuid,uuid,uuid)` | ja | `public` | `f3f54e2f09a9b07b433f059baaffc91f` | ✗ | ✗ | ✓ |
| `invalidate_pending_client_invite_v1(uuid,uuid,text,boolean)` | ja | `public` | `c1566e59c4a3a1d668896058b175169f` | ✗ | ✗ | ✓ |

Alle sechs Owner `postgres`, ACL durchweg `postgres=X | service_role=X`.
`has_function_privilege` für `anon`, `authenticated` und `authenticator`: **überall false**.

### Warum `FORCE RLS` + 0 Policies den Vertrag nicht blockiert

`FORCE ROW LEVEL SECURITY` unterwirft normalerweise auch den Tabelleneigentümer der RLS — bei
null Policies wäre damit selbst `postgres` gesperrt und die SECURITY-DEFINER-Funktionen
funktionslos. Read-only geprüft: `postgres` und `service_role` haben beide
**`rolbypassrls = true`** und umgehen RLS deshalb unabhängig von `FORCE`. Der Vertrag ist
funktionsfähig. `anon`, `authenticated` und `authenticator` haben `rolbypassrls = false`.

## N8.7 Advisor-Befund 1 — `function_search_path_mutable` (`_hm_normalize_email`)

**Status: PASS_WITH_DOCUMENTED_FINDING — kein Blocker für #6.**

| Frage | Antwort |
|---|---|
| **A** Teil der kanonischen #5? | **Ja.** Statement 1 der Migration (Zeilen 61–67). `prosrc` md5 identisch mit Repo und Probelauf. |
| **B** Absicht oder Härtungslücke? | **Echte Lücke, aber nachvollziehbare Auslassung.** Der Autor hat `SET search_path` genau auf den fünf SECURITY-DEFINER-Funktionen gesetzt, wo er Privilege Escalation verhindert, und auf dem einen INVOKER-Helper weggelassen, wo er das nicht tut. Trotzdem eine Abweichung: `_hm_normalize_email` ist die **einzige** von 195 Routinen in `public` ohne festen `search_path`. |
| **C** Praktisch ausnutzbar? | **Nein** — siehe empirische Prüfung unten. |
| **D** Wer darf sie aufrufen? | `postgres`, `service_role` (und Superuser `supabase_admin`). **Nicht** `anon`, `authenticated`, `authenticator`. |
| **E** Nur intern genutzt? | **Ja.** Referenziert ausschließlich von den vier anderen #5-Funktionen — alle SECURITY DEFINER mit `search_path=public`. In **keinem** Index-, Constraint-, Default-, View- oder Generated-Column-Ausdruck (read-only geprüft), das IMMUTABLE-Persistenzrisiko entfällt damit. |
| **F** Fixt #6–#9 das? | **Nein.** Keine der vier definiert die Funktion neu oder ändert ihre Grants; sie rufen sie nur auf — ausnahmslos aus SECURITY-DEFINER-Funktionen mit `search_path=public`. Der Befund besteht über die Kette fort, das Risiko wächst aber nicht. |
| **G** Vor #6 fixen? | **Nein, kein MUST_FIX_BEFORE_NEXT_MIGRATION.** Als dokumentierter Restbefund tragbar. |

### Empirische Prüfung (isolierte Instanz, nicht Production)

Der Befund wurde nicht theoretisch abgetan, sondern angegriffen: Schema `evil` mit
shadowenden `lower()`/`btrim()`, dann die Funktion aufgerufen.

| Szenario | Ergebnis |
|---|---|
| `search_path = public` (Baseline) | `mixed@example.com` — korrekt |
| `search_path = evil, public` (realistischer Fall) | `mixed@example.com` — **unverändert** |
| `search_path = evil, pg_catalog, public` | `PWNED-lower` — **Shadowing gelingt** |

Der Befund ist also **echt, kein False Positive**. Entscheidend ist, dass `pg_catalog`
implizit zuerst durchsucht wird, solange es nicht explizit *nach* einem fremden Schema
einsortiert wird. `coalesce`/`nullif` sind SQL-Konstrukte und grundsätzlich nicht shadowbar.

### Warum das trotzdem nicht ausnutzbar ist

Ein Angriff braucht **drei** Vorbedingungen gleichzeitig. Read-only gegen Production geprüft:

| Rolle | Schema/Funktion anlegen | `EXECUTE` auf die Funktion | ausnutzbar |
|---|---|---|---|
| `anon` | ✗ | ✗ | **nein** |
| `authenticated` | ✗ | ✗ | **nein** |
| `authenticator` | ✗ | ✗ | **nein** |
| `service_role` | ✗ | ✓ | **nein** (kann nichts anlegen) |
| `postgres` | ✓ | ✓ | irrelevant — kann die Funktion ohnehin direkt umschreiben |

Dazu: die Funktion ist **SECURITY INVOKER**. Selbst wenn die Auflösung manipuliert würde,
entstünde kein Rechtegewinn — der Code liefe mit den Rechten des Aufrufers. Die
Sicherheitsrichtung von #5 („NO GRANT ist erlaubt, WRONG GRANT nie") bliebe gewahrt: ein
verfälschter Normalisierungswert führt zu *keinem* Treffer, nicht zu einem falschen Grant.

### Fix-Plan (nicht angewendet)

Eigene, eng begrenzte Härtungsmigration — **nicht** durch Änderung der bereits angewendeten
#5-Datei:

1. `CREATE OR REPLACE FUNCTION public._hm_normalize_email(text) … SET search_path = pg_catalog, public;`
   (Signatur, Volatilität, Rückgabetyp und Body unverändert — reines Hinzufügen von `proconfig`.)
2. Verifikation: `proconfig` gesetzt, `prosrc` md5 unverändert, ACL unverändert,
   Advisor-Befund verschwunden.
3. Einordnung: kann vor #6 oder gebündelt später laufen. Da #6–#9 die Aufrufsituation nicht
   verschärfen, ist die Reihenfolge frei.

## N8.8 Advisor-Befund 2 — `rls_enabled_no_policy` (`hm_pending_client_invites`)

**Status: beabsichtigt. `INTENTIONAL_RLS_NO_POLICY=YES`.** Advisor-Level ist **INFO**, nicht WARN.

| Frage | Antwort |
|---|---|
| Absichtlich service-role-only? | **Ja**, so im Migrationskommentar begründet: „RLS an, bewusst OHNE Policy". |
| Haben `anon`/`authenticated` Tabellenprivilegien? | **Nein** — `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`REFERENCES`/`TRIGGER` alle `false`. |
| Kann PostgREST Zugriff bekommen? | **Nein.** PostgREST meldet sich als `authenticator` an (`rolinherit=false`, erbt also nichts) und wechselt per JWT-Claim die Rolle. `anon`/`authenticated` haben keine Privilegien → `42501`. Nur ein `service_role`-JWT käme durch — und dieser Key ist serverseitig. `anon`/`authenticated` sind in keiner Rolle Mitglied und erreichen weder `service_role` noch `postgres`. |
| Umgeht `service_role` RLS erwartungsgemäß? | **Ja**, `rolbypassrls=true`. |
| Gewünschter Default-Deny-Vertrag? | **Ja** — doppelt verriegelt: die Privilegienebene sperrt bereits vor RLS, RLS ist das zweite Schloss. |
| Fehlt eine Policy? | **Nein.** Eine Policy würde den Zugriff nur *erweitern*. Niemand außer `service_role`/SECURITY DEFINER soll die Tabelle je sehen. |

**Etabliertes Muster:** Vier weitere Tabellen fahren bereits RLS ohne Policy
(`hm_lifecycle_reconciliation_issues`, `hm_reconciler_runs`, `hufi_data_events`,
`hufi_data_state`). `hm_pending_client_invites` ist von diesen fünf die **strengste** — als
einzige zusätzlich mit `FORCE ROW LEVEL SECURITY`.

## N8.9 Sicherheits- und Tenant-Review

| Prüfpunkt | Ergebnis |
|---|---|
| #5 erteilt selbst Provider-/Client-Zugriff? | **Nein.** 0 DML, keine Zeile in `access_grants`/`user_roles`/`profiles` angefasst. |
| `authenticated` kann Invitation-State fremder Provider setzen? | **Nein** — kein Tabellenprivileg, kein `EXECUTE` auf irgendeine #5-Funktion. Die Sperre greift auf der Privilegienebene, vor jeder Policy-Logik. |
| `authenticated` kann fremde E-Mail-Zuordnungen/Ghost-Daten übernehmen? | **Nein** — #5 verändert `handle_new_user` und `auto_assign_client_to_provider` nicht (siehe N8.10). |
| `anon` kann interne #5-Funktionen ausführen? | **Nein**, alle sechs `false`. |
| SECURITY DEFINER: `search_path` fest? | **Ja**, alle fünf `search_path=public`. |
| SECURITY DEFINER: Auth-Kontext validiert? | `create_pending_client_invite_v1` prüft `has_role(p_provider_id,'provider')`; `bind_…` und `invalidate_…` prüfen die Provider-Bindung der Invite-Zeile und lehnen fremde Provider ab; `bind_…` vergleicht zusätzlich die normalisierte E-Mail des Auth-Users gegen den Invite. |
| Freie `provider_id`/`user_id`-Manipulation? | Nur über `service_role` möglich — das ist der vorgesehene serverseitige Aufrufer. Aus dem Browser nicht erreichbar. |
| PUBLIC-Grants korrekt? | **Ja**, `REVOKE ALL … FROM PUBLIC, anon, authenticated` auf allen sechs Funktionen und auf der Tabelle. |
| Neue Tabelle: RLS aktiv, kein öffentlicher Zugriff? | **Ja** (N8.6/N8.8). |

### Advisor-Gesamtbild

6 Befundkategorien. Entscheidend für #5:

- `anon_security_definer_function_executable` (WARN, **149** Funktionen) — **keine** aus #5
- `authenticated_security_definer_function_executable` (WARN, **156** Funktionen) — **keine** aus #5
- `function_search_path_mutable` (WARN, **1** Funktion) — `_hm_normalize_email`, siehe N8.7
- `rls_enabled_no_policy` (INFO, 5 Tabellen) — siehe N8.8
- `extension_in_public`, `auth_leaked_password_protection` — Altbefunde, ohne #5-Bezug

Die Anforderung „neue #5-Funktionen dürfen keine unbeabsichtigten anon/authenticated
SECURITY-DEFINER-Findings erzeugen" ist damit **erfüllt**: die beiden großen WARN-Kategorien
sind Altlasten, keine einzige #5-Funktion taucht darin auf.

## N8.10 Side-Effect-Matrix

| Metrik | Vorher | Nachher | Δ |
|---|---|---|---|
| Ledger gesamt | 438 | **439** | +1 (nur #5) |
| Ledger max | `20260917140000` | `20260917150000` | erwartet |
| profiles gesamt / nicht gelöscht | 103 / 93 | **103 / 93** | **0** |
| contacts | 44 | **44** | **0** |
| access_grants gesamt / aktiv | 57 / 43 | **57 / 43** | **0** |
| hm_connect_invitations | 0 | **0** | **0** |
| user_roles | 64 | **64** | **0** |
| auth.users | 64 | **64** | **0** |
| **Ghost-Profile** | **39** | **39** | **0** ✅ |
| **Duplikat-E-Mail-Gruppen** | **4** | **4** | **0** ✅ |
| `hm_pending_client_invites` | (existierte nicht) | **0 Zeilen** | neu, leer |

`MIG5_EXISTING_DATA_MUTATED=NO`. Keine Accounts zusammengeführt, keine E-Mail-Zuordnung
geändert, keine Pferde/Termine/Rechnungen verschoben, keine Ghost-Bereinigung.

Schemazahlen nach dem Apply: Tabellen `public` 293, Routinen `public` 195, Policies `public`
753, Trigger `public` 190, Trigger `auth` 1.

**Einschränkung, offen benannt:** Diese vier globalen Schemazahlen wurden vor dem Apply
**nicht** erhoben — der Precheck hat stattdessen objektgenau den negativen Prestate
verifiziert. Für Policies und Trigger ist die Nicht-Änderung aber *konstruktiv* bewiesen:
die Migration enthält nachweislich 0 `CREATE POLICY` und 0 `CREATE/DROP/ALTER TRIGGER`.
Für Tabellen und Routinen folgt aus dem negativen Prestate ein erwarteter Zuwachs von
genau +1 Tabelle und +6 Routinen.

### #1–#4 und die Triggerkette unverändert

`create_customer_with_contact`, `create_invoice_with_items_for_provider`,
`_autoflow_trigger_endpoint`, `autoflow_on_appointment_completed`,
`autoflow_on_appointment_signed` — alle vorhanden, SECURITY DEFINER, `search_path=public`.
Trigger `on_auth_user_created` (auth.users), `trg_autoflow_appointment_completed`,
`trg_autoflow_appointment_signed`, `on_client_role_created`,
`trg_user_roles_auto_assign_client` — alle vorhanden und aktiviert (`tgenabled='O'`).

## N8.11 Chain-Pause — #5 ist inert

`CHAIN_CAN_PAUSE_AFTER_MIG5=YES`, nachgewiesen statt angenommen:

| Prüfung | Ergebnis |
|---|---|
| #6 `20260917155000` | **nicht angewendet** ✅ |
| #7 `20260917160000` | **nicht angewendet** ✅ |
| #8 `20260920120000` | **nicht angewendet** ✅ |
| #9 `20260920190000` | **nicht angewendet** ✅ |
| `create_invited_customer_with_contact` (#7) | existiert in Production **nicht** ✅ |
| `handle_new_user` referenziert den #5-Vertrag? | **nein** (`prosrc` ohne Treffer) ✅ |
| `auto_assign_client_to_provider` referenziert den #5-Vertrag? | **nein** ✅ |
| Edge-Function-Deploy in diesem Durchgang | **keiner** ✅ |

**Der belastbarste Einzelbeweis:** Die in Production deployte Fassung von
`invite-client-with-password` (ACTIVE, Version 7, zuletzt aktualisiert lange vor diesem
Release) wurde gelesen. Sie enthält **keinen** Aufruf von `create_pending_client_invite_v1`,
`bind_pending_client_invite_v1` oder `invalidate_pending_client_invite_v1` — sie ist die alte
Implementierung (direktes `auth.admin.createUser` plus Profil-/Rollen-/Kontakt-Insert).

Die **Repo-Fassung** derselben Funktion ruft diese RPCs sehr wohl auf. Repo und Deployment
divergieren hier also bewusst; der Cutover gehört zu #6–#9 und ist **nicht** erfolgt.

Damit liest **nichts** in Production den neuen Vertrag: weder die Triggerkette noch eine Edge
Function. Die Tabelle bleibt leer, die Funktionen bleiben ungenutzt. `RELATED_EDGE_FUNCTION_DEPLOYED=NO`.

Produktions-App bleibt kompatibel: #5 fügt ausschließlich neue Objekte hinzu und ändert keine
bestehende Signatur, kein bestehendes Verhalten.

## N8.12 Rollback-Pfad

`docs/backups/mig5_20260917150000_prestate_rollback_2026-09-21.sql` — **nicht ausgeführt**,
aber in der isolierten Instanz **erprobt**: sie stellte den Pre-State her und meldete
`ROLLBACK #5 OK`.

Umfang exakt: 6 `DROP FUNCTION` (volle Signaturen, kein `CASCADE`), 1 `DROP TABLE`
(nimmt die eigenen Indizes/Constraints/RLS-Flag mit), 1 `DELETE` genau der Ledger-Zeile
`20260917150000`. Ein eigener Postcheck im selben Transaktionsblock bricht ab, wenn danach
noch #5-Objekte existieren oder #1–#4 nicht mehr genau viermal im Ledger stehen.

Drei Guards verhindern einen schädlichen Lauf: (1) Abbruch, wenn #6–#9 bereits angewendet
sind — #5 darf dann nicht isoliert zurück; (2) Abbruch, wenn fremder Code den Vertrag
referenziert; (3) Abbruch, wenn die Tabelle Zeilen enthält (dann wäre ein `DROP` kein
Rollback mehr, sondern Datenverlust).

Kein Backup bestehender Daten nötig: `MIG5_DATA_ROLLBACK_LOSSLESS=YES`, da keine
Bestandsdaten angefasst wurden.

## N8.13 Ergebnis

```
MIG5_APPLIED=YES
MIG5_APPLY_STATE=COMMITTED
MIG5_LEDGER_VERSION=20260917150000
LEDGER_DRIFT_CREATED=NO

MIG5_OBJECTS_CREATED=PASS
MIG5_RLS_CONTRACT=PASS
MIG5_GRANT_CONTRACT=PASS
MIG5_SECURITY_REVIEW=PASS_WITH_DOCUMENTED_FINDING
MIG5_TENANT_REVIEW=PASS

NORMALIZE_EMAIL_SEARCH_PATH_FINDING=REAL_BUT_NOT_EXPLOITABLE_DOCUMENTED_RESIDUAL
INTENTIONAL_RLS_NO_POLICY=YES

MIG5_EXISTING_DATA_MUTATED=NO
GHOST_PROFILE_COUNT_AFTER=39
DUPLICATE_EMAIL_GROUPS_AFTER=4

UNEXPECTED_PROD_SIDE_EFFECTS=NONE

MIG6_APPLIED=NO
MIG7_APPLIED=NO
MIG8_APPLIED=NO
MIG9_APPLIED=NO
RELATED_EDGE_FUNCTION_DEPLOYED=NO

CHAIN_CAN_PAUSE_AFTER_MIG5=YES
SAFE_TO_ANALYZE_MIG6=YES
```

**Offener Punkt für den nächsten Schritt:** der `search_path`-Restbefund aus N8.7. Er blockiert
#6 nicht, sollte aber nicht unbegrenzt offen bleiben — er ist die einzige Abweichung von einer
sonst zu 100 % durchgehaltenen Projektkonvention.

**STOPP.** Keine Migration #6–#9, kein Edge-Deploy, keine Ghost-Bereinigung, keine
Vault-Änderung, kein Push.

---

# NACHTRAG 9 — Micro Hardening after Migration #5 (2026-09-21)

`20260917152500_fix_hm_normalize_email_search_path_v1`

Schliesst den in NACHTRAG 8 dokumentierten Restbefund
`function_search_path_mutable` auf `public._hm_normalize_email(text)`. Bewusst als eigene,
winzige Migration **zwischen** #5 und #6 — nicht durch Aenderung der bereits angewendeten
#5-Datei. Ergebnis: **COMMITTED**, Advisor-Befund weg, ausschliesslich `proconfig` veraendert.

## N9.1 Warum ueberhaupt

Der Befund war in NACHTRAG 8 als `REAL_BUT_NOT_EXPLOITABLE_DOCUMENTED_RESIDUAL` eingestuft und
hat #5 zu Recht nicht blockiert: kein untrusted Principal konnte ihn ausloesen. Geschlossen
wird er trotzdem, weil `_hm_normalize_email` die **einzige** von 195 Routinen in `public` ohne
festen `search_path` war — die einzige Abweichung von einer sonst vollstaendig durchgehaltenen
Konvention. Ein dauerhaft offener Restbefund weicht genau den Massstab auf, an dem spaetere
Reviews sich orientieren.

## N9.2 Artefakt-Integritaet

| Groesse | Wert |
|---|---|
| `HARDENING_VERSION` | `20260917152500` |
| `HARDENING_FILE` | `supabase/migrations/20260917152500_fix_hm_normalize_email_search_path_v1.sql` |
| `HARDENING_MD5` | `948bd6454f4ac125eb0ca576850e93b4` |
| `HARDENING_SHA256` | `957da901b4974c7fcb6692da8d04c5ebc85e45617aab3f975c4fa95ce630d03e` |
| Groesse / Zeilen | 4388 Bytes / 70 |
| Apply-Artefakt | `docs/backups/mig_hardening_20260917152500_apply_canonical.sql` (`2504ca57ddf910bd424fefd62cf52a1e`, 9000 Bytes) |
| Rollback | `docs/backups/mig_hardening_20260917152500_prestate_rollback_2026-09-21.sql` (`08a544e2033c38b7dc4b6c817f2e5436`) |

Versionswahl: `20260917152500` war **in Ledger und Repo frei** — zwischen `20260917150000`
und `20260917155000` existierte weder eine Ledger-Zeile noch eine Datei.

**Migrationsinhalt: genau ein Statement** (Dollar-Quote-bewusst tokenisiert, `TOPLEVEL_TOTAL=1`):

```sql
ALTER FUNCTION public._hm_normalize_email(text) SET search_path = public;
```

### Warum `ALTER FUNCTION` statt `CREATE OR REPLACE`

`ALTER FUNCTION ... SET` beruehrt ausschliesslich `pg_proc.proconfig`. Body, Sprache,
Volatilitaet, Rueckgabetyp, Strictness, Owner und ACL bleiben unangetastet — und genau das ist
per `prosrc`-md5 vor und nach dem Apply **beweisbar**. `CREATE OR REPLACE` haette den Body neu
geschrieben und diesen Beweis ohne Not aufgegeben. Die Migration ist idempotent.

### Warum `search_path = public` und nicht `pg_catalog, public`

Sobald der `search_path` fest am Objekt haengt, kann ein Aufrufer ueberhaupt kein fremdes
Schema mehr davorschieben — der in N8.7 gezeigte Angriffspfad existiert dann nicht mehr.
`pg_catalog` bleibt implizit an erster Stelle. `public` ist damit ebenso sicher wie
`pg_catalog, public` und identisch zu dem, was die fuenf SECURITY-DEFINER-Funktionen aus #5
und die uebrigen Routinen verwenden. Konsistenz schlaegt Sonderweg.

## N9.3 Probelauf vor Production

Vollstaendiger Rundlauf in `mig34-isolated-test`. Der dortige Prestate war **byte-identisch
zu Production** (`prosrc_md5=4f7063e0…`, `proconfig=NULL`, `secdef=f`, `vol=i`, ACL gleich).

| Schritt | Ergebnis |
|---|---|
| Apply inkl. Pre-/Poststate-Guard | `EXIT=0` |
| `proconfig` danach | `search_path=public` |
| `prosrc` md5 danach | `4f7063e0…` — **unveraendert** |
| ACL / SECDEF / Volatilitaet | unveraendert |
| Semantikproben | `mixed@example.com`, `''→NULL`, `NULL→NULL` — identisch |
| **Angriffspfad `evil2, pg_catalog, public`** | liefert **korrektes** Ergebnis |
| Rollback | `EXIT=0`, `proconfig` zurueck auf `NULL`, Rest unveraendert |

Der vorletzte Punkt ist der eigentliche Wirksamkeitsnachweis: **genau der Vektor, der im
#5-Review noch `PWNED-lower` zurueckgab, ist geschlossen.**

Repo-Checks vor dem Apply: `npm test` 273/273 · Migration-Baseline PASS · Secret-Scan PASS
(2764 Dateien) · `git diff --check` clean.

## N9.4 Apply

Gleicher Vertrag wie #3–#5: `psql` ueber den Session Pooler, genau ein Aufruf, keine
Retry-Schleife, `PGSSLMODE=require`, Passwort ausschliesslich interaktiv ueber `/dev/tty`
(nie gespeichert, geloggt, in eine Datei geschrieben oder in die Shell-History aufgenommen).
Kein `db push`, kein `apply_migration`, kein `_prepared`, kein Migration-Repair.

Das Apply-Artefakt traegt drei Sicherungen: md5-Guard auf den Migrationstext, einen
**Prestate-Guard** (richtige Funktion, korrekte `prosrc`-md5, noch kein `search_path`, nicht
SECURITY DEFINER) und einen **Poststate-Guard** (`proconfig` exakt `search_path=public`, Body-,
ACL-, SECURITY- und Volatilitaets-Identitaet). Der Commit kommt nur zustande, wenn genau die
eine gewuenschte Aenderung eingetreten ist.

`PSQL_EXIT=0` — wie zuvor **nicht** als Beweis akzeptiert; der Postcheck unten ist unabhaengig
read-only erhoben.

## N9.5 Postcheck — Ledger

| Pruefung | Ergebnis |
|---|---|
| `20260917152500` | exakt **1** ✅ |
| Phantomversion (`LIKE '202609171525%'`) | **1** (nur die kanonische) ✅ |
| `ledger_max` | `20260917152500` ✅ |
| `ledger_total` | 439 → **440** (+1) ✅ |
| #1–#4 | zusammen weiterhin **4** ✅ |
| #5 `20260917150000` | weiterhin **1**, `statements[1]` md5 `d0f8b9bd…`, 16586 Bytes — unveraendert ✅ |
| `LEDGER_DRIFT_CREATED` | **NO** ✅ |

Ledger-Zeile: `name=fix_hm_normalize_email_search_path_v1`,
`created_by=passaondigital@gmail.com`, `idempotency_key=NULL`, `rollback=NULL`,
`array_length(statements)=1`, `md5(statements[1])=948bd6454f4ac125eb0ca576850e93b4`,
`octet_length(statements[1])=4388` — beides exakt die Repo-Datei.

## N9.6 Postcheck — nur `proconfig` hat sich geaendert

Vollstaendiger Attributvergleich gegen den in N9.2 festgehaltenen Prestate:

| Attribut | Vorher | Nachher | |
|---|---|---|---|
| `prosrc` md5 | `4f7063e091f7c6a30525e78ce68da4ae` | `4f7063e091f7c6a30525e78ce68da4ae` | ✅ gleich |
| `prosrc` (Text) | `SELECT nullif(lower(btrim(coalesce(p_email, ''))), '');` | identisch | ✅ |
| **`proconfig`** | **`NULL`** | **`search_path=public`** | ← **die eine Aenderung** |
| Owner | `postgres` | `postgres` | ✅ |
| Sprache | `sql` | `sql` | ✅ |
| Volatilitaet | `i` (IMMUTABLE) | `i` | ✅ |
| `prosecdef` | `false` (INVOKER) | `false` | ✅ |
| ACL | `postgres=X/postgres \| service_role=X/postgres` | identisch | ✅ |
| `proisstrict` | `false` | `false` | ✅ |
| `proleakproof` | `false` | `false` | ✅ |
| `proparallel` | `u` | `u` | ✅ |
| `pronargs` / Rueckgabetyp | 1 / `text` | 1 / `text` | ✅ |
| `postgres` EXECUTE | `true` | `true` | ✅ |
| `anon` EXECUTE | `false` | `false` | ✅ |
| `authenticated` EXECUTE | `false` | `false` | ✅ |
| `authenticator` EXECUTE | `false` | `false` | ✅ |
| `service_role` EXECUTE | `true` | `true` | ✅ |

`pg_get_functiondef` zeigt jetzt genau eine zusaetzliche Zeile: `SET search_path TO 'public'`.

**Funktionale Gegenprobe in Production (read-only):**
`'  MiXeD@Example.COM '` → `mixed@example.com`; `''` → `NULL`; `'   '` → `NULL`; `NULL` → `NULL`;
`'A@B.DE'` → `'a@b.de'`. Semantik unveraendert.

## N9.7 Advisor — Vorher/Nachher

Beide Advisor-Laeufe (nach #5 und nach dem Hardening) wurden maschinell verglichen:

| Kategorie | Level | Entities vorher → nachher | |
|---|---|---|---|
| `function_search_path_mutable` | WARN | **1 → 0** | **Befund verschwunden** ✅ |
| `rls_enabled_no_policy` | INFO | 5 → 5 | unveraendert, beabsichtigt ✅ |
| `anon_security_definer_function_executable` | WARN | 149 → 149 | Altbefund, unveraendert |
| `authenticated_security_definer_function_executable` | WARN | 156 → 156 | Altbefund, unveraendert |
| `extension_in_public` | WARN | unveraendert | Altbefund |
| `auth_leaked_password_protection` | WARN | unveraendert | Altbefund |

`function_search_path_mutable` ist als Kategorie **vollstaendig entfallen** — vorher war
`_hm_normalize_email` ihr einziger Eintrag. Gegenprobe in `pg_proc`: Funktionen in `public`
ohne festen `search_path`: **1 → 0**.

`rls_enabled_no_policy` fuer `hm_pending_client_invites` **bleibt bestehen und ist kein
Fehler** — der in N8.8 begruendete Default-Deny-Vertrag. Die Tabelle wurde nicht angefasst:
Owner `postgres`, RLS an, FORCE RLS an, 0 Policies, ACL unveraendert, 5 Indizes, 5 Constraints,
`anon`/`authenticated` ohne `SELECT`. `INTENTIONAL_RLS_NO_POLICY_UNCHANGED=YES`.

## N9.8 Side-Effect-Matrix

Diesmal mit echter Vorher-Basis: alle Werte sind gegen den in N8.10 protokollierten
Post-#5-Stand verglichen.

| Metrik | Nach #5 | Nach Hardening | Δ |
|---|---|---|---|
| Ledger gesamt | 439 | **440** | +1 (nur das Hardening) |
| Tabellen `public` | 293 | **293** | **0** |
| Routinen `public` | 195 | **195** | **0** |
| Policies `public` | 753 | **753** | **0** |
| Trigger `public` | 190 | **190** | **0** |
| Trigger `auth` | 1 | **1** | **0** |
| profiles gesamt / nicht geloescht | 103 / 93 | **103 / 93** | **0** |
| contacts | 44 | **44** | **0** |
| access_grants gesamt / aktiv | 57 / 43 | **57 / 43** | **0** |
| hm_connect_invitations | 0 | **0** | **0** |
| user_roles | 64 | **64** | **0** |
| auth.users | 64 | **64** | **0** |
| **Ghost-Profile** | **39** | **39** | **0** ✅ |
| **Duplikat-E-Mail-Gruppen** | **4** | **4** | **0** ✅ |
| `hm_pending_client_invites` Zeilen | 0 | **0** | **0** |
| Funktionen ohne festen `search_path` | 1 | **0** | −1 (Ziel) |

Die uebrigen fuenf #5-Funktionen sind unveraendert — `prosrc` md5, `prosecdef`,
`proconfig=search_path=public`, ACL und Owner identisch zu N8.6:
`_hm_expire_pending_client_invites` `480bc920…`, `_hm_has_active_pending_client_invite`
`2d7a311c…`, `create_pending_client_invite_v1` `098ba120…`, `bind_pending_client_invite_v1`
`f3f54e2f…`, `invalidate_pending_client_invite_v1` `c1566e59…`.

`UNEXPECTED_PROD_SIDE_EFFECTS=NONE`. Keine Datenmutation, keine Ghost-Bereinigung, keine
E-Mail-Zuordnung geaendert.

## N9.9 Kette weiterhin pausiert

| Pruefung | Ergebnis |
|---|---|
| #5 `20260917150000` | **applied**, unveraendert ✅ |
| #6 `20260917155000` | **nicht angewendet** ✅ |
| #7 `20260917160000` | **nicht angewendet** ✅ |
| #8 `20260920120000` | **nicht angewendet** ✅ |
| #9 `20260920190000` | **nicht angewendet** ✅ |
| Edge-Function-Deploy | **keiner** ✅ |
| Vault | **nicht angefasst** ✅ |

#5 bleibt inert: nichts in Production liest den Invite-Vertrag (Begruendung und Beweis in
N8.11, durch dieses Hardening unveraendert — es hat weder Triggerkette noch Edge Functions
noch Grants angefasst).

## N9.10 Rollback-Pfad

`docs/backups/mig_hardening_20260917152500_prestate_rollback_2026-09-21.sql` — **nicht
ausgefuehrt**, aber in der isolierten Instanz **erprobt** (`EXIT=0`, `proconfig` zurueck auf
`NULL`).

Umfang exakt: ein `ALTER FUNCTION public._hm_normalize_email(text) RESET search_path` plus
`DELETE` genau der Ledger-Zeile `20260917152500`. Zwei Guards vorweg (Body-md5, SECURITY,
Volatilitaet muessen dem #5-Stand entsprechen; `proconfig` muss `search_path=public` sein),
ein Postcheck im selben Transaktionsblock (`proconfig=NULL`, Body/ACL/SECURITY unveraendert,
#5 weiterhin genau einmal im Ledger).

Kein Datenbackup noetig — die Migration mutiert nichts.

## N9.11 Ergebnis

```
HARDENING_APPLIED=YES
APPLY_STATE=COMMITTED
LEDGER_VERSION=20260917152500
LEDGER_DRIFT_CREATED=NO

NORMALIZE_EMAIL_BODY_UNCHANGED=YES
NORMALIZE_EMAIL_PROSRC_MD5_BEFORE=4f7063e091f7c6a30525e78ce68da4ae
NORMALIZE_EMAIL_PROSRC_MD5_AFTER=4f7063e091f7c6a30525e78ce68da4ae

SEARCH_PATH_BEFORE=NULL
SEARCH_PATH_AFTER=public

ACL_UNCHANGED=YES
SECURITY_INVOKER_UNCHANGED=YES
VOLATILITY_UNCHANGED=YES
OWNER_UNCHANGED=YES

SEARCH_PATH_ADVISOR_FINDING_AFTER=GONE
INTENTIONAL_RLS_NO_POLICY_UNCHANGED=YES

UNEXPECTED_PROD_SIDE_EFFECTS=NONE

MIG6_APPLIED=NO
MIG7_APPLIED=NO
MIG8_APPLIED=NO
MIG9_APPLIED=NO
RELATED_EDGE_FUNCTION_DEPLOYED=NO

SAFE_TO_ANALYZE_MIG6=YES
```

Der in NACHTRAG 8 offene Punkt ist damit geschlossen. `MIG5_SECURITY_REVIEW` waere nach
heutigem Stand **PASS** statt `PASS_WITH_DOCUMENTED_FINDING`; die Einstufung in NACHTRAG 8
bleibt als historisch korrekte Momentaufnahme stehen.

**STOPP.** Keine Migration #6–#9, kein Edge-Deploy, keine Ghost-Bereinigung, keine
Vault-Aenderung, kein Push.

---

# NACHTRAG 10 — Migration #6 Production Apply (2026-09-21)

`20260917155000_fix_invite_tenant_auto_assign_v1`

Zweites Glied der Invite-/Ghost-Kette. Angewendet als Einzelschritt; #7–#9 bleiben aus.
Ergebnis: **COMMITTED**, exakt eine Funktionsdefinition ersetzt, ACL nachweislich
unveraendert, keine Bestandsdaten beruehrt, kein neuer Advisor-Befund.

**Wichtigste Einordnung vorweg: #6 schliesst die P0-Luecke NICHT allein.**
Siehe N10.8.

## N10.1 Artefakt-Integritaet

| Groesse | Wert |
|---|---|
| `MIG6_FILE` | `supabase/migrations/20260917155000_fix_invite_tenant_auto_assign_v1.sql` |
| `MIG6_MD5` | `30ee5a9e435a53c6371adc5a482c3f3f` |
| `MIG6_SHA256` | `09e5f54921e65368af92434ddae3b2cd651773b20efed8072f92645af59e3420` |
| Groesse / Zeilen | 9125 Bytes / 224 (davon 103 Kopfkommentar) |
| Apply-Artefakt | `docs/backups/mig6_20260917155000_apply_canonical.sql` (`5625b672e72a7506ef7841a0f6c6dfeb`, 17591 Bytes) |
| Rollback | `docs/backups/mig6_20260917155000_prestate_rollback_2026-09-21.sql` (`3c5b7197d8f59874597c6467370dc27f`) |

Statisches Audit: **1 DDL-Statement, 0 DML, 0 destruktiv**. Das
`INSERT INTO access_grants` steht im Funktionskoerper und laeuft zur Triggerlaufzeit,
nicht beim Apply. Keine Grants, keine RLS, keine Trigger-DDL, keine Tabellen-DDL.

## N10.2 Prestate (read-only, vor dem Apply)

Ledger: `total=440`, `max=20260917152500`, #5 = 1, Hardening = 1, **#6 = 0**, #7–#9 = 0.

`public.auto_assign_client_to_provider()` vor dem Apply:

| Attribut | Wert |
|---|---|
| `prosrc` md5 | `b015f90bd1e72e9680f8ad91129f7591` (1834 Bytes) |
| `pg_get_functiondef` md5 | `8e37ff3a5a0fadbf2fcfe7c08bd311fe` (2007 Bytes) |
| Owner / Sprache / Rueckgabetyp | `postgres` / `plpgsql` / `trigger`, `pronargs=0` |
| SECURITY DEFINER / `search_path` | `true` / `search_path=public` |
| Volatilitaet / strict / leakproof / parallel | `v` / `false` / `false` / `u` |
| ACL | `=X/postgres \| postgres=X/postgres \| anon=X/postgres \| authenticated=X/postgres \| service_role=X/postgres` |

`prosrc` und `functiondef` wurden **base64-kodiert** aus Production geholt, damit kein
Zeichen ueber JSON-Escaping verlorengeht.

## N10.3 Der exakte Diff — byte-genau verifiziert

Der Kopfkommentar von #6 behauptet, der restliche Funktionskoerper sei „Zeichen fuer
Zeichen der bisherige". Gegen `pg_proc.prosrc` gediffed:

```
Hunks: 2 · Zeilen hinzugefuegt: 20 · Zeilen ENTFERNT: 0
```

Die **gesamte semantische Aenderung sind 7 Zeilen**:

```sql
invited_email text;                                    -- Deklaration
SELECT au.email INTO invited_email
  FROM auth.users au WHERE au.id = NEW.user_id;        -- E-Mail lesen
IF public._hm_has_active_pending_client_invite(invited_email) THEN
  RETURN NEW;                                          -- Fallback unterdruecken
END IF;
```

Alles Uebrige ist unveraendert. Die Behauptung stimmt.

### Warum kein Pfad trotz Invite einen fremden Provider setzen kann

Die Funktion enthaelt **genau ein** `INSERT INTO access_grants`, ganz am Ende, erreichbar
erst nachdem saemtliche Guards durchgefallen sind. Der Invite-Check ist der **zweite**
Guard, direkt nach der Rollenpruefung, mit sofortigem `RETURN NEW`. Es existiert damit
kein Kontrollfluss von „aktiver Invite" zum Insert.

Die zweite grant-erzeugende Triggerfunktion `auto_create_access_grant_for_client` vergibt
ausschliesslich an `NEW.created_by_provider_id` — also nie generisch, nie an einen fremden
Provider. `NO GRANT` bleibt erlaubt, `WRONG GRANT` ausgeschlossen.

## N10.4 Probelauf vor Production

Vollstaendiger Rundlauf in `mig34-isolated-test` (Schema- und Datenklon, 289 Tabellen).
Die dortige Funktion hatte denselben `prosrc`-md5 und dieselben zwei Trigger.

**Der Prestate-Guard feuert nachweislich.** Weil die Testinstanz die Funktion unter
`supabase_admin` fuehrt, brach das unveraenderte Artefakt korrekt ab:
`ABORT: Owner ist "supabase_admin" statt postgres.`

Mit an die Instanz angepasster Owner-/ACL-Erwartung (alle `prosrc`-Guards unveraendert):

| Pruefung | Ergebnis |
|---|---|
| Apply, alle fuenf Guards | `EXIT=0` |
| `prosrc` md5 danach | `b6f62858b4de1b61a9a7503e1668e209` — exakt der berechnete Zielwert |
| **ACL vor/nach** | **byte-identisch** — `CREATE OR REPLACE` fasst Rechte nicht an |
| Owner/SECDEF/search_path/Volatilitaet/strict/leakproof/parallel/rettype | unveraendert |
| Trigger | weiterhin 2, aktiviert |
| Rollback | `EXIT=0`, zurueck auf `b015f90b…`, Datenklon unberuehrt |

### Funktionale Verhaltensproben

In Transaktionen mit `ROLLBACK`, sodass nichts zurueckblieb (Ausgabe nur Zahlen/Booleans):

| Fall | Erwartung | Ergebnis |
|---|---|---|
| kein Invite | Legacy-Fallback greift | 1 aktiver Grant ✅ |
| **aktiver Invite** | **kein Grant** | **0** ✅ |
| abgelaufener Invite | zaehlt nicht als aktiv | 1 ✅ |
| invalidierter Invite | zaehlt nicht als aktiv | 1 ✅ |
| verbrauchter Invite | zaehlt nicht als aktiv | 1 ✅ |
| **E-Mail in GROSSSCHREIBUNG** | Normalisierung greift | **0** ✅ |

Der letzte Fall ist der aussagekraeftigste: Invite in Kleinschreibung angelegt, Auth-User
mit Grossbuchstaben erzeugt — die Unterdrueckung greift trotzdem. Das validiert
`_hm_normalize_email` in der echten Triggerkette.

## N10.5 Apply

`psql` ueber den Session Pooler, genau ein Aufruf, keine Retry-Schleife,
`PGSSLMODE=require`, Passwort ausschliesslich interaktiv ueber `/dev/tty`. Kein `db push`,
kein `apply_migration`, kein `_prepared`, kein Ledger-Repair, keine ACL-Aenderung.

Das Artefakt trug fuenf Sicherungen: md5-Guard auf den Migrationstext, Prestate-Guard
(`prosrc`, SECDEF, `search_path`, Owner, **ACL**), Abhaengigkeits-Guard auf den
#5-Vertrag, Poststate-Guard (Zielwert plus Owner/SECDEF/`search_path`/Volatilitaet/**ACL
unveraendert**) und eine Trigger-Bindungspruefung.

`PSQL_EXIT=0` — wie zuvor nicht als Beweis akzeptiert.

## N10.6 Postcheck — Ledger

| Pruefung | Ergebnis |
|---|---|
| `20260917155000` | exakt **1** ✅ |
| Phantomversion (`LIKE '2026091715500%'`) | **1** (nur die kanonische) ✅ |
| `ledger_max` | `20260917155000` ✅ |
| `ledger_total` | 440 → **441** (+1) ✅ |
| #1–#4 | zusammen weiterhin 4 ✅ |
| #5 / Hardening | je weiterhin 1, `statements[1]` md5 unveraendert ✅ |
| #7 / #8 / #9 | **0 / 0 / 0** ✅ |
| `LEDGER_DRIFT_CREATED` | **NO** ✅ |

Ledger-Zeile: `name=fix_invite_tenant_auto_assign_v1`,
`created_by=passaondigital@gmail.com`, `idempotency_key=NULL`, `rollback=NULL`,
`array_length(statements)=1`, `md5(statements[1])=30ee5a9e435a53c6371adc5a482c3f3f`,
`octet_length(statements[1])=9125` — beides exakt die Repo-Datei.

## N10.7 Postcheck — Funktion

**Die Live-Funktion in Production ist byte-identisch mit dem Repo-Migrationskoerper.**
`prosrc` base64 aus PROD geholt, lokal dekodiert und gegen die Repo-Datei gediffed:
kein einziges Zeichen Abweichung, 2825 Bytes auf beiden Seiten.

| Attribut | Vorher | Nachher | |
|---|---|---|---|
| `prosrc` md5 | `b015f90bd1e72e9680f8ad91129f7591` | `b6f62858b4de1b61a9a7503e1668e209` | ← beabsichtigt |
| `prosrc` Bytes | 1834 | 2825 | +991 (7 Codezeilen + Kommentar) |
| Owner | `postgres` | `postgres` | ✅ |
| Sprache / Rueckgabetyp / `pronargs` | `plpgsql` / `trigger` / 0 | identisch | ✅ |
| SECURITY DEFINER | `true` | `true` | ✅ |
| `search_path` | `public` | `public` | ✅ |
| Volatilitaet | `v` | `v` | ✅ |
| strict / leakproof / parallel | `f` / `f` / `u` | identisch | ✅ |
| **ACL** | `=X/postgres \| postgres=X \| anon=X \| authenticated=X \| service_role=X` | **identisch** | ✅ |
| `has_function_privilege` postgres/anon/authenticated/authenticator/service_role | `t/t/t/t/t` | identisch | ✅ |
| Trigger auf der Funktion | 2 aktiv | 2 aktiv | ✅ |

`ACL_UNCHANGED=YES`, `SECURITY_DEFINER_UNCHANGED=YES`, `SEARCH_PATH_UNCHANGED=YES`,
`OWNER_UNCHANGED=YES`, `VOLATILITY_UNCHANGED=YES`.

### Warum in Production kein Schreibtest stattfand

Ein funktionaler Test in PROD haette einen Auth-User anlegen muessen. An derselben
`user_roles`-Tabelle haengt `notify_new_registration`, das `net.http_post` ausfuehrt
(ebenso `notify_admin_on_profile_change` auf `profiles`). pg_net stellt die Anfrage zwar
transaktional in die Queue, aber der Hintergrund-Worker pollt laufend — ein `ROLLBACK`
kann eine bereits abgeholte Admin-Benachrichtigung nicht zurueckholen. Ein Schreibtest
waere damit nicht nebenwirkungsfrei gewesen. Die Verhaltensproben aus N10.4 liefen
stattdessen in der isolierten Instanz gegen eine byte-identische Funktion; in PROD wurde
read-only semantisch verifiziert:

```
_hm_has_active_pending_client_invite('unbekannt@…') = false
_hm_has_active_pending_client_invite(NULL)          = false
_hm_has_active_pending_client_invite('')            = false
_hm_normalize_email('  GROSS@Example.COM ')         = 'gross@example.com'
aktive Invites (consumed IS NULL AND invalidated IS NULL AND expires_at > now()) = 0
```

## N10.8 #6 ist inert — und schliesst die P0-Luecke NICHT allein

`MIG6_P0_FIXED_BY_ITSELF=NO`. Das ist der wichtigste Satz dieses Nachtrags.

`hm_pending_client_invites` hat **0 Zeilen**. Schreiben kann dort nur `service_role` bzw.
eine SECURITY-DEFINER-Funktion; der einzige vorgesehene Schreiber ist die neue Fassung von
`invite-client-with-password` — und die ist **nicht deployt**. Der Suppressions-Check
liefert damit ausnahmslos `false`, der neue Zweig ist vorerst toter Code, und das
Verhalten fuer normale Signups ist unveraendert.

Die in Production laufende Edge Function wurde erneut gelesen: **Version 7,
`ezbr_sha256=bb7c2e4794972ca150333c96c9cb934e55a24880c0328d4ff629050a590a00c8`,
`updated_at` unveraendert**. Sie enthaelt keinen Aufruf von
`create_pending_client_invite_v1`, `bind_pending_client_invite_v1` oder
`invalidate_pending_client_invite_v1`.

**Solange die alte Edge Function laeuft, entsteht der Fremd-Grant weiterhin.** #6 macht den
Fix moeglich, es *ist* nicht der Fix. Der reale Schutz entsteht erst mit **#7 plus einem
korrekt getakteten Edge-Deploy**. Bis dahin muss die Edge Function undeployt bleiben: ein
Deploy nach #6, aber vor #7, wuerde Einladungen hart scheitern lassen, weil
`create_invited_customer_with_contact` in Production noch nicht existiert.

### Neue harte Laufzeitabhaengigkeit

Ab jetzt haengt die Signup-Triggerkette an `_hm_has_active_pending_client_invite` aus #5.
Ein Rollback von **#5** bei angewendetem #6 wuerde jede Client-Registrierung brechen. Der
Guard in `mig5_20260917150000_prestate_rollback_2026-09-21.sql`, der bei angewendetem
#6–#9 abbricht, ist damit tragend geworden.

## N10.9 Side-Effect-Matrix

Gegen den in NACHTRAG 9 protokollierten Stand nach dem Hardening:

| Metrik | Vor #6 | Nach #6 | Δ |
|---|---|---|---|
| Ledger gesamt | 440 | **441** | +1 (nur #6) |
| Tabellen `public` | 293 | **293** | **0** |
| Routinen `public` | 195 | **195** | **0** |
| Policies `public` | 753 | **753** | **0** |
| Trigger `public` / `auth` | 190 / 1 | **190 / 1** | **0** |
| Trigger auf `auto_assign_client_to_provider` | 2 aktiv | **2 aktiv** | **0** |
| profiles gesamt / nicht geloescht | 103 / 93 | **103 / 93** | **0** |
| contacts | 44 | **44** | **0** |
| access_grants gesamt / aktiv | 57 / 43 | **57 / 43** | **0** |
| user_roles | 64 | **64** | **0** |
| auth.users | 64 | **64** | **0** |
| hm_connect_invitations | 0 | **0** | **0** |
| **Ghost-Profile** | **39** | **39** | **0** ✅ |
| **Duplikat-E-Mail-Gruppen** | **4** | **4** | **0** ✅ |
| `hm_pending_client_invites` Zeilen | 0 | **0** | **0** ✅ |
| Funktionen ohne festen `search_path` | 0 | **0** | **0** |

`MIG6_EXISTING_DATA_MUTATED=NO`. Keine Accounts zusammengefuehrt, keine E-Mail-Zuordnung
geaendert, keine Ghost-Bereinigung, keine Pferde/Termine/Rechnungen verschoben.

Der #5-Vertrag ist unveraendert: RLS an, FORCE RLS an, 0 Policies, ACL
`postgres=arwdDxtm \| service_role=arwdDxtm`, 5 Indizes, 5 Constraints, 0 Zeilen.

## N10.10 Advisor-Diff ueber drei Messpunkte

| Kategorie | nach #5 | nach Hardening | nach #6 | |
|---|---|---|---|---|
| `anon_security_definer_function_executable` | 149 | 149 | **149** | unveraendert |
| `authenticated_security_definer_function_executable` | 156 | 156 | **156** | unveraendert |
| `function_search_path_mutable` | 1 | 0 | **0** | unveraendert |
| `rls_enabled_no_policy` | 5 | 5 | **5** | unveraendert, beabsichtigt |
| `extension_in_public` | — | — | unveraendert | Altbefund |
| `auth_leaked_password_protection` | — | — | unveraendert | Altbefund |

`NEW_SECURITY_FINDINGS_FROM_MIG6=NONE`. Keine neue Kategorie, kein veraenderter
Zaehlerstand.

**Klassifikation des ACL-Befunds:** `public.auto_assign_client_to_provider()` ist als
SECURITY-DEFINER-Funktion mit `EXECUTE` fuer PUBLIC/`anon`/`authenticated` bereits **im
#5-Snapshot** in der anon-Kategorie enthalten — also ueber alle drei Messpunkte hinweg
**`PREEXISTING_LEGACY`**, ausdruecklich **nicht** `NEW_FROM_MIG6`. `CREATE OR REPLACE`
setzt ACLs nicht zurueck; der Poststate-Guard hat das erzwungen und die Messung bestaetigt
es. Praktisch ist der Befund kaum ausnutzbar, weil eine `RETURNS trigger`-Funktion sich
nicht direkt aufrufen laesst. **In #6 wurde bewusst nichts daran geaendert** — eine
Hardening-Entscheidung gehoert nicht in eine Tenant-Fix-Migration.

## N10.11 Offener Release-Blocker: der zweite Einladepfad

`INVITE_CLIENT_GAP_EXISTS=YES` · `INVITE_CLIENT_GAP_BLOCKS_MIG6=NO` ·
`INVITE_CLIENT_GAP_BLOCKS_FEATURE_RELEASE=YES`

`src/components/customers/InviteClientButton.tsx:249` ruft die Edge Function
`invite-client` (deployt, Version 8). Diese legt **keinen** Pending Invite an: sie ruft
`auth.admin.createUser`, wartet `setTimeout(600 ms)` auf die Triggerkette und setzt erst
danach `created_by_provider_id` plus einen eigenen `access_grant`. Fuer diesen Pfad greift
die #6-Unterdrueckung **nie**.

Der zweite Pfad, `src/components/customers/InviteByEmailModal.tsx:63` →
`invite-client-with-password`, ist der von der Kette abgedeckte.

**Die Kette #5–#9 behebt den `invite-client`-Pfad auch nach vollstaendigem Rollout
nicht.** Das blockiert #6 nicht und wurde hier bewusst nicht gefixt — aber es ist ein
**Blocker fuer die Freigabe des Invite-Features** und gehoert vor diese Freigabe geloest,
unabhaengig vom Fortgang der Migrationskette.

## N10.12 Rollback-Pfad

`docs/backups/mig6_20260917155000_prestate_rollback_2026-09-21.sql` — **nicht
ausgefuehrt**, aber in der isolierten Instanz erprobt (`EXIT=0`, zurueck auf
`b015f90b…`).

Der Funktionsrumpf darin ist **nicht rekonstruiert**: es ist die woertliche
`pg_get_functiondef`-Ausgabe aus Production (md5 `8e37ff3a…`), genau einmal enthalten.
Umfang exakt: ein `CREATE OR REPLACE FUNCTION` plus `DELETE` genau der Ledger-Zeile
`20260917155000`. Zwei Guards vorweg (spaetere Kettenglieder duerfen nicht angewendet
sein; `prosrc`-md5 muss der #6-Stand oder bereits der Pre-State sein), ein Postcheck im
selben Transaktionsblock (Pre-State-md5, Owner, SECDEF, `search_path`, **ACL**,
Volatilitaet, Ledger-Zeile weg, #5 und Hardening intakt). Kein DML, also nichts zu
verlieren.

## N10.13 Ergebnis

```
MIG6_APPLIED=YES
MIG6_APPLY_STATE=COMMITTED
MIG6_LEDGER_VERSION=20260917155000
LEDGER_DRIFT_CREATED=NO

AUTO_ASSIGN_PROSRC_MD5_BEFORE=b015f90bd1e72e9680f8ad91129f7591
AUTO_ASSIGN_PROSRC_MD5_AFTER=b6f62858b4de1b61a9a7503e1668e209

ACL_UNCHANGED=YES
SECURITY_DEFINER_UNCHANGED=YES
SEARCH_PATH_UNCHANGED=YES
OWNER_UNCHANGED=YES
VOLATILITY_UNCHANGED=YES

MIG6_EXISTING_DATA_MUTATED=NO
GHOST_PROFILE_COUNT_AFTER=39
DUPLICATE_EMAIL_GROUPS_AFTER=4
PENDING_INVITE_ROWS_AFTER=0

NEW_SECURITY_FINDINGS_FROM_MIG6=NONE
MIG6_P0_FIXED_BY_ITSELF=NO

INVITE_CLIENT_GAP_EXISTS=YES
INVITE_CLIENT_GAP_BLOCKS_FEATURE_RELEASE=YES

MIG7_APPLIED=NO
MIG8_APPLIED=NO
MIG9_APPLIED=NO
RELATED_NEW_EDGE_FUNCTION_DEPLOYED=NO

CHAIN_CAN_PAUSE_AFTER_MIG6=YES
SAFE_TO_ANALYZE_MIG7=YES
```

**Offene Punkte fuer den naechsten Schritt:** (1) der `invite-client`-Pfad aus N10.11,
(2) die Taktung von #7 und Edge-Deploy, (3) die Untersuchung der 39 Ghost-Profile und
4 Duplikat-Gruppen, die weiterhin korrekt **vor #8** verortet ist, (4) fehlende
CI-Testabdeckung fuer die Trigger-Semantik — `inviteTenantBinding.test.ts` prueft nur
statisch Migrations- und Edge-Function-Text; die sechs Verhaltensproben aus N10.4 liefen
manuell und sind nicht Teil der CI.

**STOPP.** Keine Migration #7–#9, kein Edge-Deploy, keine Ghost-Bereinigung, keine
Vault-Aenderung, kein Push.

---

# NACHTRAG 11 — Migration #7 Production Apply (2026-09-21)

`20260917160000_add_create_invited_customer_with_contact_v1`

Drittes Glied der Invite-Kette und die Stelle, die den vorgesehenen Zugriff **tatsaechlich
erteilt**. Angewendet als Einzelschritt; #8/#9 bleiben aus. Ergebnis: **COMMITTED**, eine neue
Funktion, nichts ueberschrieben, keine Bestandsdaten beruehrt, kein neuer Advisor-Befund.

**Wichtigste Einordnung: #7 ist ohne Edge-Deploy inert — und ein Deploy VOR #8 waere
gefaehrlich.** Siehe N11.7.

## N11.1 Artefakt-Integritaet

| Groesse | Wert |
|---|---|
| `MIG7_FILE` | `supabase/migrations/20260917160000_add_create_invited_customer_with_contact_v1.sql` |
| `MIG7_MD5` | `78906327a982fbb643760065f633bfed` |
| `MIG7_SHA256` | `8a1451a18677270cef2cf4346f2b67460c23483f34952e66a528302748e3f477` |
| Groesse / Zeilen | 9310 Bytes / 238 |
| Apply-Artefakt | `docs/backups/mig7_20260917160000_apply_canonical.sql` (`c857918c0c0561a4cdba0f2f4c6a133e`, 18943 Bytes) |
| Rollback | `docs/backups/mig7_20260917160000_prestate_rollback_2026-09-21.sql` (`ba3054dc4895d314313d856fa4860dde`) |

Statisches Audit: **3 DDL, 0 DML, 0 destruktiv.** Ein `CREATE OR REPLACE FUNCTION` auf einer
Funktion, die in Production **noch nicht existierte**, plus `REVOKE` und `GRANT` auf eben
dieser neuen Funktion. Keine Tabellen-, Index-, Trigger-, Policy- oder RLS-DDL.

Alle `ON CONFLICT`-Ziele vorab gegen Production geprueft: `profiles_pkey`,
`user_roles_user_id_role_key`, `access_grants_client_id_provider_id_key` — vorhanden und
passend. Eine fehlende Unique-Constraint waere erst zur Laufzeit aufgefallen.

## N11.2 Prestate

Ledger: `total=441`, `max=20260917155000`, #5 = 1, Hardening = 1, #6 = 1, **#7 = 0**,
#8/#9 = 0, keine Phantomversion. `auto_assign_client_to_provider` auf
`b6f62858b4de1b61a9a7503e1668e209`, `_hm_normalize_email` auf `4f7063e0…`.
**`create_invited_customer_with_contact` existierte nicht** — es gab also keine alte
Definition zu sichern. Ghosts 39, Duplikat-Gruppen 4, Invite-Tabelle 0 Zeilen.

Signaturvergleich: #7, #8 und #9 definieren dieselbe Signatur
`(uuid, uuid, jsonb, jsonb)`. Eine Ueberladung existiert weder im Repo noch in Production —
ein `DROP FUNCTION` mit dieser Signatur ist damit eindeutig.

## N11.3 Probelauf und Testplan

Die isolierte Instanz wurde exakt auf PROD-Stand gebracht (#5 + Hardening + #6). Apply lief
mit allen sechs Guards durch (`EXIT=0`), Rollback anschliessend ebenfalls (`EXIT=0`).

Der geforderte Testplan wurde vollstaendig nachgewiesen — jeder Fall in einer Transaktion mit
`ROLLBACK`, Ausgabe nur Zahlen und Statuswerte:

| Fall | Status | Grant richtig | Grant fremd | Fehlermeldung |
|---|---|---|---|---|
| ACTIVE | `completed` | 1 | 0 | — |
| WRONG PROVIDER | — | 0 | 0 | `Invited user is not marked for this provider` |
| EXPIRED | — | 0 | 0 | `No valid pending invite for this user` |
| INVALIDATED | — | 0 | 0 | `No valid pending invite for this user` |
| CONSUMED | `already_completed` | 1 | 0 | — |
| REPLAY | `already_completed` | 1 | 0 | — |
| UNBOUND (Selbst-Signup) | — | 0 | 0 | `No valid pending invite for this user` |
| NORMALIZED EMAIL (Grossschreibung) | `completed` | 1 | 0 | — |

**In keinem Fall entstand ein Fremd-Grant.** Der Fall UNBOUND ist der wichtigste: ein Invite,
der nie an die `user_id` gebunden wurde, wird nicht gefunden — das ist der Schutz gegen das
Einsammeln eines fremden Selbst-Signups.

**Parallelitaetstest mit zwei echten Sessions:** Session 1 `completed`, Session 2
`already_completed`; Endzustand exakt **1** aktiver Grant, **1** Provider, **1** Kontakt,
**1** verbrauchter Invite. `FOR UPDATE` serialisiert wie vorgesehen.

### Zwischenfall waehrend dieses Tests — Testcontainer-Trigger gegen Production

Der Parallelitaetstest hat als einziger Testfall **committet** (echte Nebenlaeufigkeit braucht
zwei Sessions, also eine sichtbare Zeile). Dabei ist ein Fehler aufgetreten, der hier
festgehalten gehoert:

Die Testinstanz `mig34-isolated-test` ist ein Klon von Production — **einschliesslich der
Trigger-Funktionen mit fest eincodierten Produktions-URLs** — und `pg_net` ist dort
installiert. Der `AFTER INSERT`-Trigger `trg_notify_new_registration` auf `user_roles` hat
deshalb einen echten HTTP-Aufruf an die **Produktions**-Edge-Function
`notify-new-registration` abgesetzt.

Folge: **genau eine** Zeile in `public.notifications`
(`015a9681-6cf8-4405-bf46-b0f2e8b47b6d`, `type=new_registration`, 2026-09-21 19:44:53 UTC,
Inhalt „Race hat sich als Pferdebesitzer registriert"), plus sehr wahrscheinlich eine
Admin-Benachrichtigungs-E-Mail ueber Resend. Die uebrigen 14 Testfaelle liefen in
zurueckgerollten Transaktionen und haben nichts ausgeloest — bestaetigt durch den Treffer von
genau 1.

Die Produktions**datenbank** war und ist unberuehrt: 0 Auth-User, 0 Profile, 0 Kontakte,
0 Grants mit Testbezug; Gesamtzahlen unveraendert.

Sofortmassnahme: alle fuenf Trigger der Testinstanz, die `net.http_post` gegen Production
absetzen, wurden deaktiviert (`trg_notify_new_registration`, `notify_admin_profile_changes`,
`on_new_profile_created`, `on_client_first_login`, `trg_auto_create_conversation`, dazu die
drei Autoflow-Trigger auf `appointments`/`leads`). Stand: **0 aktiv, 5 deaktiviert**.

Lehre fuer die Release-Regeln: „Schreibtests nur in der isolierten Instanz" ist
unvollstaendig. Richtig ist **„nur in einer Instanz, deren ausgehende Trigger nachweislich
entschaerft sind"**. Das gehoert als Vorbedingung und als Hook in die Development Factory.

## N11.4 Apply

`psql` ueber den Session Pooler, genau ein Aufruf, keine Retry-Schleife, `PGSSLMODE=require`,
Passwort ausschliesslich interaktiv ueber `/dev/tty`. Kein `db push`, kein `apply_migration`,
kein `_prepared`, kein Ledger-Repair.

Sechs Guards im Artefakt: Ledger-Guard (#5/Hardening/#6 = 1, #7 = 0, #8/#9 abwesend),
Dependency-Guard (#5-Vertrag vollstaendig, #6-Funktion auf `b6f62858`), Prestate-Guard
(Zielfunktion darf nicht existieren), md5-Guard, Poststate-Guard (Ziel-`prosrc`, SECDEF,
`search_path`, Owner, Signatur, **kein EXECUTE fuer anon/authenticated/authenticator, kein
PUBLIC-Grant**), Side-Effect-Guard (Invite-Tabelle leer, #6 unveraendert).

## N11.5 Postcheck — Ledger

| Pruefung | Ergebnis |
|---|---|
| `20260917160000` | exakt **1** ✅ |
| Phantomversion (`LIKE '2026091716%'`) | **1** (nur die kanonische) ✅ |
| `ledger_max` | `20260917160000` ✅ |
| `ledger_total` | 441 → **442** (+1) ✅ |
| #1–#4 / #5 / Hardening / #6 | 4 / 1 / 1 / 1 — unveraendert ✅ |
| #8 / #9 | **0 / 0** ✅ |
| `LEDGER_DRIFT_CREATED` | **NO** ✅ |

Ledger-Zeile: `name=add_create_invited_customer_with_contact_v1`,
`created_by=passaondigital@gmail.com`, `idempotency_key=NULL`, `rollback=NULL`,
`md5(statements[1])=78906327a982fbb643760065f633bfed`, `octet_length=9310` — exakt die
Repo-Datei. Die #6-Ledger-Zeile (`30ee5a9e…`, 9125) ist unveraendert.

## N11.6 Postcheck — Funktion

Die Live-Funktion ist **byte-identisch** mit dem Repo-Migrationskoerper: 6727 Bytes,
`prosrc` md5 `0be8f9ca939c9e84d4d59352338d8c62` auf beiden Seiten.

| Attribut | Wert | Erwartung |
|---|---|---|
| `prosrc` md5 / Bytes | `0be8f9ca…` / 6727 | ✅ |
| Owner | `postgres` | ✅ |
| Sprache / Rueckgabetyp | `plpgsql` / `jsonb` | ✅ |
| Signatur | `p_provider_id uuid, p_user_id uuid, p_profile jsonb, p_contact jsonb` | ✅ |
| SECURITY DEFINER | `true` | ✅ |
| `search_path` | `public` | ✅ |
| Volatilitaet / strict / leakproof / parallel | `v` / `f` / `f` / `u` | ✅ |
| ACL | `postgres=X/postgres \| service_role=X/postgres` | ✅ kein PUBLIC |
| `anon` / `authenticated` / `authenticator` EXECUTE | `false` / `false` / `false` | ✅ |
| `service_role` EXECUTE | `true` | ✅ |

## N11.7 #7 ist inert — und der naechste Schritt ist NICHT der Deploy

`MIG7_P0_FIXED_BY_ITSELF=NO`.

`hm_pending_client_invites` hat 0 Zeilen, nur `service_role` darf die neue Funktion ausfuehren,
und der einzige Aufrufer waere die neue Fassung von `invite-client-with-password` — die
**nicht deployt** ist (Version 7, `ezbr_sha256 bb7c2e47…`, ohne jeden Aufruf der neuen RPCs).
#7 ist damit folgenlos und darf beliebig lange so stehen.

**Ein Edge-Deploy nach #7, aber vor #8, waere dagegen gefaehrlich.** Das heute laufende
`public.handle_new_user()` (`prosrc` md5 `dc89cc94bbaf69e6a41f55b60b594723`, im Postcheck als
unveraendert bestaetigt) enthaelt eine **bedingungslose** Ghost-Merge-Schleife, die
`access_grants` jedes Nicht-Demo-Providers auf den neuen Auth-User umhaengt. Erst #8 schaltet
sie im Invite-Pfad ab.

#7 wuerde den dadurch entstehenden Fremd-Grant zwar erkennen und mit
`Invited customer already has access granted to another provider` abbrechen — aber der Schaden
ist eine Transaktion frueher zusammen mit dem `auth.users`-INSERT committet und laesst sich
nicht zurueckdrehen. Read-only gemessen: **25 Ghost-Profile** tragen einen aktiven Grant eines
echten Providers und waeren exponiert.

Verbindliche Reihenfolge: **#7 → #8 → #9 → Ghost-Review → Edge-Deploy.**

## N11.8 Side-Effect-Matrix

Gegen den in NACHTRAG 10 protokollierten Stand nach #6:

| Metrik | Vor #7 | Nach #7 | Δ |
|---|---|---|---|
| Ledger gesamt | 441 | **442** | +1 (nur #7) |
| **Routinen `public`** | 195 | **196** | **+1** (genau die neue Funktion) |
| Tabellen `public` | 293 | **293** | **0** |
| Policies `public` | 753 | **753** | **0** |
| Trigger `public` / `auth` | 190 / 1 | **190 / 1** | **0** |
| profiles | 103 | **103** | **0** |
| contacts | 44 | **44** | **0** |
| access_grants gesamt / aktiv | 57 / 43 | **57 / 43** | **0** |
| user_roles | 64 | **64** | **0** |
| auth.users | 64 | **64** | **0** |
| **Ghost-Profile** | **39** | **39** | **0** ✅ |
| **Duplikat-E-Mail-Gruppen** | **4** | **4** | **0** ✅ |
| `hm_pending_client_invites` Zeilen | 0 | **0** | **0** ✅ |
| Funktionen ohne festen `search_path` | 0 | **0** | **0** |
| `auto_assign_client_to_provider` (#6) | `b6f62858…` | **unveraendert** | ✅ |
| `handle_new_user` | `dc89cc94…` | **unveraendert** | ✅ (erwartet — #8 aendert sie) |

`MIG7_EXISTING_DATA_MUTATED=NO`.

## N11.9 Advisor-Diff

| Kategorie | nach #6 | nach #7 | |
|---|---|---|---|
| `anon_security_definer_function_executable` | 149 | **149** | unveraendert |
| `authenticated_security_definer_function_executable` | 156 | **156** | unveraendert |
| `rls_enabled_no_policy` | 5 | **5** | unveraendert, beabsichtigt |
| `extension_in_public`, `auth_leaked_password_protection` | — | unveraendert | Altbefunde |

`NEW_SECURITY_FINDINGS_FROM_MIG7=NONE`. Keine neue Kategorie, kein veraenderter Zaehlerstand.

**Die neue #7-Funktion taucht in keiner der beiden SECDEF-Kategorien auf** — korrekt, denn
`anon` und `authenticated` haben kein `EXECUTE`. Das war die ausdrueckliche Anforderung und
ist damit erfuellt.

## N11.10 Rollback-Pfad

`docs/backups/mig7_20260917160000_prestate_rollback_2026-09-21.sql` — **nicht ausgefuehrt**,
in der isolierten Instanz erprobt (`EXIT=0`).

Umfang exakt: ein `DROP FUNCTION` mit voller Signatur (kein `CASCADE`) plus `DELETE` genau der
Ledger-Zeile `20260917160000`. Drei Guards: #8/#9 duerfen nicht angewendet sein (sie
definieren dieselbe Funktion neu — ein Drop wuerde sonst deren Korrektur entfernen);
`prosrc`-md5 muss die #7-Fassung sein; es darf keinen verbrauchten Invite geben. Postcheck im
selben Block prueft, dass #5, Hardening und #6 intakt bleiben. Kein DML, nichts zu verlieren.

## N11.11 Ergebnis

```
MIG7_APPLIED=YES
MIG7_APPLY_STATE=COMMITTED
MIG7_LEDGER_VERSION=20260917160000
LEDGER_DRIFT_CREATED=NO

MIG7_PROSRC_MD5=0be8f9ca939c9e84d4d59352338d8c62
MIG7_OBJECTS_CREATED=PASS
MIG7_GRANT_CONTRACT=PASS   (anon/authenticated/authenticator ohne EXECUTE, kein PUBLIC)
MIG7_SECURITY_REVIEW=PASS
MIG7_TENANT_REVIEW=PASS

MIG7_EXISTING_DATA_MUTATED=NO
GHOST_PROFILE_COUNT_AFTER=39
DUPLICATE_EMAIL_GROUPS_AFTER=4
PENDING_INVITE_ROWS_AFTER=0
ROUTINES_DELTA=+1

NEW_SECURITY_FINDINGS_FROM_MIG7=NONE
MIG7_P0_FIXED_BY_ITSELF=NO

MIG8_APPLIED=NO   MIG9_APPLIED=NO
RELATED_NEW_EDGE_FUNCTION_DEPLOYED=NO

CHAIN_CAN_PAUSE_AFTER_MIG7=YES
EDGE_DEPLOY_EARLIEST_AFTER=#9 + Ghost-Review
SAFE_TO_PREPARE_MIG8=YES
```

**STOPP.** Keine Migration #8/#9, kein Edge-Deploy, keine Ghost-Bereinigung, keine
Vault-Aenderung, kein Push.

---

# NACHTRAG 12 — Migration #8 Production Apply (2026-09-21)

`20260920120000_fix_pending_invite_ghost_merge_v1`

Viertes Glied der Invite-Kette und das einzige, das **sofort** wirkt. Angewendet als
Einzelschritt; #9 bleibt aus. Ergebnis: **COMMITTED**, drei Funktionen ersetzt, keine
Bestandsdaten beruehrt, kein neuer Advisor-Befund.

## N12.1 Artefakt-Integritaet

| Groesse | Wert |
|---|---|
| `MIG8_FILE` | `supabase/migrations/20260920120000_fix_pending_invite_ghost_merge_v1.sql` |
| `MIG8_MD5` | `5d426ae10ca2831cb4c0cd016d93d348` |
| Groesse / Zeilen | 23974 Bytes / 573 |
| Apply-Artefakt | `docs/backups/mig8_20260920120000_apply_canonical.sql` (`3200b8256c3663343e81847701e4b5f5`, 35179 Bytes) |
| Rollback | `docs/backups/mig8_20260920120000_prestate_rollback_2026-09-21.sql` (`cf9a68f2f10aea432f47fa232107cc63`) |

Statisches Audit: **7 DDL, 0 DML.** Drei `CREATE OR REPLACE FUNCTION` plus zwei
REVOKE/GRANT-Paare. Keine Tabellen-, Index-, Trigger-, Policy- oder RLS-DDL.

## N12.2 Prestate

Ledger `total=442`, `max=20260917160000`, #5/Hardening/#6/#7 je 1, **#8 = 0**, #9 = 0.

| Funktion | `prosrc` md5 vorher | Bytes |
|---|---|---|
| `handle_new_user()` | `dc89cc94bbaf69e6a41f55b60b594723` | 4428 |
| `create_pending_client_invite_v1(...)` | `098ba120e40e3e51019e74c827959d84` | 3172 |
| `create_invited_customer_with_contact(...)` | `0be8f9ca939c9e84d4d59352338d8c62` | 6727 |

Fuer den Rollback wurde `handle_new_user` woertlich als `pg_get_functiondef` aus Production
gesichert (md5 `8af001b16380a9d5b8347dd06dd55024`, 4586 Bytes); die beiden anderen stammen
aus den Repo-Statements von #5 bzw. #7, deren `prosrc`-md5 vorab gegen Production verifiziert
wurde.

## N12.3 Was #8 korrigiert

**1. `handle_new_user()` — zwei unabhaengige Fixes.**

*a) Ghost-Merge im Invite-Pfad ausgesetzt.* Die Vorfassung merged bedingungslos und haengt
`access_grants` **jedes** Nicht-Demo-Providers auf den neuen Auth-User um — ohne Pruefung, ob
das der einladende Provider ist. Das ist die Cross-Provider-Uebernahme, die #9s Kopfkommentar
als reproduziertes Browser-E2E beschreibt. #8 kapselt die Schleife in `IF NOT invite_pending`.

*b) Rollen-Eskalation geschlossen.* Die Vorfassung las die Rolle aus
`raw_user_meta_data->>'role'` — einem Feld, das bei `supabase.auth.signUp()` vom Client frei
gesetzt wird (das Frontend belegt das selbst: `ConnectForm.tsx:153` sendet `role: "client"`).
Ein Signup mit `{"data":{"role":"admin"}}` ergab damit `assigned_role = 'admin'` in
`public.user_roles`. Gegengeprueft: keiner der drei Trigger auf `user_roles` validiert die
Rolle, `sync_trusted_app_role` existiert in Production nicht, und RLS greift nicht, weil die
Funktion SECURITY DEFINER ist. #8 laesst privilegierte Rollen nur noch aus
`raw_app_meta_data` zu, das serverseitig gesetzt wird.

Dieser zweite Fix hat **nichts mit der Invite-Kette zu tun** und wirkt ab dem Apply sofort
fuer jede neue Registrierung.

**2. `create_pending_client_invite_v1()` — TTL nicht mehr aufruferkontrolliert.** Vorher
`greatest(1, least(coalesce(p_ttl_minutes,15),60))`, jetzt fest `interval '15 minutes'`. Der
Parameter bleibt in der Signatur, wirkt aber nicht mehr — eine kleine API-Unsauberkeit,
sicherheitlich eine Verschaerfung.

**3. `create_invited_customer_with_contact()` — E-Mail-Dreieck und Ghost-Finalisierung.**
Die Profil-E-Mail muss zur Auth-E-Mail passen; die Ghost-Uebernahme wandert aus
`handle_new_user` hierher und laeuft mit Cross-Provider-Guards.

## N12.4 Probelauf

Testinstanz exakt auf PROD-Stand gebracht (alle vier Funktions-md5 identisch). **Vor jedem
Test die Trigger-Isolation verifiziert: 0 aktive Trigger mit `net.http_post`, 5 deaktiviert**
— die Konsequenz aus dem in N11.3 dokumentierten Zwischenfall.

Der ACL-Guard des Artefakts hat dabei zunaechst korrekt abgebrochen, weil die
Container-Erwartung unvollstaendig war. Nach Korrektur: Apply `EXIT=0`, alle Guards passiert.

Sieben Verhaltensproben, jede in einer Transaktion mit `ROLLBACK`:

| Fall | Ergebnis |
|---|---|
| `role_admin_usermeta` | **`provider`** statt `admin` — Eskalation geschlossen ✅ |
| `role_admin_appmeta` | `admin` — serverseitiger Pfad intakt ✅ |
| `ttl_fixed` | 60 Min angefordert → **15 Min** tatsaechlich ✅ |
| `ghost_normal_signup` | Ghost gemerged — Legacy fuer normale Signups erhalten ✅ |
| **`ghost_invite_skipped`** | **Ghost unangetastet — der Kernfix wirkt** ✅ |
| `ghost_cross_provider` | `An existing customer record for this email belongs to another provider` ✅ |
| `email_triangle` | `Customer email does not match the invited user` ✅ |

Rollback anschliessend erprobt: `EXIT=0`, alle drei Funktionen zurueck auf ihre Vor-#8-md5.
Keine Testrueckstaende.

## N12.5 Postcheck — Ledger

| Pruefung | Ergebnis |
|---|---|
| `20260920120000` | exakt **1** ✅ |
| Phantomversion (`LIKE '2026092012%'`) | **1** (nur die kanonische) ✅ |
| `ledger_max` | `20260920120000` ✅ |
| `ledger_total` | 442 → **443** (+1) ✅ |
| #1–#4 / #5–#7 | 4 / 4 — unveraendert ✅ |
| #9 | **0** ✅ |
| `LEDGER_DRIFT_CREATED` | **NO** ✅ |

Ledger-Zeile: `name=fix_pending_invite_ghost_merge_v1`, `created_by=passaondigital@gmail.com`,
`md5(statements[1])=5d426ae10ca2831cb4c0cd016d93d348`, `octet_length=23974` — exakt die
Repo-Datei. Die #7-Zeile ist unveraendert.

## N12.6 Postcheck — Funktionen

| Funktion | md5 nachher | Bytes | Ziel getroffen |
|---|---|---|---|
| `handle_new_user` | `5cb9eee610c378ead795a285475ccd08` | 5099 | ✅ |
| `create_pending_client_invite_v1` | `cd138b57c0236f214dd8307d024717cb` | 2935 | ✅ |
| `create_invited_customer_with_contact` | `fabfebb739ca83ad11c8fcae60fac2a6` | 8783 | ✅ |
| `auto_assign_client_to_provider` (#6) | `b6f62858b4de1b61a9a7503e1668e209` | 2825 | unveraendert ✅ |

Alle drei: Owner `postgres`, SECURITY DEFINER, `search_path=public`, Volatilitaet `v`,
Signaturen unveraendert.

ACLs:
* `create_pending_client_invite_v1` und `create_invited_customer_with_contact`:
  `postgres=X \| service_role=X` — `anon`/`authenticated`/`authenticator` ohne EXECUTE ✅
* `handle_new_user`: unveraendert inkl. der Alt-ACL mit PUBLIC/anon/authenticated. #8 fasst
  deren Grants bewusst nicht an; die Funktion ist `RETURNS trigger` und damit nicht direkt
  aufrufbar.

### Semantische Gegenproben (rein lesend auf `pg_proc.prosrc`, kein Schreibtest)

```
ttl_fest_15min            = true   (interval '15 minutes' da, make_interval(mins=>v_ttl) weg)
email_dreieck             = true   ('Customer email does not match the invited user')
ghost_cross_guard         = true   ('...belongs to another provider')
rolle_aus_appmeta         = true   (requested_app_role vorhanden)
alte_eskalation_entfernt  = true   (user_role_from_meta = 'admin' nicht mehr vorhanden)
ghost_merge_gated         = true   (IF NOT invite_pending THEN)
```

Damit sind die vier geforderten Bestaetigungen erbracht: #5-TTL, #7-E-Mail-Dreieck,
Ghost-Finalisierung und Rollen-Eskalation.

## N12.7 Side-Effect-Matrix

| Metrik | Vor #8 | Nach #8 | Δ |
|---|---|---|---|
| Ledger gesamt | 442 | **443** | +1 (nur #8) |
| Tabellen `public` | 293 | **293** | **0** |
| Routinen `public` | 196 | **196** | **0** (drei ersetzt, keine neu) |
| Policies `public` | 753 | **753** | **0** |
| Trigger `public`+`auth` | 191 | **191** | **0** |
| profiles | 103 | **103** | **0** |
| profiles soft-deleted | 10 | **10** | **0** |
| contacts | 44 | **44** | **0** |
| access_grants gesamt / aktiv | 57 / 43 | **57 / 43** | **0** |
| user_roles gesamt / `admin` | 64 / 2 | **64 / 2** | **0** |
| auth.users | 64 | **64** | **0** |
| horses | 78 | **78** | **0** |
| appointments | 295 | **295** | **0** |
| **Ghost-Profile** | **39** | **39** | **0** ✅ |
| **Duplikat-E-Mail-Gruppen** | **4** | **4** | **0** ✅ |
| `hm_pending_client_invites` | 0 | **0** | **0** ✅ |
| Funktionen ohne festen `search_path` | 0 | **0** | **0** |

`MIG8_EXISTING_DATA_MUTATED=NO`.

## N12.8 Advisor-Diff

| Kategorie | nach #7 | nach #8 | |
|---|---|---|---|
| `anon_security_definer_function_executable` | 149 | **149** | unveraendert |
| `authenticated_security_definer_function_executable` | 156 | **156** | unveraendert |
| `rls_enabled_no_policy` | 5 | **5** | unveraendert, beabsichtigt |
| `extension_in_public`, `auth_leaked_password_protection` | — | unveraendert | Altbefunde |

`NEW_SECURITY_FINDINGS_FROM_MIG8=NONE`.

**Klassifikation `handle_new_user`:** Die Funktion steht in beiden SECDEF-Kategorien — aber
ueber **alle fuenf** Advisor-Snapshots hinweg (nach #5, nach Hardening, nach #6, nach #7,
nach #8). Damit eindeutig **`PREEXISTING_LEGACY`**, nicht durch #8 verursacht. `CREATE OR
REPLACE` setzt ACLs nicht zurueck; der Poststate-Guard hat das erzwungen.

## N12.9 Wirkung und naechster Schritt

Anders als #5–#7 ist #8 **nicht vollstaendig inert**:

* Der **Invite-Teil** bleibt inert — `hm_pending_client_invites` ist leer und die neue Edge
  Function ist nicht deployt.
* Die **Rollen-Eskalationskorrektur wirkt sofort** fuer jede neue Registrierung. Das war der
  Grund, #8 nicht liegenzulassen.

Verbleibende Reihenfolge: **#9 → Ghost-Review (25 exponierte Profile) → Edge-Deploy → E2E →
`invite-client`-Gap.**

## N12.10 Rollback-Pfad

`docs/backups/mig8_20260920120000_prestate_rollback_2026-09-21.sql` — **nicht ausgefuehrt**,
erprobt (`EXIT=0`). Drei `CREATE OR REPLACE` plus `DELETE` genau der Ledger-Zeile. Guards:
#9 darf nicht angewendet sein; alle drei Funktionen muessen auf dem #8- oder Pre-Stand
stehen; die Invite-Tabelle muss leer sein.

**Ausdrueckliche Warnung im Kopf der Datei:** Ein Rollback von #8 stellt den Vorzustand her
und schaltet damit **beide** geschlossenen Luecken wieder scharf — den bedingungslosen
Ghost-Merge **und** die Rollen-Eskalation. Er ist nur vertretbar, wenn #8 selbst Schaden
anrichtet; sonst ist Vorwaertsrollen die bessere Antwort.

## N12.11 Ergebnis

```
MIG8_APPLIED=YES
MIG8_APPLY_STATE=COMMITTED
MIG8_LEDGER_VERSION=20260920120000
MIG8_CANONICAL_MD5_VERIFIED=YES (5d426ae10ca2831cb4c0cd016d93d348)
LEDGER_DRIFT_CREATED=NO

MIG8_FUNCTIONS_VERIFIED=3/3
  handle_new_user                      dc89cc94… -> 5cb9eee6…
  create_pending_client_invite_v1      098ba120… -> cd138b57…
  create_invited_customer_with_contact 0be8f9ca… -> fabfebb7…

MIG8_TTL_FIXED=YES          MIG8_EMAIL_TRIANGLE=YES
MIG8_GHOST_GUARD=YES        MIG8_ROLE_ESCALATION_CLOSED=YES

MIG8_EXISTING_DATA_MUTATED=NO
GHOST_PROFILE_COUNT_AFTER=39
DUPLICATE_EMAIL_GROUPS_AFTER=4
PENDING_INVITE_ROWS_AFTER=0

NEW_SECURITY_FINDINGS_FROM_MIG8=NONE
MIG9_APPLIED=NO
RELATED_NEW_EDGE_FUNCTION_DEPLOYED=NO
CHAIN_CAN_PAUSE_AFTER_MIG8=YES
```

**STOPP.** Keine Migration #9, kein Edge-Deploy, keine Ghost-Bereinigung, keine
Vault-Aenderung, kein Push.

---

# NACHTRAG 13 — Migration #9 Apply, Ghost Safety Review, Edge Predeploy (2026-09-21)

`20260920190000_fix_cross_provider_ghost_takeover_v1`

Letztes Glied der Invite-Kette. Angewendet als Einzelschritt. Ergebnis: **COMMITTED**, eine
Funktion ersetzt, keine Bestandsdaten beruehrt, kein neuer Advisor-Befund. Anschliessend der
angekuendigte Ghost-Review und das Edge-Predeploy-Audit — beide **read-only**, nichts
veraendert, nichts deployt.

## N13.1 Artefakt und Postcheck

| Groesse | Wert |
|---|---|
| `MIG9_MD5` | `331a090f5cf61dbbc4f52f5d11dc72dc` (11673 Bytes, 292 Zeilen) |
| Apply-Artefakt | `docs/backups/mig9_20260920190000_apply_canonical.sql` (`e705e380f87e02b2d62303f4dfdd10f9`) |
| Rollback | `docs/backups/mig9_20260920190000_prestate_rollback_2026-09-21.sql` (`337caa6c2072081d893babdd8c0c29ab`) |

3 DDL, 0 DML. Der reine Code-Diff gegen #8 sind vier Zeilen: `created_by_provider_id` als
Ghost-Besitzmarker.

**Ledger:** 443 → **444**, max `20260920190000`, #9 exakt 1, keine Phantomversion, #1–#8
vollstaendig. `md5(statements[1])=331a090f…`, `octet_length=11673` — exakt die Repo-Datei.

**Funktion:** `prosrc` md5 `dbbfc981c9ef9e8f1aaa8ccb4adb849a` (9465 Bytes) = Zielwert.
Owner `postgres`, SECURITY DEFINER, `search_path=public`, Signatur unveraendert,
ACL `postgres=X \| service_role=X`, `anon`/`authenticated`/`authenticator` ohne EXECUTE,
**Besitzmarker-Guard im Funktionstext nachgewiesen**. `handle_new_user` (`5cb9eee6…`),
`create_pending_client_invite_v1` (`cd138b57…`) und `auto_assign_client_to_provider`
(`b6f62858…`) unveraendert.

**Side Effects:** Tabellen 293, Routinen 196, Policies 753, Trigger 190+1, profiles 103,
soft-deleted 10, contacts 44, grants 57/43, user_roles 64 (admin 2), auth.users 64,
horses 78, appointments 295, Invites 0, Funktionen ohne festen `search_path` 0 — alle Δ=0.

**Ghost/Duplikat mit wortgleicher Prestate-SQL: 39 / 4.** Unveraendert.

**Advisor:** keine neue Kategorie, Zaehler identisch (149/156/0/0/5). Die Funktion taucht in
keiner Kategorie auf. `NEW_SECURITY_FINDINGS_FROM_MIG9=NONE`.

## N13.2 Ghost Safety Review — read-only

### Herleitung der Zahl 25

```
39  GHOST_TOTAL        (Prestate-Definition: profiles ohne auth.users-Zeile)
 -4  soft-deleted
 35  live
 -2  ohne aktiven Grant
 33  mit aktivem Grant
 -8  nur Demo-Provider-Grants
 25  GHOST_EXPOSED     (live, aktiver Nicht-Demo-Grant)
```

### Klassifikation aller 39

| Klasse | Anzahl | davon Duplikat-Mail | Pferde | Termine | aktive Grants |
|---|---|---|---|---|---|
| `SAFE_SAME_PROVIDER` | **32** | 1 | 41 | 40 | 32 |
| `ALREADY_DELETED` | **4** | 2 | 1 | 0 | 0 |
| `MARKERLESS_LEGACY` | **2** | 1 | 0 | 0 | 0 |
| `AUTH_COLLISION` | **1** | 1 | 1 | 0 | 1 |
| **`CROSS_PROVIDER_CONFLICT`** | **0** | — | — | — | — |
| `ORPHAN` | 0 | — | — | — | — |

Summe 39. Klassifiziert wurde nach Praezedenz ueber `distinct_owner_providers` — der Zahl
verschiedener Provider ueber `created_by_provider_id`, aktive Nicht-Demo-Grants und aktive
Kontakte hinweg.

**Der entscheidende Wert ist die Null:** Kein einziger Ghost traegt Besitzmarker, die auf
mehr als einen Provider zeigen. Die Konstellation, die #9 adressiert, existiert im
Bestand aktuell nicht.

### Die zwei markerlosen Ghosts

| opake ID | Marker | Grants | Kontakte | Pferde | Termine | Auth-User gleiche Mail | weitere Profile gleiche Mail |
|---|---|---|---|---|---|---|---|
| `5c8e997a` | nein | 0 | 0 | 0 | 0 | nein | 0 |
| `621111d0` | nein | 0 | 0 | 0 | 0 | nein | 1 |

**Beide sind vollstaendig leer.** Wuerde eine dieser Adressen eingeladen, greift weder #9s
Markerpruefung noch #8s Grant- oder Kontakt-Guard — die Schleife faellt in CASE A und
„finalisiert" den Ghost. Uebertragen wird dabei **nichts**, weil nichts da ist; ein leeres
Profil wird soft-deleted. Kein Datenverlust, kein Fremdzugriff.

`621111d0` liegt in Duplikat-Gruppe `97ae3013`, der einzigen Gruppe ohne existierenden
Auth-User — also der einzigen, in der ein Invite ueberhaupt durchlaufen koennte. Das zweite
Profil dieser Gruppe (`a4fdc44e`) traegt Marker, Grant **und** Kontakt, und alle drei zeigen
auf **denselben** Provider (`ecb7497b`).

* Laedt `ecb7497b` ein → beide Ghosts korrekt finalisiert, Grant wandert mit.
* Laedt ein anderer Provider ein → `a4fdc44e` loest #9s Marker-Guard aus, die gesamte
  Transaktion bricht ab. **Fail-closed.**

`BLOCK_EDGE_DEPLOY_DUE_TO_MARKERLESS_GHOSTS=NO`

### Die vier Duplikat-Gruppen (je 2 Profile)

| Gruppe (opak) | Ghosts | echte Auth-User | soft-deleted | Auth-User mit dieser Mail | Bewertung |
|---|---|---|---|---|---|
| `e1938d46` | 1 | 1 | 0 | ja | Invite scheitert an `createUser` (409) — sicher |
| `1c23ae1f` | 1 | 1 | 2 | ja | beide Profile soft-deleted — harmlos |
| `97ae3013` | 2 | 0 | 0 | **nein** | alle Marker auf einen Provider — sicher, siehe oben |
| `ee83d4cd` | 1 | 1 | 1 | ja | Invite scheitert an `createUser` — sicher |

Drei der vier Gruppen haben bereits einen Auth-User mit dieser Adresse; dort bricht der
Invite-Flow schon bei `auth.admin.createUser` mit 409 ab, bevor irgendein Ghost angefasst
wird. Die vierte ist provider-rein.

### AUTH_COLLISION (1)

`39a34c62`: Marker gesetzt, 1 aktiver Nicht-Demo-Grant, 1 Kontakt desselben Providers,
1 Pferd — und es existiert bereits ein Auth-User mit derselben Adresse. Auch hier scheitert
ein erneuter Invite an `createUser`. Es ist eine bestehende Dateninkonsistenz, aber kein
Deploy-Blocker.

**`BLOCK_EDGE_DEPLOY_DUE_TO_GHOST_REVIEW=NO`**

## N13.3 Edge Predeploy Audit — read-only, NICHT deployt

### Zwei klar getrennte Pfade

| | Slug | Version | `ezbr_sha256` | Frontend-Aufrufer |
|---|---|---|---|---|
| 1 | `invite-client-with-password` | **7** | `bb7c2e4794972ca150333c96c9cb934e55a24880c0328d4ff629050a590a00c8` | `InviteByEmailModal.tsx:63` |
| 2 | `invite-client` | **8** | `ae834781f71068c87b4094ed90760b2600ebdcd661a714d8af92943ee3aa9c94` | `InviteClientButton.tsx:249` |

Die deployte v7 wurde gelesen: sie enthaelt **keinen** Aufruf der neuen RPCs. Die Repo-Fassung
(18386 Bytes, sha256 `c5abec5b611b9667…`) tut es.

**Hinweis zur Hash-Vergleichbarkeit:** `ezbr_sha256` ist der Hash des deployten Bundles, nicht
der Quelldatei. Ein direkter Vergleich Quelle↔Bundle ist nicht aussagekraeftig. Belastbar ist
der inhaltliche Befund: der deployte Quelltext enthaelt die RPC-Aufrufe nicht.

### Audit der Repo-Fassung

| Pruefpunkt | Befund |
|---|---|
| Aufrufreihenfolge | `create_pending_client_invite_v1` (Z. 138) → `auth.admin.createUser` (175) → `bind_pending_client_invite_v1` (198) → `create_invited_customer_with_contact` (234) ✅ |
| Invite VOR createUser | ✅ — Voraussetzung dafuer, dass die Unterdrueckung in #6 greift |
| Fehlerpfade | `invalidateInvite` bei createUser-Fehler (183), bind-Fehler (206, `cleanupRequired=true`), Persistenz-Fehler (262, `cleanupRequired=true`) ✅ vollstaendig |
| **Provider-ID** | **immer `callerUser.id` aus dem verifizierten JWT** (Z. 139/162/200/235). Der Request-Body liefert ausschliesslich `email` und `fullName` (Z. 107) ✅ |
| Fremde Provider-ID akzeptierbar? | **nein** ✅ |
| Aufrufer-Guards | 401 ohne Auth · 401 ungueltiges Token · 403 kein Provider · 403 kein Pro-Abo · 400 fehlende Felder · 409 Konflikte ✅ |
| Secrets im Source | keine Literale, nur `Deno.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`) ✅ |
| TTL | uebergibt 15; seit #8 ist der Parameter serverseitig ohnehin wirkungslos ✅ doppelt abgesichert |
| Idempotenz | `requestId = crypto.randomUUID()` pro Aufruf. Der `(provider_id, request_id)`-Unique-Index aus #5 verhindert Doppel-Invites **innerhalb eines Retries derselben ID**; ein erneuter Klick erzeugt eine neue ID |
| Replay | serverseitig abgesichert: `create_invited_customer_with_contact` liefert `already_completed` statt eines zweiten Grants (in NACHTRAG 11 empirisch belegt) |

**Eine ehrliche Einschraenkung:** Weil `requestId` clientseitig je Aufruf neu erzeugt wird,
ist die Idempotenz auf den Serverpfad verlagert. Zwei schnelle Klicks erzeugen zwei Invites
auf dieselbe Adresse — der partielle Unique-Index auf `normalized_email` laesst nur einen
offenen zu, der zweite scheitert mit `Another invite for this email is already pending`.
Das ist korrekt, aber der Nutzer sieht dann eine 409-Meldung. Fuer den E2E-Test vormerken.

### Deployment-Plan (nicht ausgefuehrt)

```
EDGE_CURRENT_VERSION = 7
EDGE_TARGET_VERSION  = 8 (naechste Version nach Deploy)
EDGE_CURRENT_HASH    = bb7c2e4794972ca150333c96c9cb934e55a24880c0328d4ff629050a590a00c8 (Bundle)
EDGE_TARGET_SOURCE   = supabase/functions/invite-client-with-password/index.ts
                       sha256 c5abec5b611b9667… (18386 Bytes)

MECHANISMUS: supabase CLI 2.116.0 ist vorhanden
  supabase functions deploy invite-client-with-password --project-ref vnschgjxkzzwzefqlrji

VORBEDINGUNGEN (alle erfuellt):
  #5, Hardening, #6, #7, #8, #9 applied · Ghost-Review ohne P0 ·
  hm_pending_client_invites leer
NACHBEDINGUNG: E2E aus beiden Providersichten, danach invite-client-Gap schliessen
```

**NICHT DEPLOYT.** `EDGE_READY_TO_DEPLOY=YES` (technisch), aber siehe N13.4.

## N13.4 `invite-client` v8 bleibt Release-Blocker

```
INVITE_CLIENT_GAP_EXISTS=YES
CHAIN_5_TO_9_FIXES_THIS_GAP=NO
INVITE_CLIENT_GAP_BLOCKS_FEATURE_RELEASE=YES
```

`InviteClientButton.tsx:249` ruft weiterhin `invite-client` v8 — unveraendert deployt. Diese
Function legt **keinen** Pending Invite an: sie ruft `createUser`, wartet `setTimeout(600 ms)`
auf die Triggerkette und setzt erst danach `created_by_provider_id` plus einen eigenen Grant.

Konsequenz auch **nach** dem Deploy von `invite-client-with-password`: Fuer diesen Pfad greift
die Unterdrueckung aus #6 nie, weil kein Invite existiert. Der generische
„erster Provider"-Fallback bleibt dort aktiv. Zwei Einladepfade im selben Frontend verhalten
sich dann unterschiedlich — einer abgesichert, einer nicht.

**Das ist der letzte offene P0 der Invite-Freigabe und wird von #5–#9 nicht geschlossen.**

## N13.5 Ergebnis

```
MIG9_APPLIED=YES                 MIG9_APPLY_STATE=COMMITTED
MIG9_LEDGER_VERSION=20260920190000        LEDGER_DRIFT_CREATED=NO
MIG9_PROSRC_MD5=dbbfc981c9ef9e8f1aaa8ccb4adb849a
MIG9_MARKER_GUARD_PRESENT=YES
MIG9_EXISTING_DATA_MUTATED=NO
NEW_SECURITY_FINDINGS_FROM_MIG9=NONE

GHOST_TOTAL=39   GHOST_EXPOSED=25   GHOST_MARKERLESS=2   DUPLICATE_EMAIL_GROUPS=4
SAFE_SAME_PROVIDER=32  ALREADY_DELETED=4  MARKERLESS_LEGACY=2
AUTH_COLLISION=1       CROSS_PROVIDER_CONFLICT=0   ORPHAN=0
BLOCK_EDGE_DEPLOY_DUE_TO_GHOST_REVIEW=NO

EDGE_PREDEPLOY_AUDIT=PASS
EDGE_CURRENT_VERSION=7   EDGE_TARGET_VERSION=8   EDGE_READY_TO_DEPLOY=YES
RELATED_NEW_EDGE_FUNCTION_DEPLOYED=NO

INVITE_CLIENT_GAP_EXISTS=YES
INVITE_CLIENT_GAP_BLOCKS_FEATURE_RELEASE=YES
```

**STOPP.** Kein Edge-Deploy, keine Ghost-Daten veraendert, kein `invite-client`-Fix, keine
Billing-Implementierung, kein Push.
