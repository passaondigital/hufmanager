# HufManager Relaunch 2026 — finaler Produktstand

**Status:** produktiv / Dennis-ready  
**Stand:** 14.08.2026  
**Produktionsdomains:** `https://hufmanager.de` · `https://app.hufmanager.de`  
**HufiApp:** `https://hufiapp.de` bleibt ein getrennt ausgeliefertes Produkt/Frontend und wurde beim HufManager-Relaunch nicht überschrieben.

## 1. Was HufManager ist

HufManager ist die produktive Betriebssoftware für Hufbearbeiter/Hufpfleger. Der Relaunch 2026 bündelt den täglichen Arbeitsablauf in einer einheitlichen Slim/Hybrid-Oberfläche, ohne die bewährten Fachseiten zu entfernen.

Die Provider-Hauptnavigation ist bewusst klein:

1. Heute
2. Tour
3. Kunden & Pferde
4. Hufi Hufanalyse
5. Finanzen
6. Mehr

Fachseiten wie Pferdeakte, Kalender, Rechnungen, Ausgaben, Fuhrpark und Einstellungen bleiben erreichbar, laufen aber innerhalb derselben HufManager-Shell. Die alte sichtbare 5-A-Navigation ist nicht mehr die primäre Provider-Navigation.

## 2. Bestätigte Rollen und Zugänge

### Provider / Pferdeprofi — `#PID`

Bestätigte produktive Bereiche:
- Tagesübersicht / Heute
- Kunden- und Pferdeverwaltung
- Pferdeakte
- Kalender und Termine
- Touren / Karten / Reihenfolge / Navigation
- Terminabschluss
- Hufi Hufanalyse
- Leistungen und Preise
- Rechnungen und Zahlungsstatus
- Ausgaben / Buchhaltung / GuV
- Fuhrpark / Fahrtenbuch
- Management / Profil / Sicherheit / Kommunikation / Abo
- Hilfe und Support

### Client / Pferdebesitzer — `#KID`

Der Kundenbereich ist Teil der Hauptanwendung, aber mit eigener `ClientAppLayout`-Shell und eigener Rollenprüfung. Bestätigte produktive Routen umfassen:
- Client-Home
- eigene Pferde
- Pferdeakte / Pferdedetail
- Terminbuchung
- Rechnungen
- Freigaben
- Profil / Account
- Benachrichtigungen
- Kalender
- Historie
- Dokumente
- Netzwerk / Chat / Marketplace-Funktionen, soweit im ausgelieferten Clientbereich vorhanden

Der Kundenbereich wird nicht als zweites separates Produkt-Backend betrieben; er nutzt dieselbe Auth-/Datenbasis und strikt rollen-/beziehungsgebundene Zugriffe.

### Partner / Fachpartner — `#PRID`

Bestätigt sind Partner-Login, Partner-Shell und pferdebezogene Zugriffe über `horse_partner_access`. Ein Partner erhält keinen pauschalen Zugriff auf alle Pferde oder Kundendaten.

## 3. Pferd-zentriertes Identitätsmodell

Kanonische fachliche IDs:

- `#KID` = Kunde / Pferdebesitzer
- `#EQID` = dauerhafte Pferde-/Equine-ID
- `#PID` = Provider / Pferdeprofi
- `#PRID` = Fachpartner / weiterer Pferdeprofi

Kernregel:

`Identity → Workspace/Context → Pferd/#EQID → Relationship → Status → Grant/Permission → Action`

Das Pferd bzw. `#EQID` ist der zentrale Beziehungsknoten. Sichtbare App-Rollen, URL-Parameter, Buttons oder lesbare IDs erzeugen allein keine Berechtigung.

### Aktueller technischer Stand

- `horses.eqid` / `horses.readable_id` identifizieren das Pferd.
- `horses.owner_id` bindet das Pferd an den Besitzer.
- `access_grants` bildet primär Provider-Kunden-Beziehungen ab.
- `horse_partner_access` bildet granulare pferdebezogene Partner-Beziehungen ab.
- Beziehungen können u. a. `pending`, `active`, `inactive`/`revoked` sein.
- Unklarer oder nicht gültiger Status bedeutet DENY/LIMITED.

## 4. Termine, Touren und mehrere Pferde

HufManager kann mehrere Pferde zu einem physischen Kundenbesuch führen. Im Tageskontext wird ein gleicher Kunde mit gleicher Zeit und gleichem Ort als ein physischer Besuch gezählt, ohne die zugrunde liegenden Appointment-/Rechnungsbeziehungen destruktiv zusammenzuführen.

Touren verwenden echte Routing-Geometrie, wenn diese geliefert wird. Fällt die Straßenroute aus, bleiben Stop-Marker sichtbar; es wird keine irreführende gerade Ersatzlinie als Straßenroute gezeichnet.

## 5. KundenApp und Benachrichtigungen

Die KundenApp ist im Relaunch-Modell enthalten. Bestätigt sind rollenbasierte Client-Routen und produktive Benachrichtigungsflüsse.

