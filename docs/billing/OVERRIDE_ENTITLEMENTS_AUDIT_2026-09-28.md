# Override-Entitlements / Manual-Access — Audit + vorbereiteter Fix (28.09.2026)

Status: **Analyse abgeschlossen, Fix LOKAL vorbereitet und getestet, NICHT auf PROD.**
PROD (`vnschgjxkzzwzefqlrji`, per `get_project` = HufManager/eu-central-1) nur **read-only** gelesen. Keine Nutzer verändert.
Keine personenbezogenen Daten in diesem Bericht (nur Aggregate/Klassen).

## 1. Kanonik (verifiziert)
- Zugang = ausschließlich `product_entitlements` (HUFMANAGER/HUFMANAGER_SLIM) über `_hm_has_hufmanager_access_v1`,
  `has_hufmanager_access_v1()` (RLS-Gates auf contacts/appointments/hoof_analyses/invoices/horses) und
  `get_hufmanager_access_context_v1()` (Frontend-Gate `HufmanagerSlimAccessGate`).
- `profiles.plan_override / subscription_* / access_valid_until` geben **keinen** Slim-Zugang (T7a). Sie steuern nur noch
  Legacy-Anzeigen/Feature-Flags (`useSubscription`, `useVaultAccess`, Mission Control).
- Gate-Lücke (vor Fix): `status='ACTIVE'` wird **ohne Enddatum** akzeptiert → befristete Grants laufen nie ab
  (Negativkontrolle lokal: abgelaufener Manual-Grant → Zugang **true**).

## 2. Inventar Mission-Control-Pläne (Code)
Angeboten in `src/components/admin/AdminProviderTab.tsx` (`PLAN_OVERRIDE_OPTIONS`, Anlage-Dialog + Bearbeiten-Dialog in
`src/pages/admin/MissionControl.tsx`); zweite, abweichende Planliste in `src/components/admin/AdminUserDB.tsx` (schreibt zusätzlich
`subscription_plan/subscription_status`). Alle Edit-Pfade schreiben **direkt `profiles`** (Admin-RLS), kein Entitlement.

`admin-create-user` v134: planOverride gesetzt → `profiles.plan_override`, `subscription_plan='pro'`, `is_manually_managed=true`,
`access_valid_until` (UI: lifetime/employee → 2099-12-31, manual_cash_1y → +1 Jahr); **kein** `signup_app` → kein Trial,
**kein Entitlement**. Standard (NULL) → `signup_app=hufmanager` → 14-Tage-Trial (live, PASS).

| Plan | UI-Label heute | fachlich | mit Slim (19,95 €) vereinbar |
|---|---|---|---|
| standard | „Standard (wartet auf Copecart)“ | aktiv | ja (Trial) — Label veraltet |
| copecart_starter/pro/duo/team | 9,90/29/49/79 €/Monat | **Legacy-Preismodell** vor Slim | nein |
| copecart_anfaenger/fortgeschritten/profi | „[Legacy] …“ | Legacy-Migrationshilfe | nein |
| lifetime_grant | Lifetime Grant | Owner-Grant | ja, als Manual Grant |
| manual_cash_1y | Barzahlung (1 Jahr) | Owner-Grant befristet | ja, als Manual Grant befristet |
| beta_tester | Beta Tester | offen | Business-Entscheidung |
| employee | Mitarbeiter | **kein** Provider-Tarif | nein (Mitarbeiter-Rolle) |

CopeCart-Overrides: setzen nur Strings, keine Zahlung, kein Entitlement; echte CopeCart-Zahlungen laufen ausschließlich über
`copecart-webhook` → `hufi_data_events` → Lifecycle → Projektor (Testzahlungen werden dort verworfen). → **Legacy-UI**, ausblenden.

