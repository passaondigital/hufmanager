# HufManager Slim — Release-Closeout 29.09.2026

PROD `vnschgjxkzzwzefqlrji` · Branch `release/hufmanager-lifecycle-2026-09-11` · Basis `8acee7d7` · Vorbericht `HUFMANAGER_FINAL_RELEASE_REPORT_2026-09-28.md`

## 1. Rekonstruktion (read-only, 29.09. ~10:00 UTC)
| Prüfung | Ergebnis |
|---|---|
| Git | Worktree sauber (nur untracked Alt-Skripte), HEAD = origin = `8acee7d7`; **kein** ChatGPT-Doku-Commit auf GitHub sichtbar (kein Commit nach 8acee7d7 auf irgendeinem Branch) |
| PROD Frontend | `/srv/hufi/business/hufmanager/releases/ceacdcb4abff` |
| Edge | admin-create-user v136 (Inhalt = Repo), hufi-data-core v6 (= Repo), copecart-webhook v165 ack-only |
| Ledger-Head | `20260929120000` |
| account_class Provider | real 28 · qa 11 · test_fixture 8 · demo 2 |
| Integrität | orphan user_roles 0 · product_entitlements 0 · access_grants 0 (client_id → profiles) · Doppel-Entitlements 0 · Trial ≠ 14 T. 0 · offene Reconciliation-Issues 0 |

## 2. Neue Befunde (reproduziert) und Fixes
| # | Prio | Befund | Fix (Repo) | Status |
|---|---|---|---|---|
| 1 | **P1** | **Mitarbeiter-Annahme vergibt zusätzlich Rolle `provider`**: `accept-employee-invitation` setzt `role` nur in `user_metadata`, `handle_new_user` vertraut `employee` nur aus `app_metadata` → Default `provider`. Folge: Mitarbeiter bleibt nach Login auf `/auth` hängen und zählt als *echter Provider* in den KPIs. Frisch reproduziert mit `+qa-emp-0929`. | `app_metadata: { role: "employee" }` in `accept-employee-invitation` | Fix lokal, **Deploy wartet auf Freigabe**. QA-Konto bereinigt (Rolle `provider` entfernt, `account_class=qa`) |
| 2 | **P1** | **CopeCart-Käuferzuordnung**: `profiles.email = customer_email LIMIT 1` (case-sensitiv, zufällig bei Dubletten). Bei 6 Dubletten-Adressen (2 davon Provider mit Geister-Kundenprofil) wählt der Projektor ggf. das Geisterprofil → FK-Fehler → **ganze Zahlung 500**, CopeCart-Retry-Schleife, kein Zugang. Lokal reproduziert. | `_hm_resolve_copecart_subject_v1` (case-insensitiv, Provider-Rolle zuerst, deterministisch) | Migration `20260929130000` lokal fertig, **Anwenden wartet auf Freigabe** |
| 3 | **P1** | **Kündigung beendet Zugang nie**: `subscription_cancelled` setzt nur `billing_status=CANCELLED` + Datum 00:00 UTC; Gate ignoriert `current_period_end` für Nicht-manual; kein `subscription_ended`-Produzent. | Grenze = `hm_billing_effective_end_at_v1` (Folgetag 00:00 Berlin); Gate + Access-Context sperren CANCELLED nach Grenze | gleiche Migration; Bestand 0 CANCELLED → keine Wirkung auf Bestandskonten |
| 4 | P2 | Offline: Slim-Shell zeigt **keinen** Offline-Hinweis; nicht geladene Listen erscheinen offline als „0 Kunden / Noch keine Kunden“ | vorhandenen `OfflineBanner` in `HufManagerSlimShell` (alle Breiten) | lokal gebaut + Browser-Test 10/10, **Frontend-Deploy wartet auf Freigabe** |
| 5 | P2 | Provider-Einladungsmail (admin-create-user): Emoji-Betreff, nur HTML, kein Reply-To, Absender `info@` | Absender `team@` (landet nachweislich im Posteingang), sachlicher Betreff, Text-Teil, Reply-To `support@`, Resend-Fehler werden geloggt | lokal, `deno check` OK, **Deploy wartet auf Freigabe** |
| 6 | P2 | Refund/Chargeback ohne automatische Wirkung (Event wird gespeichert, Zugang bleibt) | — (bewusst: manuelle Owner-Prüfung) | dokumentiert |
| 7 | P2 | Checkout übergibt keine E-Mail an CopeCart → zahlt ein Kunde mit anderer Adresse, bleibt er ohne Zugang (Issue `UNRESOLVED_SUBJECT`) | — | dokumentiert; Owner-Hinweis im Checkout-Text empfohlen |
| 8 | P3 | Monitoring-Job fragt `employee_profiles.invitation_sent_at` o. ä. → 569× HTTP 400/24 h (service_role, kein Nutzerflow); `push_subscriptions.subscription` fehlt (11×) | — | dokumentiert |
| 9 | P3 | `system_health_checks` 446k Zeilen / 111 MB, +~4k/Tag | Retention später | dokumentiert |

