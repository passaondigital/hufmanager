# Storage-Quota-Plan — 5 GB pro Nutzer

> Stand: 2026-08-02. Reine Bestandsaufnahme + Konzept, keine Migration
> ausgeführt, keine Server-Implementierung. Grundlage für die
> Produktentscheidung "5 GB Speicher pro Nutzer inklusive" (Landingpage,
> Hufi-Lab-Vorschau).

---

## 1. Aktueller Zustand

Es existiert bereits ein **echtes, produktiv laufendes** Speicher-Quota-
System — unabhängig von der neuen "5 GB pro Nutzer"-Story:

- `src/hooks/useStorageQuota.tsx` definiert `STORAGE_QUOTAS` für drei
  Entitätstypen: `provider` (10 GB, max. 50 MB/Datei), `client` (1 GB, max.
  20 MB/Datei), `horse` (500 MB, max. 10 MB/Datei).
- Tabelle `public.storage_usage` (Migration
  `20260124145129_1d7e5f01-ecde-4cb5-bd61-a8e8ce6f3f3c.sql`): eine Zeile pro
  hochgeladener Datei — `entity_type`, `entity_id`, `bucket_name`,
  `file_path`, `file_size_bytes`, `uploaded_by`. Verbrauch wird bei jedem
  Lesevorgang über `SUM(file_size_bytes)` berechnet (keine laufende
  Saldozeile).
- RPC `get_storage_usage(entity_type, entity_id)`: Summe des Verbrauchs.
  Wurde in der IDOR-Fix-Migration `20260719080000_fix_minor_idor_functions.sql`
  um echte Aufrufer-Autorisierung ergänzt (Admin, Provider selbst, Kunde
  selbst/verknüpfter Provider über `access_grants`, Pferdebesitzer/
  zugeordneter Provider).
- RPC `check_storage_quota(entity_type, entity_id, file_size_bytes)`:
  prüft vor dem Upload gegen die hartkodierten Limits aus derselben
  Migration und liefert `allowed`, `current_usage`, `quota_limit`,
  `remaining` etc. zurück.
- Frontend-Komponente `src/components/storage/StorageQuotaCard.tsx` zeigt
  diesen echten Verbrauch an (genutzt z. B. im Pferdeakte-Kontext).

**Diese Zahlen (10 GB/1 GB/500 MB, nach Entität) stehen im direkten
Widerspruch zur neuen Produktentscheidung "5 GB pro Nutzer".** Das neue
Modell (`src/lib/hufi-storage-plans.ts`) ist deshalb bewusst als separate
Konfiguration angelegt und **nicht** an `useStorageQuota` angebunden — siehe
Abschnitt 13 für die Empfehlung, wie beide zusammengeführt werden sollten.

---

## 2. Welche Uploads heute nur verarbeitet und nicht dauerhaft gespeichert werden

| Upload-Weg | Datei | Ziel-Bucket | Persistiert? | Quota angebunden? |
|---|---|---|---|---|
| HM-CAM (Huf-Fotos) | `src/components/hufcam/HufCamPro.tsx` | `hoof_photos` | Ja | **Nein** |
| Pferdeakte-Röntgen | `src/components/pferdeakte/XrayUpload.tsx` | `horse-documents` | Ja | **Nein** (nur Client-seitiges 20-MB-Limit) |
| Pferdeakte-Dokumente | `src/components/horse-detail/TabDokumente.tsx` | `horse-documents` | Ja | **Ja** — ruft `checkQuota()`/`trackUpload()` |
| Rechnungsbeleg-Scan | `src/components/expenses/ReceiptScanner.tsx` | `documents` (nach der KI-Auswertung) | Ja, aber getrennt vom Analyseschritt | **Nein** |
| Fahrtkosten-Belege | `src/components/workmode/MileageTracker.tsx` | `expense-receipts` | Ja | **Ja** — ruft `checkQuota()`/`trackUpload()` |
| Profilbilder | `src/components/client/ClientAvatarUpload.tsx` | `avatars` | Ja | **Nein** |
| Hufi-Lab Beobachtungs-Foto | Edge Function `analyze-hoof-image` | — | **Nein**, reines Analyseergebnis (JSON) zurück, kein Storage-Write | entfällt |
| Beleg-Feldextraktion | Edge Function `scan-receipt` | — | **Nein**, reines Analyseergebnis (JSON), Persistenz erfolgt getrennt im Frontend | entfällt |

