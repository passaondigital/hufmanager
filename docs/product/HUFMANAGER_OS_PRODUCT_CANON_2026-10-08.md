# HufManagerOS v1.0 — verbindliche Produkt- und Dokumentationsfassung (09.10.2026)

> **Vorrangiger Beschluss:** Exakter Name **HufManagerOS v1.0**; ein Kundenprodukt, drei geplante Tarife (Standard 19,95 €, Premium 49,90 €, Team Premium 199 €). „HufManager OS“, „HufManager Slim“ und „HufiApp“ sind alte Namen oder technische Altbezeichnungen. Die v1.0-Angabe ist Produkt-/Dokumentationsversion, **kein** technischer Release-Nachweis. Der verbindlich nachgewiesene OVH-Live-Commit vom 09.10.2026 lautet 53ed0add; ein Entwicklungsstand, der diesen überschreibt, ist nicht automatisch PROD. Alte one.com-Entwicklungsstände nie nach OVH-PROD spiegeln. Bestehende Sicherheitsgates, Tenant-Isolation, Storage-Zugriffe, Billing/Restore-Freigaben haben Vorrang. HufiBoss/HufiOS intern getrennt halten.**

> **Dokumentstand:** Diese Ergänzung ersetzt gegenteilige ältere Produktnamen und Ziele, nicht historische Test- oder Releasebelege. Der nachstehende Produktbeschluss vom 08.10. bleibt Grundlage.

# HufManager OS – Kanonische Produktstrategie (08.10.2026)

Stand 08.10.2026 | Fassung 1.0 | Beschlüsse Product Owner | Zielmarkt DACH

Geltungsbereich: Positionierung, Tarife, Nutzerrollen, Produktumfang, UX, Vernetzung, Architekturziele, priorisierte Roadmap. Diese Strategie ist KEIN Beweis, dass alle Funktionen live sind.





## 0. VERBINDLICHE GRUNDSÄTZE

EIN Produkt HufManager OS – keine eigenständige HufiApp mehr. Hufi Voice/Intelligenz wird im HufManager als Premium-Schicht integriert. Standard und Premium arbeiten auf demselben Daten-, Authentifizierungs- und Betriebsmodell. HufiBoss/HufiOS bleibt ein unabhängiges internes System und wird durch HufManager nicht verändert.

Kernbotschaft: „Weniger Büroarbeit. Mehr Zeit am Pferd.“ / „Vom ersten Kunden bis zum eigenen Team.“

Vision: die einfachste vernetzte Betriebs- und Branchenplattform für Hufpfleger, Hufbearbeiter und Hufschmiede im DACH-Markt. Vom Berufsanfänger direkt nach der Ausbildung bis zum etablierten Profi mit Mitarbeitern. Das Pferd ist die zentrale fachliche Entität. Vernetzung mit Pferdebesitzern und Fachpartnern ist ein Kernbestandteil, nicht nur ein Bonus.

Fachlicher Produktzuschnitt: FUNNEL (Kunden gewinnen) + CRM (Kunden betreuen) + ERP (Betrieb führen) + CONNECT (Zusammenarbeit am Pferd) + Hufi (optionale Automatisierung). Kein paralleles Zweitprodukt und keine ausufernde Anzahl von Tarifen.

Entwicklungsregel: DISCOVER → VERIFY → REUSE → IMPLEMENT → TEST → DOCUMENT. Nutzen vor Featurezahl; höchste Sicherheit für echte Kundendaten.





## 1. VERBINDLICHE PRODUKTTARIFE

**STANDARD 19,95 € pro Monat**: manuelles, möglichst einfaches HufManager OS. Zielumfang Kunden, Pferde/Pferdeakte, Termine, Touren, Befunde/Fotos, Leistungen/Preise, Angebote/Rechnungen, Finanzen/Ausgaben, Material/Lager, Kommunikation, kostenloser KundenApp-/Freigabezugang und eigene einfache Betriebs-Landingpage samt Formular. Ein Standard-Anwender darf nicht durch künstliche Premium-Abhängigkeiten blockiert werden. Zielentscheidung: unbegrenzt Kunden/Pferde als Datensätze; alte Code-Tariflimits prüfen und erst nach nachgewiesener Durchsetzung entfernen. Speicher, Mail-Volumen, KI, externe APIs und Missbrauchsschutz benötigen getrennte wirtschaftlich tragbare Grenzen.

