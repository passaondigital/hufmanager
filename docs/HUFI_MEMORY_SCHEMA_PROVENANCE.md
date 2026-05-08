# Hufi Memory Schema Provenance

> Read-only Schema-Provenance-Erfassung für `public.hufi_memory` und
> `public.hufi_memories`. Stand 2026-05-08, HEAD `99166f59`.
>
> **Status: TEILWEISE VERIFIZIERT.** Repo-Lage ist vollständig erfasst.
> Live-Schema **konnte nicht verifiziert werden**, weil die Supabase
> CLI auf dem VPS nicht authentifiziert ist und kein Service-Role-
> oder Access-Token bereitsteht. Dieser Report dokumentiert genau, was
> heute belegbar ist und welchen Eingriff Pascal liefern muss, damit
> die Provenance abgeschlossen werden kann.

---

## Purpose

Vor jedem Memory-Refactor (siehe
`docs/HUFI_CORE_TARGET_ARCHITECTURE.md` §10 P0.1) muss das Schema der
zwei Memory-Tabellen im Repo versioniert sein. Heute existiert das
Schema nur live in Supabase, nicht in einer `CREATE TABLE`-Migration.
Solange das so ist, ist jeder Refactor Spekulation und kann Daten
verlieren.

---

## Repo references

### `hufi_memory` (singular, kategorisiert key/value)

- **Genutzt in:**
  - `src/lib/hufi-brain.ts` — Interface `HufiMemory`
    (`{ id, user_id, category, key, value, confidence, source,
    last_updated, expires_at }`), Funktionen `fetchHufiContext`,
    `updateHufiMemory`, `learnFromInteraction`,
    `checkProactiveAlerts`.
  - `src/components/layout/MobileShell.tsx` — Konsument von
    `hufi-brain`-Funktionen.
- **Referenzen in `supabase/functions/`:** keine.
- **Referenzen in TypeScript-Types** (`src/integrations/supabase/`):
  keine.
- **Code-Pattern:** Zugriff vermutlich mit `as any`-Cast (in
  `hufi-brain.ts` zu prüfen).

### `hufi_memories` (plural, Markdown-Archiv)

- **Genutzt in:**
  - `src/lib/hufi-memory.ts` — Type `MemoryType`
    (`pferdeakte | pferdebusiness | pferdemensch | hufi_notizen`),
    Funktionen `getMemory`, `updateMemory`, `getMemoryContext`,
    `exportAllMemories`, `transferHorseMemory`,
    `initializeMemoriesForUser`. **Fünf Stellen** mit
    `.from("hufi_memories" as any)`.
- **Referenzen in `supabase/functions/`:** keine.
- **Referenzen in TypeScript-Types** (`src/integrations/supabase/`):
  keine.
- **Schreib-Pattern:** `.upsert(record, { onConflict:
  "user_id,memory_type,horse_id" })` — impliziert ein
  Composite-Unique-Constraint auf diesen drei Spalten.

### CREATE TABLE in Migrationen

- **`hufi_memory`:** keine `CREATE TABLE`-Migration gefunden
  (`grep -ril hufi_memor supabase/migrations` → leer).
- **`hufi_memories`:** keine `CREATE TABLE`-Migration gefunden.

### RLS Policies

- Keine `CREATE POLICY`-Statements für `hufi_memor*` in den 389
  Migrationen gefunden. Wenn RLS heute live aktiv ist, ist sie
  **nicht im Repo versioniert**.

### Indexes

- Keine `CREATE INDEX`-Statements für `hufi_memor*` in Migrationen
  gefunden.

### Code-Pattern-Hinweise auf Schema

Aus den `as any`-Zugriffen in `src/lib/hufi-memory.ts` und den
TypeScript-Interface-Definitionen in `src/lib/hufi-brain.ts` lassen
sich plausible Spalten ableiten — aber das ist **keine Provenance**,
sondern Code-Annahme:

| Tabelle | Vermutete Spalten (aus Code-Inferenz) |
|---|---|
| `hufi_memory` | `id`, `user_id`, `category`, `key`, `value` (jsonb?), `confidence` (numeric), `source`, `last_updated`, `expires_at` |
| `hufi_memories` | `user_id`, `memory_type`, `content` (text/markdown), `horse_id` (nullable), `last_updated_by`, `updated_at` plus Unique `(user_id, memory_type, horse_id)` |

**Diese Inferenz ist nicht authoritative.** Echte Datentypen,
Defaults, Foreign Keys, RLS, Triggers, Grants müssen aus der
Live-DB ausgelesen werden.

---

## Live schema: hufi_memory

**Nicht verifiziert.**

Grund: Supabase CLI (`supabase --version` → 2.90.0) ist auf dem VPS
**nicht authentifiziert**:

- `supabase projects list` antwortet:
  *"Access token not provided. Supply an access token by running
  supabase login or setting the SUPABASE_ACCESS_TOKEN environment
  variable."*
- `SUPABASE_ACCESS_TOKEN` env-Variable ist nicht gesetzt.
- Verzeichnis `supabase/.temp/` enthält keine `project-ref`-Datei
  → Projekt ist via CLI **nicht gelinked**.

`psql` (16.13) und `pg_dump` (16.13) sind installiert — können das
Schema lesen, brauchen aber den vollständigen DB-Connection-String
inkl. Credentials. Dieser ist **nicht im Repo** und Pascals Regel
verbietet das Drucken von DB-Connection-Strings, Passwörtern,
Service-Role-Keys.

---

## Live schema: hufi_memories

**Nicht verifiziert.** Gleiche Begründung wie oben.

---

## Policies / RLS

**Nicht verifiziert.**

Plausible Erwartung (basierend auf anderen Hufi-Tabellen-Patterns):

- `hufi_memory` sollte mindestens eine RLS-Policy
  `auth.uid() = user_id` haben — wenn nicht, wäre die Tabelle für
  alle authentifizierten User offen. Dringend zu prüfen.
- `hufi_memories` sollte ähnlich haben, plus eine Logik für
  `horse_id`-basierten Zugriff (Provider darf Memory zu seinen
  Horses sehen).

**Diese Erwartung ist Hypothese, nicht Fakt.** Live-Audit nötig.

---

## Indexes / triggers / grants

**Nicht verifiziert.**

Vermutung aus Code-Pattern:

- `hufi_memories` hat einen Composite-Unique-Index auf
  `(user_id, memory_type, horse_id)` — sonst würde das `onConflict`-
  Pattern in `hufi-memory.ts:97` nicht funktionieren.
- Indexes auf `user_id` und ggf. `horse_id` plausibel (Performance).
- Keine Trigger-Vermutung — heute nicht erkennbar.

---

## Gaps between repo and live schema

Die Diskrepanz ist **maximal**: das Repo enthält keinerlei
Schema-Definition, die Live-DB enthält das Schema vollständig
(belegbar dadurch, dass das Frontend produktiv mit den Tabellen
arbeitet).

Konkrete Drift-Risiken:

1. **Spalten-Umbenennung im Dashboard** würde den Code stillschweigend
   brechen — `as any`-Cast lässt jeden Zugriff durch.
2. **RLS-Drift im Dashboard** könnte unbemerkt Daten freigeben oder
   blockieren.
3. **Schema-Verlust bei Supabase-Migration** (z. B. Branch-Restore,
   Projekt-Wechsel) würde die Tabellen löschen, weil sie nirgends
   versioniert sind.
4. **Audit-Lücke:** wer hat wann welche Spalte hinzugefügt? Heute
   nirgends nachvollziehbar.
5. **Unterschiedliche Schemas in Dev/Staging/Prod** möglich, wenn die
   Tabellen in Dashboard angelegt wurden statt per Migration.

---

## Risk assessment

**MEDIUM** (unverändert seit `HUFI_VERIFICATION_AUDIT.md` §2).

- Funktional läuft das System heute stabil — der Code arbeitet, die
  Daten sind da.
- Ohne Schema-Versionierung im Repo ist aber jeder zukünftige Refactor
  ein Schritt auf nicht kartiertem Boden.