## 3. Frische Tests (29.09.)
| Test | Ergebnis |
|---|---|
| vitest | 392/392 (vor und nach Frontend-Fix) |
| CopeCart/Billing Node-Contracts | copecart-contract 4/4, ingest-wiring 11/11, period-end-capture 12/12, billing-trial-contract 7/7 |
| `scripts/hufmanager-copecart-lifecycle-tests.sql` (neu, C00–C16) | gegen **alten** Stand: bricht bei C01 mit FK-Fehler ab (= Befund 2 bewiesen). Lauf **nach** Migration lokal: vom Auto-Mode blockiert → steht aus |
| PROD Security-Smoke | 38/38 |
| PROD Billing-Access-Smoke | 11/11 |
| Employee E2E (PROD, `+qa-emp-0929`) | Einladung → Mail im Posteingang (noreply@) → Link app.hufmanager.de → Annahme im Browser → **mit Standardcode FAIL** (Befund 1). Nach Rollenkorrektur: Login → `/employee`, Reload, Mission Control verweigert, Logout (0 Auth-Keys), Re-Login PASS, 0 JS-Fehler. Negativ 15/15 (kein account_class/Billing/Entitlement-Write, kein Admin-RPC/-Function, keine fremden Betriebe) |
| Offline→Online + Kontowechsel (Browser) | PROD-Build 8/10 (kein Offline-Hinweis; Telemetrie-POST fälschlich gezählt) → Fix-Build 10/10: Offline-Hinweis, kein weißer Screen, Reconnect+Reload eingeloggt mit Daten, keine Nutzer-Writes, nach Logout keine TRIAL-Daten in Storage/IndexedDB/UI, auch nicht offline |
| Mail | Mitarbeiter-Einladung `noreply@` → Posteingang; Kunden-Einladungen `info@` 24.09. → Posteingang; Auth-Mails `team@` → Posteingang; Provider-Willkommensmail (alt) in Gmail nicht auffindbar |

## 4. Performance-Baseline PROD (24 h bis 29.09. ~10:10 UTC, nur Messung, kein Lasttest)
| Metrik | Wert |
|---|---|
| API-Requests | 15.729 · p50 70 ms · p95 410 ms · p99 930 ms · max 14,1 s (1 Request > 10 s: `horse_documents`) |
| 5xx | 2 (0,013 %) · 4xx 747 (davon 569 Monitoring-Job, s. Befund 8) |
| Zentrale Pfade p50/p95 | profiles 56/379 · horses 147/518 · appointments 15/984 · invoices 72/320 · user_roles 26/265 · access_context 48/695 · auth/token 119/543 ms |
| DB | 206 MB · 20 Verbindungen (1 aktiv, 0 idle-in-tx) |
| Cron | 2.157 Läufe/24 h, 0 Fehler, max 1,15 s (VACUUM net) · reconcile p95 224 ms |
| net._http_response | 517 Zeilen / 1,9 MB (Retention greift) · 2 Fehler/24 h |
| Baseline-Grenze (aus Ist) | p95 API < 1 s, 5xx < 0,1 %, keine Cron-Fehler, net < 5.000 Zeilen → **PASS**, kein 10–30-s-Incident-Muster |

