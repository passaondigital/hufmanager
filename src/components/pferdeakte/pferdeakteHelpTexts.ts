/**
 * Pferdeakte Help Texts
 * Contextual ℹ️ tooltip content for all 7 tabs and sub-sections.
 */

export const PFERDEAKTE_HELP = {
  // Tab-level
  tabs: {
    start: {
      title: "Start-Briefing",
      content: "Zeigt automatisch was sich seit deinem letzten Besuch geändert hat — Befunde, Termine, Gesundheitswerte.",
    },
    verlauf: {
      title: "Verlauf / Timeline",
      content: "Chronologische Übersicht aller Aktivitäten: Hufbearbeitungen, Tierarztbesuche, Therapien, Tagebucheinträge und hochgeladene Dokumente.",
    },
    huf: {
      title: "Huf-Tab",
      content: "Alle Hufbefunde, Fotos und Trends. Vergleiche Hufe im Vorher/Nachher-Modus und nutze die Spracheingabe für schnelle Befunde.",
    },
    vet: {
      title: "Veterinär-Tab",
      content: "Impfungen, Entwurmungen und Gesundheitschecks. Der Besitzer und berechtigte Partner können hier Einträge hinzufügen.",
    },
    therapie: {
      title: "Therapie-Tab",
      content: "Behandlungsnotizen von Fachpartnern (Physiotherapeuten, Osteopathen etc.). Sichtbar nur wenn der Besitzer den Zugang freigegeben hat.",
    },
    berichte: {
      title: "Berichte & Export",
      content: "Generiere PDF-Berichte über den Gesundheitsverlauf deines Pferdes für Tierärzte, Versicherungen oder deine eigenen Unterlagen.",
    },
    tresor: {
      title: "Dokumenten-Tresor",
      content: "PIN-geschützter Hochsicherheitsbereich für sensible Dokumente wie Equidenpass, Kaufverträge und Versicherungspolicen.",
    },
  },

  // Section-level help texts
  sections: {
    healthMonitor: {
      title: "Gesundheits-Monitor",
      content: "Der Wellbeing-Score basiert auf den letzten Gesundheitseinträgen. 5 = ausgezeichnet, 1 = kritisch. Wird vom Besitzer oder berechtigten Partnern gepflegt.",
    },
    hoofGrid: {
      title: "Huf-Übersicht",
      content: "Zeigt den aktuellen Zustand aller vier Hufe auf einen Blick. Tippe auf einen Huf für Details und Fotohistorie.",
    },
    stammdaten: {
      title: "Stammdaten",
      content: "Grunddaten wie Chip-Nr., UELN, Geburtsjahr und Rasse. Nur der Besitzer kann diese Daten bearbeiten.",
    },
    kompetenzteam: {
      title: "Kompetenzteam",
      content: "Alle Fachpersonen die Zugang zur Akte haben: Hufbearbeiter, Tierarzt, Therapeuten. Der Besitzer verwaltet die Zugänge.",
    },
    quickActions: {
      title: "Schnellaktionen",
      content: "Häufig genutzte Funktionen: Gesundheits-Check eintragen, Termin buchen, Foto hochladen.",
    },
    vaccination: {
      title: "Impfprotokoll",
      content: "Dokumentiert alle Impfungen mit Datum, Wirkstoff und nächstem Fälligkeitsdatum. Erinnerungen werden automatisch gesendet.",
    },
    deworming: {
      title: "Entwurmungsprotokoll",
      content: "Wirkstoffe, Kotproben-Ergebnisse und Intervalle. Hilft bei der Planung strategischer Entwurmung.",
    },
    xray: {
      title: "Röntgenbilder",
      content: "Hochgeladene Röntgenbilder mit Datum, Körperregion und Befund. Werden im sicheren Tresor gespeichert und sind nur für berechtigte Personen sichtbar.",
    },
    documentUpload: {
      title: "Dokument hochladen",
      content: "Unterstützte Formate: PDF, JPG, PNG. Max. 10 MB pro Datei. Dokumente werden verschlüsselt im HufManager-Tresor gespeichert.",
    },
    diary: {
      title: "Tagebuch",
      content: "Private Notizen des Besitzers. Können optional mit dem Hufbearbeiter oder dem Kompetenzteam geteilt werden.",
    },
    timeline: {
      title: "Timeline-Filter",
      content: "Filtere nach Kategorie (Huf, Vet, Therapie, Tagebuch) um gezielt Einträge zu finden.",
    },
    dataPrivacy: {
      title: "Datenschutz",
      content: "Der Besitzer hat die volle Kontrolle darüber wer welche Daten sehen darf. Zugänge können jederzeit widerrufen werden.",
    },
    transferInfo: {
      title: "Besitzerwechsel",
      content: "Bei einem Besitzerwechsel werden alle bestehenden Zugänge widerrufen. Der neue Besitzer kann Zugänge neu vergeben.",
    },
    retention: {
      title: "Aufbewahrung",
      content: "Akten verstorbener Pferde werden 2 Jahre aufbewahrt. Bei Diebstahl gelten 5 Jahre (Verjährungsfrist).",
    },
  },
} as const;
