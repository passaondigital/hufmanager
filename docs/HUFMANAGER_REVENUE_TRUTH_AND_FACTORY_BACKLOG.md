# HufManager — Revenue Truth, Account Lifecycle und Factory-Backlog

**Stand: 2026-09-21. Reines Backlog-Dokument. Keine Implementierung, keine Tabellen, keine
Trigger, keine Billing-Logik geaendert.**

Dieses Dokument haelt fachliche Entscheidungen fest, die nach Abschluss der
Invite-/Ghost-Kette (#5–#9) umgesetzt werden. Die Migrationsevidenz liegt separat in
`HUFMANAGER_MIGRATION_LEDGER_RECONCILIATION_2026-09-21.md`.

---

## 1. Ausgangslage — read-only aus Production erhoben

| Groesse | Wert |
|---|---|
| Auth-User | 64 |
| Rollen | provider 37 · client 23 · admin 2 · employee 1 · partner 1 |
| Provider mit mindestens einem Login | 27 von 37 |
| Clients mit mindestens einem Login | 19 von 23 |
| Profile `subscription_status='active'` | 53 |
| Profile `subscription_status='trialing'` | 11 |

### Belastbare Zahlungsindikatoren

| Indikator | Wert |
|---|---|
| Profile mit `copecart_subscription_id` | **1** |
| `provider_subscriptions` | **0** |
| `manual_payments` | **0** |
| `admin_provider_payments` | **2** (Summe 1147 EUR) |
| `client_subscriptions` | 4 (fachlich separater Bereich, **kein** SaaS-Umsatz) |

### Der Kernbefund

**53 Profile stehen auf `active`. Belastbare Zahlungsbelege existieren fuer hoechstens 3.**

`subscription_status='active'` ist in HufManager **kein Zahlungsnachweis**. Es ist ein
Zugriffs-Flag, das an mehreren Stellen gesetzt wird, ohne dass je ein Zahlungsereignis
verknuepft wurde. Jede Umsatzaussage, die auf diesem Feld beruht, ist unbelegt.

**Verbindliche Regel: `active` != `paid`. Keine Kennzahl "zahlender Kunde" ohne
Zahlungsnachweis.**

---

## 2. Revenue Truth — getrennte Zustandsraeume

Heute vermischt ein einziges Feld vier fachlich unabhaengige Fragen. Sie werden getrennt:

### USER STATUS — was macht der Mensch?
`ACTIVE` · `DORMANT` · `PAUSED` · `CANCELLED`

### SUBSCRIPTION STATUS — was sagt der Vertrag?
`TRIAL` · `ACTIVE` · `PAST_DUE` · `CANCELLED`

### PAYMENT STATUS — ist Geld geflossen?
`PAID` · `FAILED` · `REFUNDED` · `CHARGEBACK` · `MISSING`

### DATA STATUS — was darf mit den Daten passieren?
`LIVE` · `RETENTION` · `ANONYMIZED` · `DELETED`

### Zusaetzliche Felder

```
PAYMENT_VERIFIED          boolean — nur true mit belegtem Zahlungsereignis
PAYMENT_PROVIDER          copecart | stripe | manual | …
EXTERNAL_SUBSCRIPTION_ID  Referenz beim Zahlungsanbieter
LAST_PAYMENT_AT
NEXT_PAYMENT_DUE
MRR                       tatsaechlich wiederkehrend
EXPECTED_MRR              vertraglich erwartet
ACTUAL_RECEIVED
OUTSTANDING_AMOUNT
```

`PAYMENT_VERIFIED` ist das einzige Feld, das "zahlender Kunde" begruendet. Es darf nie aus
einem Status abgeleitet werden, sondern ausschliesslich aus einem Ledger-Event.

---

## 3. Billing Ledger — append-only

Zahlungen werden als **unveraenderliches Ereignisprotokoll** modelliert, nicht als
mutierbarer Zustand. Der aktuelle Zustand ist eine Projektion des Ledgers.

### Ereignistypen

```
SUBSCRIPTION_CREATED · PAYMENT_CAPTURED · PAYMENT_FAILED · PAYMENT_RETRY_SUCCESS
REFUND · CHARGEBACK · CANCELLATION · PLAN_CHANGED
```

### Mindestfelder je Event

```
event_id                  eindeutig, idempotenzfaehig
account_id / provider_id
subscription_id
event_type
amount · currency
payment_provider
external_reference        Referenz beim Anbieter
occurred_at               wann es beim Anbieter passierte
received_at               wann wir es erfahren haben
raw_payload               unveraenderlich, zur Rekonstruktion
```

**Keine historische Zahlung darf ueberschrieben werden.** Korrekturen sind neue Events
(`REFUND`, `CHARGEBACK`), keine Updates. Die historische Abrechnung muss zu jedem Zeitpunkt
rekonstruierbar bleiben — auch fuer steuerliche Nachweise.

`occurred_at` und `received_at` sind bewusst getrennt: verspaetet zugestellte Webhooks
duerfen die Umsatzperiode nicht verfaelschen.

---

## 4. Account Lifecycle

### Inaktivitaet

| Schwelle | Zustand | Aktion |
|---|---|---|
| 30 Tage kein Login | `DORMANT` | Erinnerung / Reaktivierungsansprache |
| 60 Tage | `DORMANT` | zweite Erinnerung |
| 90 Tage inaktiv **und nicht zahlend** | `CLEANUP_CANDIDATE` | manuelle Pruefung |

### Niemals automatisch loeschen

* aktive zahlende Accounts — **Inaktivitaet allein ist nie ein Loeschgrund fuer zahlende Nutzer**
* gesetzlich aufzubewahrende Rechnungs- und Zahlungsdaten
* Zahlungsnachweise
* sonstige Daten mit Aufbewahrungs- oder Nachweispflicht

`CLEANUP_CANDIDATE` ist ein Pruefauftrag, kein Loeschbefehl. Personenbezogene Daten werden
erst nach einer sauberen Retention-/Anonymisierungsregel entfernt; die Buchhaltungsspur
bleibt.

### Nichtzahlung

```
PAYMENT_FAILED → Grace Period → PAUSED_NONPAYMENT
                                      ↓ Zahlung erfolgreich
                                 ACTIVE_PAID
```

---

## 5. Money-Leak-Monitoring — taeglich automatisiert

Jede Abweichung erzeugt einen Alert mit **Betrag, betroffenem Account und, soweit
bestimmbar, Ursache**.

| # | Pruefung | Bedeutung |
|---|---|---|
| 1 | Anbieter sagt bezahlt, HufManager sagt `PAUSED` | Kunde zahlt, bekommt aber nichts |
| 2 | HufManager sagt `ACTIVE_PAID`, kein Zahlungsbeleg | Wir verschenken Leistung |
| 3 | Zahlung faellig, kein Payment-Event | stille Zahlungsluecke |
| 4 | `PAYMENT_FAILED`, Zugriff bleibt voll | Nichtzahler mit Vollzugriff |
| 5 | `REFUND`/`CHARGEBACK`, Zugriff unveraendert | erstattet und trotzdem nutzbar |
| 6 | bezahlt, Features nicht freigeschaltet | Kunde zahlt fuer Gesperrtes |
| 7 | externe und interne Billing-Daten widersprechen sich | Datenintegritaet |
| 8 | `EXPECTED_MRR` != `ACTUAL_RECEIVED` | Differenz ausweisen, nicht glaetten |

---

## 6. Business Dashboard

### Provider-Funnel
`Registered` · `Ever logged in` · `Active last 30d` · `Dormant` · `Trial` · `Active Paid` ·
`Past Due` · `Paused` · `Cancelled` · `Cleanup Candidate`

### Revenue
`Active paying customers` · `MRR` · `Expected MRR` · `Actual received` · `Outstanding` ·
`Payment failed` · `Refunds` · `Chargebacks` · `Churn`

Keine Kachel darf eine Zahl zeigen, die nicht aus dem Billing Ledger belegbar ist.

---

## 7. Churn — nicht nur DASS, sondern WARUM

Bei Kuendigung strukturierten Grund erfassen:

`zu teuer` · `brauche es nicht` · `zu kompliziert` · `technische Probleme` ·
`fehlende Funktion` · `anderer Anbieter` · `Betrieb aufgegeben` · `sonstiges`

Spaeter korrelieren: Kuendigung ↔ Fehler ↔ Supportfaelle ↔ fehlende Features ↔
Nutzungsintensitaet ↔ Payment Failures.

---

## 8. Test-Isolation — harte Regel

**Anlass:** Am 2026-09-21 hat die Testinstanz `mig34-isolated-test` waehrend eines
Parallelitaetstests fuer Migration #7 einen echten HTTP-Aufruf an die **Produktions**-Edge-
Function `notify-new-registration` abgesetzt. Ursache: Der Container ist ein Klon von
Production **inklusive Trigger-Funktionen mit fest eincodierten Produktions-URLs**, und
`pg_net` ist dort installiert. Folge: eine echte Benachrichtigungszeile in Production plus
sehr wahrscheinlich eine Admin-E-Mail. Die Produktionsdatenbank war sonst unberuehrt.
Details in NACHTRAG 11, Abschnitt N11.3.

### Die Regel

> **"isolated database" ist nicht "network isolated".**

Vor **jedem** Schreibtest muss automatisiert nachgewiesen sein:

* keine Production-URL in Funktionskoerpern, Settings oder Secrets
* keine Production-Service-Keys in der Testumgebung
* **keine aktiven Trigger mit `net.http_post` Richtung Production**
* keine Edge-Function-Aufrufe gegen Production
* keine Production-Webhooks
* keine externen Mail-/SMS-/Payment-Seiteneffekte

**Ist die Isolation nicht nachweisbar, wird der Schreibtest blockiert.**

### Umsetzung

Als harter Hook bzw. CI-Gate. Beispielhafte Pruefung, die heute schon greift:

```sql
SELECT count(*) FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND p.prosrc LIKE '%net.http_post%'
  AND t.tgenabled = 'O';
-- muss 0 sein, sonst: Schreibtest verweigern
```

Aktueller Stand der Testinstanz: **0 aktiv, 5 deaktiviert.**

---

## 9. Development Factory — Reihenfolge

Nach Abschluss der Invite-Kette:

1. `CLAUDE.md`
2. `.claude/rules/` — product · database-security · tenant-isolation · production-release ·
   testing · mobile-ux · material-lager
3. `.claude/skills/` — hm-audit · hm-feature · hm-migration · hm-release · hm-golden-flow ·
   hm-inventory
4. Hooks — Tests · Typecheck · Lint · Migration-Baseline · Secret-Scan ·
   **Dangerous-Production-Write-Guard** · **Test-Isolation-Guard** · Pre-Commit-Verification
5. `.claude/agents/` — architect · database · security · qa · ux-mobile · inventory-domain
6. GitHub Actions
7. Playwright Golden Flow
8. Supabase Test-/Staging-Isolation (siehe Abschnitt 8)
9. Security CI
10. Revenue Truth / Billing Audit (Abschnitte 2–7)
11. Material/Lager Core

---

## 10. Material / Lager — Core, nicht Anhang

**Zielgruppe:** Barhufbearbeiter · Hufpfleger · Huforthopaeden · Huftechniker · Hufschmiede.

**Golden Flow:**

```
Customer → Horse → Appointment → Work → Documentation
        → Material Usage → Inventory → Invoice → Payment → Next Appointment
```

Material sitzt zwischen Arbeit und Rechnung — dort entsteht die Marge.

### Modell

```
material_product      Produkt, Hersteller, Steuersatz, Einheit
material_variant      Variante/Groesse, EK, VK, Marge, Mindestbestand
storage_location      Hauptlager · Fahrzeuglager · Werkstatt
inventory_movement    Verbrauch · Umlagerung · Rueckgabe · Verlust ·
                      Ausschuss · Einkauf  — append-only Ledger
material_usage        (appointment, horse, variant, menge)
                      → erzeugt Rechnungsposition + Pferdehistorie
```

### Zwei Architekturprinzipien

**Bestand als append-only Movement-Ledger**, Saldo abgeleitet — nie als mutierbarer Zaehler.
Sonst ist Schwund nicht rekonstruierbar.

**Preise historisiert/versioniert.** Die Rechnungsposition traegt einen **Preis-Snapshot zum
Rechnungszeitpunkt**; eine alte Rechnung muss den damaligen Preis zeigen, auch wenn EK/VK
sich spaeter aendern.

Beispiele: Hufeisen · Aluminium · Kunststoff-/Verbundbeschlag · Klebebeschlag · Hufschuhe ·
Pads · Einlagen · Naegel · Stollen · Kleber · Primer · Casting Tape · Verbrauchsmaterial.

---

**STOPP.** Keine Implementierung aus diesem Dokument ohne gesonderte Freigabe.