## 3. PROD-Bestand (read-only, 28.09. ~14:40 UTC)
| Override | Profile | davon Provider | Entitlement | Status/Billing/Quelle | access_valid_until | Payment-Evidenz | Zugang |
|---|---|---|---|---|---|---|---|
| (standard/NULL) | 43 | 43 | 38 | 6 TRIAL_ACTIVE/NONE/SYSTEM · 3 ACTIVE/NONE/PROVEN_TRIAL · **28 ACTIVE/UNKNOWN_BILLING_STATE/AMBIGUOUS_ACTIVE_ONLY** · 1 LOCKED | – | 0 | 37 |
| lifetime_grant | 9 | **1** | 1 (Provider) | ACTIVE/**VERIFIED_PAID**/PROVEN_MANUAL_GRANT | Provider: keins | 0 | 1 |
| ↳ Nicht-Provider | 8 | – | 0 | 5 Kunde (3 gelöscht), 1 Partner, 1 Mitarbeiter, 1 Profil ohne Auth-User | teils 2027–2040 | 0 | 0 |
| manual_cash_1y | 2 | 2 | 2 | ACTIVE/**VERIFIED_PAID**/PROVEN_MANUAL_GRANT, **kein Ende** | 2027-01 / 2027-02 | 0 (kein manual_payments) | 2 |
| copecart_pro | 1 | 1 | 1 | ACTIVE/VERIFIED_PAID/PROVEN_PAID | 2200-12-31 | nur `copecart_subscription_id` + 1 **Test**zahlung (is_test) | 1 |
| copecart_starter | 1 | 1 | 0 | – | – | 0 | 0 |
| copecart_duo/team, Legacy-Anfänger/Fortg./Profi, beta_tester, employee | 0 | – | – | – | – | – | – |

## 4. Access-Gate-Realität je Typ
- **standard**: Trial → true bis Tag 14. 28 Alt-Provider haben **dauerhaft ACTIVE nur wegen `subscription_status='active'`**
  (Backfill-Klasse AMBIGUOUS_ACTIVE_ONLY, damals bewusst grandfathered, `legacy_compatibility_review_required=true`).
- **lifetime_grant (Provider)**: true — aber als `VERIFIED_PAID` markiert (falsch: Grant ≠ Zahlung).
- **manual_cash_1y**: true — **läuft nie ab** (kein Ende im Entitlement, Gate prüft keins) → nach 2027-01/02 weiter Zugang.
- **copecart_pro**: true — `VERIFIED_PAID` beruht auf Subscription-ID-String; einzige Zahlung ist Testzahlung.
- **copecart_starter**: false (kein Entitlement) — korrekt nach Regel B, sofern keine echte Zahlung existiert.
- **employee / Nicht-Provider-Lifetime**: false, und das ist richtig: Mitarbeiter arbeiten über `employee`-Rolle + `/employee`-Routen
  und `employee_profiles`; das Slim-RLS-Gate greift nur, wenn `provider_id = auth.uid()`. Kein eigenes Entitlement nötig.
- Kein Legacy-Override bekommt Zugang **allein** über aktuelle Profilstrings (Gate liest nur Entitlements). Die Altlasten stammen aus
  dem einmaligen Backfill (12.09.).

## 5. Vorhandener Writer?
Nein. Entitlement-Writer heute: Projektor `hm_project_hufmanager_entitlement_v1` (CopeCart-Events + `trial_started`),
Trial-Producer `hm_start_hufmanager_slim_trial_v1`, einmaliger Backfill. Enum `hm_lifecycle_event_name` kennt kein Manual-Grant-Event.

## 6. Vorbereiteter Fix (lokal) — `supabase/migrations/20260929090000_add_hufmanager_manual_access_writer_v1.sql`
- Enum + `manual_access_granted`, `manual_access_revoked`.
- Kern-Writer `hm_set_hufmanager_manual_access_v1(user, grant_type, valid_until, reason, actor)` — SECURITY DEFINER, nur
  `service_role`. Grant-Arten fest: `MANUAL_LIFETIME`, `MANUAL_FIXED_TERM` (Ende Pflicht, ≤ 5 Jahre), `BETA_ACCESS` (seit Owner-Entscheidung: Ende Pflicht),
  `REVOKE_MANUAL_ACCESS`. Produkt/Plan konstant. Validiert: Akteur ist Admin, kein Self-Grant, Ziel existiert, ist Provider,
  nicht gelöscht, Grund 3–200 Zeichen ohne E-Mail.