## 5. Gates
| Gate | Status | Grund |
|---|---|---|
| AUTH | OWNER_ACTION | Confirm Email AUS (live `mailer_autoconfirm=true`); Site URL/Template nur im Dashboard. Code ist vorbereitet (alle Server-Pfade `email_confirm: true`; Signup + ConnectForm zeigen „E-Mail bestätigen“) |
| COPECART | READY_FOR_OWNER_PAYMENT (nach Migration) | Kette hufi-data-core → Lifecycle → Entitlement → Gate gelesen und = Repo; heute 04:19 echtes `recurring.upcoming` eines echten Abos korrekt angenommen |
| EMPLOYEE | FIX_READY | PASS nach Rollenkorrektur; Standardpfad braucht Deploy von Befund 1 |
| OFFLINE_CACHE | FIX_READY | Sicherheit PASS (keine Fremddaten); Hinweis-UI braucht Frontend-Deploy |
| PERFORMANCE | PASS | §4 |
| DATA_INTEGRITY | PASS | §1 |
| SECURITY | PASS | 38/38 + 11/11 + Employee-Negativ 15/15 |
| MOBILE (real Android) | OWNER_ACTION | Testzettel §6 C |
| INVITE_EMAIL | ACCEPTED_NON_BLOCKING | Einladungen kommen an (Mitarbeiter/Kunden); Provider-Mail-Fix bereit; DMARC `p=none` bleibt Owner-Thema |

## 6. Owner-Aktionen (eine Runde)
**A. Freigabe Deploy** (Antwort „Freigabe Deploy 29.09.“), danach führt Claude aus – in dieser Reihenfolge, jeweils mit Rücklese/Smoke:
1. lokal: Migration `20260929130000` anwenden + `scripts/hufmanager-copecart-lifecycle-tests.sql` (muss 24/24 zeigen)
2. PROD: `docs/backups/mig20260929130000_apply_canonical.sql` (md5 `4cd5d0a6…`, Vorzustands-Guards) · Rollback `docs/backups/mig20260929130000_rollback_PROD.sql`
3. Edge `accept-employee-invitation` (Befund 1) und `admin-create-user` (Befund 5) · Rollback = vorherige Repo-Stände (v86 / v136)
4. Frontend `./deploy.sh hufmanager` (Befund 4) · Rollback `./deploy.sh hufmanager --rollback` → `ceacdcb4`

**B. Supabase-Dashboard** → Projekt *HufManager* (`vnschgjxkzzwzefqlrji`)
1. Authentication → **URL Configuration** → Site URL: CURRENT `https://hufiapp.de` (laut Audit 28.09.; per API nicht auslesbar) → TARGET `https://app.hufmanager.de` → Save
2. dort **Redirect URLs** → prüfen/ergänzen: `https://app.hufmanager.de/**` (bestehende Einträge nicht löschen)
3. Authentication → **Emails** → Reiter **Confirm signup**: Link-Ziel muss `{{ .ConfirmationURL }}` sein (keine feste hufiapp.de-URL), Betreff z. B. „Bestätige deine E-Mail für HufManager“, Text mit „HufManager“ → Save
4. Authentication → **Sign In / Providers** → **Email** → „Confirm email“: CURRENT AUS → TARGET **AN** → Save
→ danach führt Claude den Signup-E2E mit genau einem neuen Konto `+qa-signup-0929` (account_class=qa) selbst durch.

**C. CopeCart-Echtkauf** (erst nach A.2)
1. In `https://app.hufmanager.de` einloggen als `barhufserviceschmid+qa-trial-admin-0928c@gmail.com` (Zugangsdaten in `~/.config/hufmanager-qa/credentials.env`, Schlüssel `QA_TRIAL_ADMIN_0928C_*`)
2. Trial-Banner → „Jetzt HufManager freischalten – 19,95 €/Monat“ → CopeCart-Checkout Produkt `3a97bd25`
3. **Im Checkout exakt diese E-Mail-Adresse verwenden** (sonst keine Zuordnung) und 19,95 € bezahlen
4. Danach Claude Bescheid geben → Claude prüft Event, Lifecycle, `ACTIVE/VERIFIED_PAID/copecart`, 1 Zeile, Trial beendet, Reload/Logout/Login, Banner weg
5. Abo anschließend in CopeCart kündigen → testet zugleich den Kündigungspfad (Zugang bis Periodenende)