**PREMIUM 49,90 € pro Monat**: vollständiger STANDARD-Funktionsumfang PLUS Hufi Voice-first, KI-Unterstützung, Arbeitsablauf-Entwürfe, Assistenz und zunehmend kontrollierte Automatisierung. Nutzer kann jederzeit alles manuell weiterbedienen. KI-Guthaben und Inklusiv-Voice-Minuten sind technisch/wirtschaftlich noch nicht final definiert; keine unbegrenzte KI versprechen.

**TEAM PREMIUM 199,00 € pro Monat**: vollständiger PREMIUM-Umfang PLUS Mitarbeiterkonten, Rollen, gemeinsame Termin-/Tour-/Kunden-/Pferdeabläufe, Aufgaben und Audit. Bestehende Team-Bausteine zuerst prüfen. Enthaltene Teamgröße, Zusatz-Sitze, Team-Voice-Guthaben, Fair Use/Verbrauch und Abrechnung sind OFFENE PRODUKTENTSCHEIDUNGEN.

Nur drei bezahlte Tarife. Preise sind Zielpreise und kein geprüfter öffentlicher Checkout; Netto-/Brutto-Darstellung, Umsatzsteuer je DE/AT/CH, Trial, CopeCart-Lifecycle, Altverträge, Kündigung und Verfügbarkeit vorher prüfen. Nicht freigegebene Premium/Team-Funktionen auf Landingpage klar als „In Vorbereitung“ darstellen.





## 2. ROLLEN UND ZUGÄNGE – VON TARIFEN GETRENNT

Hufprofi/Provider: betreibt die zahlende Organisation, besitzt eigene Kunden-, Pferde-, Abrechnungs-, Verkaufs- und Materialdaten.

Pferdebesitzer/KundenApp: dauerhaft KOSTENLOS – sämtliche vorgesehenen Besitzerfunktionen; nicht gleichzusetzen mit kostenlosen professionellen Betriebsrechten. Eigene Pferdeakte, Kommunikation und Inhalte nur im autorisierten Scope.

Fachpartner: Tierärzte, Physiotherapeuten, Osteopathen etc. arbeiten auf ausdrücklichen Freigaben. GESCHÄFTS-/PREISMODELL VORERST OFFEN; keine ungefragten Partnergebühren und keine unbeschränkte Leseberechtigung.

Mitarbeiter: interne Teamrolle eines Providers, nicht externer Partner. Rollen, Zugehörigkeit und Zugriffe müssen geprüft sein.

Drei vernetzte Zugangswelten um das Pferd: Hufprofi – Besitzer – Fachpartner; Mitarbeiter innerhalb des Provider-Teams. Ein gemeinsames fachliches Pferde-/Beziehungsmodell mit serverseitigen Berechtigungen, widerrufbaren Freigaben, Datenherkunft und Audit. Weder Marke noch sichtbare UI oder gespeicherte IDs sind eine Erlaubnis, auf Daten zuzugreifen.





## 3. FUNNEL + CRM + ERP – DER DURCHGÄNGIGE ABLAUF

Funnel: Jeder Hufprofi soll eine eigene automatisch anpassbare Betriebs-/Salespage bekommen. Wahlweise eine HufManager-Subdomain, eine sicher verifizierte eigene Domain oder Kontakt-/Termin-Widgets zum Einbetten in eine bestehende Website. Enthalten: Logo, Leistungen, Region, Kontaktdaten, Kontaktanfrage, Interessentenquelle, Datenschutzhinweise. Auch ein Berufsanfänger muss dies ohne Website- oder Codekenntnisse einrichten können.

