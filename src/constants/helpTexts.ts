/**
 * Zentrale Hilfe-Texte für den gesamten HufManager.
 * Struktur: { sektion: { feld: { title, description } } }
 * Leere Beschreibungen mit Platzhalter, damit sie nach und nach befüllt werden können.
 */

export interface HelpTextEntry {
  title: string;
  description: string;
}

export const helpTexts: Record<string, Record<string, HelpTextEntry>> = {
  // ─── Dashboard ────────────────────────────────────────────
  dashboard: {
    "aktive-kunden": {
      title: "Aktive Kunden",
      description:
        "Zeigt die Anzahl deiner Kunden mit mindestens einem geplanten oder abgeschlossenen Termin. Klicke auf die Karte, um zur Kundenliste zu gelangen.",
    },
    "termine-woche": {
      title: "Termine diese Woche",
      description:
        "Anzahl aller geplanten Termine in der aktuellen Kalenderwoche. Die Zusatzinfo zeigt, wie viele Termine heute anstehen.",
    },
    "neue-anfragen": {
      title: "Neue Anfragen",
      description:
        "Hier siehst du, wie viele neue Kontaktanfragen von potenziellen Neukunden eingegangen sind. Ungelesene Anfragen werden hervorgehoben.",
    },
    "umsatz-monat": {
      title: "Umsatz (Monat)",
      description:
        "Dein Gesamtumsatz im laufenden Monat basierend auf abgeschlossenen und fakturierten Terminen. Die Veränderung zeigt den Vergleich zum Vormonat.",
    },
    "faellige-termine": {
      title: "Fällige Termine",
      description:
        "Pferde, deren Hufbearbeitung laut Intervall überfällig ist. Du kannst direkt einen Termin planen oder zum nächsten Termin hinzufügen.",
    },
    "erste-schritte": {
      title: "Erste Schritte",
      description:
        "Checkliste zum Einrichten deines HufManager-Accounts. Erledige alle Schritte, um das volle Potenzial auszuschöpfen.",
    },
    "tour-vorschlaege": {
      title: "Smarte Tour-Vorschläge",
      description:
        "Basierend auf deinen Terminen und Standorten schlägt HufManager optimierte Tourenrouten vor, um Fahrzeit und Sprit zu sparen.",
    },
    "spritpreise": {
      title: "Live-Spritpreise",
      description:
        "Aktuelle Kraftstoffpreise von Tankstellen in deiner Nähe. Die Daten werden von der Tankerkönig-API geliefert.",
    },
    "hufrente": {
      title: "Hufrente",
      description:
        "Übersicht über deine Hufrente-Rücklagen. Plane jetzt für deine berufliche Zukunft vor.",
    },
    "einladen": {
      title: "Einladungslink teilen",
      description:
        "Teile deinen persönlichen Einladungslink mit Kunden, damit diese sich selbst registrieren und ihre Pferde anlegen können.",
    },
    "demo-tour": {
      title: "Demo-Tour",
      description:
        "Starte eine geführte Tour durch den HufManager, um alle wichtigen Funktionen kennenzulernen.",
    },
  },

  // ─── 1. Anfragen ──────────────────────────────────────────
  anfragen: {
    bereich: {
      title: "Anfragen-Bereich",
      description:
        "Hier gehen Anfragen von Neukunden ein, die dich über deine Website, den QR-Code oder den Einladungslink kontaktiert haben.",
    },
    "status-filter": {
      title: "Status-Filter",
      description:
        "Filtere Anfragen nach Status: Neu, Kontaktiert, Angebot gesendet, Gewonnen oder Verloren.",
    },
    suche: {
      title: "Suche",
      description:
        "Durchsuche alle Anfragen nach Name, Telefonnummer, E-Mail oder PLZ.",
    },
    "status-aendern": {
      title: "Status ändern",
      description:
        "Ändere den Bearbeitungsstatus einer Anfrage, um den Fortschritt zu tracken.",
    },
    "broadcast-senden": {
      title: "Broadcast senden",
      description:
        "Sende eine Nachricht an mehrere Kunden gleichzeitig – z.B. für Terminänderungen oder saisonale Infos.",
    },
  },

  // ─── 2. Angebote ──────────────────────────────────────────
  angebote: {
    bereich: {
      title: "Angebote-Bereich",
      description:
        "Verwalte deine Dienstleistungen und Preise, die auf deiner Website und bei der Terminbuchung angezeigt werden.",
    },
    "neues-angebot": {
      title: "Neues Angebot erstellen",
      description:
        "Lege eine neue Dienstleistung mit Preis, Beschreibung und optional einem Video an.",
    },
    "preis-typ": {
      title: "Preis-Typ",
      description:
        "Wähle zwischen Festpreis, ab-Preis, Preis auf Anfrage oder kostenlos.",
    },
    "video-url": {
      title: "Video-URL",
      description:
        "Füge ein YouTube-Video hinzu, das deine Dienstleistung erklärt. Es wird als Thumbnail auf der Website angezeigt.",
    },
    "live-vorschau": {
      title: "Live-Vorschau",
      description:
        "Sieh dir in Echtzeit an, wie dein Angebot auf der Website für Kunden aussehen wird.",
    },
    "material-rezeptur": {
      title: "Material-Rezeptur",
      description:
        "Verknüpfe Lagerbestände mit diesem Angebot. Bei jedem abgeschlossenen Termin werden die Materialien automatisch abgebucht.",
    },
  },

  // ─── 3. Aufnahme ──────────────────────────────────────────
  aufnahme: {
    bereich: {
      title: "Aufnahme-Hub",
      description:
        "Zentraler Einstiegspunkt: Wähle ob du einen neuen Kunden anlegen, ein neues Pferd erfassen oder eine Einladung senden möchtest.",
    },
    "neuer-kunde": {
      title: "Neuen Kunden anlegen",
      description:
        "Erfasse Name, Kontaktdaten und Standort deines neuen Kunden. Duplikate werden automatisch erkannt.",
    },
    "neues-pferd": {
      title: "Neues Pferd anlegen",
      description:
        "Ordne das Pferd einem bestehenden Kunden zu und erfasse Rasse, Geburtsjahr und Haltungsart.",
    },
    "kunde-vorname": {
      title: "Vorname",
      description: "Der Vorname des Kunden. Pflichtfeld.",
    },
    "kunde-nachname": {
      title: "Nachname",
      description: "Der Nachname des Kunden. Pflichtfeld.",
    },
    "kunde-email": {
      title: "E-Mail",
      description:
        "Die E-Mail-Adresse für Terminbestätigungen und Rechnungen. Optional, aber empfohlen.",
    },
    "kunde-telefon": {
      title: "Telefon",
      description:
        "Die Telefonnummer für kurzfristige Terminabsprachen. Optional.",
    },
    "pferd-name": {
      title: "Pferdename",
      description: "Der Name des Pferdes. Pflichtfeld.",
    },
    "pferd-rasse": {
      title: "Rasse",
      description: "Die Rasse des Pferdes (z.B. Haflinger, Warmblut). Optional.",
    },
    "pferd-geburtsjahr": {
      title: "Geburtsjahr",
      description: "Das Geburtsjahr des Pferdes im Format JJJJ (z.B. 2018). Optional.",
    },
    "standort-picker": {
      title: "Standort",
      description:
        "Markiere den Stallstandort auf der Karte, damit der Tour Manager optimale Routen berechnen kann.",
    },
  },

  // ─── 4. Auffassen ─────────────────────────────────────────
  auffassen: {
    bereich: {
      title: "Auffassen-Bereich",
      description:
        "Sammle und verwalte Kundenbewertungen. Positive Bewertungen stärken dein Profil und helfen bei der Neukundengewinnung.",
    },
    "neue-bewertung": {
      title: "Neue Bewertung",
      description:
        "Erstelle manuell eine Bewertung, z.B. basierend auf einer WhatsApp-Nachricht oder einem Telefonat.",
    },
    "bewertung-quelle": {
      title: "Quelle",
      description:
        "Woher stammt die Bewertung? App, WhatsApp, Google, E-Mail oder Screenshot.",
    },
    "bewertung-sterne": {
      title: "Sterne-Bewertung",
      description:
        "Die Gesamtbewertung von 1 bis 5 Sternen.",
    },
    "bewertung-veroeffentlichen": {
      title: "Veröffentlichen",
      description:
        "Veröffentlichte Bewertungen werden auf deiner öffentlichen Website angezeigt.",
    },
    "feedback-link": {
      title: "Feedback-Link",
      description:
        "Teile diesen Link mit Kunden, damit sie dir eine Bewertung direkt über die App hinterlassen können.",
    },
  },

  // ─── 5. Analyse ───────────────────────────────────────────
  analyse: {
    bereich: {
      title: "Analyse-Bereich",
      description:
        "Detaillierte Statistiken zu Umsatz, Terminen, Kunden und Wachstum. Filtere nach Jahr für Vergleichswerte.",
    },
    "jahres-filter": {
      title: "Jahres-Filter",
      description:
        "Wähle ein Jahr aus, um die Statistiken für diesen Zeitraum anzuzeigen. Veränderungen werden zum Vorjahr berechnet.",
    },
    "umsatz-chart": {
      title: "Umsatz-Entwicklung",
      description:
        "Monatlicher Umsatzverlauf als Liniendiagramm. Zeigt Trends und saisonale Schwankungen.",
    },
    "termin-statistik": {
      title: "Termin-Statistik",
      description:
        "Verteilung deiner Termine nach Monat als Balkendiagramm.",
    },
    "service-verteilung": {
      title: "Service-Verteilung",
      description:
        "Kreisdiagramm: Welche Dienstleistungen werden am häufigsten gebucht?",
    },
    "csv-export": {
      title: "CSV-Export",
      description:
        "Exportiere deine Analyse-Daten als CSV-Datei für die Buchhaltung oder externe Auswertung.",
    },
  },

  // ─── Kalender ─────────────────────────────────────────────
  kalender: {
    bereich: {
      title: "Kalender",
      description: "Dein Terminkalender mit Tages-, Wochen- und Monatsansicht. Termine können per Drag & Drop verschoben werden.",
    },
    "termin-erstellen": {
      title: "Termin erstellen",
      description: "Erstelle einen neuen Termin für ein Pferd. Wähle Datum, Uhrzeit, Dienstleistung und Standort.",
    },
    "termin-bearbeiten": {
      title: "Termin bearbeiten",
      description: "Ändere Details eines bestehenden Termins wie Datum, Uhrzeit oder Dienstleistung.",
    },
    "termin-loeschen": {
      title: "Termin löschen",
      description: "Lösche einen Termin unwiderruflich. Der Kunde wird optional benachrichtigt.",
    },
  },

  // ─── Rechnungen ───────────────────────────────────────────
  rechnungen: {
    bereich: {
      title: "Rechnungen",
      description: "Erstelle und verwalte Rechnungen für abgeschlossene Termine. PDF-Export und Versand per E-Mail möglich.",
    },
    "position-hinzufuegen": {
      title: "Position hinzufügen",
      description: "Füge eine neue Rechnungsposition hinzu – entweder aus dem Lager oder als manuellen Eintrag.",
    },
    "produkt-waehlen": {
      title: "Produkt aus Lager",
      description: "Wähle ein Produkt aus deinem Lagerbestand. Preis und Bezeichnung werden automatisch übernommen.",
    },
    menge: {
      title: "Menge",
      description: "Anzahl der berechneten Einheiten für diese Position.",
    },
    "einzel-preis": {
      title: "Einzelpreis",
      description: "Preis pro Einheit in Euro. Wird automatisch befüllt bei Lagerprodukten, bleibt aber editierbar.",
    },
  },

  // ─── Tour Manager ────────────────────────────────────────
  tour: {
    bereich: {
      title: "Tour Manager",
      description: "Plane und optimiere deine Tagestouren. Der Tour Manager berechnet die effizienteste Route.",
    },
    "tour-starten": {
      title: "Tour starten",
      description: "Starte deine geplante Tagestour. Die Navigation führt dich von Stall zu Stall.",
    },
    "tour-beenden": {
      title: "Tour beenden",
      description: "Beende die aktive Tour und erfasse die gefahrenen Kilometer.",
    },
    "termin-abschliessen": {
      title: "Termin abschließen",
      description: "Markiere einen Termin als erledigt und erfasse optional Notizen und Unterschrift.",
    },
  },

  // ─── Fuhrpark / km-Tracker ────────────────────────────────
  fuhrpark: {
    bereich: {
      title: "Fuhrpark",
      description: "Verwalte deine Fahrzeuge, erfasse Tankstopps und tracke Kilometerkosten für die Steuererklärung.",
    },
    "km-stand": {
      title: "Kilometerstand",
      description: "Aktueller Kilometerstand des Fahrzeugs. Wird für die Berechnung der Fahrtkosten verwendet.",
    },
    "tankstopp": {
      title: "Tankstopp erfassen",
      description: "Erfasse einen Tankstopp mit Menge, Preis und Kilometerstand. Der Literpreis wird live vorausgefüllt.",
    },
    "preis-pro-liter": {
      title: "Preis pro Liter",
      description: "Wird automatisch mit dem aktuellen Live-Dieselpreis vorausgefüllt, kann aber manuell angepasst werden.",
    },
  },

  // ─── HufCam Pro ───────────────────────────────────────────
  hufcam: {
    bereich: {
      title: "HufCam Pro",
      description: "Fotografiere Hufe und erstelle visuelle Dokumentationen. Fotos werden dem Termin zugeordnet.",
    },
    "foto-aufnehmen": {
      title: "Foto aufnehmen",
      description: "Nimm ein Foto direkt mit der Kamera auf oder wähle ein Bild aus der Galerie.",
    },
  },

  // ─── Hufanalyse ───────────────────────────────────────────
  hufanalyse: {
    bereich: {
      title: "Hufanalyse",
      description: "KI-gestützte Analyse von Huffotos. Erkennt Anomalien und gibt Empfehlungen.",
    },
  },

  // ─── Einstellungen ────────────────────────────────────────
  einstellungen: {
    "geschaeftsname": {
      title: "Geschäftsname",
      description: "Der Name deines Betriebs, wie er auf Rechnungen und deiner Website erscheint. Bearbeite ihn unter Management → Mein Profil.",
    },
    email: {
      title: "E-Mail",
      description: "Deine geschäftliche E-Mail-Adresse für den Kundenkontakt.",
    },
    telefon: {
      title: "Telefon",
      description: "Deine geschäftliche Telefonnummer.",
    },
    adresse: {
      title: "Adresse",
      description: "Deine Geschäftsadresse – wird für Rechnungen und die Standortberechnung verwendet.",
    },
    steuernummer: {
      title: "Steuernummer",
      description: "Deine Steuernummer für die Rechnungsstellung. Pflicht ab einem gewissen Umsatz.",
    },
    "ust-id": {
      title: "USt-IdNr.",
      description: "Umsatzsteuer-Identifikationsnummer für EU-Geschäfte. Optional.",
    },
    iban: {
      title: "IBAN",
      description: "Deine Bankverbindung, die auf Rechnungen angezeigt wird.",
    },
    "mwst-pflichtig": {
      title: "MwSt.-pflichtig",
      description: "Aktiviere dies, wenn du umsatzsteuerpflichtig bist. Rechnungen werden dann mit MwSt. ausgestellt.",
    },
    "kleinunternehmer": {
      title: "Kleinunternehmer",
      description: "Gemäß §19 UStG: Wenn aktiviert, wird auf Rechnungen keine MwSt. ausgewiesen.",
    },
  },

  // ─── Team-Modul ───────────────────────────────────────────
  team: {
    bereich: {
      title: "Team-Modul",
      description: "Verwalte Mitarbeiter, weise Termine zu und kontrolliere Zugriffsrechte.",
    },
    "mitarbeiter-einladen": {
      title: "Mitarbeiter einladen",
      description: "Sende eine Einladung per E-Mail an einen neuen Mitarbeiter.",
    },
    "rolle-zuweisen": {
      title: "Rolle zuweisen",
      description: "Bestimme, welche Bereiche ein Mitarbeiter sehen und bearbeiten darf.",
    },
  },

  // ─── Lager ────────────────────────────────────────────────
  lager: {
    bereich: {
      title: "Lagerverwaltung",
      description: "Verwalte deine Produkte und Materialien. Bestandswarnungen informieren dich, wenn Nachschub nötig ist.",
    },
    "neues-produkt": {
      title: "Neues Produkt",
      description: "Lege ein neues Produkt mit Name, Marke, Einkaufspreis und Verkaufspreis an.",
    },
    mindestbestand: {
      title: "Mindestbestand",
      description: "Unter diesem Wert bekommst du eine Warnung, dass Nachbestellung nötig ist.",
    },
  },

  // ─── Partner-App ──────────────────────────────────────────
  partner: {
    home: {
      title: "Partner-Dashboard",
      description: "Deine Übersicht als Fachpartner. Hier siehst du freigegebene Pferde, anstehende Termine und aktuelle Anfragen.",
    },
    kalender: {
      title: "Kalender",
      description: "Dein Terminkalender als Fachpartner. Erstelle und verwalte Behandlungstermine.",
    },
    rechnungen: {
      title: "Rechnungen",
      description: "Erstelle Rechnungen für deine Behandlungen und verwalte offene Posten.",
    },
    chat: {
      title: "Chat",
      description: "Kommuniziere direkt mit Pferdebesitzern und Hufbearbeitern über Behandlungspläne.",
    },
    netzwerk: {
      title: "Netzwerk",
      description: "Vernetze dich mit Hufbearbeitern und anderen Fachpartnern in deiner Region.",
    },
    notizen: {
      title: "Behandlungsnotizen",
      description: "Deine Notizen zu einzelnen Pferden und Behandlungen, chronologisch sortiert.",
    },
    dokumente: {
      title: "Dokumente & Befunde",
      description: "Lade Befunde, Röntgenbilder und andere Dokumente hoch und ordne sie Pferden zu.",
    },
    behandlungsplaene: {
      title: "Behandlungspläne",
      description: "Erstelle strukturierte Behandlungspläne mit Zielen, Maßnahmen und Verlaufskontrolle.",
    },
    services: {
      title: "Meine Leistungen",
      description: "Verwalte deine angebotenen Dienstleistungen mit Preisen und Beschreibungen.",
    },
    profil: {
      title: "Mein Profil",
      description: "Bearbeite dein öffentliches Fachpartner-Profil, Qualifikationen und Kontaktdaten.",
    },
    einstellungen: {
      title: "Einstellungen",
      description: "Konfiguriere dein Partner-Konto, Benachrichtigungen und Datenschutz-Einstellungen.",
    },
    "sichtbar-provider": {
      title: "Sichtbar für Provider",
      description: "Wenn aktiv, kann der Hufbearbeiter deinen Befund sehen. Empfohlen für bessere Zusammenarbeit.",
    },
    empfehlung: {
      title: "Empfehlung an",
      description: "Schreibe eine Empfehlung an den Hufbearbeiter oder Besitzer. Sie erscheint beim nächsten Termin-Briefing.",
    },
    bodymap: {
      title: "Body-Map",
      description: "Tippe auf die Körperregion die du behandelt hast. Die Markierung wird automatisch in der Pferdeakte gespeichert.",
    },
  },

  // ─── Mitarbeiter-App ──────────────────────────────────────
  mitarbeiter: {
    kalender: {
      title: "Kalender",
      description: "Deine zugewiesenen Termine. Hier siehst du, welche Pferde du heute bearbeiten musst.",
    },
    notizbuch: {
      title: "Notizbuch",
      description: "Persönliche Notizen zu Terminen und Pferden. Nur du kannst diese sehen.",
    },
    material: {
      title: "Mein Material",
      description: "Übersicht über dir zugewiesene Materialien und Werkzeuge.",
    },
    hufcam: {
      title: "HufCam Pro",
      description: "Fotografiere Hufe während der Bearbeitung für die Dokumentation.",
    },
    hufanalyse: {
      title: "Hufanalyse",
      description: "Erstelle Bearbeitungsbögen nach dem Leipziger Modell für zugewiesene Pferde.",
    },
    timer: {
      title: "Zeiterfassung",
      description: "Erfasse deine Arbeitszeiten pro Termin oder Tag für die Abrechnung.",
    },
    abwesenheiten: {
      title: "Abwesenheiten",
      description: "Melde Urlaub, Krankheit oder andere Abwesenheiten an deinen Arbeitgeber.",
    },
    vertrag: {
      title: "Mein Vertrag",
      description: "Einsicht in deine Vertragsdaten und Konditionen.",
    },
    profil: {
      title: "Mein Profil",
      description: "Bearbeite deine persönlichen Daten und Kontaktinformationen.",
    },
    chat: {
      title: "Chat",
      description: "Kommuniziere mit deinem Chef und Teamkollegen.",
    },
  },

  // ─── Kunden-App ───────────────────────────────────────────
  kunden: {
    home: {
      title: "Mein Dashboard",
      description: "Deine Übersicht mit Pferden, nächsten Terminen und Nachrichten.",
    },
    pferde: {
      title: "Meine Pferde",
      description: "Alle deine registrierten Pferde mit Behandlungshistorie und Terminstatus.",
    },
    rechnungen: {
      title: "Rechnungen",
      description: "Alle Rechnungen deines Hufbearbeiters. Du kannst sie herunterladen und den Zahlungsstatus einsehen.",
    },
    buchen: {
      title: "Service buchen",
      description: "Buche einen Termin bei deinem Hufbearbeiter – wähle Service, Pferd und Wunschtermin.",
    },
    profil: {
      title: "Mein Profil",
      description: "Bearbeite deine Kontaktdaten und Adresse.",
    },
    chat: {
      title: "Chat",
      description: "Schreibe deinem Hufbearbeiter direkt eine Nachricht.",
    },
    stallboard: {
      title: "Stallboard",
      description: "Aktuelle Infos und Ankündigungen von deinem Hufbearbeiter für den Stall.",
    },
    freigaben: {
      title: "Datenfreigabe",
      description: "Kontrolliere, wer Zugriff auf deine Pferdedaten hat – z.B. Tierärzte oder Fachpartner.",
    },
    pferdeakte: {
      title: "Pferdeakte",
      description: "Die Pferdeakte zeigt alle Behandlungen, Befunde und Gesundheitsdaten deines Pferdes an einem Ort.",
    },
    qrcode: {
      title: "Notfall-QR-Code",
      description: "Drucke diesen QR-Code aus und hänge ihn an den Stall oder das Halfter. Im Notfall kann jeder scannen und sieht die wichtigsten Kontakte.",
    },
    buchung: {
      title: "Gesundheitsinfos bei Buchung",
      description: "Diese Infos helfen deinem Hufbearbeiter sich optimal auf den ersten Termin vorzubereiten. Alles optional.",
    },
  },
  // ─── Client App ─────────────────────────────────────────
  client: {
    "heute-termine": {
      title: "Heutige Termine",
      description: "Zeigt deine Termine für heute mit Live-Status deines Hufpflegers. Du siehst in Echtzeit, ob er unterwegs ist oder bereits angekommen.",
    },
    standorte: {
      title: "Meine Standorte",
      description: "Verwalte mehrere Stall-Standorte. Der Standardstandort wird bei neuen Terminen automatisch verwendet.",
    },
    benachrichtigungen: {
      title: "Benachrichtigungen",
      description: "Wähle, wie du benachrichtigt werden möchtest: Per Push, E-Mail oder beides. Stelle auch die Sprache deiner Benachrichtigungen ein.",
    },
    "naechster-termin": {
      title: "Nächster Termin",
      description: "Dein nächster geplanter Termin mit Countdown. Tippe darauf, um Details zu sehen.",
    },
    "pferde-liste": {
      title: "Meine Pferde",
      description: "Übersicht aller deiner registrierten Pferde. Tippe auf ein Pferd, um die Akte zu öffnen.",
    },
    "tour-status": {
      title: "Tour-Status",
      description: "Zeigt den Live-Fortschritt deines Hufpflegers auf seiner Tour. Du siehst, wie viele Stationen noch vor dir sind.",
    },
    profil: {
      title: "Mein Profil",
      description: "Verwalte deine persönlichen Daten, Standorte, Benachrichtigungseinstellungen und Notfallkontakte.",
    },
    rechnungen: {
      title: "Meine Rechnungen",
      description: "Übersicht aller Rechnungen deines Hufpflegers. Du kannst sie als PDF herunterladen.",
    },
    buchen: {
      title: "Termin buchen",
      description: "Buche einen neuen Termin bei deinem Hufpfleger. Wähle die Leistung, dein Pferd und deinen Wunschtermin.",
    },
    chat: {
      title: "Chat",
      description: "Schreibe deinem Hufpfleger eine Nachricht. Ideal für Rückfragen oder Terminänderungen.",
    },
    "dashboard-hero": {
      title: "Heutiger Termin",
      description: "Hier siehst du deinen heutigen Termin und wann dein Profi bei dir ist. Der Status wird live aktualisiert.",
    },
    "dashboard-timeline": {
      title: "Status-Timeline",
      description: "Diese Leiste zeigt dir live, wo sich dein Termin gerade befindet – von der Planung bis zum Abschluss.",
    },
    "dashboard-upcoming": {
      title: "Nächste Termine",
      description: "Deine nächsten Termine auf einen Blick – mit Pferd, Uhrzeit und zuständigem Betreuer.",
    },
    horses: {
      title: "Meine Pferde",
      description: "Hier siehst du all deine Pferde mit Rasse, Alter und Standort. Tippe auf ein Pferd für Details wie Hufzustand und letzten Behandlungsbericht.",
    },
    locations: {
      title: "Meine Ställe",
      description: "Verwalte deine Stallstandorte. Der Standard-Stall wird automatisch für neue Termine verwendet. GPS-Koordinaten helfen deinem Hufpfleger bei der Navigation.",
    },
    notifications: {
      title: "Benachrichtigungen",
      description: "Wähle wie du benachrichtigt werden möchtest – per Push, E-Mail oder beides. Stelle auch die Sprache deiner Benachrichtigungen ein.",
    },
  },
  // ─── Onboarding ────────────────────────────────────────────
  onboarding: {
    "profession-type": {
      title: "Berufsgruppe",
      description: "Wähle deinen Beruf – HufManager passt Service-Typen, Zeitpuffer und Kalenderfarben automatisch an deine Tätigkeit an.",
    },
  },
  // ─── Fahrzeug ────────────────────────────────────────────
  fahrzeug: {
    anhaenger: {
      title: "Anhänger-Profil",
      description: "Mit Anhänger plant HufManager deine Route ohne Unterführungen und Höhenbeschränkungen. Gib die Maße deines Anhängers ein für optimale Routenplanung.",
    },
  },
  // ─── Tages-Cockpit ──────────────────────────────────────
  cockpit: {
    bereit: {
      title: "Tour bereit",
      description: "Deine Termine für heute in optimierter Reihenfolge. Prüfe die Route und starte mit einem Tap.",
    },
    unterwegs: {
      title: "Unterwegs-Modus",
      description: "Navigation läuft. Du siehst die Karte, Sprachansagen, Geschwindigkeit und die nächste Station.",
    },
    abschluss: {
      title: "Tour-Zusammenfassung",
      description: "Übersicht über deine erledigten Termine, gefahrene Kilometer und Umsatz des Tages.",
    },
    "tour-card": {
      title: "Termin-Karte",
      description: "Zeigt Kunde, Pferd, Uhrzeit und Auftragstyp. Der farbige Badge kennzeichnet den Service-Typ.",
    },
    tempoanzeige: {
      title: "Geschwindigkeitsanzeige",
      description: "Zeigt dein aktuelles Tempo. Grün = Landstraße, Gelb = innerorts, Rot = über dem Limit.",
    },
    navigation: {
      title: "Turn-by-Turn Navigation",
      description: "Sprachnavigation auf Deutsch, DSGVO-konform über EU-Server. Funktioniert auch offline.",
    },
    spritpreise: {
      title: "Live-Spritpreise",
      description: "Zeigt die günstigste Tankstelle auf deiner Route – live über die Tankerkönig API.",
    },
    fahrtenbuch: {
      title: "Fahrtenbuch-Export",
      description: "Automatisches Fahrtenbuch nach §6 EStG. GPS-basierte km-Erfassung, Export als PDF oder CSV.",
    },
  },
  // ─── Kalender-Erweiterungen ─────────────────────────────
  "kalender-erweitert": {
    "service-time-presets": {
      title: "Auftragstyp-Zeitpuffer",
      description: "Jeder Auftragstyp hat einen automatischen Zeitpuffer. So vermeidest du Stress durch zu eng getaktete Termine.",
    },
  },

  // ─── Zugriffsrechte (Prompt 2) ────────────────────────────
  zugriffsrechte: {
    bereich: {
      title: "Zugriffsrechte",
      description: "Du entscheidest wer welche Daten deines Pferdes sehen darf. Zugriffe können jederzeit widerrufen werden. Alle Änderungen werden protokolliert.",
    },
    "zeitlich-begrenzen": {
      title: "Zeitlich begrenzen",
      description: "Du kannst Zugriffsrechte automatisch ablaufen lassen z.B. nach einer einmaligen Behandlung.",
    },
    "partner-typ": {
      title: "Partner-Typ",
      description: "Der Partner-Typ bestimmt welche Standard-Berechtigungen vorgeschlagen werden.",
    },
  },

  // ─── Pferdeakte (Prompt 3) ────────────────────────────────
  pferdeakte: {
    ueln: {
      title: "UELN (Lebensnummer)",
      description: "Universal Equine Life Number. 15-stellige internationale Identifikationsnummer aus dem Equidenpass. Format: DEUXXXXXXXX",
    },
    bcs: {
      title: "Body Condition Score",
      description: "Body Condition Score nach Henneke-Skala. Skala 1-9:\n1-3 = Untergewicht\n4-6 = Idealgewicht ✓\n7-9 = Übergewicht\nBitte alle 4-6 Wochen messen.",
    },
    sicherheitshinweis: {
      title: "Sicherheitshinweis",
      description: "Dieser Hinweis wird rot und prominent für ALLE angezeigt die Zugriff auf dieses Pferd haben. Nutze ihn für wichtige Sicherheitsinformationen.",
    },
    impfpass: {
      title: "Impfpass",
      description: "Impfungen können von Tierärzten direkt eingetragen werden wenn du ihnen den entsprechenden Zugriff gewährt hast.",
    },
    aktivitaeten: {
      title: "Aktivitäten-Protokoll",
      description: "Vollständiges Protokoll aller Zugriffe und Aktionen an diesem Pferd. Nur du als Besitzer siehst diesen kompletten Verlauf.",
    },
    "fn-nummer": {
      title: "FN-Nummer",
      description: "Die FN-Nummer wird von der Deutschen Reiterlichen Vereinigung (FN) vergeben und dient zur eindeutigen Identifikation im deutschen Pferdesport.",
    },
    brandzeichen: {
      title: "Brandzeichen",
      description: "Physisches Erkennungsmerkmal des Pferdes. Wird zunehmend durch Chip-Nummern ersetzt.",
    },
    gewicht: {
      title: "Gewicht",
      description: "Das aktuelle Gewicht deines Pferdes in Kilogramm. Regelmäßige Messungen helfen bei der Gesundheitsüberwachung.",
    },
    ausruestung: {
      title: "Ausrüstungsnotizen",
      description: "Hier kannst du besondere Anforderungen an Sattel, Zaum, Hufschuhe oder andere Ausrüstung vermerken.",
    },
    versicherung: {
      title: "Versicherungsdaten",
      description: "Diese Daten sind nur für berechtigte Personen sichtbar. Der Besitzer kontrolliert den Zugriff.",
    },
  },

  // ─── Transfer (Prompt 4) ──────────────────────────────────
  transfer: {
    "gemeinsames-passwort": {
      title: "Gemeinsames Passwort",
      description: "Sicherheitsmerkmal: Beide Parteien müssen dasselbe Passwort eingeben. HufManager kennt das Passwort nicht — es wird nur verschlüsselt gespeichert.",
    },
    "dokument-hochladen": {
      title: "Dokument hochladen",
      description: "HufManager prüft keine Vertragsinhalte. Das Dokument dient nur als Nachweis dass ein Vertrag existiert.",
    },
    "transfer-abschliessen": {
      title: "Transfer abschließen",
      description: "Nach Abschluss wechselt der Besitz sofort digital. Alle Zugriffsrechte des alten Besitzers werden automatisch entzogen.",
    },
  },

  // ─── Auftragserteilung (Prompt 5) ─────────────────────────
  auftrag: {
    bereich: {
      title: "Auftragserteilung",
      description: "Ein digitaler Behandlungsauftrag dokumentiert was vereinbart wurde. HufManager ist nicht Vertragspartei — wir stellen nur die Infrastruktur zur Verfügung.",
    },
    auftragsnummer: {
      title: "Auftragsnummer",
      description: "Format: SO-[Jahr]-[Nummer]. Eindeutige Referenz für Auftraggeber und Auftragnehmer.",
    },
    agb: {
      title: "AGB",
      description: "Die aktuellen AGB findest du unter hufiapp.de/agb",
    },
  },

  // ─── Hufwerte (Prompt 10) ────────────────────────────────
  hufwerte: {
    zehenlaenge: {
      title: "Zehenlänge",
      description: "Miss die Zehenlänge von der Zehenspitze bis zum Kronrand in mm. Idealwert Warmblut: 75-85mm.",
    },
    hufwinkel: {
      title: "Hufwinkel",
      description: "Der Winkel zwischen Zehenwand und Boden. Idealwert Vorderhufe: 50-55°, Hinterhufe: 55-60°.",
    },
    trachtenhoehe: {
      title: "Trachtenhöhe",
      description: "Höhe der Trachten in mm. Gemessen am niedrigsten Punkt der Trachte zum Boden.",
    },
    strahlqualitaet: {
      title: "Strahlqualität",
      description: "Beurteile den Strahl: 'healthy' = fest und elastisch, 'soft' = weich und empfindlich.",
    },
  },

};

/**
 * Hilfsfunktion: Holt einen HelpText-Eintrag.
 * Falls nicht vorhanden, gibt Platzhalter zurück.
 */
export function getHelpText(section: string, field: string): HelpTextEntry {
  return (
    helpTexts[section]?.[field] ?? {
      title: field.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "Beschreibung folgt.",
    }
  );
}
