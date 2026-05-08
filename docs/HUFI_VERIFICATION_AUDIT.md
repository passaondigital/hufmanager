# Hufi Verification Audit

> Read-only verification audit der 5 Hochrisiko-Punkte aus
> `docs/HUFI_SYSTEM_DNA_ANALYSIS.md`. Quelle: aktuelle Codebase
> `/hufiapp` (HEAD `7c1c0e90`, Stand 2026-05-08).
> Keine Code-Änderung, keine Schema-Änderung, kein Deploy.
> Unsichere Punkte sind mit `[?] muss verifiziert werden` markiert.

---

## Executive Summary

**Overall risk: MEDIUM**

Vier von fünf Findings sind LOW oder MEDIUM, einer ist MEDIUM mit
Replay-Verdacht (Copecart-Webhook).

Die fünf wichtigsten Erkenntnisse:

1. **Auto-Repair in `useAuth.tsx` ist nicht so gefährlich, wie zuvor
   befürchtet.** Der DB-Trigger `handle_new_user` cast't
   `user_metadata.role` über das `app_role` ENUM (`provider`/`client`)
   und filtert dadurch ungültige Werte. `admin`-Setzen via Metadata ist
   nicht möglich (Migration `20251223161353` hat hartkodierte
   Admin-Email aus dem Trigger entfernt). **Risiko: LOW**, mit
   Vorbehalt für künftige Rollen-Erweiterungen.

2. **`hufi_memory` und `hufi_memories` haben keine sichtbare
   `CREATE TABLE`-Migration im Repo.** Code zugreift mit `as any`
   (Cast). Beide Konzepte sind klar verschieden (kategorisiert
   key/value vs. Markdown-Archiv). DB-Provenance unklar. **Risiko:
   MEDIUM** — Schema kann nicht aus dem Repo rekonstruiert werden,
   stale Tabellen oder Drift möglich.

3. **Es gibt KEIN parallelles `conversations`-Chat-Modell.** Genau
   ein Chat-Modell: `horse_chat_*`-Familie via `useHufChat`-Hook,
   plus separate Tabellen-Familien für domain-spezifische Channels
   (`partner_messages`, `partner_conversations`, `employee_team_messages`,
   `admin_messages`). Der frühere Memory-Eintrag mit "conversations"
   war fehlerhaft. **Risiko: LOW**.

4. **21 Portal-Routes sind real konfiguriert, aber 11+ Submodule liegen
   im `demos/`- und `modules/`-Unterordner und sind als Stubs erkennbar.**
   `<PortalPlaceholder />` ist explizit Catchall. **Risiko: MEDIUM** —
   keine Sicherheitslücke, aber spürbare Wartungslast und Bundle-Anteil.

5. **Copecart-Webhook ist passwort-geschützt mit Timing-Attack-Schutz,
   aber ohne Replay-Protection und mit teilweise schwacher Idempotenz.**
   `admin_revenue_log` wird bei replays mehrfach befüllt; Email-Invites
   und Push-Notifications werden bei replays mehrfach versendet.
   **Risiko: MEDIUM**.

**Was muss vor Hufi-Brain/Jarvis+-Expansion gefixt werden?**

> **Replay-Protection für Copecart-Webhook + dokumentierte
> Schema-Provenance für `hufi_memory`/`hufi_memories`.**
> Alles andere ist tolerable Wartungslast.

---

## 1. useAuth / Role Auto-Repair

### Files inspected

- `src/hooks/useAuth.tsx` (vollständig, 486 Zeilen)
- `supabase/migrations/*` mit Pattern `handle_new_user`,
  `on_auth_user_created`, `user_roles`, `raw_user_meta_data`
  (~20 Treffer in ~14 Migrationen)

### What exists

**Frontend (`useAuth.tsx`):**