**D. Realer Android-Test** – Konto `barhufserviceschmid+qa-trial@gmail.com` (Schlüssel `QA_TRIAL_*`), Chrome auf dem Handy, `app.hufmanager.de`
1. Login → Dashboard lädt, Trial-Banner sichtbar
2. Kunden & Pferde → Neuer Kunde „Android 0929“ (Tastatur verdeckt keine Felder, Speichern sichtbar)
3. beim Kunden Pferd „Android-Pferd 0929“ anlegen (Dropdowns öffnen/scrollen)
4. Tour/Termine → Termin für morgen mit Kunde+Pferd+Leistung anlegen
5. Termin öffnen → Uhrzeit ändern → speichern
6. Termin abschließen
7. Rechnung aus dem Termin erstellen → PDF öffnen → herunterladen/teilen → zurück
8. Seite neu laden (nach unten ziehen) → noch eingeloggt, Daten da
9. Mehr → Abmelden → erneut einloggen → Kunde/Pferd/Termin/Rechnung vorhanden
10. Handy auf Dunkelmodus → Kunden, Termin, Rechnung ansehen: nichts schwarz-auf-schwarz, keine verdeckten Buttons, Bottom-Nav frei, Zurück-Taste funktioniert, Modals schließen
11. Flugmodus an → in der App navigieren → roter Hinweis „Du arbeitest offline“ (erst nach Frontend-Deploy) → Flugmodus aus → neu laden
Ergebnis an Claude: pro Schritt OK/Fehler + Screenshot bei Fehler.

## 7. A-Deploy 29.09.2026 (~14:00–14:40, PROD vnschgjxkzzwzefqlrji)
| Schritt | Stand | Rollback |
|---|---|---|
| DB | Migration 20260929130000 per `docs/backups/mig20260929130000_apply_canonical.sql` (md5- + Vorzustands-Guards), Ledger-Head 20260929130000 | `docs/backups/mig20260929130000_rollback_PROD.sql` (jetzt byte-genau = PROD-Vorstand, lokal verifiziert) |
| Edge | `accept-employee-invitation` v88, `admin-create-user` v137 | v86 / v136 = Repo-Stände vor cdcb8180 |
| Frontend | Release 700dbc32 | `./deploy.sh hufmanager --rollback` → ceacdcb4 |

**Nachbesserung Employee (während Deploy gefunden):** `app_metadata.role` allein wirkt nicht – GoTrue schreibt
app_metadata bei `admin.createUser` erst nach dem Auth-INSERT, `handle_new_user` vergibt daher weiter `provider`.
v88 entfernt die Default-Rolle `provider` des soeben erzeugten Kontos vor dem Setzen von `employee`
(Abbruch + Konto-Löschung bei Fehler). Guard-Test `src/lib/employeeInviteRoleGuard.test.ts`.
QA-Konto `+qa-emp-0929b` (mit v87 angelegt) manuell bereinigt (nur employee, account_class qa);
`+qa-emp-0929c` (v88) ohne Eingriff korrekt: nur employee, 0 Entitlements, Login → /employee.

**Tests:** CopeCart-SQL lokal 26/26 (24 + C17a/b Bestandskunde), alter PROD-Funktionsstand scheitert an C03
(Geisterprofil) = Bug belegt; PROD-Funktionen md5-identisch mit getestetem Stand (bis auf
`hufi_data_ingest_and_project_v1`, lokal abweichend, nicht Teil der Migration). Direkter PROD-Lauf der Suite
(Rollback-Transaktion) vom Auto-Mode blockiert. Contract 34/34, Vitest 394/394, PROD-Smokes 38/38 · 11/11 · 19/19,
Offline/Kontowechsel 10/10, Employee-E2E 9/9, Employee-Security 11/11.
**Echter CopeCart-Kunde:** vor/nach identisch (1 Zeile ACTIVE, Zugang, Tabellen-md5 `be41168c…` unverändert),
nächste Zahlung wird ihm eindeutig zugeordnet (Resolver → eigenes Konto).
**Integrität:** real 28 · qa 11 · test_fixture 8 · demo 2, 0 Orphans, Trials nur 14 Tage, 0 Cron-Fehler/24 h, DB 206 MB.
**Performance** (12:05–12:40 UTC): p50 38 ms, p95 367 ms, 5xx 0.

**KPI-Funnel Dry-Run (real, nur lesend):** registriert 28 → E-Mail bestätigt 26 → aktiviert (bestätigt +
Kunde/Pferd/Termin/Rechnung/Leistung) 15 → Trial aktiv 1 → bezahlt (VERIFIED_PAID) 1.
Mission Control zählt heute `account_class = real` ohne Bestätigungs-/Aktivierungsfilter. Kein Captcha/Turnstile im
Code; 4 Signup-Wege (useAuth, ConnectForm, Botschafter ×2); 0 Signups in 24 h; Supabase-Auth-Rate-Limits nicht
auslesbar (kein Management-Token).