CRM: Öffentliche Anfrage → Lead beim RICHTIGEN Betrieb → Kontakt → Kunde → Pferd → Termin → Nachricht/Verlauf. Zuordnung zu Provider und Einwilligung sind entscheidend. DSGVO-geeignete Hinweise, Rate Limits, Anti-Spam, Datenschutz, Einbettungs-/postMessage-Origin-Prüfung und Dublettenbehandlung verpflichtend.

ERP: Termin/Route → Bearbeitung → Pferdeakte/Materialverbrauch → Rechnungsentwurf → Zahlung/Finanzen → Follow-up und Betriebsauswertung. Daten einmal erfassen und in den jeweils autorisierten Bereichen wiederverwenden. In DE/AT/CH regionale Steuer-/Rechnungsvorschriften beachten.

IST-Grundlage (nur Codeinventar): WebsiteEditor, LandingEditor, ProviderLanding, DomainSection, WidgetGeneratorTab, LandingContactForm, leads, Kunden/Pferde/Termine/Rechnungen sowie Lager/PurchasingTab/SuppliersTab existieren im Repository. Es gibt teils verwaiste Routes/Featureflags, alte hufiapp.de-URLs, alte Tariffreigaben und fehlende End-to-End-Nachweise. Vor Reaktivierung prüfen, nicht neu duplizieren. Eigene Domain und iframe-Widgets nicht als bereits vollständig produktionsreif ausgeben.





## 4. MATERIAL/LAGER + HERSTELLER-/HÄNDLERANBINDUNG

Ziel: Artikelstamm nach Hersteller, Variante, Größe, Einheit, Bestand und Mindestbestand; Verbrauch je Pferd/Termin/Leistung; automatische NACHBESTELLVORSCHLÄGE. Mehrere Händler/Hersteller sollen auswählbar sein und ggf. Preis, Lieferzeit und Verfügbarkeit vergleichen lassen, wenn echte Schnittstellen vorliegen.

Offen und herstellerneutral: offizielle Händler-APIs, genehmigte Feeds/CSV, vorbereitete E-Mail-Bestellungen, Warenkorb-/Shop-Links. MCP als kontrollierter Toolstandard für Hufi, nicht als magischer Zugriff auf Händler ohne API/Partnerschaft. Bestellungen/Zahlungen ausschließlich nach ausdrücklicher Bestätigung; Idempotenz, Beleg, Lieferstatus und Preisgültigkeit prüfen. Ein fremder Händlerausfall darf das lokale Lager nicht blockieren.

MVP: korrekter Materialverbrauch → Bestand → Mindestbestand → Bestellentwurf an hinterlegten Lieferanten, ohne automatische Zahlung.





## 5. HUFI INTELLIGENZ – JARVIS ALS LANGFRISTIGE VISION

Premium ist primär auf Voice-first und Automatisierung ausgelegt; keine reine Chatbot-Funktion. Der manuelle Modus ist auch in Premium und Team vollständig verfügbar.

Erster realer End-to-End-MVP: „Hufi, dokumentiere die Bearbeitung bei Pferd X“ → Sprachaufnahme → Transkription → eindeutige Pferdzuordnung → editierbarer Befund-Entwurf → Bestätigung → gesicherter Akteneintrag. Danach Termin-/Rechnungs-/Materialentwürfe und bestätigte Bestellvorschläge; später proaktive Briefings, koordinierte Mehrschrittaufgaben und Team.

Technische Leitplanken: Least Privilege, betriebliche Berechtigungen, kontrollierte externe Tools, Einwilligung, Bestätigung vor Schreiben/Versenden/Kauf, Kosten-/Guthabenlimits, transaktionssichere Verbrauchsbuchung, nachvollziehbare Tool-/Action-Logs, sichere Ablehnung unklarer Entitäten, Schutz vor doppelten Aktionen. KI darf keine Autorisierungs- oder Geldentscheidungen selbst begründen.

Bestehender HufiApp-Code (VoiceAgent, UsageWidget, voice-route, voice-token, Credits) ist Wiederverwendungskandidat, nicht ungeprüfte Importfreigabe. CopeCart als vorhandene HufManager-Billing-Grundlage; keine zweite unkoordinierte Stripe-Zahlungswelt. Sprach-/KI-Minuten vor Verkauf wirtschaftlich kalkulieren.





