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
      title: "Aufnahme-Bereich",
      description:
        "Hier legst du neue Kunden und Pferde an. Der erste Schritt in deinem Workflow.",
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
      description: "Der Name deines Betriebs, wie er auf Rechnungen und deiner Website erscheint.",
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