- Ein einziger Schema-Drift im Dashboard kann das Memory-System
  unbemerkt brechen.

---

## Recommendation

**Stop and request access** — dieser Report bleibt unvollständig, bis
Pascal die Live-Schema-Erfassung freigibt.

### Empfohlener Pfad (Pascal entscheidet)

#### Option A — Supabase Dashboard manuell

Pascal öffnet das Supabase Dashboard für Projekt
`vnschgjxkzzwzefqlrji`:

1. Database → Tables → `hufi_memory` → Schema-Tab → Spalten-Liste,
   Defaults, Constraints kopieren.
2. Authentication → Policies → für `hufi_memory` alle Policies
   notieren.
3. Database → Indexes → für `hufi_memory` alle Indexes notieren.
4. Database → Triggers → falls vorhanden notieren.
5. Wiederholen für `hufi_memories`.
6. Output an mich (Markdown oder Screenshot, kein Secret).

Vorteil: kein Credential-Eingriff, Pascal hat volle Kontrolle.

#### Option B — Supabase CLI authentifizieren

Pascal:

1. `supabase login` (öffnet Browser, generiert lokalen Access-Token).
2. `cd /hufiapp && supabase link --project-ref vnschgjxkzzwzefqlrji`
3. Danach kann ich read-only Schema-Pull machen:
   - `supabase db dump --schema public --table hufi_memory
     --table hufi_memories -f /tmp/hufi_memory_schema.sql`
   (Datei lokal, kein Push, kein Apply)

Vorteil: maschinenlesbares Output, exakt verifizierbar.
Nachteil: Pascal muss CLI authentifizieren.

#### Option C — direkter `psql` mit Service-Role-Connection-String

Pascal kann mir einen sicher beschränkten DB-Read-User-
Connection-String geben (NICHT Service-Role). Ich:

1. Connection-String wird in Bash-Variable gesetzt, **nicht
   gedruckt**.
2. `psql "$DB_URL" -c "\d public.hufi_memory" > /tmp/schema.txt`
3. `psql "$DB_URL" -c "\d public.hufi_memories" >> /tmp/schema.txt`
4. Output ist Schema-Beschreibung ohne Daten.

Vorteil: schnell.
Nachteil: höchstes Secret-Risiko. Bevorzugt nicht.

### Empfehlung

**Option A oder B.** Option B ist maschinenlesbarer und ist deshalb
für die anschließende `CREATE TABLE IF NOT EXISTS`-Migration
präziser — aber nur, wenn Pascal mit CLI-Authentifizierung okay ist.

### Wenn Schema endlich erfasst ist

1. Migration `supabase/migrations/<timestamp>_hufi_memory_provenance.sql`
   anlegen mit `CREATE TABLE IF NOT EXISTS public.hufi_memory (...)`
   und gleicher für `hufi_memories`.
2. RLS-Policies als `CREATE POLICY IF NOT EXISTS` (oder mit
   `DROP IF EXISTS` davor).
3. Indexes als `CREATE INDEX IF NOT EXISTS`.
4. **Idempotent.** Lokal applizieren würde nichts ändern (Tabellen
   existieren ja).
5. Commit + Push als reine Provenance-Snapshot, kein Daten-Eingriff.

### Nicht jetzt

- **Keine Schema-Änderung** an den live-Tabellen.
- **Keine Daten-Migration** zwischen `hufi_memory` und `hufi_memories`
  (das ist P1.12 in der Architektur-Datei, lange nach P0.1).
- **Keine Konsolidierung** auf eine zentrale `horse_memory`-Tabelle —
  das ist P1.12, nicht P0.1.

---

## Next action

**Pascal, bitte wähle:**

- **A:** "Ich exportiere das Schema aus dem Dashboard und pastete es
  hier rein."
- **B:** "Ich melde mich mit `supabase login` an und linke das Projekt;
  dann mach den Schema-Pull."
- **C:** "Ich liefere einen DB-Read-User-Connection-String über
  einen sicheren Kanal."

Bis dahin ist P0.1 **blockiert by access**, nicht by uncertainty.