Nur zwei von sechs echten Upload-Flows (Pferdeakte-Dokumente,
Fahrtkosten-Belege) sind heute tatsächlich an eine Quota-Prüfung
angebunden. Die "5 GB inklusive"-Aussage auf der Landingpage bezieht sich
also auf ein Ziel, das technisch erst in Teilen existiert — deshalb der
bewusst zurückhaltende Text ("wird schrittweise freigeschaltet") statt
einer Verfügbarkeitsbehauptung.

---

## 3. Geplante Datenkategorien

- Pferdeakte-Dokumente (Befunde, Röntgenbilder, Verträge)
- Huf-/Beobachtungsfotos (HM-CAM, Galerie-Upload)
- Rechnungs- und Ausgabenbelege
- Profil-/Avatarbilder
- Signaturen, Abnahmeprotokolle, Übergabedokumente (bereits vorhandene
  Bucket-Landschaft, siehe Abschnitt 4)

---

## 4. Vorgeschlagene Storage-Buckets

Bereits vorhanden (aus `INSERT INTO storage.buckets` in den Migrationen,
Auszug relevant für Nutzerspeicher):

| Bucket | Sichtbarkeit | Zweck |
|---|---|---|
| `horse-vault` | privat, 10 MB/Datei | Pferdeakte-Tresor |
| `horse-documents` | privat | Pferdeakte-Dokumente/Röntgen |
| `horse-media`, `horse-photos` | privat (nachträglich von public umgestellt) | Pferdefotos |
| `admin-invoices` | privat, 10 MB/Datei | Rechnungen |
| `expense-receipts` | privat | Ausgabenbelege |
| `verification-docs` | privat | Verifizierungsunterlagen |
| `partner-documents`, `legal-documents` | privat | Vertrags-/Rechtsdokumente |
| `avatars`, `employee-avatars` | teils public | Profilbilder |
| `hoof_photos` | — | HM-CAM-Fotos (Bucket-Erzeugung nicht in den Migrationen auffindbar, vermutlich per Dashboard angelegt — **Dokumentationslücke**, sollte nachgezogen werden) |
| `documents` | — | Belege nach KI-Auswertung (gleiche Lücke wie `hoof_photos`) |
| `blog-images`, `gallery`, `logos` | public | Marketing, unkritisch für Nutzerquota |

Für das 5-GB-Produkt sind keine neuen Buckets nötig — die Kategorien
existieren bereits. Empfehlung: `hoof_photos` und `documents` nachträglich
als Migration erfassen (nur dokumentieren, nicht in diesem Auftrag
anlegen), damit die Bucket-Landschaft vollständig in Git nachvollziehbar
ist.

---

## 5. Zuordnung pro Nutzer bzw. Organisation

Im Schema existiert bereits ein Organisations-/Team-Konzept: `employees`
(`src/hooks/useEmployees.tsx`) verknüpft Mitarbeitende über `provider_id`
und `organization_id`; die Funktion `get_user_organization(_user_id)`
(Migration `20260121095002_...sql`, angepasst in
`20260719080000_fix_minor_idor_functions.sql`) löst die Organisation eines
Nutzers auf. Ein Hufbearbeiter-Account ist also nicht zwingend eine
Einzelperson — mehrere Mitarbeitende können demselben Account/derselben
Organisation zugeordnet sein.

→ Siehe Empfehlung in Abschnitt 13.

---

## 6. Verbrauchsmessung

Heutiges Muster (`storage_usage`): eine Zeile pro Datei, Verbrauch wird bei
jedem Abruf per `SUM()` berechnet — korrekt, aber bei wachsender Dateizahl
nicht kostenlos (kein Index-Problem bei aktueller Größe, aber ohne
laufenden Saldo).

Alternatives, im Projekt bereits vorhandenes Muster: Voice-Guthaben
(`hufi_voice_credits` + `hufi_voice_credit_transactions`, Migration
`20260717120000_hufi_voice_credits.sql`) — eine Saldozeile pro Nutzer plus
ein Append-only-Transaktionslog. Für Speicher wäre eine Mischung sinnvoll:
`storage_usage` (eine Zeile pro Datei) bleibt die Wahrheitsquelle für
Löschung/Audit, ein zusätzlicher, per Trigger gepflegter Saldo (analog zum
Guthabenmodell) vermeidet aber teure `SUM()`-Abfragen bei jeder
Quota-Prüfung.

