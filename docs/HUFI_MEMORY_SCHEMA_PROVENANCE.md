# Hufi Memory Schema Provenance

> Read-only Schema-Provenance für `public.hufi_memory` und
> `public.hufi_memories`. Stand 2026-05-09, HEAD `aca1b59b`.
>
> **Status: LIVE VERIFIZIERT.** Schema wurde via `supabase db dump`
> aus dem gelinkten Cloud-Projekt `vnschgjxkzzwzefqlrji`
> (HufManager, Region Central EU Frankfurt) read-only ausgelesen,
> Dump in `/tmp/hufi_full_schema.sql` (24144 Zeilen, lokal, nicht
> committed). Keine Schema-Änderung, keine Migration, kein Daten-
> Eingriff.
>
> Vorgänger-Stand (Pascal-Zugriff blockiert) bleibt nur in Git-
> Historie. Diese Datei ist überarbeitet.

---

## Purpose

Vor jedem Memory-Refactor (siehe
`docs/HUFI_CORE_TARGET_ARCHITECTURE.md` §10 P0.1) muss das Schema
der zwei Memory-Tabellen im Repo versioniert sein. Mit diesem Dump
ist die Wahrheit fixiert; eine reine `CREATE TABLE IF NOT EXISTS`-
Provenance-Migration kann jetzt formuliert werden, ist aber **noch
nicht** Aufgabe dieser Datei.

---

## Live schema: `public.hufi_memory`

### Columns

| # | Spalte | Typ | NULL? | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **NULLABLE** | – |
| 3 | `category` | `text` | NOT NULL | – |
| 4 | `key` | `text` | NOT NULL | – |
| 5 | `value` | `jsonb` | NULLABLE | – |
| 6 | `confidence` | `double precision` | NULLABLE | `0.5` |
| 7 | `source` | `text` | NULLABLE | `'system'::text` |
| 8 | `last_updated` | `timestamp with time zone` | NULLABLE | `now()` |
| 9 | `expires_at` | `timestamp with time zone` | NULLABLE | – |

### Constraints

- **Primary Key:** `hufi_memory_pkey` on `(id)`
- **Unique:** `hufi_memory_user_id_category_key_key` on
  `(user_id, category, key)`
- **Foreign Keys:** keine

### Indexes

Nur die durch PK und UNIQUE implizierten. Keine zusätzlichen
`CREATE INDEX`-Statements.

### Owner / Grants

- Owner: `postgres`
- `GRANT ALL ON TABLE "public"."hufi_memory" TO "anon"`
- `GRANT ALL ON TABLE "public"."hufi_memory" TO "authenticated"`
- `GRANT ALL ON TABLE "public"."hufi_memory" TO "service_role"`

(Supabase-Standard. Wirkungs-Filter ist RLS, siehe unten.)

### RLS

- **Enabled:** ja (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` auf
  Zeile 20537 des Dumps).
- **Policy** (1 Stück, `FOR ALL`-Operationen):
  ```
  CREATE POLICY "hufi_memory_owner" ON "public"."hufi_memory"
    USING (auth.uid() = user_id);
  ```

### Triggers

Keine.

### Beobachtung

`user_id` ist **nullable** in `hufi_memory`. Die Policy prüft
`auth.uid() = user_id` — bei `NULL`-user_id-Records ergibt das
`NULL` (nicht `TRUE`), Records mit `user_id IS NULL` sind also
**über die Standard-Policy nicht aus dem Frontend erreichbar**.
Sie können aber über `service_role` (Edge Functions) gelesen oder
geschrieben werden. Das wirkt wie ein bewusstes Pattern für
**system-level memory** (nicht user-gebunden). Sollte beim
Refactor erhalten bleiben, falls Hufi-Brain das nutzt
[? Pascal-Bestätigung].

---

## Live schema: `public.hufi_memories`

### Columns

| # | Spalte | Typ | NULL? | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | NOT NULL | – |
| 3 | `horse_id` | `uuid` | NULLABLE | – |
| 4 | `memory_type` | `text` | NOT NULL | – |
| 5 | `content` | `text` | NOT NULL | `''::text` |
| 6 | `last_updated_by` | `text` | NULLABLE | `'hufi_brain'::text` |
| 7 | `version` | `integer` | NULLABLE | `1` |
| 8 | `exportable` | `boolean` | NULLABLE | `true` |
| 9 | `visible_to_owner` | `boolean` | NULLABLE | `true` |
| 10 | `created_at` | `timestamp with time zone` | NULLABLE | `now()` |
| 11 | `updated_at` | `timestamp with time zone` | NULLABLE | `now()` |

### Constraints

- **Primary Key:** `hufi_memories_pkey` on `(id)`
- **Unique (partial):**
  - `hufi_memories_user_type_horse_uq`: UNIQUE on
    `(user_id, memory_type, horse_id)` **WHERE `horse_id IS NOT NULL`**
  - `hufi_memories_user_type_uq`: UNIQUE on
    `(user_id, memory_type)` **WHERE `horse_id IS NULL`**
- **Foreign Keys:** keine

### Indexes

- `idx_hufi_memories_horse` btree on `(horse_id)`
- `idx_hufi_memories_user` btree on `(user_id)`
- plus die durch PK und die zwei partiellen Unique-Indexes
  implizierten

### Owner / Grants

- Owner: `postgres`
- `GRANT ALL ON TABLE "public"."hufi_memories" TO "anon"`
- `GRANT ALL ON TABLE "public"."hufi_memories" TO "authenticated"`
- `GRANT ALL ON TABLE "public"."hufi_memories" TO "service_role"`

### RLS

- **Enabled:** ja (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` auf
  Zeile 20518 des Dumps).
