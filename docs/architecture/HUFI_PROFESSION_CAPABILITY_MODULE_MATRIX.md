# Berufsprofil × Arbeitsweise × Einnahmequelle × Betriebsstruktur — Baukastensystem für HufiApp

> Stand: 2026-08-06. Reines Architektur- und Rechercheddokument, keine
> Implementierung, keine Migration, kein Code geändert.
>
> Methodik: Jede Aussage zu "existiert" ist gegen den echten Code verifiziert
> (Datei/Zeile zitiert). Alles, was ein Vorschlag ist, ist explizit als
> **Vorschlag** markiert. `reife`-Werte sind 1:1 aus `src/config/appMap.ts`
> übernommen — dort ist `reife` "aus dem Code abgeleitet, nicht aus
> Anzeigenamen" (siehe Kopfkommentar dieser Datei).

---

## 1. Das Grundproblem und das Baukastenprinzip

HufiApp bedient sehr unterschiedliche Berufsgruppen der Pferdebranche:
Hufbearbeiter, Hufschmiede, Physiotherapeuten/Osteopathen, Tierärzte,
Trainer/Reitlehrer, Stallbetreiber, Berater — mit unterschiedlichen
Arbeitsweisen (mobil, stationär, digital, kombiniert) und Einnahmequellen
(Dienstleistung, physisches Produkt, digitales Produkt, Shop, Abo, Kurs,
Mitgliedschaft, Beratung, Vermietung, Stallleistung).

**Kernregel:** Das Berufsprofil bestimmt NICHT den Code. Es steuert über eine
Kombination aus vier Dimensionen, was ein Nutzer sieht:

1. **Arbeitsweise** — mobil / stationär (Werkstatt, Praxis, Anlage, Stall) /
   digital (Online-Kurse, Fernberatung) / Mischform
2. **Einnahmequelle(n)** — Dienstleistung, physisches Produkt, digitales
   Produkt, Shop, Abo, Kurs, Mitgliedschaft, Beratung, Vermietung,
   Stallleistung (mehrere gleichzeitig möglich)
3. **Betriebsstruktur** — Solo, Team, mehrere Standorte, eigene
   Werkstatt/Schmiede/Praxis/Stall/Anlage, mobiler Betrieb, Onlinebusiness,
   Mischbetrieb
4. **Berufsprofil** — bestimmt vor allem *Bezeichnungen* (dieselbe
   technische Funktion "Termine" heißt bei unterschiedlichen Berufen
   unterschiedlich) und eine kleine Menge echter Feature-Gates

Die vier Dimensionen zusammen steuern:
- sichtbare **Bezeichnungen** (Label-Mapping, keine Code-Verzweigung)
- **Modulauswahl** (welche Kacheln/Routen ein Account sieht)
- **Feature-Flags** (welche noch unfertigen Bereiche überhaupt erscheinen)
- **Berechtigungen** (welche Rolle welche Route/Aktion darf)

Das ist bewusst NICHT "44 Apps für 44 Berufe", sondern eine Matrix aus
wenigen orthogonalen Dimensionen, die kombiniert werden.

---

## 2. Was heute real existiert — verifiziert im Code

### 2.1 Fünf harte Rollen (echtes Berechtigungssystem)

`src/components/auth/ProtectedRoute.tsx` Zeile 10:
```ts
allowedRoles?: ("provider" | "client" | "admin" | "employee" | "partner")[];
```
Diese fünf Rollen sind fest im Code verdrahtet und bestimmen eigene
App-Shells in `src/App.tsx`:
- `provider` (+ `admin`) → `AppLayout` / `MobileShell` — Hufbearbeiter-Kern-CRM
  (Zeilen 576–645)
- `client` → `ClientAppLayout` — Pferdebesitzer (Zeilen 648–673)
- `partner` (+ `admin`) → `PartnerAppLayout` — Therapeuten/Osteopathen/Partner
  (Zeilen 676–703)