Der Produktions-Acceptance-Test vom 14.08.2026 bestätigte insbesondere eine bidirektionale Terminverspätungs-Kommunikation:
- Provider → Client
- Client → Provider

Der Empfänger wird serverseitig aus Termin, Pferd und Beziehung ermittelt. Eine vom Client mitgesendete beliebige Empfänger-ID wird nicht als Autorisierung akzeptiert.

## 6. Sicherheit

### Go-Live-Gate

Der dokumentierte Relaunch-Abschluss bestätigt:
- Tests: **148/148 PASS**
- Build: **PASS**
- Build = Deploy = Live: **verifiziert**
- App HTTP: **200**
- Landing HTTP: **200**
- HufiApp HTTP: **200, unberührt**
- P0 Security Areas: **5/5 PASS**
- P0 Blocker: **0**
- P1 Blocker zum Relaunch-Zeitpunkt: **0**
- `READY_FOR_REAL_CUSTOMER=YES`

### Verifizierte P0-Bereiche

1. Profile / personenbezogene Daten — restriktive RLS statt pauschalem Provider-Zugriff.
2. Pferde / medizinische Daten — Zugriff über Ownership bzw. gültige Beziehungen.
3. Rechnungen / Zahlungsfelder — rollen- und ownershipgebundener Zugriff.
4. GPS / Standort — zeitlich begrenzbare Grants (`valid_until`) und Revoke-Logik.
5. Termine / Consent — Freigabe-Flags und RLS-gesteuerte Sichtbarkeit.

### Partner-Einladungen — zusätzliche P1-Härtung 14.08.2026

Die Produktionsfunktion `accept_partner_invitation(text, uuid)` wurde zusätzlich gehärtet und live verifiziert:
- `p_user_id` muss `auth.uid()` entsprechen.
- `anon` und `PUBLIC` besitzen kein EXECUTE-Recht.
- `authenticated` darf ausführen.
- Pending-Einladung wird atomar gesperrt/aktualisiert.
- E-Mail-Bindung wird geprüft, wenn eine Partner-E-Mail hinterlegt ist.
- Wiederverwendung / Race-Condition wird blockiert.

## 7. Architektur und Betrieb

Technologie:
- React + TypeScript + Vite
- React Router
- TanStack Query
- Tailwind / shadcn/Radix
- Supabase Auth, Postgres, RLS, Storage und Edge Functions
- Leaflet / Routing für Touren

Produktionsauslieferung auf dem VPS ist getrennt:
- `hufmanager.de` → Landingpage
- `app.hufmanager.de` → HufManager App
- `hufiapp.de` → eigene HufiApp-Auslieferung

Damit darf ein HufManager-Deploy niemals den HufiApp-Webroot überschreiben.

## 8. Preis-/Relaunch-Kontext

Der Relaunch-Slim-Stand wurde mit `19,95 € / Monat`, 14 Tagen Testphase, Tourenplanung inklusive und KundenApp inklusive vorbereitet. Preis-/Checkout-Aussagen müssen bei künftigen Änderungen gegen die tatsächlich live geschaltete Landingpage und das Billing-System geprüft werden; diese Dokumentation ist kein Ersatz für den aktuellen Checkout.

## 9. Was nicht behauptet werden darf

Nicht automatisch als bestätigt behandeln:
- eine Funktion nur, weil eine Komponente im Repo existiert;
- Offline-Fähigkeit jeder Fachfunktion ohne konkreten Test;
- automatische Zahlungserkennung, DATEV, Mahnlauf oder sonstige Marketingclaims ohne aktuellen Acceptance-Test;
- vollständige medizinische Diagnose durch Hufi;
- pauschale Partner-/Therapeutenrechte;
- beliebige Cross-User-Zugriffe ohne gültige Relationship/Permission.

## 10. Support- und Betriebsregel

Bei Supportfällen zuerst unterscheiden:
1. Rolle/Account (`#KID`, `#PID`, `#PRID`)
2. betroffenes Pferd (`#EQID`)
3. Relationship-/Grant-Status
4. konkrete Aktion / Route / Datensatz
5. RLS-/Permission-Ergebnis

Keine Secrets, Tokens, Service-Role-Keys oder private Zugangsdaten in Tickets oder Wissensdokumente übernehmen.

## 11. Verbindliche Evidenz

Für den Relaunch maßgeblich:
- `HUFMANAGER_RELAUNCH_2026_ABSCHLUSS_MAENGELBERICHT.md`
- `HUFMANAGER_DEMO_ACCEPTANCE_2026-08-14.md`
- Migration `20260814144956_secure_partner_invitation_acceptance.sql`
- Produktionsprüfung der Funktion `accept_partner_invitation`: `anon=false`, `PUBLIC=false`, `authenticated=true`

Bei Widerspruch gilt: **aktuell verifizierter Production-Stand schlägt ältere Doku und Marketingtext.**