---

## 7. Quota-Prüfung

Muster aus `check_storage_quota` weiterverwenden: Prüfung **vor** dem
Upload (`p_file_size_bytes` gegen `remaining`), serverseitig als
`SECURITY DEFINER`-RPC. Wichtig: die Funktion muss wie `get_storage_usage`
eine Aufrufer-Autorisierung erhalten (siehe Risiko in Abschnitt 15) und auf
5 GB inklusive statt der aktuellen entitätsspezifischen Werte umgestellt
werden — sobald die Produktentscheidung technisch verbindlich wird.

---

## 8. Soft Limit und Hard Limit

Empfehlung, konsistent mit den bereits im Code vorhandenen Schwellen
(`StorageQuotaCard.tsx`, jetzt auch `hufi-storage-plans.ts`):

- **Soft Limit bei 80 %**: Hinweis in der UI ("wird knapp"), keine Sperre.
- **Soft Limit bei 95 %**: deutliche Warnung, Upload weiterhin möglich.
- **Hard Limit bei 100 %**: `check_storage_quota` liefert `allowed: false`,
  Upload wird serverseitig abgelehnt (nicht nur clientseitig, siehe
  Abschnitt 13).

---

## 9. Löschlogik

- Löschen einer Datei muss die zugehörige `storage_usage`-Zeile entfernen
  (`removeUpload` in `useStorageQuota.tsx` existiert bereits als Muster,
  wird aber nicht von allen Upload-Flows aufgerufen — siehe Abschnitt 2).
  Ein DB-Trigger auf `storage.objects`-Löschung wäre robuster als das
  aktuelle rein clientseitige `removeUpload`.
- Papierkorb-/Aufbewahrungsfrist vor endgültigem Löschen sollte definiert
  werden, bevor Hard Limits scharf geschaltet werden — sonst können Nutzer
  am Limit keine neuen Dateien mehr anlegen, obwohl sie gerade gelöscht
  haben (Race Condition, siehe Abschnitt 13).

---

## 10. DSGVO-Aspekte

- Alle relevanten Buckets sind bereits privat (Ausnahme: bekannter Fund zu
  `hufcam-images`, siehe `HUFI_TODO.md` Punkt 13 — als public-Bucket
  eingestuft, aktuell leer, kein Schreibpfad gefunden, aber Status sollte
  vor Produktivsetzung der 5-GB-Quota geklärt werden).
- Löschung auf Nutzeranfrage muss Speicherverbrauch korrekt zurückrechnen
  (siehe Abschnitt 9) — sonst bleibt ein DSGVO-Löschauftrag technisch
  unvollständig, auch wenn die Datei selbst gelöscht wurde.
- EU-Hosting (Supabase Frankfurt, laut `CLAUDE.md`) bleibt unverändert
  relevant für die Speicherkommunikation ("DSGVO-konform · EU-Server" ist
  bereits Teil der `includedFeatures`-Liste auf der Landingpage).

---

## 11. Aufbewahrung und Export

Noch nicht vorhanden: ein Datenexport pro Nutzer/Organisation über alle
Buckets hinweg. Für die 5-GB-Story relevant, sobald reale Kündigungen mit
Datenmitnahme möglich sein sollen — nicht Teil dieses Auftrags, aber als
offener Punkt zu vermerken.

---

## 12. Spätere Zusatzpakete

`ADD_ON_STORAGE_PLANS` in `src/lib/hufi-storage-plans.ts`: +15 GB, +25 GB,
+50 GB, Status `planned` / `in_preparation`, bewusst **ohne Preisfeld** —
im Projekt existiert aktuell keine verlässliche Preisdefinition für diese
Pakete. Auf der Landingpage als reine Info-Kacheln mit Badge "In
Vorbereitung" dargestellt, kein Checkout, kein Kaufbutton.

---

## 13. Migration in sinnvollen Phasen