- **Policies** (4 Stück, je eine pro Operation):
  ```
  CREATE POLICY "hufi_memories_select_own" ON "public"."hufi_memories"
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "hufi_memories_insert_own" ON "public"."hufi_memories"
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "hufi_memories_update_own" ON "public"."hufi_memories"
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "hufi_memories_delete_own" ON "public"."hufi_memories"
    FOR DELETE USING (auth.uid() = user_id);
  ```

### Triggers

Keine.

### Beobachtungen

- `user_id` ist `NOT NULL` — anders als bei `hufi_memory`. Memories
  sind also immer einer Person zugeordnet.
- Die zwei **partiellen Unique-Indexes** sind clever: ein User
  kann pro `memory_type` ohne `horse_id` *einen* Eintrag haben
  (allgemeine Notizen), und pro `(memory_type, horse_id)`-Tupel
  *einen* Eintrag (pferd-spezifische Markdown-Akte). Das deckt
  exakt das Code-Pattern `.upsert(..., { onConflict:
  "user_id,memory_type,horse_id" })` aus `src/lib/hufi-memory.ts`.
- `visible_to_owner` und `exportable` sind im Schema vorhanden,
  werden aber im aktuellen Code von `hufi-memory.ts` **nicht
  gesetzt** (Code schreibt nur `content` und `last_updated_by`).
  Defaults greifen also (`true`/`true`). Hint auf zukünftige
  Multi-Akteur-Logik [?].
- `version`-Spalte wird im Code nicht inkrementiert — Default
  bleibt `1`. Vermutlich für künftige Versionierung vorgesehen [?].
- `last_updated_by` Default `'hufi_brain'` — Hufi schreibt sich
  selbst als Quelle.

### Wichtig für RLS

**`hufi_memories` hat keine Policy für service_role-Bypass-
ähnliches Cross-User-Lesen** — und auch keine Pferd-zentrierte
Logik. Wenn Provider X Memory zu einem Pferd anlegt, das Owner Y
gehört, dann hat Owner Y über die Standard-Policies **keinen
Lese-Zugriff** auf Provider X' Memories über sein eigenes Pferd.
Das ist die Wurzel des "user-zentrierten Memory"-Befunds aus den
Audits — datenmodell-seitig bestätigt.

---

## Repo references (zur Bestätigung)

### `hufi_memory` — Code-Konsumenten

- `src/lib/hufi-brain.ts`: Interface `HufiMemory` mit allen 9
  Live-Spalten, Funktionen `fetchHufiContext`, `updateHufiMemory`,
  `learnFromInteraction`, `checkProactiveAlerts`.
- `src/components/layout/MobileShell.tsx`: indirekt über
  `hufi-brain`-Funktionen.
- Code-Pattern: Zugriff via `as any`-Cast (TypeScript-Types fehlen).

### `hufi_memories` — Code-Konsumenten

- `src/lib/hufi-memory.ts`: 5× `.from("hufi_memories" as any)`,
  Funktionen `getMemory`, `updateMemory`, `getMemoryContext`,
  `exportAllMemories`, `transferHorseMemory`,
  `initializeMemoriesForUser`.
- Code-Pattern: gleiche `as any`-Cast-Struktur.

### Repo-Migrations für die Tabellen

- **Keine** `CREATE TABLE.*hufi_memor*` in den 389 Migrationen.
- **Keine** `CREATE POLICY.*hufi_memor*`.
- **Keine** `CREATE INDEX.*hufi_memor*`.
- **Keine** TypeScript-Types in `src/integrations/supabase/`.

