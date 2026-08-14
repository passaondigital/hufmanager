# HufManager FAQ — Relaunch 2026

**Stand:** 14.08.2026  
**Grundlage:** tatsächlich verifizierter Relaunch-/Production-Stand. Keine Funktionsbehauptung nur aufgrund vorhandener Komponenten.

## Was ist HufManager?

HufManager ist die Betriebssoftware für Hufbearbeiter/Hufpfleger. Der Relaunch 2026 bündelt Tagesarbeit, Kunden, Pferde, Termine, Touren, Dokumentation und Finanzen in einer einheitlichen Slim/Hybrid-Oberfläche.

## Wo läuft HufManager?

- Landingpage: `https://hufmanager.de`
- App: `https://app.hufmanager.de`

`https://hufiapp.de` ist eine getrennte Auslieferung und wird durch HufManager-Deployments nicht überschrieben.

## Welche Hauptbereiche hat der Hufbearbeiter?

Die primäre Navigation besteht aus:
- Heute
- Tour
- Kunden & Pferde
- Hufi Hufanalyse
- Finanzen
- Mehr

Spezialisierte Seiten wie Pferdeakte, Kalender, Rechnungen, Ausgaben, Fuhrpark und Management bleiben innerhalb derselben HufManager-Shell erreichbar.

## Gibt es eine KundenApp?

Ja. Der Pferdebesitzer-Bereich ist im HufManager-System enthalten und hat eine eigene Client-Shell mit rollenbasiertem Zugriff. Bestätigt sind u. a. eigene Pferde, Pferdedetail/Pferdeakte, Termine, Rechnungen, Freigaben, Benachrichtigungen, Kalender, Historie und Dokumente.

## Brauchen Pferdebesitzer ein zweites Backend?

Nein. Provider und Client nutzen dieselbe Auth-/Datenbasis, aber unterschiedliche Rollen, Layouts und serverseitige Berechtigungen.

## Was bedeuten #KID, #EQID, #PID und #PRID?

- `#KID` = Kunde / Pferdebesitzer
- `#EQID` = dauerhafte Pferde-/Equine-ID
- `#PID` = Provider / Pferdeprofi
- `#PRID` = Fachpartner / weiterer Pferdeprofi

Die IDs identifizieren fachliche Entitäten. Sie ersetzen keine Berechtigungsprüfung.

## Was ist das zentrale Berechtigungsprinzip?

Das Pferd bzw. seine `#EQID` ist der zentrale Beziehungsknoten. Zugriff folgt der Kette:

`Identity → Context/Workspace → Pferd/#EQID → Relationship → Status → Grant/Permission → Action`

Ein sichtbarer Button, eine URL, ein Appointment oder eine lesbare ID reichen allein nicht als Berechtigung.

## Können Partner alle Pferde sehen?

Nein. Partnerzugriffe sind pferdebezogen und müssen über eine gültige Beziehung/Freigabe erlaubt sein. Ein negativer Production-Test bestätigte, dass ein Partner ein nicht freigegebenes Pferd nicht lesen konnte.

## Wie funktionieren Partner-Einladungen sicher?

Die produktive Funktion `accept_partner_invitation` bindet die angegebene User-ID an `auth.uid()`, verweigert `anon`/`PUBLIC` die Ausführung, prüft bei vorhandener Partner-E-Mail die E-Mail-Bindung und schützt gegen Wiederverwendung/Race-Conditions.

## Kann ein Nutzer bei Terminmeldungen einen beliebigen Empfänger angeben?

Nein. Beim bestätigten Delay-Flow wird der Empfänger serverseitig aus Termin, Pferd und autorisierter Beziehung abgeleitet. Eine beliebige mitgesendete `recipient_id` wird nicht als Autorisierung akzeptiert.

## Unterstützt HufManager mehrere Pferde bei einem Kundenbesuch?

Ja. Im Tageskontext kann ein physischer Besuch mit mehreren Pferden als ein Stopp gezählt werden, während die zugrunde liegenden Appointment-/Rechnungsbeziehungen erhalten bleiben.

## Was passiert, wenn die Straßenroute nicht geladen werden kann?

Die Stop-Marker bleiben sichtbar. HufManager zeichnet in diesem Fall keine irreführende gerade Linie als vermeintliche Straßenroute.

## Ist HufManager produktionsbereit?

Der dokumentierte Go-Live-Gate-Stand bestätigt:
- 148/148 Tests bestanden
- Build bestanden
- Build/Deploy/Live-Hash verifiziert
- Landingpage HTTP 200
- App HTTP 200
- HufiApp HTTP 200 und unberührt
- 5/5 P0-Sicherheitsbereiche bestanden
- `READY_FOR_REAL_CUSTOMER=YES`

Zusätzlich wurden am 14.08.2026 echte Production-Acceptance-Tests für Provider, Client und Partner durchgeführt.

## Welche Security-Bereiche wurden vor Go-Live geprüft?

- Profile / PII
- Pferde / medizinische Daten
- Rechnungen / Zahlungsfelder
- GPS / Standort und zeitlich begrenzte Zugriffe
- Termine / Consent
- Auth-/Rollenchecks
- Cross-Tenant-/Cross-Relationship-Negativtests
- Partner-Einladungsannahme

## Ist jede Funktion offline verfügbar?

Das darf nicht pauschal behauptet werden. Einzelne Offline-/PWA-Bausteine existieren, aber diese FAQ behauptet nur Funktionen als vollständig offlinefähig, wenn dafür ein konkreter Acceptance-Test vorliegt.

## Macht Hufi medizinische Diagnosen?

Nein. Hufi kann im Produkt bei Dokumentation/Analyse unterstützen, ist aber kein Ersatz für tiermedizinische Diagnose oder Behandlung.

## Was kostet HufManager?

Der Relaunch-Slim-Stand wurde mit `19,95 € / Monat`, 14 Tagen Testphase, Tourenplanung inklusive und KundenApp inklusive vorbereitet. Bei Kaufentscheidungen ist die aktuell live angezeigte Landingpage/Checkout-Konfiguration maßgeblich.

## Welche Daten soll ich dem Support nennen?

Wenn möglich:
- Rolle bzw. fachliche ID (`#KID`, `#PID`, `#PRID`)
- betroffenes Pferd (`#EQID`)
- betroffene Funktion/Route
- Zeitpunkt
- Fehlermeldung ohne Secrets

Keine Passwörter, API-Keys, Tokens oder Service-Role-Keys senden.

## Was hat bei widersprüchlicher Dokumentation Vorrang?

1. aktuell verifizierter Production-Stand
2. aktuelle Security-/Acceptance-Evidenz
3. aktueller Code-/Migrationsstand
4. ältere Architektur-/Planungsdokumente
5. Marketingtexte

Nicht bestätigte Marketingclaims dürfen nicht als Produktfakt in HufiBoss/HufiOS übernommen werden.