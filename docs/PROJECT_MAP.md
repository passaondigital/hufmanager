# HUFI — Project Map

**Stand:** 14.08.2026

## Aktuelle Topologie

```text
Pascal Schmid
│
├── HufManager
│   ├── Landing: https://hufmanager.de
│   ├── App:     https://app.hufmanager.de
│   ├── Ziel: Betriebssoftware für Hufbearbeiter/Hufpfleger
│   ├── Provider: #PID
│   ├── KundenApp / Pferdebesitzer: #KID
│   ├── Pferd: #EQID
│   └── Fachpartner: #PRID
│
├── HufiApp
│   └── https://hufiapp.de
│       getrennte Frontend-Auslieferung; nicht durch HufManager-Deploy überschreiben
│
├── HufiOS
│   └── Pascals Arbeits-/Betriebssystem-Umgebung
│       └── HufiBoss = CEO-Agent / Gesprächspartner
│           └── HufiBrain + Hufi Code / Reason / Voice / Vision / Image
│
├── Weitere HUFI-Produkte / Dienste
│   ├── HufiAI
│   ├── HufiVoice
│   ├── HufCamPro
│   └── EquiMeteo / weitere spezialisierte Tools
│
└── Infrastruktur
    ├── Hostinger VPS / Ubuntu / Nginx
    ├── Supabase Auth + Postgres + RLS + Storage + Edge Functions
    ├── GitHub
    └── lokale / Cloud-KI-Dienste nach Bedarf
```

## HufManager — produktiver Status

HufManager ist seit dem Relaunch 2026 **nicht mehr nur Legacy-Alias**, sondern ein eigenständig positioniertes und getrennt ausgeliefertes Produkt.

Bestätigt:
- Landing und App produktiv
- 148/148 Tests PASS
- Build PASS
- 5/5 P0 Security PASS
- Production Acceptance für Provider, Client und Partner
- `DENNIS_READY=YES`
- `READY_FOR_REAL_CUSTOMER=YES`

Detailquellen:
- `docs/HUFMANAGER_RELAUNCH_2026_FINAL.md`
- `docs/HUFMANAGER_FAQ.md`
- `docs/HUFIBOSS_HUFMANAGER_CANONICAL.md`

## HufManager Hauptnavigation

Provider:
1. Heute
2. Tour
3. Kunden & Pferde
4. Hufi Hufanalyse
5. Finanzen
6. Mehr

Fachseiten bleiben erhalten, werden aber in derselben Hybrid-Shell dargestellt.

## Identitäts-/Beziehungsmodell

- `#KID` = Kunde / Pferdebesitzer
- `#EQID` = dauerhafte Pferde-/Equine-ID
- `#PID` = Provider / Pferdeprofi
- `#PRID` = Fachpartner / weiterer Pferdeprofi

Globale Regel:

`Pferd/#EQID → beteiligte Menschen/Business → Relationship → Status → Permission → fachlicher Vorgang`

Berechtigungen entstehen nicht aus Branding oder Workspace allein. Das Pferd ist der zentrale Beziehungsknoten.

## HufiOS / HufiBoss

HufiOS ist die interne Arbeits-/Betriebssystem-Umgebung. HufiBoss ist der zentrale CEO-Agent und nutzt HufiBrain als Wissens-/Memory-Schicht.

Für HufManager muss HufiBoss wissen:
- Produktstatus und Domains
- Rollen/IDs
- Pferd-zentriertes Relationship-/Permission-Modell
- Provider-, Client- und Partnergrenzen
- Security-Gates
- getrennte Deployment-Grenze zwischen HufManager und HufiApp
- nur bestätigte Funktionen als Fakten behandeln

Kanonisches HufManager-Agentenwissen: `docs/HUFIBOSS_HUFMANAGER_CANONICAL.md`.

## Deployment-Grenzen

Vor jedem Production-Deploy aktuell prüfen. Der Relaunch wurde mit getrennten Webroots betrieben:
- HufManager Landing
- HufManager App
- HufiApp

Regel: HufManager-Deployment darf HufiApp nicht redeployen oder überschreiben.

## Security-Regel

Cross-User-Aktionen benötigen serverseitig prüfbare Relationships/Permissions. Sichtbare UI, URL, `user_metadata`, lesbare IDs oder Client-Payloads sind keine Autorisierung.

Die zusätzliche Härtung von `accept_partner_invitation` ist in Production verifiziert: Auth-Bindung, keine `anon`/`PUBLIC`-Ausführung, atomare Annahme und Schutz gegen Wiederverwendung.

## Doku-Regel

Bei Konflikten gilt:
1. Production-Evidenz
2. Security-/Acceptance-Tests
3. aktueller Code/Migration
4. aktuelle Produktdoku
5. alte Planung/Marketing

Keine Secrets dokumentieren.