Alles, was im Live-Schema existiert, wurde **direkt im Supabase-
Dashboard** angelegt — vermutlich von Lovable AI-generiert oder
durch frühere Pascal-Sessions im Dashboard-SQL-Editor [?].

---

## Gaps zum Repo

Maximal:

| Aspekt | Repo | Live |
|---|---|---|
| `CREATE TABLE hufi_memory` | – | vorhanden, 9 Spalten |
| `CREATE TABLE hufi_memories` | – | vorhanden, 11 Spalten |
| RLS-Policies | – | 5 Policies (1 + 4) |
| Indexes | – | 4 Indexes (2 partial unique + 2 btree) |
| Constraints (PK + UNIQUE) | – | 3 Constraints |
| Grants | – | 6 Grants (3 pro Tabelle) |
| Triggers | – | keine (konsistent zu Repo) |
| Foreign Keys | – | keine (konsistent zu Repo) |
| TypeScript-Types | – | implizit, aber `as any`-Cast |

**Effekt:** ein Branch-Restore oder Schema-Wipe würde beide
Tabellen mit allen Policies und Indexes verlieren, ohne dass der
Repo das ersetzen könnte.

---

## Risk

**MEDIUM bleibt** — funktional läuft das System, aber Schema-Drift
ist jederzeit möglich, weil im Repo nichts versioniert ist. Die
Provenance-Migration löst das, ist aber **noch nicht erstellt**.

Zusätzliche Beobachtungs-Risiken aus dem Live-Schema:

1. `hufi_memory.user_id NULLABLE` ist ein bewusstes oder
   unbewusstes Pattern [?]. Wenn unbewusst, sollte `NOT NULL`
   gesetzt werden — sonst können System-Records dauerhaft niemand
   gehören. Wenn bewusst (system-level memory), sollte das
   dokumentiert sein.
2. `hufi_memories.visible_to_owner` und `exportable` haben
   Defaults, werden aber nicht aktiv gesetzt — ein zukünftiger
   Refactor sollte die Logik dafür einbauen oder die Spalten
   entfernen.
3. `hufi_memories.version` wird nie inkrementiert — entweder Logik
   einbauen oder Spalte entfernen.

---

## Recommendation

### Empfohlen jetzt (separater Schritt, nicht in dieser Datei)

**Idempotente Provenance-Migration** in `supabase/migrations/`
anlegen, die das Live-Schema 1:1 versioniert:

- `CREATE TABLE IF NOT EXISTS public.hufi_memory (...)`
- `CREATE TABLE IF NOT EXISTS public.hufi_memories (...)`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (idempotent in
  Postgres seit 9.5).
- `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` für die 5
  Policies.
- `CREATE UNIQUE INDEX IF NOT EXISTS ...` für die 2 partial
  Unique-Indexes.
- `CREATE INDEX IF NOT EXISTS ...` für die 2 btree-Indexes.
- `GRANT ALL ON TABLE ... TO ...` (idempotent).

**Sicher, weil:**
- Alle Statements `IF NOT EXISTS` oder `IF EXISTS`-vorbereitet.
- Keine `DROP TABLE`, keine `ALTER COLUMN`, keine `TRUNCATE`.
- Keine Daten betroffen.
- Bei lokaler Anwendung auf der Live-DB: NO-OP (alles existiert
  schon).
- Bei Branch-Restore: stellt das Schema wieder her.

### Nicht jetzt

- Memory-Konsolidierung (`horse_memory`/`user_memory`/
  `relation_memory`-Aufspaltung) bleibt P1.12 in der Architektur-
  Datei.
- `user_id NULLABLE`-Klärung muss Pascal entscheiden.
- TypeScript-Types-Generation (`supabase gen types`) ist eigener
  Schritt, separat.

---

## Snapshot-Verifikation

| Quelle | Wert |
|---|---|
| Dump-Datei | `/tmp/hufi_full_schema.sql` (lokal, nicht committed) |
| Dump-Größe | 24144 Zeilen |
| `hufi_memory` Mentions | 13 |
| `hufi_memories` Mentions | 20 |
| Policies (live) | 5 (1 für `hufi_memory`, 4 für `hufi_memories`) |
| Indexes (live) | 4 (2 partial unique + 2 btree, alle auf `hufi_memories`) |
| Triggers (live) | 0 |
| Grants (live) | 6 (3 pro Tabelle: anon, authenticated, service_role) |

Der Dump ist lokal in `/tmp/`, **nicht im Repo**. Sobald die
Provenance-Migration formuliert ist, kann der Dump gelöscht
werden — die Migration übernimmt die Versionierung.