## 6. UI/UX UND DESIGN – AUS SICHT EINES ANFÄNGERS

Design: HufiPreview-Richtung; Markenfarben Orange #E97824, Weiß #FFFFFF, Schwarz #000000 mit neutralen Abstufungen, Light/Dark. Klar lesbare Typografie statt flächiger Monospace-Schrift. Keine überlappenden PWA-/Hufi-Popups, keine Backend-Namen, keine überfrachteten Einstellungsmenüs.

Desktop links: Heute, Termine, Tour, Kunden, Pferde, Rechnungen, Finanzen, Mehr. Direkt darunter Schnellaktionen: Neuer Termin, Neuer Kunde, Neues Pferd, Neue Rechnung, Notiz. Unten Profil, Abmelden. Mehr mit vier Blöcken: Ich / Mein Betrieb / Kunden & App / Erweitert. Smartphone: reduzierte Bottom-Navigation und zentraler Schnellaktionsknopf. Einfache Sprache, wenige Klicks, verlässlicher Back-/Logout-Weg.

Die vorhandene kurze Notiz liegt nach bekanntem Stand nur auf dem Gerät und wird beim Logout gelöscht; keine synchronisierte Speicherung suggerieren. Bestandseiten in den Einstellungsunterpunkten noch auf weitere Verschachtelung prüfen.





## 7. WWW.HUFMANAGER.DE – VERKAUFSARGUMENTATION

Primäre Botschaft: „Weniger Büroarbeit. Mehr Zeit am Pferd.“ Sekundär: „Vom ersten Kunden bis zum eigenen Team.“

Subline-Ziel: „HufManager verbindet deine Website, Kunden, Pferde, Termine, Touren, Pferdeakten, Rechnungen und Materialverwaltung in einem System. Vernetze Pferdebesitzer und Fachpartner. Einfach manuell – oder mit Hufi intelligent unterstützt.“

Innerhalb von fünf Sekunden sollen Zielgruppe, Problem, Nutzen, Einstiegspreis und die Vernetzung verständlich sein.

Sechs Nutzenpunkte im Hero: Kunden gewinnen; Termine & Touren; Pferdeakte & Befunde; Rechnungen/Finanzen; kostenlose Besitzer-App & Fachpartner; Material/Lager. Nicht zehn Absätze in der mobilen ersten Ansicht.

Seitenreihenfolge: Hero/Produktvorschau → fünf Schritte im Arbeitsalltag → drei vernetzte Rollen am Pferd → Kernfunktionen → Salespage/Funnel-CRM-ERP → Standard/Premium/Team-Preisvergleich → reale Gründer-/Vertrauensbelege → FAQ/CTA.

Kein „KI jetzt live“, solange nicht verifiziert. Keine frei erfundenen Zeitersparnisse, Auszeichnungen oder Sicherheitszusagen. Fotos/Mocks als Mock kennzeichnen; echte Produktscreens bevorzugen.





## 8. PROTOKOLLIERTER UMSETZUNGSSTAND (ZUSAMMENGEFASST, OHNE SENSITIVE SECURITY-DETAILS)

Referenz aus Claude-Code-Protokoll vom 08.10.2026: Navigations-Preview-Commit 946cc7e3, 196 grüne Vitest-Tests, erfolgreicher Build, 76 verbleibende TypeScript-Diagnosen. Mobile und vollständige End-to-End-Reife nicht belegt. Die Vorschau ist keine bestätigte öffentliche Produktionsauslieferung.

Security-/Restore-/Auth-/Billing- und Mandantentrennungsgates bleiben bis zur erneuten Prüfung und protokollierten Owner-Freigabe offen. Detailbefunde und sicherheitsrelevante operative Maßnahmen gehören ausschließlich in das autorisierte, nicht öffentliche Security-/Recovery-Runbook, nicht in diese öffentliche Produktstrategie.