- `fetchUserRole()` (Zeilen 34–77):
  - liest aus `user_roles` Tabelle.
  - Wenn kein Eintrag: liest `user.user_metadata.role`,
    mappt auf `provider | partner | client`, inserted in `user_roles`.
  - Bei Insert-Fehler: returnt Meta-Role direkt als Fallback ("so user
    isn't stuck").
  - Letzter Fallback: `"client"`.
- `signUp()` (Zeilen 407–422): schreibt `role` und `full_name` in
  `auth.signUp({ options: { data: ... } })` — landet in
  `raw_user_meta_data`. Default `role = "client"`. Frontend-Typ erlaubt
  `"provider" | "client" | "partner"`.
- `signIn()` (Zeilen 355–405): "Fast Path" liest Metadata-Role direkt;
  parallel wird DB-Role als "authoritative" geholt und überschreibt
  am Ende.

**DB-Trigger `handle_new_user` (Migrationen, 16+ Versionen):**

- Letzte Variante (`20260325203751`, `20260325202658`,
  `20260219144114`):
  - liest `raw_user_meta_data->>'role'`
  - inserted in `user_roles` mit `COALESCE(...::app_role, 'client')`
  - **Cast `::app_role` filtert ungültige Werte** — fällt auf
    `'client'` zurück bei beliebigen anderen Werten.
- Migration `20251223161353` hat **hartkodierte Admin-E-Mail-Whitelist
  aus dem Trigger entfernt**. Vorher gab es einen Admin-Auto-Provision-
  Pfad — bewusst zurückgebaut.
- Admin-Rolle wird seither nur manuell vergeben (vermutlich über
  `is_admin()`-Function plus separate Tabelle [?]).

**`app_role` ENUM:** `'provider'`, `'client'` (Migration
`20251203110750`). Es existieren weitere Tabellen `user_roles` mit
zusätzlichen Werten, aber `app_role`-Typ-Cast filtert auf diese zwei.

### What is safe

- ENUM-Cast `::app_role` blockiert beliebige Rollen-Strings via
  Metadata. Wer `'admin'` in Metadata schreibt, wird zu `'client'`.
- `admin`-Whitelist im Trigger ist explizit entfernt.
- DB-Trigger läuft mit `SECURITY DEFINER` (üblich für
  `handle_new_user`) und respektiert RLS für die Inserts.
- `signIn()` überschreibt am Ende immer mit DB-Role — Frontend-State
  vertraut nicht dauerhaft auf Metadata.

### What is risky

- **Selbst-Eskalation auf `provider`**: Ein User kann sich als
  `provider` registrieren statt `client`. Provider haben mehr
  Permissions als Client (eigene `provider_id`-gebundene Tabellen).
  Das ist designgewollt (Self-Signup für Hufpfleger), aber ohne
  Verifikation, ob die Person tatsächlich Hufpfleger ist. Mitigation
  bisher: Subscription-Pflicht via `copecart-webhook`, der Provider
  formal anlegt — aber jeder kann sich vor Subscription als Provider
  ausgeben.
- **`partner` self-signup**: gleiches Pattern. Kann ohne
  Tierarzt-Lizenz angelegt werden.
- **Auto-Repair-Pfad bei Insert-Failure** (Zeile 67-68): "return meta
  role anyway so user isn't stuck". Wenn der Insert fehlschlägt
  (z. B. RLS-Verstoß), wird Metadata-Role trotzdem im Frontend-State
  benutzt. Das ist UI-Convenience, kein DB-Recht — RLS-Policies sehen
  weiterhin keinen `user_roles`-Eintrag und blockieren Zugriffe. Aber:
  Frontend-State zeigt ggf. Provider-UI an, obwohl DB-Operation
  scheitern werden. Verwirrend, nicht eskalierend.
- **`is_admin()`-Function-Provenance** [?]: wie wird Admin-Status heute
  vergeben? Migration `20251222120139` definiert `is_admin(_user_id)`,
  aber wie der initial admin-Eintrag dorthinkommt, wurde nicht im
  Trigger-Pfad gefunden. *Muss verifiziert werden* — vermutlich
  manueller DB-Insert via Supabase-Dashboard.

### Exact risk rating

**LOW** für den Auto-Repair-Pfad selbst.
**MEDIUM** als generische Anmerkung: Die Architektur, *jeder kann sich als
Provider registrieren*, ist kein Bug, aber ein Design-Pattern, das mit
Subscription-/Copecart-Webhook gepaart funktioniert. Wenn Hufi
zusätzliche Rollen (z. B. `super_admin`, `partner_admin`,
`stable_owner`) ergänzt, ist neu zu prüfen.

### Recommendation

- **Nicht fixen.** Aktuelles Verhalten ist konsistent mit dem
  Geschäftsmodell.
- Beim Erweitern von `app_role` (siehe DNA-Analyse §12) bewusst
  prüfen, ob neue Rollen via Self-Signup oder nur via
  Admin-Provision vergeben werden dürfen.
- `is_admin()`-Provisioning-Pfad dokumentieren `[?]`.

### Do not fix yet

Bestätigt — kein Eingriff in dieser Session.

---

## 2. hufi_memory vs hufi_memories

### Files inspected

- `src/lib/hufi-brain.ts` (Interface `HufiMemory`, Tabelle
  `hufi_memory`)
- `src/lib/hufi-memory.ts` (Type `MemoryType`, Tabelle `hufi_memories`)
- `src/components/layout/MobileShell.tsx` (Konsument von `hufi_memory`)
- `supabase/migrations/*` (gesamtes Verzeichnis, 389 Dateien)
- `src/integrations/supabase/types.ts` [?]

### What exists

**Code-Seite:**

- **`hufi_memory`** (Singular, kategorisiertes Key-Value-Store):
  - Interface `HufiMemory` in `hufi-brain.ts`:
    `{ id, user_id, category, key, value, confidence, source,
    last_updated, expires_at }`.
  - Kategorien: `routine | preference | horse_pattern | client_note |
    alert | dsgvo | permission`.
  - Source: `voice | manual | system | ai`.
  - Verwendet in: `hufi-brain.ts`, `MobileShell.tsx`.

- **`hufi_memories`** (Plural, Markdown-Archiv pro Pferd/Akteur):
  - Type `MemoryType` in `hufi-memory.ts`:
    `"pferdeakte" | "pferdebusiness" | "pferdemensch" | "hufi_notizen"`.
  - Modi: `"append" | "replace"`.
  - Schreibt mit `onConflict: "user_id,memory_type,horse_id"`
    (Composite-Unique).
  - Verwendet in: `hufi-memory.ts`.

**DB-Seite:**

- Keine `CREATE TABLE.*hufi_memory` und keine
  `CREATE TABLE.*hufi_memories` in den 389 Migrationen gefunden
  (`grep -rln`).
- Alle Code-Zugriffe verwenden `.from("hufi_memory" as any)` bzw.
  `.from("hufi_memories" as any)` — das `as any` ist klares Indiz,
  dass Supabase-Type-Generation diese Tabellen **nicht kennt**.
- `[?]`: Tabellen existieren vermutlich live in der Supabase-Instanz
  (sonst würde der Code sofort fehlschlagen), aber sind nicht im
  Repo migrationiert. Wahrscheinlich direkt im Supabase-Dashboard
  angelegt und nie als Migration zurückgespielt.

### What is safe

- Beide Tabellen sind konzeptionell klar getrennt (kategorisiert
  vs. Markdown).
- Kein gegenseitiges Überschreiben sichtbar.
- `confidence`-Feld in `hufi_memory` und Append-Mode in
  `hufi_memories` sind durchdachte Patterns.
- Keine produktiven Schreib-Konflikte erkennbar.

### What is risky

- **Schema-Provenance nicht im Repo**: Tabellenstruktur, Spalten,
  Constraints und RLS-Policies können **nicht** aus dem Repo
  rekonstruiert werden. Bei Schema-Drift (Spalte umbenannt im
  Dashboard) bricht der Code ohne Warnung.
- **`as any`-Casts** umgehen TypeScript-Schutz — Typo in Spaltennamen
  wird nicht zur Compile-Zeit erkannt.
- **RLS-Policies unverifiziert**: ob `hufi_memory.user_id =
  auth.uid()` als RLS gesetzt ist und ob `hufi_memories` eine
  Multi-Akteur-RLS hat (z. B. mit `horse_id`-Berechtigung), ist
  ohne Dashboard-Inspektion nicht beweisbar.
- **Drift-Verdacht**: Zwei Memory-Modelle ohne Repo-Migration
  riechen nach Lovable-/Dashboard-getrieben Wachstum, nicht nach
  bewusster Architektur.

### Exact risk rating

**MEDIUM**

Begründung: Funktional kein akutes Problem, aber operativ und
audit-technisch schwer zu fassen. Wenn Pascal die Memory-Architektur
für Hufi-Brain pferd-zentriert refactorisieren will (siehe
DNA-Analyse §11), muss zuerst das Schema rekonstruiert und
versioniert werden.

### Recommendation

- **Nicht fixen.**
- Vor jedem Memory-Eingriff: Schema-Inspektion via Supabase-
  Dashboard, dann eine Repo-Migration nachziehen, die die Tabellen
  als `CREATE TABLE IF NOT EXISTS` versioniert. So wird das aktuelle
  Schema im Git fixiert.
- Anschließend: Pascal entscheidet, ob `hufi_memory` und
  `hufi_memories` zwei bewusste Tabellen bleiben oder konsolidiert
  werden. Mein Vorschlag aus der DNA-Analyse: konsolidieren auf eine
  pferd-zentrierte `horse_memory`-Tabelle plus user-zentrierte
  Routinen.

### Do not fix yet

Bestätigt — keine Schema-/Code-Änderung.

---

## 3. horse_chat_* vs conversations

### Files inspected

- `supabase/migrations/20260319193234_28c2fdc0-4209-45fc-bbe9-7add9fb234a3.sql`
  (`horse_chat`-Tabellen)
- `supabase/migrations/*` (Suche nach `CREATE TABLE.*conversations`,
  `CREATE TABLE public.messages`)
- `src/hooks/useHufChat.ts`
- 7 weitere `src/`-Dateien mit `from("horse_chat`-Verwendung

### What exists

**Schema (real, in Migration vorhanden):**

- Migration `20260319193234`: definiert `horse_chat_channels`,
  `horse_chat_messages`. Pferd-Kanal-Modell.

**Generic `conversations`-Tabelle:**

- **Existiert nicht** als `public.conversations` mit `CREATE TABLE`.
- Frühere Memory-Aussagen mit "conversations" als zentrale Tabelle
  waren **falsch** (vermutlich Memory-Drift aus einer früheren
  Architektur-Skizze).

**Domain-spezifische Chat-Tabellen (existieren als parallele
Familien):**

- `partner_messages`
- `partner_conversations` [? Memory-Eintrag, nicht im Migration-Search
  bestätigt]
- `employee_team_messages`
- `admin_messages` + `admin_message_replies` + `admin_message_templates`

**Konsumenten von `horse_chat_*` in `src/`:**

- `src/hooks/useHufChat.ts` (Realtime + Voice + File-Upload)
- `src/pages/Chat.tsx`
- `src/components/hm-connect/EquidChat.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/client/chat/ClientGruppenChat.tsx`
- `src/components/client/DeleteAccountSection.tsx`
- `src/components/client/chat/ClientExpertenChat.tsx`
- `src/components/tour-manager/TourCard.tsx`

### What is safe

- **Es gibt KEIN paralleles Generic-Chat-Modell.** Was existiert, sind
  domain-spezifische Tabellen (Partner, Employee, Admin) — die haben
  klare Trennung pro Akteurs-Beziehung.
- `useHufChat` arbeitet primär auf `horse_chat_*` und kann mit
  unterschiedlichen Channel-IDs für verschiedene Kontexte verwendet
  werden.
- Realtime-Subscriptions sind in `useHufChat` zentralisiert.

### What is risky

- **Konsumenten-Fragmentation**: 8 Stellen verwenden `horse_chat`-
  Tabellen direkt. Bei Schema-Änderung müssen alle 8 angefasst werden.
- **Permission-Konsistenz** [?]: ob alle Channels die gleiche
  RLS-Policy ("Akteur ist über `access_grants`/`horse_partner_access`/
  `stall_horse_access` berechtigt") verwenden, ist nicht verifiziert.
  Frontend-Code lässt sich darauf vertrauen, RLS-Policies sind die
  Wahrheit — das Schema-Migration-File aus 20260319 müsste detailliert
  gelesen werden, was nicht im Auftrag dieses Audits ist.
- **`partner_conversations` vs. `partner_messages`** — zwei separate
  Konzepte oder eine Drift? *Muss verifiziert werden*.

### Exact risk rating

**LOW**

Begründung: Es gibt nicht zwei Generic-Chat-Modelle. Die
domain-spezifischen Familien sind sauber getrennt. Der frühere Verdacht
basierte auf einem fehlerhaften Memory-Eintrag.

### Recommendation

- **Nicht fixen.**
- Bei zukünftigem Pferd-Kanal-Refactor (siehe DNA-Analyse §11 "Hufi
  Network"): `partner_conversations` vs. `partner_messages` klären,
  ggf. konsolidieren.

### Do not fix yet

Bestätigt — kein Eingriff.

---

## 4. Portal Submodules

### Files inspected

- `src/App.tsx` Zeilen 326–401 (PortalRouteGuard) und Zeilen 612–629
  (Portal-Routes als App-Routen)
- `src/pages/portal/` Verzeichnis
- `src/pages/portal/demos/` Unterverzeichnis
- `src/pages/portal/modules/` Unterverzeichnis

### What exists

**Routen-Struktur in App.tsx (Subdomain-Modus `portal`/`insurance`):**

`<Route path="/portal/:slug" element={<PortalAppLayout />}>` mit
folgenden Sub-Routes:

| Route | File | Status | Rolle |
|---|---|---|---|
| `index` | `PortalDashboard.tsx` | real | Portal-Hub |
| `kalender` | `PortalCalendar.tsx` | real | Portal-User |
| `management` | `PortalManagementHub.tsx` | real | Portal-Admin |
| `settings` | `PortalSettings.tsx` | real | Portal-Admin |
| `analytics` | `PortalAnalytics.tsx` | real | Portal-Admin |
| `team` | `PortalTeam.tsx` | real | Portal-Admin |
| `connect` | `PortalConnect.tsx` | real | Portal-User |
| `import` | `PortalImport.tsx` | real | Portal-Admin |
| `policen` | `modules/PortalPolicen.tsx` | **stub** | Insurance |
| `claims` | `modules/PortalClaims.tsx` | **stub** | Insurance |
| `produkte` | `modules/PortalOrders.tsx` [?] | stub | Marketplace |
| `orders` | `modules/PortalOrders.tsx` | **stub** | Marketplace |
| `schulungen` | `modules/PortalSchueler.tsx` [?] | stub | Education |
| `kurse` | `modules/PortalSchueler.tsx` [?] | stub | Education |
| `schueler` | `modules/PortalSchueler.tsx` | **stub** | Education |
| `pruefungen` | nicht im `modules/` gefunden [?] | unknown | Education |
| `standards` | nicht im `modules/` gefunden [?] | unknown | Verband |
| `mitglieder` | nicht im `modules/` gefunden [?] | unknown | Verband |
| `statistiken` | nicht im `modules/` gefunden [?] | unknown | – |
| `patienten` | `modules/PortalPatienten.tsx` | **stub** | Veterinary |
| `befunde` | `modules/PortalBefunde.tsx` | **stub** | Veterinary |
| `impfungen` | `modules/PortalImpfungen.tsx` | **stub** | Veterinary |
| `*` (catchall) | `PortalPlaceholder.tsx` | **explicit placeholder** | – |

**Plus auf der App-Seite (außerhalb Subdomain-Modus, in
`App.tsx:612-629`):**

| Route | File | Status |
|---|---|---|
| `/portal/galerie` | `PortalGallery.tsx` | real (Botschafter-Galerie) |
| `/portal/bewerben` | `PortalApplication.tsx` | real (Botschafter-Bewerbung) |
| `/portal/versicherung` | `demos/InsurancePortalDemo.tsx` | **demo** |
| `/portal/hersteller` | `demos/ManufacturerPortalDemo.tsx` | **demo** |
| `/portal/tierarzt` | `demos/VetPortalDemo.tsx` | **demo** |
| `/portal/lieferant` | `demos/SupplierPortalDemo.tsx` | demo |
| `/portal/ausbildung` | `demos/EducationPortalDemo.tsx` | demo |
| `/portal/verband` | `demos/AssociationPortalDemo.tsx` | **demo** |

**Verzeichnis-Inventur `src/pages/portal/`:**

- 16 Top-Level-Pages (8 real, 8 mit "Demo" oder "Login" im Namen).
- `demos/` Subdirectory: 4+ Demo-Pages mit
  `SharedPortalTabs.tsx` als Stub-Pattern.
- `modules/` Subdirectory: 7+ Modul-Stubs (PortalSchueler, PortalOrders,
  PortalImpfungen, PortalPolicen, PortalBefunde, PortalClaims,
  PortalPatienten).

### Tabellarische Bewertung

| Bereich | Real | Demo / Stub | Empfehlung |
|---|---|---|---|
| Portal-Core (Dashboard/Kalender/Mgmt/Settings/Connect/Import/Analytics/Team) | 8 | 0 | **keep** — reale Logik |
| Insurance-Modul (policen, claims) | 0 | 2 | **park** — auditieren mit Pascal, ggf. später entfernen |
| Marketplace-Modul (produkte, orders) | 0 | 1 | **park** |
| Education-Modul (schulungen, kurse, schueler, pruefungen) | 0 | 4 | **park** |
| Verband-Modul (standards, mitglieder, statistiken) | 0 | 3 | **verify with Pascal** |
| Vet-Modul (patienten, befunde, impfungen) | 0 | 3 | **park** — überschneidet mit Vet-Portal-Suite (`/vet/*`) |
| Botschafter (galerie, bewerben) | 2 | 0 | **keep** |
| Demos (versicherung, hersteller, tierarzt, lieferant, ausbildung, verband) | 0 | 6 | **park** — Demo-Stubs für Investorengespräche |

### What is safe

- `<PortalPlaceholder />` als expliziter Catchall — verhindert 404s
  bei nicht-existenten Submodulen.
- Demo-Pages sind klar als `demos/`-Subdirectory abgegrenzt.
- Keine Demo-Page hat erkennbar produktive DB-Schreibzugriffe (sind
  vermutlich UI-Stubs mit Hardcoded-Daten) [? muss stichprobenartig
  verifiziert werden].

### What is risky

- **Bundle-Anteil**: 11+ Stub-Pages laden in den Lazy-Chunks und
  vergrößern den Build minimal — bei aktiver Lazy-Load aber kein
  akutes Problem.
- **Demo-Pages mit Mock-Daten**: wenn Hardcoded-Daten reale Pferdenamen
  oder Kundennamen enthalten, könnte das DSGVO-relevant sein
  [? stichprobenhaft prüfen].
- **Wartungslast**: jede Stub-Page muss bei Library-Updates
  (React-Router, Lazy-Suspense) mit-getestet werden.
- **Marketing-Verwirrung**: Pascal-Vision sagt "kein generisches
  KI-Tool". Portal-Submodule mit Versicherungs-/Hersteller-/Verband-
  Branding suggerieren eine SaaS-Plattform-Story, die im Konflikt zur
  Hufi-Vision steht.

### Exact risk rating

**MEDIUM**

Begründung: kein Sicherheitsproblem, aber spürbare strategische und
Wartungsbelastung. 11+ Stubs ohne Nutzer-Wert.

### Recommendation

- **Nicht fixen.**
- Mit Pascal eine Audit-Session: pro Submodul "behalten / parken /
  entfernen". Realistisch: 8 Core-Pages plus Galerie/Bewerben behalten,
  alle `demos/` und `modules/`-Subdirectories archivieren.
- Vor jedem Audit: stichprobenartig prüfen, ob Demo-Daten reale
  Personendaten enthalten [?].

### Do not fix yet

Bestätigt — keine Datei wird umbenannt, gelöscht oder
deklariert.

---

## 5. copecart-webhook Security

### Files inspected

- `supabase/functions/copecart-webhook/index.ts` (vollständig,
  912 Zeilen)

### What exists

**Authentifizierung:**

- IPN-Password-Validation (Zeilen 339–356):
  - `expectedPassword = Deno.env.get("COPECART_IPN_PASSWORD")`.
  - `receivedPassword = payload.password || payload.ipn_password ||
    payload.secret`.
  - Vergleich via `constantTimeCompare()` (Zeilen 144–159) —
    Timing-Attack-resistent, korrekt implementiert.
- Wenn `COPECART_IPN_PASSWORD` nicht konfiguriert: HTTP 500 (sauber).
- Wenn falsches Password: HTTP 401, kein Detail-Leak.

**Verarbeitete Events:**

- Payment-Events: `order_created`, `order.created`,
  `subscription_payment_succeeded`, `subscription.payment.succeeded`,
  `payment_completed`, `payment.completed`, `purchase`, `sale`.
- Cancellation: `subscription_cancelled`, `.cancelled`, `.canceled`.
- Failure: `payment_failed`, `subscription_payment_failed`.
- Expiration: `subscription_expired`, `subscription.expired`.
- Refund: `refund_created`, `refund.created`, `refund`.

**Aktionen pro Event:**

- Invoice-Payment (custom field = invoice ID, UUID-Längen-Check):
  Update `invoices.status='paid'`, send Resend-Email an Provider+Client,
  send Push an beide.
- Provider-Subscription-Auto-Erstellung bei Payment-Event ohne
  bestehendes Profile: `auth.admin.inviteUserByEmail` + Profile-Update +
  `user_roles` upsert + `business_settings` upsert + `admin_revenue_log`-
  Insert + `admin_invoices`-Erstellung.
- Bestehendes Profile: Subscription-Status-Update +
  `feature_statuses`-Auto-Provisioning aus `PLAN_FEATURE_MAP` +
  `admin_revenue_log`-Insert + `admin_invoices`-Erstellung
  (mit Existence-Check).

**Service-Role-Nutzung:**

- `createClient(supabaseUrl, supabaseServiceKey, ...)` (Zeile 365–370)
  — korrekt mit `autoRefreshToken: false`, `persistSession: false`.
- Nur nach erfolgreichem Password-Check.

**Logging:**

- Console.log mit `[copecart]`-Prefix für Cloudflare-Edge-Logs.
- `admin_revenue_log.raw_payload` speichert das ganze Payload
  (Zeile 812).

### What is safe

- Constant-time-Compare gegen Timing-Attacks ✓.
- Service-Role wird erst NACH Password-Check verwendet ✓.
- `admin_invoices`-Erstellung hat Existence-Check pro Periode
  (Zeile 829–836) — **idempotent**.
- `user_roles`, `business_settings` upserts sind idempotent.
- Profile-Update mit gleichen Werten ist im Effekt idempotent.
- Unbekannte Event-Types liefern 200 mit "Event type not handled" —
  kein Crash, kein Daten-Schaden.

### What is risky

- **Replay-Protection: NEIN.**
  - Kein `event_id`-Tracking, keine Nonce, kein Timestamp-Check.
  - Wenn ein gültiger Webhook abgefangen wird, kann er beliebig oft
    repliced werden.
  - Konsequenzen pro replay:
    - `admin_revenue_log`-Insert: **mehrfacher Eintrag** (kein UNIQUE-
      Constraint sichtbar, `transaction_id` wird zwar gesetzt, aber
      keine `ON CONFLICT`-Klausel) — kann Revenue-Reports verzerren.
    - Resend-E-Mail an Provider und Client: **mehrfacher Versand**
      (UX-Schaden, kein Daten-Schaden).
    - Push-Notification: **mehrfacher Versand**.
    - `auth.admin.inviteUserByEmail` bei replay vor erstem
      Profile-Existence-Check: würde duplizierten Invite versuchen,
      `createError.message.includes("already been registered")`
      catch-fall greift (Zeile 605) — graceful.
  - **`admin_invoices` ist durch Periode-Check geschützt** (LOW
    Replay-Risiko), aber alles andere nicht.
- **HMAC fehlt**: IPN-Password im Payload-Body ist ungewöhnlich.
  Standard-Webhook-Sicherheit nutzt HMAC-Signature in Header. CopeCart
  scheint diese Variante zu unterstützen [?]. Wenn ja, wäre HMAC
  stärker, weil bei Body-Manipulation Signatur bricht. Aktuell:
  Body-Inhalt ist nicht signaturgesichert — wer das IPN-Password kennt
  und Schreibzugriff auf den HTTPS-Tunnel hat, kann beliebige Felder
  ändern.
- **Customer-Email vs. Profile-Lookup**: `customerEmail` aus Payload
  steuert, welcher User getroffen wird. Wer das IPN-Password besitzt,
  kann Subscription-Status für *jede* Email-Adresse ändern. Mitigation:
  Password ist nur CopeCart bekannt.
- **`payload.amount`** wird ungeprüft in `admin_revenue_log` und
  `admin_invoices.subtotal/total` geschrieben (Zeilen 799–800,
  863–864). Wenn ein Replay mit manipuliertem Body kommt, kann der
  Revenue-Eintrag vergrößert werden — aber der Replay setzt voraus,
  dass das IPN-Password kompromittiert wurde.
- **Resend-From-Adresse hartkodiert auf
  `onboarding@resend.dev`** (Zeile 191) — Default-Sandbox-Adresse,
  vermutlich Stub aus der Setup-Phase. Sollte auf eigene Domain
  umgestellt werden, aber das ist ein **Liefer-Risiko**, kein
  Sicherheits-Risiko.

### Spoofbar?

- **Nein, ohne IPN-Password.** Constant-time-Compare schließt
  Brute-Force durch Timing aus.
- **Ja, mit IPN-Password.** Sobald das Geheimnis kompromittiert ist
  (env-leak, log-leak, CopeCart-Account-Hijack), kann Subscription-
  Status für jede Email-Adresse beliebig gesetzt werden.

### Duplicate webhook handling safe?

- **Teilweise.** Idempotenz nur für `admin_invoices` (Periode-Check)
  und für Upserts. **Nicht idempotent**: `admin_revenue_log`,
  E-Mail-Versand, Push-Notifications.

### Exact risk rating

**MEDIUM**

Begründung: Authentifizierung ist solide (Password +
constant-time-compare). Replay-Schutz fehlt, daraus folgt:
Revenue-Log-Verfälschung und Mehrfach-E-Mail-Versand bei replay.
Spoofing ohne Password ist nicht möglich.

### Recommendation

- **Nicht jetzt fixen.** Aktuelles Verhalten ist nicht akut gefährlich.
- Spätere Maßnahmen (separate Session, mit Pascal-Freigabe):
  1. Replay-Protection: Header-Timestamp-Check (max. 5 Min Drift) +
     Persist `transaction_id` als UNIQUE in `admin_revenue_log`.
  2. HMAC-Validierung statt IPN-Password [? CopeCart-Doku prüfen, ob
     das angeboten wird].
  3. `RESEND_FROM`-Env-Var statt hartkodierter Sandbox-Adresse.
  4. `admin_revenue_log.event_id`-UNIQUE-Constraint plus
     `ON CONFLICT DO NOTHING`.

### Do not fix yet

Bestätigt — kein Eingriff in Edge Function, keine Schema-Änderung.

---

## Final Risk Table

| Area | Risk | Why | Fix priority |
|---|---|---|---|
| **useAuth Auto-Repair** | LOW | ENUM-Cast filtert Metadata-Manipulation; Admin nicht via Metadata zuweisbar | **Parken** — bei zukünftiger Rollen-Erweiterung neu auditieren |
| **hufi_memory + hufi_memories** | MEDIUM | Schema nicht im Repo, `as any`-Casts; Drift-Verdacht | **P1** — Schema rekonstruieren und in Repo-Migration versionieren, vor Hufi-Brain-Refactor |
| **horse_chat_* vs conversations** | LOW | Nur ein Generic-Chat-Modell; domain-spezifische Familien sauber getrennt | **Parken** — RLS-Konsistenz bei späterem Pferd-Kanal-Refactor prüfen |
| **Portal Submodules** | MEDIUM | 11+ Stubs, Wartungslast, Marketing-Verwirrung | **P1** — Audit-Session mit Pascal: keep/park/remove |
| **copecart-webhook Security** | MEDIUM | Replay-Protection fehlt, Revenue-Log nicht idempotent | **P1** — Replay-Protection + UNIQUE-Constraint |

---

## Recommended Next Step

**Genau ein Schritt:**

**Schema-Provenance für `hufi_memory` und `hufi_memories` aus der
Live-Supabase-Instanz auslesen und als versionierte Repo-Migration
nachziehen** — read-only Auslesen, dann eine reine `CREATE TABLE IF
NOT EXISTS`-Migration in `supabase/migrations/`, kein Schema-Eingriff,
kein Daten-Eingriff.

**Warum:** Hufi-Brain-Architektur (DNA-Analyse §11) baut zentral auf
Memory-Layer. Solange das Schema nicht im Repo versioniert ist, ist
jede Refactor-Diskussion Spekulation. Diese Rekonstruktion ist die
einzige der 5 Findings, deren Lücke direkt die nächste Architektur-
Entscheidung blockiert.

**Risiko:** LOW. Read-only Auslesen via Supabase-Dashboard oder
`pg_dump --schema-only` für die zwei Tabellen. Migration ist
`CREATE TABLE IF NOT EXISTS` — idempotent, niemand wird beeinträchtigt.

**Voraussetzung:** Pascal hat Dashboard-Zugriff und kann das Schema
exportieren oder mir die `\d hufi_memory` und `\d hufi_memories`
Outputs liefern. Alternative: `psql`-Zugriff vom VPS aus mit
`SUPABASE_SERVICE_ROLE_KEY` [? operativ zu klären].

---

## Schlussbemerkung

Von den 5 Hochrisiko-Punkten sind 2 LOW und 3 MEDIUM. Keiner ist HIGH.
Das System ist sicherer und sauberer als die DNA-Analyse erst
befürchtete — auf der Auth-/Chat-Seite. Die Schwachstellen liegen in
**Schema-Provenance** (`hufi_memory*`) und **Webhook-Replay**
(`copecart-webhook`). Beide sind P1 für die nächste Recovery-Phase,
keine sofortige Gefahr.
