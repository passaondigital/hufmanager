# HufiBoss — kanonisches HufManager-Wissen

**Status:** SOURCE OF TRUTH für HufiBoss/HufiOS zum ausgelieferten HufManager  
**Stand:** 14.08.2026

## Produktidentität

HufManager ist ein produktives, eigenständig ausgeliefertes B2B-Produkt für Hufbearbeiter/Hufpfleger. Es ist nicht nur ein Legacy-Alias der HufiApp.

Produktionsgrenzen:
- `hufmanager.de` = HufManager Landingpage
- `app.hufmanager.de` = HufManager App
- `hufiapp.de` = getrennte HufiApp-Auslieferung

HufManager und HufiApp dürfen technisch dieselbe historische Codebasis/Backends teilen, aber ihre Frontend-Auslieferung und Produktpositionierung sind getrennt zu behandeln. Ein HufManager-Deploy darf den HufiApp-Webroot nicht überschreiben.

## Aktueller Go-Live-Status

Kanonisch bestätigt:
- HufManager Relaunch 2026 produktiv
- App und Landing HTTP 200
- 148/148 Unit Tests PASS
- Build PASS
- Build = Deploy = Live verifiziert
- P0 Security 5/5 PASS
- Production Acceptance mit Provider, Client und Partner durchgeführt
- `DENNIS_READY=YES`
- `READY_FOR_REAL_CUSTOMER=YES`

Die zusätzliche P1-Härtung der Partner-Einladungsannahme ist in Production vorhanden: `anon` und `PUBLIC` haben kein EXECUTE, `authenticated` hat EXECUTE, Caller-ID wird an `auth.uid()` gebunden.

## Provider-UX

Primäre Provider-Navigation:
1. Heute
2. Tour
3. Kunden & Pferde
4. Hufi Hufanalyse
5. Finanzen
6. Mehr

Spezialisierte Fachseiten bleiben innerhalb derselben Hybrid-Shell. Die alte sichtbare 5-A-Navigation ist nicht mehr die primäre HufManager-Navigation.

## Bestätigte fachliche Bereiche

Provider:
- Tagesübersicht
- Kunden/Pferde
- Pferdeakte
- Kalender/Termine
- Tour/Navigation
- Terminabschluss
- Hufi Hufanalyse
- Leistungen/Preise
- Rechnungen/Zahlungsstatus
- Ausgaben/Buchhaltung/GuV
- Fuhrpark/Fahrtenbuch
- Management/Einstellungen
- Hilfe/Support

Client/KundenApp:
- Client-Home
- eigene Pferde
- Pferdedetail/Pferdeakte
- Booking
- Rechnungen
- Permissions/Freigaben
- Profil/Account
- Benachrichtigungen
- Kalender
- Historie
- Dokumente

Partner:
- Partner-Login/Shell
- pferdebezogener Zugriff nur über gültige `horse_partner_access`-Beziehung

## Identitäten und IDs

- `#KID` = Kunde/Pferdebesitzer
- `#EQID` = dauerhafte Pferde-/Equine-ID
- `#PID` = Provider/Pferdeprofi
- `#PRID` = Fachpartner/weiterer Pferdeprofi

Kanonische Beziehungskette:

`Identity → Context/Workspace → Pferd/#EQID → Relationship → Status → Grant/Permission → Action`

Das Pferd steht global zuerst. IDs sichern Eindeutigkeit; Relationships und Permissions sichern den Zugriff.

## Berechtigungsmodell

Nicht als Berechtigung akzeptieren:
- sichtbare UI
- Frontend-Route
- URL-Parameter
- lesbare ID
- `user_metadata`
- beliebige Client-Payload-Empfänger-ID
- bloßer Appointment-Eintrag ohne gültige Beziehung

Relevante technische Beziehungen:
- `horses.owner_id` = Besitzerbindung
- `access_grants` = aktuell primär Provider↔Kunde
- `horse_partner_access` = granulare #EQID↔#PRID-Beziehung

Unklarer/inaktiver/revokter Status → DENY/LIMITED.

## Termin-/Benachrichtigungsregel

Cross-User-Terminaktionen benötigen eine gültige fachliche Beziehung. Beim produktiv getesteten Delay-Flow wird der Empfänger serverseitig ermittelt. Arbitrary recipient injection wurde negativ getestet.

## Tourregel

Mehrere Pferde beim selben Kunden, zur selben Zeit und am selben Ort dürfen im Tageskontext als ein physischer Besuch gezählt werden, ohne Appointment-/Invoice-Datensätze destruktiv zusammenzuführen.

Bei fehlender Routing-Geometrie: Stop-Marker anzeigen, aber keine gerade Fake-Straßenroute zeichnen.

## Security-Gates

Vor Go-Live verifiziert:
- Profile/PII
- Horses/Medical Data
- Invoices/Payment Fields
- GPS/Locations/Timed Access
- Appointments/Consent

Zusätzliche Partner-Invitation-Härtung:
- Auth erforderlich
- `p_user_id == auth.uid()`
- `anon`/`PUBLIC` EXECUTE entzogen
- `authenticated` EXECUTE erlaubt
- E-Mail-Bindung wenn vorhanden
- Pending-Row Lock / atomare Annahme
- Wiederverwendung blockiert

## Betriebsregel für HufiBoss

Bei HufManager-Aufgaben zuerst prüfen:
1. Ist die Aussage aus Production/Akzeptanz belegt?
2. Welche Rolle/ID ist betroffen?
3. Welches Pferd/#EQID ist betroffen?
4. Welche Relationship/Permission gilt?
5. Ist es HufManager oder HufiApp?
6. Betrifft die Änderung Frontend, DB, RLS, Storage, Edge Function oder Nginx?
7. Kann HufiApp unbeabsichtigt mitbetroffen sein?

Bei Production-Änderungen immer Rollback, Tests und Live-Validierung voraussetzen.

## Keine Secrets

HufiBoss darf in kanonisches Wissen niemals übernehmen:
- API-Keys
- Passwörter
- Service-Role-Key
- private Tokens
- SSH Private Keys
- Session-Cookies
- vollständige Zugangsdaten realer Kunden

Demo-Accounts können in Acceptance-Evidenz existieren; ihre Passwörter gehören nicht in kanonisches Wissen.

## Nicht ungeprüft behaupten

Nicht als Produktfakt übernehmen, nur weil Code/Marketing vorhanden ist:
- vollständige Offlinefähigkeit jeder Funktion
- automatische Zahlungserkennung
- DATEV-Export
- automatischer Mahnlauf
- medizinische Diagnose
- pauschale Therapeuten-/Partnerrechte
- unbegrenzte oder kostenlose Features ohne aktuelle Billing-/Landing-Verifikation

## Maßgebliche Quellen

1. aktueller Production-Stand
2. `HUFMANAGER_DEMO_ACCEPTANCE_2026-08-14.md`
3. `HUFMANAGER_RELAUNCH_2026_ABSCHLUSS_MAENGELBERICHT.md`
4. `docs/HUFMANAGER_RELAUNCH_2026_FINAL.md`
5. `docs/HUFMANAGER_FAQ.md`
6. aktuelle Security-Migrationen und Production-Verifikation

Bei Konflikt schlägt die neuere, tatsächlich verifizierte Production-Evidenz ältere Planungs-/Marketingdokumente.