- Schreibt Audit-Event (`source=admin`, metadata: producer, grant_type, valid_from/until, reason, actor_id, previous_status/source)
  **und** das Entitlement in derselben Transaktion: `ACTIVE`, `billing_status=NONE`, `billing_provider='manual'`,
  `current_period_end = valid_until`, `source=MANUAL_GRANT`. Nie VERIFIED_PAID.
- Schutz: bezahlte Entitlements (CopeCart / echte PAID-Quellen) → `skipped_paid_entitlement` / `skipped_not_manual`;
  identischer Grant → `unchanged` (kein Event, keine Dublette); Revoke → `LOCKED`, Historie bleibt; Re-Grant möglich;
  Legacy-Manual-Grants (Backfill) nur per **expliziter** Admin-Aktion konvertierbar.
- Admin-Wrapper `hm_admin_set_hufmanager_manual_access_v1(user, grant_type, valid_until, reason)` für Mission Control
  (`authenticated`, Akteur = `auth.uid()`).
- Gates (`_hm_has…`, `has_hufmanager_access_v1()`, Kontext): zusätzlich `billing_provider='manual'` ⇒ Zugang nur bis
  `current_period_end`; Kontext-Reason `ACTIVE_MANUAL` bzw. `LOCKED` nach Ablauf. **Wirkung auf PROD-Bestand heute: 0 Zeilen**
  (auf PROD hat keine Zeile `billing_provider` gesetzt).
- Projektor/Reconciler unverändert (neue Events = No-Op dort).
- Frontend: nur Typ `ACTIVE_MANUAL` in `useHufmanagerSlimAccess.tsx`. **Noch nicht** angebunden: admin-create-user / Mission Control
  (erst nach Owner-Matrix).
- Rollback: `docs/backups/mig20260929_manual_access_prestate_functions_LOCAL.sql` (Gate-Funktionen, lokal = PROD-md5) +
  `DROP FUNCTION` der zwei neuen Funktionen; Enum-Werte bleiben (harmlos, ungenutzt).

## 7. Tests (lokaler Stack, Funktionen md5 = PROD)
`scripts/hufmanager-manual-access-tests.sql` → **50/50 PASS** (T0–T12 + S1–S10). Negativkontrolle vor Migration: abgelaufener
Manual-Grant → Zugang true (Lücke belegt); nach Migration false. Regression Trial-Suite 19/19, vitest 347/347.
Gefunden + behoben während Tests: NULL-Logik (`billing_provider` NULL bei Trial-Zeilen) ließ Revoke auf Trial-Nutzer zu.

## 8. Migration / Kompatibilität (Vorschlag, nichts ausgeführt)
| Klasse | Anzahl | Wer | Vorschlag |
|---|---|---|---|
| SAFE_AUTO_MIGRATION | **0** | – | Keine Gruppe ist ohne Owner-Bestätigung eindeutig belegt. |
| MANUAL_REVIEW | **4** (+28) | 1 Lifetime-Provider, 2 Barzahlung (Ende = access_valid_until 2027-01/02), 1 copecart_pro (Paid nur per ID-String + Testzahlung) · zusätzlich 28 AMBIGUOUS_ACTIVE_ONLY-Standard-Provider | Owner bestätigt je Fall → Admin-Aktion über Writer (Lifetime / Fixed-Term). copecart_pro: echte Zahlung klären. 28er-Gruppe: eigene Entscheidung (Grandfathering beenden?). |
| DO_NOT_MIGRATE | **8** | Lifetime-Strings bei Kunden/Partner/Mitarbeiter/verwaistem Profil | kein HufManager-Provider → kein Slim-Entitlement |
| UNKNOWN | **1** | copecart_starter ohne Zahlung, ohne Entitlement, seit 01/2026 inaktiv | Owner: echter Kunde? sonst so lassen (kein Zugang) |