- `employee` (+ `admin`) → `EmployeeAppLayout` — Mitarbeiter (Zeilen 706–728)
- `admin` → eigene `/admin/*`-Routen

Das ist eine reale, harte Verzweigung nach **Rolle im Geschäftsmodell**
(Anbieter/Kunde/Mitarbeiter/Partner-Dienstleister/Admin) — nicht nach Beruf.
Ein Tierarzt z.B. läuft je nach Kontext entweder über `partner` (Praxis-Modell,
`PartnerAppLayout`) oder über die separate `veterinary`-Subdomain
(`/vet/*`, Zeilen 360–377, eigenes Login `VetPortalLogin`).

### 2.2 Ein echtes `profession_type`-Feld — aber nur für Provider, nur als Label-/Widget-Steuerung

Real vorhanden:
- `profiles.profession_type` und `business_settings.profession_type`
  (`src/integrations/supabase/types.ts` Zeilen 2646, 2734, 2822, 14085,
  14251, 14417 — echte generierte DB-Types, kein erfundenes Feld)
- `src/lib/profession-config.ts` — `PROFESSION_CONFIGS`, ein Record mit
  11 Einträgen (`hoof_care`, `farrier`, `osteopath`, `physiotherapist`,
  `dentist`, `riding_instructor`, `saddler`, `massage`, `vet_mobile`,
  `other`), je mit `label`, `emoji`, `menuItems`, `dashboardWidgets`,
  `serviceLabel`, `appointmentDuration`, `documentTypes`
- `src/hooks/useProfessionConfig.ts` liest `profession_type` aus `profiles`
  und liefert die passende Config
- `src/components/onboarding/ProfessionSelector.tsx` — die Auswahl-UI beim
  Onboarding zeigt **9 der 11** Optionen (Zeilen 17–27); `farrier`
  (Hufschmied) ist in `PROFESSION_CONFIGS` definiert, aber in der
  Onboarding-Auswahl **nicht wählbar** — ein bestehender Bruch zwischen
  Datenmodell und UI.

**Was `profession_type` tatsächlich steuert** (aus `profession-config.ts`
Kopfkommentar Zeilen 4–13, wörtlich):
> "Universelle Business-Tools (Kalender, Kunden, Rechnungen, Buchhaltung …)
> sind NICHT gegated und immer sichtbar. Gegated werden nur die hier
> gelisteten Features: hufcam, analyse, bhs, connect, lager."

D.h. `profession_type` schaltet **fünf** kleine Zusatz-Features frei
(`AppSidebar.tsx` Zeilen 65–66, 134, 159–162, 230), bestimmt die
**Seed-Reihenfolge der Dashboard-Widgets** (`useDashboardWidgets.ts`
Zeilen 25–32) und liefert ein **Label** (`serviceLabel`,
`appointmentDuration`, `documentTypes`) — aber KEIN echtes
Modul-An/Aus-System über die gesamte App. Es ist ein Personalisierungslayer
auf einer einzigen Rolle (`provider`), kein Berufsprofil-Datenmodell für
die ganze App.

### 2.3 Ein echtes, aber separates Client-Betriebsmodus-Feld

`src/hooks/useClientMode.ts`: `profiles.client_type` mit Werten
`private | stall | commercial`, plus `is_verified_business`,
`verification_status`, `company_name` — echte Spalten, echt gelesen/
geschrieben. UI: `src/components/client/ClientModeSettings.tsx`,
geroutet über `src/pages/ClientAccountType.tsx` (`appMap`-Eintrag
`client-account-type`, **reife: "live"**).

Wichtige Einschränkung: die Modi `stall` und `commercial` sind in der UI nur
sichtbar, wenn `FEATURE_FLAGS.stallbetreiberRolle.enabled === true`
(`ClientModeSettings.tsx` Zeile 19). Dieses Flag steht in
`src/config/featureFlags.ts` Zeile 32 auf `enabled: false`. Praktisch sieht
heute jeder Client nur "Pferdebesitzer" als wählbare Option — das
Betriebsmodus-Feld existiert im Datenmodell, ist aber in Produktion
funktional stillgelegt.

