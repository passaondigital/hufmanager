# Auth-Routing-Audit HufManager + HufiApp — 28.09.2026

Stand: nur vorbereitet, **nichts deployt**. Confirm Email AUS, Site URL unverändert (`https://hufiapp.de`), keine
Dashboard- oder Template-Änderung.

## Ausgangslage

| | HufManager | HufiApp |
|---|---|---|
| Live-Frontend | `app.hufmanager.de` (Release `84d7d45d`) | `hufiapp.de` (nginx → `/srv/hufi/hufiapp/repo/dist`, Bundle `index-75c17AwV.js`) |
| Supabase | `vnschgjxkzzwzefqlrji` | `oortmejcefbiewaceccc` (mit dem verbundenen Konto **nicht** erreichbar) |
| Site URL | `https://hufiapp.de` → für HufManager falscher Fallback (andere App, anderes Projekt) | nicht auslesbar |
| Confirm Email | AUS (`mailer_autoconfirm=true`, live geprüft) | AUS (`mailer_autoconfirm=true`, live geprüft) |

Ein Token aus `vnschg…` wird auf `hufiapp.de` nicht erkannt → jeder HufManager-Link auf `hufiapp.de` endet „nicht eingeloggt“.

## Flows

Legende: ✅ korrekt · ❌ falsch · — nicht verwendet.

### HufManager (`vnschgjxkzzwzefqlrji`)

| # | Flow | aktueller Redirect | gewünschter Redirect | Datei/Funktion | Änderung |
|---|---|---|---|---|---|
| 1 | Signup | `{origin}/home` → `https://app.hufmanager.de/home` ✅ | gleich | `src/hooks/useAuth.tsx` `signUp` (`emailRedirectTo`) | NEIN |
| 1b | Signup über `/connect/:slug` | `{origin}/client-home` ✅ (seit `1d1d33fe`) | gleich | `src/pages/ConnectForm.tsx` | NEIN |
| 2 | Confirm Signup | derzeit keine Mail (Autoconfirm). Nach Aktivierung: `redirect_to` = `emailRedirectTo` aus 1 ✅ – **Template-Inhalt nicht auslesbar** | `https://app.hufmanager.de/home` | Supabase-Vorlage „Confirm signup“ | Prüfung durch Pascal (s. u.) |
| 3 | Login Callback | Passwort-Login ohne Mail; Tokens aus Links werden auf jeder Route erkannt (implicit flow) ✅ | gleich | `src/pages/Auth.tsx` | NEIN |
| 4 | Password Reset | `{origin}/reset-password` ✅ (Mail 25.09. geprüft) | gleich | `src/pages/Auth.tsx` `resetPasswordForEmail`; Botschafter: `BotschafterAuth.tsx` | NEIN |
| 5 | Invite User (Supabase `inviteUserByEmail`) | live nicht verwendet; nur Repo-`copecart-webhook` (nicht deployt, live v165 = ack-only) → `https://hufiapp.de/auth` ❌ | `https://app.hufmanager.de/reset-password` | `supabase/functions/copecart-webhook/index.ts` | NEIN jetzt (nicht live) – vor Deploy dieser Fassung anpassen |
| 5b | Kunden-Einladung | `invite-client-with-password` v9: Allowlist-Origin, Fallback `https://app.hufmanager.de` ✅ | gleich | `supabase/functions/invite-client-with-password` | NEIN |
| 6 | Admin-Anlage Provider (`admin-create-user` v132) | Magic Link → `https://hufiapp.de/auth` ❌ | `https://app.hufmanager.de/reset-password` | `supabase/functions/admin-create-user/index.ts` | **JA – vorbereitet** |
| 6b | Provider Invitation (`send-provider-invitation` v110) | Magic Link → `https://hufiapp.de/auth` ❌ | `https://app.hufmanager.de/reset-password` | `supabase/functions/send-provider-invitation/index.ts` | **JA – vorbereitet** |
| 7 | Employee Invitation (`send-employee-invitation` v94) | `APP_URL` (Wert unbekannt) oder `https://app.hufiapp.de` ❌ (TLS-Fehler, anderes Projekt); Link inkl. Token wird geloggt | `https://app.hufmanager.de/employee-invite?token=…` | `supabase/functions/send-employee-invitation/index.ts` | **JA – vorbereitet** |
| 8 | Magic Link / OTP | Admin-Login: `{origin}/admin/mission-control` ✅; Botschafter: `{origin}/botschafter/login` ✅ | gleich | `src/pages/Auth.tsx`, `PferdeakteBotschafter.tsx`, `BotschafterAuth.tsx` | NEIN |
| 9 | Email Change | — (kein `updateUser({email})` im Frontend) | — | — | NEIN |
| 10 | Reauthentication | — | — | — | NEIN |

