# Master-Prompt-Vision vs. Ist-Zustand — Gap-Analyse

Stand: 2026-08-06. Grundlage: Pascals "HUFI – MASTER PROMPT" (Single-Login,
Workspaces statt Rollenoberfläche, Mehrfachrollen, Pferd als eigenständiges
Objekt mit granularen Freigaben, Netzwerk/Einladungssystem, proaktive KI,
Apple/Google/Notion/Linear/Stripe-Designniveau) plus ein read-only Audit
gegen den echten Code auf `feature/hufi-assistant-experience-preview`.

**Kernaussage vorab:** Der Master-Prompt beschreibt größtenteils eine
Zielarchitektur, die intern bereits einmal durchdacht (`docs/HUFI_CORE_TARGET_ARCHITECTURE.md`,
Stand 2026-05-11) und teilweise im Datenbankschema bereits angelegt wurde
(`horse_partner_access`, `user_roles`-Tabelle). Die Lücke liegt überwiegend
nicht in der Idee, sondern darin, dass Login-UI, Client-Code und
Dokumentation dieser bereits angelegten Zielarchitektur noch nicht
konsequent folgen — plus vier parallele, nicht konsolidierte
Freigabe-Tabellen. Das ändert die Risikoeinschätzung erheblich: einiges ist
kein Neubau, sondern "vorhandenes Fundament nutzen statt es zu ignorieren".

---

## 1. Login/Registrierung

| Master-Prompt | Ist-Zustand | Beleg |
|---|---|---|
| Ein Login (E-Mail/Passwort, später Apple/Google), keine Rollenwahl | `src/pages/Auth.tsx` (915 Zeilen) hat heute eine **explizite, sichtbare Rollenauswahl** (`RoleOption = "provider"\|"client"\|"partner"`, Toggle-UI) | `Auth.tsx` Z.111, Z.498–505 |
| Apple/Google-Login (perspektivisch) | Nicht vorhanden, kein `signInWithOAuth` im Code | `Auth.tsx` vollständig durchsucht |
| "Öffnet automatisch den zuletzt verwendeten Workspace" | Statisches `role → path`-Mapping, kein "zuletzt verwendet"-Konzept | `src/lib/portal-user-detect.ts:22–39` |

**Einschätzung:** Direkter Widerspruch zum heutigen UI-Zustand — hier ist
wirklich eine Neugestaltung nötig, kein reines Aufräumen. Betrifft aber nur
Frontend/Auth-Flow, **keine** Schema-Änderung.

## 2. Rollenmodell: `role` vs. `roles[]`

Wichtigster Einzelfund der Analyse: **Das Schema ist bereits mehrfachrollenfähig,
der Client-Code erzwingt künstlich eine einzelne Rolle.**

- `user_roles`-Tabelle existiert bereits als `user_id + role` mit
  `UNIQUE(user_id, role)` — strukturell schon eine 1:n-Beziehung
  (`supabase/migrations/20251203110750_*.sql:17–22`).
- `useAuth.tsx` liest daraus aber über `fetchUserRole()` nur einen
  einzelnen Wert (`.maybeSingle()`, `useAuth.tsx:38–52`) in ein
  Single-Value-Enum `UserRole`.

**Einschätzung:** Das ist **kein Datenbank-Migrationsproblem**. Die Tabelle
unterstützt bereits, was der Master-Prompt fordert. Es ist ein
Frontend-/Hook-Refactor (`useAuth`, `ProtectedRoute`, jede Stelle, die
`role === "..."` statt `roles.includes("...")` prüft) — deutlich risikoärmer
als ursprünglich angenommen, aber mit großer Blast-Radius im Frontend (jede
`allowedRoles`-Prüfung im gesamten Routing betroffen, siehe
`HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md` für die vollständige
Routenliste).

## 3. Pferde als eigenständiges Objekt mit granularen Freigaben

- `horses.owner_id` ist weiterhin `NOT NULL` (Single-Owner-Modell im
  Kern-Datensatz) — der Master-Prompt-Satz "Ein Pferd gehört technisch
  nicht einem Benutzer" ist **heute nicht zutreffend** für die Kerntabelle.