### 2.4 Eine bereits gebaute, aber deaktivierte Stallbetreiber-Rolle

Sehr relevanter Fund: Es gibt bereits eine vollständige
Stallbetreiber-Seitenstruktur unter `src/pages/stallbetreiber/*`
(`StallDashboard`, `StallKalender`, `StallLager`, `StallLeistungen`,
`StallAnfragen`, `StallAngebote`, `StallCockpit`, `StallSettings`,
`StallPlaceholder`) sowie clientseitige Pendants unter
`src/pages/client/ClientStall*` und `src/pages/ClientLocations.tsx`
(appMap-Einträge `dead-stallanfragen` … `dead-clientstallboard`,
Zeilen ~970–1066 und ~2543–2650).

Alle sind in `appMap.ts` als **reife: "attrappe"** eingestuft mit identischer
Begründung: *"Datei existiert, aber keine Route/kein Einstiegspunkt führt
dorthin (unerreichbar/toter Code) … hinter Feature-Flag
`stallbetreiberRolle` verborgen bis fertig"*. `src/App.tsx` enthält **keine**
Route zu diesen Dateien — sie sind nicht verdrahtet. Das ist praktisch ein
bereits begonnener, aber pausierter Prototyp genau des hier verlangten
Konzepts (eigenständiges Modul-Set für einen anderen Betriebstyp) — sollte
bei jeder zukünftigen Stallbetreiber-Arbeit als Ausgangspunkt geprüft werden,
statt neu zu bauen.

### 2.5 Das Portal-Slug-Muster (`/portal/:slug`) — echtes Vorbild, aber selbst deaktiviert

`src/hooks/usePortalDetection.ts` erkennt Subdomains
(`portal.`, `versicherung.`, `markt.`, `tierarzt.`) und den Pfad
`/portal/:slug` und leitet auf `PortalAppLayout` (`App.tsx` Zeilen 296–403,
`src/components/portal/PortalAppLayout.tsx`).

Das eigentliche adaptive Muster sitzt in
`src/components/portal/PortalSidebar.tsx` Zeilen 10–83: ein
`NAV_ITEMS`-Record, **keyed nach `org.type`**
(`insurance | manufacturer | supplier | school | association | veterinary`),
mit je eigener Modul-Liste (Versicherung → Policen/Schadensfälle, Schule →
Kurse/Schüler/Prüfungen, Verband → Standards/Mitglieder/Statistiken). `type`
ist eine echte Spalte auf der echten `organizations`-Tabelle
(`src/hooks/useOrganization.ts` Zeilen 5–23, real per Supabase-Query
geladen, Zeile 41: `.select("id, name, slug, type, …")`).

**Das ist der stärkste real existierende Beweis im Code, dass "ein
Typ-Feld steuert die Modulzusammenstellung" funktioniert** — die Zeile
`const items = NAV_ITEMS[org.type || "other"] || NAV_ITEMS.association;`
(`PortalSidebar.tsx` Zeile 92) ist exakt das Baukastenprinzip, nur auf
B2B-Organisationen statt auf Einzel-Provider angewendet.