Weitere Edge-Fallbacks (P2, nicht Teil dieses Patches): `send-partner-invitation` `APP_URL || https://hufiapp.de`;
`send-client-invitation` Origin-Header, Fallback `https://hufiapp.de` (bei Aufruf aus der App kommt der Origin mit).

### HufiApp (`oortmejcefbiewaceccc`, Repo `passaondigital/hufiappde`)

| # | Flow | aktueller Redirect | gewünschter Redirect | Datei/Funktion | Änderung |
|---|---|---|---|---|---|
| 1 | Signup | `window.location.origin` → `https://hufiapp.de` ✅ | gleich (oder `/app`) | `src/pages/Auth.tsx` | NEIN |
| 2 | Confirm Signup | Autoconfirm; Template nicht auslesbar (Projekt nicht erreichbar) | `https://hufiapp.de/…` | Supabase-Vorlage in `oortme…` | Prüfung durch Pascal |
| 3 | Login Callback | Passwort-Login, danach `/app` ✅ | gleich | `src/pages/Auth.tsx` | NEIN |
| 4 | Password Reset | **kein Flow vorhanden** (keine „Passwort vergessen“-Funktion) | `https://hufiapp.de/…` | — | Feature-Lücke, kein Redirect-Fehler |
| 5 | Invite User | — | — | — | NEIN |
| 6 | Provider Invitation | — | — | — | NEIN |
| 7 | Employee Invitation | — | — | — | NEIN |
| 8 | Magic Link / OTP | — | — | — | NEIN |
| 9 | Email Change | `updateUser({ email })` **ohne** `emailRedirectTo` → Site URL von `oortme…` (unbekannt) | `https://hufiapp.de/app/einstellungen` | `src/pages/app/Einstellungen.tsx` | JA (klein) – Patch `docs/auth/hufiapp-email-change-redirect.patch`, **nicht angewendet** |
| 10 | Reauthentication | — | — | — | NEIN |

## Vorbereiteter Patch HufManager (nicht deployt)

- `admin-create-user`, `send-provider-invitation`: `redirectTo: "https://app.hufmanager.de/reset-password"`,
  Fallback-Link `https://app.hufmanager.de/auth`.
- `send-employee-invitation`: `appUrl = "https://app.hufmanager.de"` (nicht mehr über das projektweite Secret `APP_URL`),
  Einladungslink (enthält Token) wird nicht mehr geloggt.
- Repo-Stand = Live-Stand vor dem Patch (letzte Änderung 18.07., Deploy 08.08.; Live-Code per MCP gelesen).

### Tests
- `src/lib/edgeAuthRedirectGuard.test.ts`: 5/5, Negativkontrolle mit Altcode 5/5 FAIL; `authRedirectGuard.test.ts` weiter grün.
- `deno check`: 0 Fehler vorher/nachher für alle drei Functions.
- **Laufzeitbeweis ohne Deploy (PROD, QA-Konto):** Magic Link mit `redirect_to=https://app.hufmanager.de/reset-password`
  angefordert → Mail enthält genau dieses Ziel (Allowlist greift, kein Site-URL-Fallback) → Klick landet auf
  `app.hufmanager.de/reset-password` mit Formular „Neues Passwort festlegen“ (nicht abgesendet).
- `app.hufmanager.de/employee-invite?token=<ungültig>` → „Einladung ungültig“ (Seite funktioniert; Text zeigt rohe
  Fehlermeldung „Edge Function returned a non-2xx status code“ → P2).
