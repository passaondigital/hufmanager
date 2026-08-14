# HUFI / HufManager — Current State

> Aktueller Snapshot für Menschen und Agenten. Bei Widerspruch gilt: verifizierter Production-Stand schlägt ältere Planung oder Marketingtext.

**Stand:** 14.08.2026

## Produktstatus

### HufManager

- **Status:** produktiv / Dennis-ready / real-customer-ready
- **Landing:** `https://hufmanager.de`
- **App:** `https://app.hufmanager.de`
- **Produkt:** eigenständiger HufManager Relaunch 2026 für Hufbearbeiter/Hufpfleger
- **Provider-Shell:** Slim/Hybrid, eine Oberfläche für Tagesarbeit und Fachseiten
- **KundenApp:** produktiver Clientbereich in derselben App-/Datenbasis, mit eigener `ClientAppLayout`-Shell und Rollenprüfung
- **Partnerbereich:** produktiv getestet, pferdebezogene Zugriffe über gültige Relationships

Go-Live-Evidenz:
- 148/148 Tests PASS
- Build PASS
- Build = Deploy = Live verifiziert
- Landing HTTP 200
- App HTTP 200
- HufiApp HTTP 200 und unberührt
- P0 Security 5/5 PASS
- Production-Acceptance 14.08.2026 mit Provider, Client und Partner
- `DENNIS_READY=YES`
- `READY_FOR_REAL_CUSTOMER=YES`

Zusätzliche P1-Härtung der Partner-Einladungsannahme ist in Production vorhanden. `accept_partner_invitation` bindet die User-ID an `auth.uid()`, entzieht `anon`/`PUBLIC` EXECUTE und schützt gegen Wiederverwendung/Race-Conditions.

Verbindliche Detaildoku:
- `docs/HUFMANAGER_RELAUNCH_2026_FINAL.md`
- `docs/HUFMANAGER_FAQ.md`
- `docs/HUFIBOSS_HUFMANAGER_CANONICAL.md`
- `HUFMANAGER_DEMO_ACCEPTANCE_2026-08-14.md`
- `HUFMANAGER_RELAUNCH_2026_ABSCHLUSS_MAENGELBERICHT.md`

### HufiApp

- **Live:** `https://hufiapp.de`
- HufiApp ist eine getrennte Frontend-Auslieferung und darf bei HufManager-Deployments nicht überschrieben werden.
- Historisch bestehen gemeinsame Code-/Backend-Bausteine; Produktidentität und Webroots sind trotzdem getrennt zu behandeln.

### HufiOS / HufiBoss

- **HufiOS** = Pascals Arbeits-/Betriebssystem-Umgebung.
- **HufiBoss** = CEO-Agent / zentraler Assistent in HufiOS.
- **HufiBrain** = Wissens-/Memory-/Intelligence-Schicht.
- Kanonische Architektur liegt zusätzlich in Google Drive unter „HUFI – Kanonische Architektur & Modellfamilie“.
- Für HufManager-Fragen muss HufiBoss `docs/HUFIBOSS_HUFMANAGER_CANONICAL.md` als Produktwissen verwenden.

## HufManager Provider-Navigation

1. Heute
2. Tour
3. Kunden & Pferde
4. Hufi Hufanalyse
5. Finanzen
6. Mehr

Fachseiten wie Pferdeakte, Kalender, Rechnungen, Ausgaben, Fuhrpark und Management laufen innerhalb derselben Hybrid-Shell. Die alte sichtbare 5-A-Navigation ist nicht mehr die primäre Provider-Navigation.

## Pferd-zentriertes Identitätsmodell

- `#KID` = Kunde / Pferdebesitzer
- `#EQID` = dauerhafte Pferde-/Equine-ID
- `#PID` = Provider / Pferdeprofi
- `#PRID` = Fachpartner / weiterer Pferdeprofi

Kanonische Zugriffskette:

`Identity → Context/Workspace → Pferd/#EQID → Relationship → Status → Grant/Permission → Action`

Das Pferd steht global zuerst. Eine sichtbare Rolle, Route, URL oder ID erzeugt allein keine Berechtigung.

## Security-Grundsätze

Vor Relaunch verifiziert:
1. Profile / PII
2. Horses / Medical Data
3. Invoices / Payment Fields
4. GPS / Locations / Timed Access
5. Appointments / Consent

Partner-/Cross-User-Zugriffe benötigen serverseitig prüfbare Beziehungen und Berechtigungen. Unklarer oder inaktiver Status bedeutet DENY/LIMITED.

## Infrastrukturgrenze

Produktionsauslieferung ist getrennt:
- HufManager Landingpage
- HufManager App
- HufiApp

Vor Deployments immer aktuelle Nginx-Roots prüfen, Backup/Rollback erzeugen, Build/Test durchführen und Live-Ziel validieren.

## Was nicht ungeprüft behauptet wird

Nicht aus bloßer Code-Existenz oder älteren Marketingtexten ableiten:
- vollständige Offlinefähigkeit aller Fachfunktionen
- automatische Zahlungserkennung
- DATEV-Export
- automatischer Mahnlauf
- medizinische Diagnose durch Hufi
- pauschale Partner-/Therapeutenrechte
- aktuelle Preise ohne Gegenprüfung gegen Live-Landing/Checkout

## Source-of-Truth-Regel

Priorität bei Konflikten:
1. aktuell verifizierter Production-Stand
2. Security-/Acceptance-Evidenz
3. aktueller Code-/Migrationsstand
4. aktuelle Produktdoku
5. ältere Architektur-/Planungsdoku
6. Marketingtext

Keine Secrets, Tokens, Passwörter oder Service-Role-Keys in Dokumentation oder Agentenwissen übernehmen.