## 9. ROADMAP – NACHEINANDER, NICHT ALS EINE XXL-BAUSTELLE

P0: verifizierte RPC-/Storage-Sicherheit, Backup/Restore, Auth/Billing/Webhooks, RLS/Tenant-Isolation, Mobile/Offline-Risiken und releasekritische TypeScript-Fehler.

P1: HufManager Slim Standard nachvollziehbar stabil; Navigation und Kernabläufe testen; echte Feature-Liste; Landingpage auf drei Tarife und DACH klarstellen.

P2: Website/Subdomain/Formular-Flow reaktivieren und durchgängigen Lead→Kunde→Pferd→Termin-Prozess in isoliertem QA testen. Eigene Domain mit TLS/Domain-Verifikation. Lagerverbrauch→Bestellentwurf.

P3: Hufi Voice Befund-Entwurf + Credits-Kontrolle; getrennt Team-Rechte und gemeinsame Arbeitsabläufe härten. Fachpartner-Freigaben prüfen.

P4: erste genehmigte Händler-API-/MCP-Anbindung, zusätzliche Automationsketten und Branchennetzwerk-Ausbau.

Jede Phase testbar dokumentieren; keine gleichzeitige Implementierung aller Zukunftsfeatures.





## 10. OFFENE ENTSCHEIDUNGEN UND GRENZEN

OFFEN: Netto/Brutto/Steuerausweisung; Team-Sitze und Premium-Guthaben; Fachpartner-Geschäftsmodell; Domain-/Speicher-/API-Limits; Lieferantenkooperationen; KI-Datenverarbeitung/Einwilligungen; Trial/Upgrade/Downgrade/Kündigungsdetails; Sicherheitsfreigaben.

Produktziel ist nicht ein Go-Live-Befehl. Keine produktiven Datenbankmigrationen, Storage-Policy-Änderungen, Deploys, Domain-/Nginx-Änderungen, Zahlungen oder Einkäufe ohne explizite gesonderte Owner-Zustimmung.

CODEXTODO.md/AGENTS.md/CLAUDE.md sind vor Entwicklungsarbeit einzuhalten. Bestehende reale Kundendaten nicht in Test-/Log-/Doku-Ausgaben kopieren.

Reifegrad je Funktion eindeutig als IDEA / PLANNED / FOUNDATION / BUILT / TESTED / STAGING / PRODUCTION / PARTIAL / BLOCKED / UNKNOWN ausweisen.





## 11. ABNAHMEKRITERIEN (ZIELWERTE, NICHT BELEGT)

Ein Berufsanfänger kann Kunde/Pferd/Termin in weniger als fünf Minuten beginnen; Termin aus vorhandener Akte unter 30 Sekunden; Rechnungsentwurf unter 60 Sekunden; alle Funktionen ohne Voice nutzbar; Premium-Aktion nur mit überprüfbarem Entwurf/Freigabe; Besitzer kostenlos; Team-/Partner-Zugriffe getrennt; Funnel lässt keine fremden Leads durchsickern; Einkauf löst keine Bestellung ohne Freigabe aus. Zeitersparnis und Marktüberlegenheit erst nach realen DACH-Anwender-Tests bewerben.





## FASSUNG VOM 08.10.2026

Ersetzt ältere strategische Annahmen eines separaten HufiApp-Produkts und älterer HufManager-Tarifstaffeln. Ersetzt NICHT frühere Prüfberichte, Go-Live-Protokolle oder tatsächlich verifizierte Live-Fakten. Neue Produktentscheidungen mit Datum, Product Owner und Delta hier ergänzen.

---

**Quellen / Pflege:** Produktbeschlüsse des Owners am 08.10.2026. [Drive-Masterfassung](https://docs.google.com/document/d/127JUnqsAIf-q1cswyqgeLyy5MaRQTTnGbaTY703dddY/edit) (zugangsbeschränkt). Historische Berichte sind kein Nachweis des aktuellen Runtime-Zustands. Produktentscheidungen ändern keine Deploy-Rechte. Aktualisierungen mit Datum und Owner-Delta festhalten.
