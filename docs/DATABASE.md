# Hufi — Datenbank-Notizen (Vision-relevanter Ausschnitt)

Stand: 2026-08-06. **Kein vollständiger Schema-Dump.** Dieses Dokument
beschreibt ausschließlich die Tabellen, die für die Master-Prompt-Vision
(Mehrfachrollen, Pferde-Freigaben, Netzwerk) relevant sind, mit dem
Verifikationsgrad, den diese Analyse-Runde tatsächlich erreicht hat. Für
die vollständige Struktur: `supabase/migrations/` lesen oder
`supabase gen types` laufen lassen (siehe `docs/ROADMAP.md`, P2-Punkt
"Type-sichere DB-Calls").

**Produktionsprojekt:** `vnschgjxkzzwzefqlrji` (EU/Frankfurt) — echte
Kundendaten. Dieselbe Instanz wird auch von HufManager
(`/root/hufmanager_v25/production`) genutzt, siehe
`docs/architecture/HUFMANAGER_FORENSIC_FEATURE_INVENTORY.md`. Jede
Schema-Änderung wirkt sich auf beide Deployments gleichzeitig aus.

## Verifiziert in dieser Analyse-Runde

### `user_roles`
- Quelle: `supabase/migrations/20251203110750_*.sql:17–22`.
- Struktur: `user_id` + `role`, Constraint `UNIQUE(user_id, role)`.
- **Bereits strukturell mehrfachrollenfähig** (1:n user→role) — der
  einschränkende Faktor ist der Client-Code (`useAuth.tsx`), nicht die
  Tabelle. Siehe `docs/AUTHENTICATION.md`.

### `horses`
- `owner_id` ist `NOT NULL` — genau ein Eigentümer pro Pferd im Kerndatensatz.
- Kein Hinweis in dieser Analyse-Runde auf ein Multi-Owner-Feld direkt in
  dieser Tabelle — geteilte Verantwortung läuft über separate
  Access-Tabellen (siehe unten), nicht über `horses` selbst.

### `horse_partner_access`
- Quelle: `supabase/migrations/20260219144114_*.sql:20–40`.
- Spalten (verifiziert): `can_view_basic`, `can_view_hoof_history`,
  `can_view_medical`, `can_add_treatment_notes`, `can_create_appointments`
  (boolesche Freigaben), Status (`pending`/`active`), Invite-Token,
  Revocation-Feld.
- Begleitend: `horse_audit_log` protokolliert Zugriffe/Änderungen separat.
- Das ist die granularste, am weitesten entwickelte Freigabe-Tabelle im
  System — gutes Vorbild für jede Erweiterung.

## Genannt, aber in dieser Runde NICHT im Detail re-verifiziert

Diese drei Tabellen werden in `docs/HUFI_CORE_TARGET_ARCHITECTURE.md`
Abschnitt 1 als Teil desselben Zersplitterungsproblems benannt. Bevor
darauf aufgebaut wird: Migrationsdateien selbst lesen, nicht diesem
Dokument blind vertrauen.

- **`stall_horse_access`** — Stallbetreiber-Zugriff auf Pferde. Zugehörige
  UI-Komponente vermutlich `src/components/client/StallDataSharing.tsx`
  (Name deutet darauf hin, nicht Zeile-für-Zeile gegen die Migration
  geprüft in dieser Runde).
- **`employee_horse_access`** — Mitarbeiterzugriff (Provider-intern).
  Zugehörige UI-Komponente: `src/components/team/EmployeeHorseAccess.tsx`.
- **`access_grants`** — generischere, vierte Access-Tabelle laut
  `HUFI_CORE_TARGET_ARCHITECTURE.md`, Zweck/Struktur nicht re-verifiziert.

## Zielbild (aus `HUFI_CORE_TARGET_ARCHITECTURE.md`, vom Master-Prompt bestätigt)

Konsolidierung der vier Access-Tabellen zu einer kanonischen
`horse_caregivers`-Sicht (Name aus dem bestehenden Zieldokument
übernommen, nicht neu erfunden). **Das ist die einzige Komponente in der
gesamten Master-Prompt-Vision, die eine echte Schema-Migration auf der
Produktionsdatenbank mit echten Kundendaten bedeutet** — siehe
Risikotabelle in `docs/architecture/HUFI_PLATFORM_VISION_GAP_ANALYSIS.md`.

## Regeln für den Umgang mit diesem Dokument

- Keine Migration ohne ausdrückliche Freigabe (Standing-Regel dieses
  Projekts, siehe `docs/ROADMAP.md` "Nicht jetzt": *"Keine
  Supabase-Schema-Migrations ohne explizite Freigabe."*).
- Vor jeder Aussage über eine Tabelle, die hier als "nicht re-verifiziert"
  markiert ist: die zugehörige Migrationsdatei tatsächlich lesen.
- Keine personenbezogenen Datensätze in dieses Dokument aufnehmen — nur
  Strukturbeschreibungen.