**Wichtige Einschränkung, die nicht verschwiegen werden darf:**
Das gesamte Portal-Whitelabel-Produkt steht hinter
`FEATURE_FLAGS.portalWhiteLabel.enabled = false`
(`featureFlags.ts` Zeilen 19–22, wörtlicher Kommentar: *"Nur über feste
Demo-E-Mail erreichbar, ~20 Module mit hartcodierten DEMO_*-Arrays statt
echten Daten"*). `App.tsx` Zeile 301 zeigt bei deaktiviertem Flag einen
"noch nicht verfügbar"-Screen statt der Portal-Routen. Konkret verifiziert:
`portal-slug-schulungen` und `portal-slug-kurse` sind laut `appMap.ts`
**reife: "teilweise"** mit hartcodiertem `DEMO_SCHULUNGEN`-Array ohne
Supabase-Anbindung (Zeilen 1784–1785). Das Architekturmuster (Typ-Feld →
Modul-Set) ist also real und funktionsfähig strukturiert, der konkrete
Inhalt dahinter ist größtenteils Demo, nicht produktiv.

### 2.6 Andere real existierende Einnahmequellen-Bausteine (zur Einordnung)

- **Abo (Dienstleistung als Subscription):** `BhsBalanceCockpit`
  (`/bhs-balance`), appMap **reife: "live"** — echtes, produktives
  Pro-Pferd-Beschlag-Abo mit Kündigungsfunktion. Guter Beleg, dass "Abo"
  als Einnahmequelle im Kern-CRM bereits funktioniert.
- **Physisches Produkt / Lager:** `/lager` (appMap **reife: "live"**) —
  Produktkatalog, Bestand, Lieferanten, Einkauf.
- **Marktplatz/Shop für Kunden:** `/client-marketplace`, appMap
  **reife: "attrappe"** — zeigt explizit ein "Coming Soon"-Badge,
  Listings kommen aus hartcodiertem `DEMO_LISTINGS`-Array statt der
  echten `client_marketplace_listings`-Tabelle, "Anfragen"-Button ist
  disabled (Zeile 873). Nicht als Referenzbeispiel für "Shop
  funktioniert schon" verwenden.
- **Kurse/digitale Produkte:** `Academy.tsx` appMap-Eintrag
  `dead-academy` (Zeile 2664 ff.) — ebenfalls unverdrahteter Code
  ("Lernbereich/Kurs-Übersicht"). Kein produktives Kurs-Feature im
  Provider-Bereich.

### 2.7 Es gibt KEIN generisches Datenmodell für die vier Dimensionen

Zusammengefasst fehlt real:
- Kein Feld/keine Tabelle für **Arbeitsweise** (mobil/stationär/digital) am
  Provider-Profil — `hufi_professions` (Wissensdatenbank-Tabelle für die
  KI, siehe appMap-Eintrag Zeile 641: "Pflege der KI-Wissensdatenbank von
  Hufi: Berufe, Pferderassen, Erkrankungen …") hat zwar Spalten wie
  `work_location`, `environment`, `delivery`, `team_sizes`,
  `pricing_models` (`types.ts` Zeilen 10089–10160) — das ist aber eine
  **Referenz-/Wissenstabelle für die KI-Antworten**, keine
  Nutzer-Kontodaten. Es gibt keine Verknüpfung dieser Spalten zu einem
  konkreten Provider-Account.
- Kein Feld für **mehrere gleichzeitige Einnahmequellen** pro Account
  (Dienstleistung + Shop + Abo + Kurs kombiniert) — `profession_type` ist
  ein Single-Value-Enum, keine Menge von Capability-Flags.
- Kein Feld für **Betriebsstruktur** (Solo/Team/mehrere Standorte/
  Werkstatt) außer den bereits genannten `client_type`
  (private/stall/commercial, nur auf Client-Rolle) und dem stillgelegten
  Stallbetreiber-Prototyp.
- `provider_type` taucht zwar in `types.ts` auf zwei anderen Tabellen auf
  (Zeilen 15879 in einem Auftrags-/Vertrags-Kontext als freier Text, und
  Zeile 17700 in einer PMS-Integrations-Tabelle als Praxissystem-Typ,
  vermutlich `"vet"` o.ä.) — beide sind **nicht** das gesuchte
  Berufsprofil-/Business-Model-Feld eines Accounts, sondern
  Kontext-Metadaten einzelner Datensätze.

---

## 3. Matrix: Berufsprofil → typische Module mit berufsspezifischer Bezeichnung

Die linke Spalte ist die **technische Funktion** (ein Code-Modul, eine
Route-Familie). Die rechten Spalten zeigen die **Anzeige-Bezeichnung**, die
ein Berufsprofil dafür sehen würde — heute größtenteils noch als
**Vorschlag**, da nur `serviceLabel` (ein einzelnes Wort) real personalisiert
wird; volle Modul-Labels wie unten sind Ziel, nicht Bestand.

| Technische Funktion (Route/Modul) | Hufbearbeiter | Hufschmied | Physio/Osteopath | Trainer/Reitlehrer | Stallbetreiber | Berater | Tierarzt |
|---|---|---|---|---|---|---|---|
| `/kalender` Termine/Aufträge | Bearbeitungen | Beschläge und Aufträge | Behandlungen | Trainingseinheiten / Reitstunden | Stallplätze und Betreuung | Beratungsfälle | Sprechstunden/Einsätze |
| `/kunden` | Kunden | Kunden | Patient:innen/Klient:innen | Reitschüler:innen | Einsteller | Mandant:innen | Patientenbesitzer |
| `/pferde` | Pferde | Pferde | Patienten (Pferde) | Schulpferde/Reitpferde | Einstellpferde | (optional) | Patienten |
| `/rechnungen` | Rechnungen | Rechnungen | Rechnungen/Abrechnung | Rechnungen | Stallgeld-Abrechnung | Honorarnoten | GOT-Abrechnung (real: `VetGOTRechner`) |
| `/mein-angebot` (Leistungen/Preise) | Leistungen & Preise | Beschlagpreise | Behandlungspreise | Kurspreise/Reitstunden-Preise | Stallplatzpreise/Zusatzleistungen | Beratungssätze | Leistungspreise |
| `/lager` (Material) | Material/Verbrauch | Hufeisen, Beschlagmaterial | Therapiematerial | Ausrüstung | Futter/Einstreu | — | Medikamente/Verbrauchsmaterial |
| `hufcam`/`analyse` (gegated Feature) | HufCam/Hufanalyse | HufCam/Hufanalyse | (nicht relevant) | (nicht relevant) | (nicht relevant) | (nicht relevant) | (nicht relevant) |
| `bhs` (Abo-Feature) | BHS-Balance-Abo | BHS-Balance-Abo | — | — | — | — | — |
| `/tour` (mobile Route) | Tour | Tour | Tour (falls mobil) | (nur falls mobil) | — (stationär) | (nur falls vor Ort) | Tour (mobiler Tierarzt real: `vet_mobile`) |
| eigener Standort (Vorschlag) | (nur falls eigene Werkstatt) | Schmiede-Standort | Praxis-Standort | Anlage-Standort | Stall-Standort(e) | Büro/online | Klinik-Standort |
| Shop/Produktverkauf (Vorschlag) | optional (Pflegeprodukte) | optional (Beschlagzubehör) | optional | optional (Reitausrüstung) | häufig (Futter/Zubehör) | selten | selten |
| Kurs/digitales Produkt (Vorschlag) | selten | selten | selten | häufig (Online-Kurs) | selten | häufig (Beratungsprodukte) | selten |
| Team/`/team` | falls Team | falls Team | falls Team | falls Team | häufig (Stallpersonal) | selten | falls Klinik |

Wichtig: Die Spalte "Tierarzt" zeigt bewusst zwei parallele echte Wege im
Code — entweder als `partner`-Rolle mit `profession_type = vet_mobile`
(mobiler Einzel-Tierarzt im Kern-CRM) oder als eigene `veterinary`-Subdomain
mit `VetDashboard`, `VetSOAPForm`, `VetGOTRechner`, `VetImpfungen`
(App.tsx Zeilen 360–377) für Klinik-/Praxis-Kontext. Das ist selbst schon
ein Beispiel für "ein Beruf, zwei Betriebsstrukturen, zwei unterschiedliche
Modul-Sets" — allerdings heute als zwei komplett getrennte Codepfade gelöst,
nicht als eine Matrix-Auflösung.

---

## 4. Mischbetrieb-Beispiele (durchgespielt)

Alle folgenden Beispiele zeigen, welche Module/Flags in einem **Zielbild**
aktiv wären. Wo eine Funktion heute nur als Attrappe/Demo existiert, ist das
vermerkt.

### 4.1 Mobile Hufbearbeiterin mit digitalen Produkten (Online-Kurs "Barhuf-Grundlagen")
- Arbeitsweise: mobil + digital (Mischform)
- Einnahmequellen: Dienstleistung (Bearbeitungen) + digitales Produkt (Kurs)
- Betriebsstruktur: Solo
- Aktiv wären: `/tour`, `/kalender` ("Bearbeitungen"), `/kunden`, `/pferde`,
  `hufcam`/`analyse` (profession_type `hoof_care`, real gegated), `/lager`
  (Material) — **plus** ein Kurs-Modul, das heute NICHT existiert
  (`Academy.tsx` ist toter Code, appMap `dead-academy`). Dieses Beispiel
  zeigt am deutlichsten die Lücke: Dienstleistung+mobil ist voll abgedeckt,
  digitales Produkt/Kurs ist im Provider-Bereich nicht gebaut.

### 4.2 Hufschmied mit mobiler Arbeit UND eigener Schmiede
- Arbeitsweise: mobil + stationär (Mischform)
- Einnahmequellen: Dienstleistung (Beschlag mobil) + Dienstleistung/Verkauf
  in der Schmiede (Beschlagzubehör)
- Betriebsstruktur: Solo oder Team, ein zusätzlicher Standort (Schmiede)
- Aktiv wären: `/tour` (für mobile Termine), `/kalender` ("Beschläge und
  Aufträge"), `/lager` (Beschlagmaterial, real vorhanden), Standort-Feld für
  die Schmiede (Vorschlag — es gibt aktuell keine "Werkstatt-Standort"-Spalte
  am Provider; `ClientLocations.tsx` mit Geocoding existiert nur
  clientseitig und ist selbst appMap `dead-clientlocations`, also nicht
  produktiv nutzbar). Wichtig: `farrier` (Hufschmied) ist in
  `PROFESSION_CONFIGS` real definiert, aber in der Onboarding-Auswahl
  (`ProfessionSelector.tsx`) nicht wählbar — heute müsste sich ein
  Hufschmied faktisch als "Hufbearbeiter" registrieren.

### 4.3 Physiotherapeutin mit Praxis UND mobilen Terminen
- Arbeitsweise: stationär (Praxis) + mobil (Hausbesuche)
- Einnahmequellen: reine Dienstleistung (Behandlungen)
- Betriebsstruktur: Solo, ein Praxis-Standort
- Aktiv wären: `PartnerAppLayout`-Routen (`/partner-calendar`
  "Behandlungen", `/partner-kunden`, `/partner-pferde`,
  `/partner-plans` Therapiepläne, `/partner-documents`), `profession_type`
  `physiotherapist` (real, `serviceLabel: "Therapie"`,
  `appointmentDuration: 75`). Eine "Praxis vs. mobil"-Unterscheidung
  existiert im Datenmodell nicht — heute rein rollenbasiert
  (`partner`), keine Arbeitsweise-Flag.

### 4.4 Reitlehrerin mit Anlage UND Onlinekurs
- Arbeitsweise: stationär (Reitanlage) + digital (Online-Kurs)
- Einnahmequellen: Dienstleistung (Reitstunden) + digitales Produkt (Kurs) +
  ggf. Mitgliedschaft (Reitschule)
- Betriebsstruktur: Solo oder Team (weitere Trainer), ein Anlage-Standort
- Aktiv wären: `profession_type` `riding_instructor` (real, `serviceLabel:
  "Reitstunde"`, keine `menuItems`-Gates, also kein einziges der fünf
  gegateten Zusatz-Features aktiv — konsistent, da HufCam/Hufanalyse/BHS
  für Reitlehrer nicht relevant sind), `/kalender` ("Reitstunden"),
  `/kunden` ("Reitschüler:innen"). Kurs-Modul fehlt (wie 4.1), ebenso ein
  echtes Mitgliedschafts-Modell.

### 4.5 Stallbetreiber mit Dienstleistungen UND Shop (Futter/Zubehör)
- Arbeitsweise: stationär (Stall)
- Einnahmequellen: Stallleistung (Einstellplätze/Betreuung) + physisches
  Produkt (Shop: Futter, Zubehör)
- Betriebsstruktur: Team (Stallpersonal), ein oder mehrere Standorte
- Aktiv wären im Zielbild: `StallDashboard`, `StallKalender`
  ("Stallplätze und Betreuung"), `StallLager` (Futter/Material, konzeptionell
  deckungsgleich mit dem bereits produktiven `/lager`), `StallLeistungen`,
  `StallAnfragen` (Einstellplatzanfragen), Mitarbeiterverwaltung
  (`ClientStallStaff`). **Alles davon existiert bereits als Code, ist aber
  komplett unverdrahtet und hinter `stallbetreiberRolle` deaktiviert**
  (siehe 2.4) — dies ist der Mischbetrieb-Fall, bei dem am wenigsten neu
  gebaut, sondern vor allem reaktiviert/fertiggestellt werden müsste.

---

## 5. Bezug zum Portal-Slug-Muster als Vorbild

Das unter 2.5 beschriebene `org.type → NAV_ITEMS[type]`-Muster in
`PortalSidebar.tsx` ist strukturell exakt das, was für Provider-Accounts
fehlt: eine zentrale, kleine Lookup-Tabelle, die aus einem Typ-Feld eine
Modul-Liste ableitet, statt Bedingungen über die ganze Codebase zu
verstreuen. Der Unterschied zum hier vorgeschlagenen Provider-Baukasten:
- Portal: **ein** Typ-Feld (`org.type`), **eine** Dimension, sechs feste
  Werte, 1:1 auf ein Organisations-Objekt.
- Provider (Vorschlag, Abschnitt 6): **mehrere** orthogonale Dimensionen
  (Berufsprofil, Arbeitsweise, Einnahmequellen als Menge, Betriebsstruktur),
  die kombiniert werden — weil ein einzelner Provider z.B. gleichzeitig
  "Hufbearbeiter" + "mobil" + "Dienstleistung+Abo" + "Solo" sein kann, was
  ein einzelnes Enum-Feld nicht abbilden kann.

Das Portal-Muster beweist also, dass das Grundprinzip im Code funktioniert
und wartbar ist — es ist aber selbst nur teilweise scharf geschaltet
(2.5) und deckt nur eine Dimension ab, nicht alle vier.

---

## 6. Empfehlung: minimales Datenmodell (Vorschlag, NICHT implementieren)

Ziel: die vier Dimensionen als eigenständige, kombinierbare Felder statt als
ein einzelnes `profession_type`-Enum, ohne die App auf einen Beruf
festzunageln. Reine Dokumentation eines möglichen Zielbilds — keine
Migration, keine Tabellennamen sind real.

**Dimension 1 — Berufsprofil** (weiterhin ein Enum, aber vollständiger und
konsistent mit `PROFESSION_CONFIGS`):
- Feld etwa `profession_type` (bereits vorhanden) — Vorschlag: Lücke
  zwischen `PROFESSION_CONFIGS`-Werten (11, inkl. `farrier`) und
  `ProfessionSelector`-Optionen (9, ohne `farrier`) schließen, plus fehlende
  Profile ergänzen: `stable_operator`/Stallbetreiber, `trainer` (falls
  getrennt von `riding_instructor` gewünscht), `consultant`/Berater.

**Dimension 2 — Arbeitsweise** (neu, Vorschlag):
- Feld etwa `work_mode`: Menge/Enum aus `mobile | stationary | digital`,
  Mehrfachauswahl (z.B. als `text[]` oder eigene Zuordnungstabelle), da
  Mischformen (4.2, 4.3, 4.4) der Normalfall sind, nicht die Ausnahme.

**Dimension 3 — Einnahmequellen** (neu, Vorschlag):
- Feld etwa `revenue_sources`: Menge aus `service | physical_product |
  digital_product | shop | subscription | course | membership |
  consulting | rental | boarding_service`, ebenfalls Mehrfachauswahl.
  Das ist die wichtigste strukturelle Änderung gegenüber heute: kein
  Single-Value-Enum, sondern eine Capability-Menge — analog zu
  `menuItems: string[]` in `ProfessionConfig`, nur nutzergesteuert statt
  berufsfest vorgegeben.

**Dimension 4 — Betriebsstruktur** (teilweise vorhanden, zu erweitern):
- `client_type` (`private | stall | commercial`, bereits real auf
  `profiles`, aber nur für die `client`-Rolle) als Vorbild für ein
  äquivalentes Feld auf Provider-Seite, z.B. `business_structure`: Enum/Menge
  aus `solo | team | multi_location | own_workshop | mobile_business |
  online_business | mixed`.
- Ergänzend ein einfaches `locations`-Konzept (Standort-Liste mit
  Adresse/Geocoding) — es gibt dafür bereits eine funktionierende Vorlage:
  `ClientLocationsManager`, die laut appMap real aktiv in `ClientProfile.tsx`
  eingebunden ist (Zeile 1053: "Funktional äquivalente Komponente
  ClientLocationsManager ist aktiv in ClientProfile.tsx eingebunden").

**Ableitung von Modulen (Vorschlag, analog zum Portal-Muster):**
Eine kleine, zentrale Lookup-Funktion `resolveModules(profession, workMode,
revenueSources, businessStructure) → { visibleModules, labels,
featureFlags }` — nach demselben Muster wie
`professionHasFeature()`/`PROFESSION_CONFIGS` heute schon für die fünf
gegateten Features funktioniert, nur erweitert um die drei zusätzlichen
Dimensionen. Kein neuer Rollenmechanismus nötig — `ProtectedRoute` und die
fünf App-Shells (2.1) bleiben die äußere Grenze; die vier Dimensionen wirken
innerhalb einer Rolle (vor allem `provider` und `partner`).

**Nicht zu vergessen:** Bevor neue Felder für Stallbetreiber entstehen,
zuerst prüfen, ob der bereits gebaute, aber deaktivierte
`stallbetreiberRolle`-Codepfad (2.4) direkt reaktiviert/fertiggestellt
werden kann — sonst entsteht ein zweites Stallbetreiber-System parallel zum
schon vorhandenen.

---

## 7. Kurzfassung der Bestandsaufnahme

| Baustein | Status |
|---|---|
| 5 harte Rollen (`provider/client/partner/employee/admin`) | **echt, live**, steuert App-Shell |
| `profession_type` + `PROFESSION_CONFIGS` | **echt, live**, aber nur Label + 5 Feature-Gates + Widget-Reihenfolge, nur Rolle `provider` |
| `client_type` (private/stall/commercial) | **echt im Datenmodell**, UI-mäßig auf "private" reduziert (Flag aus) |
| Stallbetreiber-Rolle (`src/pages/stallbetreiber/*`) | **Code existiert vollständig**, appMap `attrappe`, nicht geroutet, Flag aus |
| Portal-Slug-Muster (`org.type → NAV_ITEMS`) | **Architekturmuster real und funktionsfähig**, aber Whitelabel-Produkt selbst hinter Flag, Inhalte größtenteils Demo-Arrays |
| BHS-Balance-Abo | **echt, live** — Beleg, dass "Abo" als Einnahmequelle im Kern-CRM funktioniert |
| Kurs/Academy, Marktplatz/Shop | **appMap `attrappe`** — nicht als funktionierende Referenz verwendbar |
| Generisches Berufsprofil×Arbeitsweise×Einnahmequelle×Betriebsstruktur-Datenmodell | **existiert nicht** — Abschnitt 6 ist ein Vorschlag |