- Aber: `horse_partner_access` existiert bereits **mit exakt der
  geforderten Granularität** — `can_view_basic`, `can_view_hoof_history`,
  `can_view_medical`, `can_add_treatment_notes`, `can_create_appointments`,
  Invite-Token, Status `pending`/`active`, Revocation, plus eigenes
  `horse_audit_log` (`supabase/migrations/20260219144114_*.sql:20–40`).
- `docs/HUFI_CORE_TARGET_ARCHITECTURE.md` Abschnitt 1 (Z.85–140) beschreibt
  **fast wortgleich** dasselbe Zielbild ("horse-centric statt
  provider-centric", "multi-actor auf derselben Wahrheit") — und benennt
  bereits das Kernproblem: **vier parallele Access-Tabellen**
  (`access_grants`, `horse_partner_access`, `stall_horse_access`,
  `employee_horse_access`) sollen zu einer konsolidierten
  `horse_caregivers`-Sicht zusammengeführt werden. Das ist dokumentiert,
  aber **nicht umgesetzt**.

**Einschätzung:** Die granulare Freigabelogik muss nicht neu erfunden
werden. Die eigentliche Arbeit ist Konsolidierung von vier Tabellen auf
eine kanonische Sicht — das **ist** eine Schema-relevante Änderung mit
echtem Migrationsaufwand und Risiko für bestehende Freigaben, braucht also
ausdrückliche Freigabe und einen eigenen, vorsichtigen Migrationsplan
(nicht Teil dieser Analyse-Runde).

## 4. Einladungs-/Verbindungssystem

Mindestens drei parallele, rollengebundene Wege plus ein vierter,
tabelleneigener Weg — Redundanz bestätigt, kein einheitliches System:

- `EmployeeInvite` (`/employee-invite`)
- `PartnerInvite` (`/partner-einladung/:token`)
- `ConnectForm` (`/connect/:slug`)
- eigener `invite_token` in `horse_partner_access`

**Einschätzung:** Der Master-Prompt-Wunsch nach *einem* Einladungsweg
(QR/Link/E-Mail/Telefon/Freigabecode, "ein Klick") ist berechtigt — heute
existiert das Muster schon viermal unterschiedlich implementiert. Eine
Vereinheitlichung ist überwiegend Frontend-/UX-Arbeit auf bestehenden
Tabellen, kein Neubau der Dateninfrastruktur.

## 5. Proaktive KI-Hinweise

`hufai-proactive.ts` und `hufi-briefing.ts` sind laut Audit **beide aktiv**
(nicht totes Duplikat, wie ein älterer `CLAUDE.md`-Hinweis vermuten ließ):
Ersteres in `MobileShell.tsx`/`HufiWeatherWidget.tsx`, Letzteres über
`ProactiveBriefing.tsx`. Die im Master-Prompt beispielhaft genannten
Hinweise ("Termin in 40 Minuten", "seit 9 Wochen keine Bearbeitung") liegen
konzeptionell nahe an dem, was laut `docs/ROADMAP.md` bereits als
"HufAI Phase E — Proaktives Tages-Briefing" **live** markiert ist.

**Einschätzung:** Kein Neubau — eher Konsolidierung zweier paralleler
Systeme plus (blockiert, siehe unten) echte KI-Anbindung für die
komplexeren, freitextigen Hinweise. **`CLAUDE.md`-Hinweis zu den beiden
Dateien ist veraltet und sollte korrigiert werden** (separate kleine
Aufgabe, siehe Empfehlung unten).

## 6. Bereits vorhandene, überlappende Vision-Dokumente

`docs/HUFI_CORE_TARGET_ARCHITECTURE.md`, `docs/HUFAI_RUNTIME_VISION.md` und
`docs/HUFAI_CLI_VISION.md` decken einen großen Teil der Master-Prompt-Vision
bereits ab, verwenden aber andere Kernbegriffe (HufAI Core, Cockpit-Layer,
Tracks A–D) statt "Workspaces". Terminologie ist **nicht deckungsgleich**,
inhaltlich aber stark überlappend — siehe `docs/PLATFORM_ARCHITECTURE.md`
(neu, in dieser Einheit erstellt) für die Begriffs-Brücke.

## 7. Geforderte Dokumente — Bestand

Bereits vorhanden: `README.md` (unverändertes Lovable-Boilerplate, nicht
projektspezifisch gepflegt — bewusst nicht angefasst, siehe unten),
`AGENTS.md`, `docs/design/HUFI_DESIGN_SYSTEM.md`, `docs/ROADMAP.md`.
Bestätigt fehlend und in dieser Einheit neu angelegt: `docs/DATABASE.md`,
`docs/AUTHENTICATION.md`, `docs/NETWORK_ARCHITECTURE.md`,
`docs/PLATFORM_ARCHITECTURE.md`, `docs/UX_GUIDELINES.md`.

`README.md` wurde bewusst **nicht** überschrieben: Es ist generiertes
Lovable-Boilerplate ohne Projektbezug, während die echte, gepflegte
Dokumentation durchgängig unter `docs/` liegt (siehe `docs/HUFIBRAIN.md`
als Einstiegspunkt). Ein Rewrite wäre kosmetisch und stand nicht im
kritischen Pfad dieser Analyse — offene Empfehlung für Pascal, siehe unten.

---

## Risikoklassifizierung für jede Vision-Komponente

| Komponente | Aufwand | Risiko | Schema-Änderung nötig? | Freigabe vor Umsetzung |
|---|---|---|---|---|
| Login ohne Rollenwahl, einheitlicher Einstieg | mittel | mittel (bestehende Nutzer/Bookmarks/Deep-Links) | Nein | Ja — UX-Fluss für Bestandsnutzer vorab zeigen |
| `role` → `roles[]` im Frontend | hoch (viele Call-Sites) | mittel (Berechtigungsfehler bei falscher Migration der Prüf-Logik) | Nein (Tabelle existiert) | Ja — Plan mit Reihenfolge/Testabdeckung vor Umsetzung |
| Einheitliches Einladungssystem | mittel | niedrig-mittel | Nein (nutzt bestehende Tabellen) | Ja — welcher der 4 Wege wird Leitweg |
| Konsolidierung der 4 Pferde-Access-Tabellen | hoch | hoch (bestehende Freigaben/Kundendaten) | **Ja** | **Ja, zwingend** — eigener, vorsichtiger Migrationsplan nötig |
| Workspaces statt Rollenoberfläche | hoch (Navigation) | mittel | Nein | Ja — deckt sich mit `HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`, dort bereits Empfehlung vorhanden |
| Proaktive KI-Hinweise (Freitext) | — | — | Nein | Blockiert extern (Anthropic-Guthaben) |
| Design-/UX-Politur (Apple/Google-Niveau) | laufend | niedrig | Nein | Nein — inkrementell im Rahmen von `docs/design/HUFI_DESIGN_SYSTEM.md` möglich |

## Empfehlung

1. Dokumentations-Phase (dieses Paket) abschließen — erledigt.
2. Kleine, risikoarme Schritte zuerst: Design-/UX-Politur nach bestehendem
   Designsystem, `CLAUDE.md`-Korrektur zu den zwei proaktiven Modulen.
3. Für jede mittel-/hochriskante Komponente aus der Tabelle oben: eigener,
   fokussierter Plan zur Freigabe durch Pascal, **bevor** Implementierung
   beginnt — insbesondere die Access-Tabellen-Konsolidierung, die als
   einzige Komponente eine echte Schema-Migration auf der
   Produktionsdatenbank mit echten Kundendaten bedeutet.
4. Kein "alles gleichzeitig" — die Reihenfolge sollte sich an
   `docs/ROADMAP.md`s Leitlinie orientieren (Stabilität → täglicher Nutzen
   → Kontextsystem → Assistenz → proaktive Intelligenz).
