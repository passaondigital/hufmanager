# Hufi — Netzwerk- und Freigabe-Architektur

Stand: 2026-08-06. Ist-Stand (verifiziert) + Zielbild aus Pascals
Master-Prompt. Kein Code in dieser Einheit geändert, keine Migration
ausgeführt.

## Grundidee (Master-Prompt, deckt sich mit bestehender Zielarchitektur)

Hufi ist kein Einzelplatzsystem. Mehrere Menschen arbeiten am selben Pferd:
Besitzer, Hufbearbeiter, Tierarzt, Physiotherapeut, Osteopath,
Stallbetreiber, Trainer. Der Besitzer entscheidet granular, wer was sehen
oder bearbeiten darf. `docs/HUFI_CORE_TARGET_ARCHITECTURE.md` Abschnitt 1
beschreibt dasselbe Prinzip bereits als "horse-centric, multi-actor" —
dieses Dokument hier beschreibt die konkrete Datenbank- und
Einladungs-Realität dahinter.

## Ist-Stand: Freigaben (verifiziert)

Vier parallele, **nicht konsolidierte** Zugriffsmechanismen existieren
heute nebeneinander:

| Tabelle/Mechanismus | Zweck | Granularität |
|---|---|---|
| `horses.owner_id` (`NOT NULL`) | Kern-Eigentümerschaft | grob — genau ein Owner |
| `horse_partner_access` | Externe Fachleute am Pferd | **granular**: `can_view_basic`, `can_view_hoof_history`, `can_view_medical`, `can_add_treatment_notes`, `can_create_appointments`; Status `pending`/`active`, Invite-Token, Revocation, eigenes `horse_audit_log` (`supabase/migrations/20260219144114_*.sql:20–40`) |
| `stall_horse_access` | Stallbetreiber-Zugriff | laut `HUFI_CORE_TARGET_ARCHITECTURE.md` genannt, nicht im Detail re-verifiziert in dieser Runde |
| `employee_horse_access` | Mitarbeiterzugriff (Provider-intern) | laut `HUFI_CORE_TARGET_ARCHITECTURE.md` genannt, siehe auch `src/components/team/EmployeeHorseAccess.tsx` |
| `access_grants` | genannt in `HUFI_CORE_TARGET_ARCHITECTURE.md` als vierte, generischere Tabelle | nicht im Detail re-verifiziert in dieser Runde |

**`HUFI_CORE_TARGET_ARCHITECTURE.md` benennt bereits das Zielbild:** diese
vier zu einer konsolidierten `horse_caregivers`-Sicht zusammenführen. Das
ist dokumentiert, aber nicht umgesetzt — die eigentliche technische
Vision-Lücke, nicht "Freigabesystem fehlt".

## Ist-Stand: Einladungswege (verifiziert)

Mindestens vier unterschiedliche, rollengebundene Wege parallel:

1. `EmployeeInvite` — Route `/employee-invite`
2. `PartnerInvite` — Route `/partner-einladung/:token`
3. `ConnectForm` — Route `/connect/:slug`
4. `invite_token`-Feld direkt in `horse_partner_access` (eigener,
   pferdespezifischer Einladungsweg)

Jeder Weg hat eigene UI, eigene Statuslogik, eigenen Tokenmechanismus.
Keiner davon deckt alle im Master-Prompt genannten Kanäle (QR-Code,
Link, E-Mail, Telefonnummer, Freigabecode) einheitlich ab.

## Zielbild (Master-Prompt)

- Ein Einladungsweg statt vier, wählbar über QR-Code, Link, E-Mail,
  Telefonnummer oder Freigabecode — "ein Klick, verbunden".
- Verbindungstypen zwischen beliebigen Rollen: Hufbearbeiter↔Besitzer,
  Tierarzt↔Besitzer, Trainer↔Stall, Therapeut↔Besitzer, Stall↔Tierarzt,
  Trainer↔Hufbearbeiter usw. — nicht nur die heute hart kodierten
  Rollenpaare pro Einladungsformular.
- Granulare Berechtigungen (lesen/bearbeiten/Fotos/Dokumente/
  Hufprotokolle/Termine/Rechnungen/Gesundheitsdaten) — **existiert bereits
  in `horse_partner_access`**, muss nicht neu erfunden werden, aber auf
  alle Verbindungstypen ausgedehnt werden (heute nur für
  Partner-Fachleute, nicht z. B. für Stallbetreiber↔Tierarzt).

## Weg vom Ist- zum Zielbild — worauf zu achten ist

- **Konsolidierung der vier Tabellen ist die einzige echte
  Schema-Migration** in diesem gesamten Vision-Paket. Betrifft bestehende,
  produktiv genutzte Freigaben und Kundendaten — **erfordert einen eigenen,
  vorsichtigen Migrationsplan mit Rückwärtskompatibilität und
  ausdrücklicher Freigabe**, nicht Teil dieser Analyse-Runde.
- **Ein einheitlicher Einladungsweg** kann inkrementell auf den
  bestehenden Tabellen aufgebaut werden (gemeinsame UI-Komponente, die je
  nach Zielrolle die passende Tabelle bedient) — geringeres Risiko als die
  Tabellenkonsolidierung, aber weiterhin mehrere Dateien betroffen
  (`EmployeeInvite`, `PartnerInvite`, `ConnectForm`), daher Plan vor
  Umsetzung zeigen (CLAUDE.md-Regel: > 3 Dateien → erst Plan).
- **Audit-Log-Pattern aus `horse_partner_access` (`horse_audit_log`)**
  sollte als Vorbild für jede Erweiterung dienen, nicht neu erfunden
  werden — granulare Freigaben ohne Nachvollziehbarkeit wären ein
  Datenschutz-Rückschritt.

## Nicht in dieser Einheit umgesetzt

Kein Code für dieses Kapitel wurde geändert, keine Migration ausgeführt,
keine Tabellen konsolidiert.