- `app.hufiapp.de` → TLS-Fehler (belegt ❌ für Flow 7).

### Security Review
Keine Findings: feste Ziel-URLs statt Secret-Fallback, Ziel liegt in der Redirect-Allowlist, kein offener Redirect,
keine Rechteänderung; Token-Logging entfernt (Verbesserung).

### Deploy (nach Freigabe)
Nur namentlich, einzeln, per Supabase-MCP; danach Dateiinhalt gegen Repo prüfen:
`admin-create-user` (verify_jwt=true), `send-provider-invitation` (verify_jwt=true), `send-employee-invitation`
(verify_jwt=false – unverändert lassen). Rollback: vorherige Fassung = Git `fe415261`.
Nach Deploy: Admin-Anlage/Provider-Einladung an QA-Adresse, Link muss auf `app.hufmanager.de/reset-password` führen.

## Supabase-Vorlage „Confirm signup“ – nicht auslesbar → Klickanleitung

Kein Management-Token auf dem Server (`~/.supabase/access-token` fehlt), MCP liefert keine Auth-Templates.

1. https://supabase.com/dashboard öffnen → Projekt **HufManager** (`vnschgjxkzzwzefqlrji`).
2. Links **Authentication** → **Emails** (bzw. „Email Templates“) → Reiter **Confirm signup**.
3. Im Feld **Message body** (Quelltext) nachsehen, welcher Platzhalter im Link steht:
   - `{{ .ConfirmationURL }}` → korrekt (enthält `redirect_to` = `https://app.hufmanager.de/home` aus dem Signup).
   - `{{ .SiteURL }}` → falsch, führt nach `https://hufiapp.de`.
   - `{{ .RedirectTo }}` → nur korrekt, wenn zusätzlich `{{ .TokenHash }}` o. ä. verwendet wird.
4. **Nichts ändern, nichts speichern.** Screenshot oder den Link-Teil des Quelltextes an Claude schicken.
5. Gleiches für **Invite user**, **Change email address** und **Reauthentication** (nur ansehen).
6. Für HufiApp dasselbe im Projekt `oortmejcefbiewaceccc` (falls in einer anderen Organisation/einem anderen Konto).

## Deploy 28.09.2026 ~11:15 (Freigabe Pascal)

Nur namentlich per Supabase-MCP, verify_jwt unverändert:

| Function | vorher | nachher | verify_jwt |
|---|---|---|---|
| `send-employee-invitation` | v94 | **v95** | false |
| `send-provider-invitation` | v110 | **v111** | true |
| `admin-create-user` | v132 | **v133** | true |

Rollback: `git show 9f6c129d~1:supabase/functions/<name>/index.ts` (= Live-Code v94/v110/v132, per MCP gelesen).

Live-Verifikation:
- Employee: QA-A legt QA-Mitarbeiter an → `send-employee-invitation` 200 → Mail (Resend) enthält
  `https://app.hufmanager.de/employee-invite?token=…`; Seite zeigt „QA Provider A hat dich … eingeladen“
  (nicht angenommen). QA-Mitarbeiter danach gelöscht. **PASS**
- `admin-create-user` v133 Live-Code gelesen = Repo (redirectTo `/reset-password`). v95 Live-Code = Repo.
- Negativ: beide Admin-Functions als Nicht-Admin 403, ohne JWT 401.
- Admin-/Provider-Invite **E2E offen**: kein QA-Admin-Konto; temporäre Admin-Rolle für QA vom Auto-Mode blockiert.
- Function-Log-Abfrage auf Token: vom Auto-Mode blockiert → per Code belegt (kein Link-/Token-Logging).
- Login QA-A 200, Reset-Mail an QA-B 200, `mailer_autoconfirm=true`, `prod_security_smoke.py` 38/38.

Supabase-Projekte (live Bundles + nginx): HufManager `vnschgjxkzzwzefqlrji`, HufiApp `oortmejcefbiewaceccc`
→ **getrennte Auth-Projekte**.
