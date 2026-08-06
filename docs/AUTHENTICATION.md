# Hufi — Authentifizierung und Rollen

Stand: 2026-08-06. Ist-Stand (verifiziert) + Zielbild aus Pascals
Master-Prompt. Kein Code in dieser Einheit geändert.

## Ist-Stand (verifiziert)

- **Login/Registrierung:** `src/pages/Auth.tsx` (915 Zeilen). Zeigt heute
  eine **explizite Rollenauswahl** beim Signup (`RoleOption = "provider" |
  "client" | "partner"`, Toggle-UI, `Auth.tsx:111,498–505`) sowie einen
  eigenen `"team"`-Login-Modus. Kein Social-Login (kein `signInWithOAuth`
  im Code).
- **Rollen-Ermittlung nach Login:** `useAuth.tsx` — `fetchUserRole()`
  (Z.38–52) liest genau **eine** Rolle per `.maybeSingle()`. Fast-Path aus
  `user_metadata.role` (Z.378), sonst DB-Abfrage. Rückgabetyp `UserRole =
  "provider" | "client" | "admin" | "employee" | "partner" | null`.
- **Rollen-gesteuertes Routing:** `src/lib/portal-user-detect.ts:22–39`
  statisches `role → path`-Mapping. `src/components/auth/ProtectedRoute.tsx`
  prüft `allowedRoles?: Rolle[]` gegen die eine ermittelte Rolle.
  Kein "zuletzt verwendeter Bereich"-Konzept vorhanden.
- **Datenbank ist bereits mehrfachrollenfähig:** `user_roles`-Tabelle
  (`supabase/migrations/20251203110750_*.sql:17–22`) ist `user_id + role`
  mit `UNIQUE(user_id, role)` — technisch eine 1:n-Beziehung. Der
  Client-Code nutzt das heute nicht aus (siehe Gap-Analyse).
- **Fünf harte Rollen bestimmen eigene App-Shells** in `src/App.tsx`:
  `provider`/`admin` → `AppLayout`, `client` → `ClientAppLayout`,
  `partner`/`admin` → `PartnerAppLayout`, `employee`/`admin` →
  `EmployeeAppLayout`, `admin` → `/admin/*`.

## Zielbild (aus Master-Prompt, noch nicht umgesetzt)

1. **Ein Login** (E-Mail/Passwort; perspektivisch Apple/Google), **keine
   Rollenwahl beim Login-Formular selbst**.
2. **Registrierung in zwei sanften Schritten** statt Rollenformular:
   Schritt 1 "Wie möchtest du Hufi nutzen?" (🐴 arbeite mit Pferden / ❤️
   besitze Pferde), Schritt 2 optionale Tätigkeit (Hufbearbeiter, Tierarzt,
   Physiotherapeut, Osteopath, Trainer, Stallbetreiber, Sonstiges) — intern
   gespeichert, nicht prominent im UI wiederholt.
3. **Nach Login:** automatische Erkennung von Nutzer/Rollen/Rechten/
   Workspaces, Öffnen des zuletzt verwendeten Workspace statt einer
   Entscheidung, die der Nutzer treffen muss.
4. **Mehrfachrollen** (`roles: Rolle[]` statt `role: Rolle`) — ein Nutzer
   kann gleichzeitig Pferdebesitzer, Hufbearbeiter, Stallbetreiber,
   Trainer, Administrator sein.

## Weg vom Ist- zum Zielbild — worauf zu achten ist

- **Kein Schema-Problem.** `user_roles` unterstützt Mehrfachrollen bereits.
  Die Arbeit ist ein Frontend-/Hook-Refactor: `useAuth` muss `roles:
  UserRole[]` statt `role: UserRole` liefern, jede der zahlreichen
  `allowedRoles`-Prüfungen in `App.tsx` (siehe
  `docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`
  für die vollständige Routenliste) muss auf "Rolle in Menge enthalten"
  statt "Rolle ist gleich" umgestellt werden.
- **Migrationspfad für Bestandsnutzer:** Heutige Nutzer haben genau eine
  Rolle in `user_roles`. Der Umstieg auf `roles[]` ist rückwärtskompatibel
  (eine Rolle ist eine Menge mit einem Element) — kein Datenverlustrisiko,
  aber jede Stelle, die `role === "provider"` statt
  `roles.includes("provider")` prüft, muss einzeln gefunden und geändert
  werden. Fehlerrisiko: falsch migrierte Prüfung könnte Zugriff zu weit
  öffnen oder fälschlich verweigern — deshalb Freigabe + Testplan vor
  Umsetzung nötig, kein Blindumbau.
- **Rollenauswahl aus dem Login-Formular entfernen** ist eine reine
  UI-Änderung an `Auth.tsx`, aber mit hoher Sichtbarkeit für alle
  Bestandsnutzer (verändert den ersten Eindruck jedes Logins) — vor
  Umsetzung Pascal zeigen, nicht kommentarlos live schalten.
- **Social-Login (Apple/Google)** ist reine Ergänzung ohne Bestandsrisiko,
  aber abhängig von Supabase-Auth-Provider-Konfiguration (Secrets/OAuth-
  Setup) — das fällt unter "keine Supabase-Secrets verändern ohne
  Freigabe" aus den Standing-Regeln dieses Projekts.

## Nicht in dieser Einheit umgesetzt

Kein Code für dieses Kapitel wurde in dieser Analyse-Runde geändert.
Umsetzung erst nach separater Freigabe eines konkreten, geprüften Plans
(siehe `docs/architecture/HUFI_PLATFORM_VISION_GAP_ANALYSIS.md`,
Risikotabelle).