Empfehlung zur Quota-Ebene: **pro Organisation/Account, nicht pro
einzelnem `auth.uid()`.** Begründung: Das Schema hat bereits ein
Organisationskonzept (`get_user_organization`, `employees.organization_id`)
— mehrere Mitarbeitende teilen sich einen Account. Eine Quota pro
individuellem Nutzerkonto würde bei Teams entweder unfair (jede Person 5 GB
einzeln, Kosten explodieren) oder unbrauchbar (ein Mitarbeitender verbraucht
das Team-Kontingent allein) wirken. Vorschlag für die Phasenfolge:

1. **Phase 0 (dieser Auftrag):** Produktkonfiguration + Kommunikation, keine
   Durchsetzung.
2. **Phase 1:** `check_storage_quota` erhält Aufrufer-Autorisierung (analog
   zum bereits gefixten `get_storage_usage`) und einen neuen
   `organization`-Entitätstyp mit 5-GB-Limit; bestehende
   `provider`/`client`/`horse`-Typen bleiben zunächst parallel bestehen,
   um laufende Aufrufer nicht zu brechen.
3. **Phase 2:** Alle Upload-Flows aus Abschnitt 2, die heute nicht
   angebunden sind (HM-CAM, Röntgen, Belegablage, Avatare), rufen
   `checkQuota`/`trackUpload` konsequent auf — inklusive Soft-Limit-UI.
4. **Phase 3:** Hard Limit serverseitig scharf schalten, `hoof_photos`/
   `documents`-Buckets nachträglich als Migration erfassen.
5. **Phase 4:** Zusatzpakete real anbindbar machen (Preisdefinition,
   Zahlungsanbindung) — erst wenn Phase 1–3 stabil sind.

---

## 14. Rollback

Da in diesem Auftrag keine Migration ausgeführt wird, ist kein
DB-Rollback nötig. Für spätere Phasen: jede Migration in Phase 1–3 sollte
additiv sein (neue Spalten/Funktionen, keine Änderung bestehender
`provider`/`client`/`horse`-Limits), damit ein Rollback durch reines
Zurücksetzen der neuen Migration ohne Datenverlust möglich bleibt.

---

## 15. Risiken

- **Zentrales Risiko:** Die "5 GB pro Nutzer"-Kommunikation läuft aktuell
  vollständig ohne technische Entsprechung — reines Vorbereiten ist correct
  für diese Runde, aber die Landingpage-Formulierung muss ehrlich bleiben,
  bis Phase 1–3 (Abschnitt 13) umgesetzt sind.
- **Bestehende Sicherheitslücke (unverändert, nicht Teil dieses Auftrags):**
  `check_storage_quota` wurde bei der IDOR-Fix-Migration
  (`20260719080000_fix_minor_idor_functions.sql`) **nicht** mit angepasst —
  anders als `get_storage_usage` erhielt sie keine Aufrufer-Autorisierung.
  Sollte vor Phase 1 nachgezogen werden.
- **Uneinheitliche Quota-Anbindung:** vier von sechs Upload-Flows umgehen
  die Quota-Prüfung komplett (Abschnitt 2) — ein Hard Limit auf Basis der
  heutigen `storage_usage`-Zahlen würde den realen Verbrauch unterschätzen.
- **Zwei Buckets ohne Migrationsspur** (`hoof_photos`, `documents`) —
  erschwert Nachvollziehbarkeit und Policy-Audits.
- **Nie nur clientseitig durchsetzen:** jede Client-seitige Prüfung (wie
  aktuell bei `XrayUpload.tsx`, nur 20-MB-Dateigrößen-Check) ist umgehbar;
  Hard Limits gehören ausschließlich in serverseitige RPCs/Storage-Policies.
- **Race Conditions:** paralleles Hochladen kurz vor Erreichen des Limits
  kann `check_storage_quota` zweimal mit noch nicht aktualisiertem
  `current_usage` treffen — eine spätere Implementierung sollte den
  Verbrauchs-Insert und die Prüfung in derselben Transaktion/RPC kapseln,
  nicht als zwei getrennte Client-Aufrufe (wie aktuell in
  `TabDokumente.tsx`/`MileageTracker.tsx`).
- **Versionen/Thumbnails:** aktuell nicht im `storage_usage`-Modell
  berücksichtigt — jede erzeugte Miniaturansicht oder Dateiversion muss als
  eigene Zeile gezählt werden, sonst unterschätzt die Quota den realen
  Bucket-Verbrauch.