## 9. Mission Control — Vorschlag (nicht umgesetzt)
Sichtbar: **„HufManager Slim – 14 Tage testen, danach 19,95 €/Monat“** (Standard) · „Lifetime (Owner-Grant)“ · „Befristeter Zugang
(Barzahlung) bis …“ (Datum Pflicht) · ggf. „Beta“ nach Entscheidung · „Zugang entziehen“. Mitarbeiter **nicht** über Provider-Anlage,
sondern über Mitarbeiter-Einladung.
Ausblenden: copecart_starter/pro/duo/team, copecart_anfaenger/fortgeschritten/profi, employee. Planliste in `AdminUserDB.tsx`
angleichen (schreibt heute Legacy-Status direkt). Anzeige „Plan/Status/Preis“ aus `product_entitlements` statt Legacy-Feldern.

## 10. Beta — Optionen (keine Entscheidung)
| Modell | Technik | Vorteil | Nachteil |
|---|---|---|---|
| A kostenlos ohne Ablauf | `BETA_ACCESS` ohne Ende | einfach, Beta-Tester bleiben | vergessener Dauer-Gratiszugang, Revoke manuell |
| B kostenlos bis Datum | `BETA_ACCESS` mit Ende | läuft automatisch aus, planbar | Datum pflegen/verlängern |
| C regulärer 14-Tage-Trial | Standard-Anlage | kein Sonderpfad | kein Beta-Vorteil; Trial nur 1× pro Identität |

## 11. Security Review (Entwurf)
Admin-only (Wrapper prüft `is_admin(auth.uid())`, Kern zusätzlich Akteur), kein Self-Grant, Mitarbeiter/Provider/Client/anon abgewiesen
(S2/S3/S7/S9), direkte Inserts in Entitlements/Lifecycle für `authenticated` verboten (S7c/d), feste Grant-Arten + Konstanten statt
Strings (T7c), keine Rechteausweitung über `user_metadata` (Writer liest es nicht), Audit mit Akteur (S8c), Grund ohne E-Mail (S6),
Revoke nur auf manuelle Zeilen, Paid unantastbar (T11). Keine Findings im Entwurf.
Neben-Findings (bestehend, nicht Teil des Fix): `prevent_billing_self_update` schützt `access_valid_until`,
`copecart_subscription_id`, `is_manually_managed` **nicht** vor Self-Update (heute ohne Zugangswirkung, da nicht kanonisch → P2);
Backfill hat Manual-Grants als `VERIFIED_PAID` markiert (P1-Datenqualität).

---

## 12. Owner-Entscheidungen (28.09.2026) und Umsetzung (lokal, NICHT PROD)
Freigegeben: Standard = 14-Tage-Trial · Lifetime = MANUAL_LIFETIME ohne Ende · Barzahlung = MANUAL_FIXED_TERM mit explizitem Ende ·
Beta = **Variante B** (BETA_ACCESS, Enddatum Pflicht) · Employee = kein Provider-Plan · Legacy-CopeCart ausgeblendet ·
kein Manual-Writer setzt VERIFIED_PAID · 28 Standard-Altprofile **GRANDFATHER TEMPORARILY** (keine Mutation).

Umgesetzt (Architektur + Rollback: `docs/billing/MANUAL_ACCESS_WRITER_ARCHITECTURE.md`):
- Writer + Admin-Wrapper final (Beta-Enddatum jetzt Pflicht).
- `admin-create-user`: nur standard/lifetime_grant/manual_cash_1y/beta_tester; andere Pläne 400 **vor** Anlage; Enddatum-Pflicht
  für Barzahlung/Beta; Grant über Writer mit Akteur; kein 2099-Default mehr; Antwort `manualAccess`.
