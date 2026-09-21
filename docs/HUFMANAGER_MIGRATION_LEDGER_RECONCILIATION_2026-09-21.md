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