- Mission Control: neue Planliste (4 Einträge, Standard-Label „HufManager Slim – 14 Tage testen, danach 19,95 €/Monat“),
  Enddatum-Feld nur bei Barzahlung/Beta und Pflicht; Bearbeiten-Dialog vergibt/entzieht über den Admin-Wrapper,
  Legacy-Werte nur als nicht wählbare Anzeige. **Nicht angefasst:** God-Mode `AdminUserDB` (eigene Legacy-Planliste,
  schreibt nur Profilfelder ohne Zugangswirkung) → Folgepunkt P2.
- P2-Härtung `20260929100000`: `access_valid_until`, `copecart_subscription_id`, `is_manually_managed`, `signup_app`,
  `vault_*`, `suspended_at/_reason` für Nicht-Admins mit Nutzer-JWT unveränderbar (auch über „connected profiles“).
  Keine legitimen Nutzer-Schreiber gefunden (nur Admin-UI + Service-Role).

## 13. Bestand vor PROD — Evidenz (read-only 28.09.) und Klassen
| Klasse | Count | Technische Begründung |
|---|---|---|
| SAFE_MANUAL_LIFETIME | **0** | Der eine Lifetime-Provider hat keinen Grant-Beleg: kein `admin_activity_log`-Eintrag, `is_manually_managed=false`, kein Enddatum, keine Zahlung — nur der Planstring. |
| SAFE_MANUAL_FIXED_TERM | **2** | Beide `manual_cash_1y`: Admin-Log `provider_created` mit `manual_cash_1y` am Anlagetag, `is_manually_managed=true`, `access_valid_until` = Anlagedatum + exakt 365 Tage (2027-01-15 / 2027-02-27), keine späteren Änderungen im Log. Migration = exakt diese Daten, nicht verlängert. Hinweis: das Datum hat damals die UI aus dem 1-Jahres-Plan gesetzt (nicht von Hand eingetippt). |
| MANUAL_REVIEW | **2** | Lifetime-Provider (s. o., Zugang bleibt unverändert bis Owner-Bestätigung); `copecart_pro`: keine echte Zahlung (0 Live-Rohevents per Mail/Subscription, 0 provider_subscriptions, 0 manual_payments; einziges CopeCart-Lifecycle-Event = Testzahlung `is_test=true`), VERIFIED_PAID stammt aus dem Backfill per `copecart_subscription_id`-String → Zugang bleibt, nicht automatisch entziehen. |
| GRANDFATHER_UNCHANGED | **28** | Standard-Provider `ACTIVE/UNKNOWN_BILLING_STATE/LEGACY_BACKFILL_AMBIGUOUS_ACTIVE_ONLY`; keine Mutation (T20). Zusätzlich 3 `LEGACY_BACKFILL_PROVEN_TRIAL` (ACTIVE/NONE, Alt-Trial grandfathered) — ebenfalls unverändert, gehören in dieselbe spätere Klassifizierung. |
| UNKNOWN | **1** | `copecart_starter`: keine Zahlung, kein Entitlement, kein Zugang, seit 01/2026 inaktiv → nicht migrieren, kein Entitlement. |
| DO_NOT_MIGRATE | **8** | `lifetime_grant` bei Nicht-Providern (5 Kunden, davon 3 gelöscht; 1 Partner; 1 Mitarbeiter; 1 Profil ohne Auth-User) → kein HufManager-Provider. |

## 14. Tests (lokal, Funktionen md5 = PROD)
Manual-Access T1–T20 + Migration M1–M3 + Security S1–S5: **59/59** · Härtung **7/7** (Negativkontrolle vorher 4/7) ·
Trial-Regression **19/19** · vitest **358/358** (inkl. Planliste/Edge-Guard) · `deno check` admin-create-user sauber.
