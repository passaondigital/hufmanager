import { TourStep } from './SpotlightTour';

/**
 * Dashboard-Tour: Hauptübersicht erklären (Provider)
 */
export const dashboardTourSteps: TourStep[] = [
  {
    target: '[data-tour="stats-grid"]',
    title: 'Deine Zahlen auf einen Blick',
    description: 'Kunden, Termine, Anfragen und Umsatz — alles tagesaktuell aus deinem Betrieb.',
    position: 'bottom',
  },
  {
    target: '[data-tour="due-appointments"]',
    title: 'Fällige Termine',
    description: 'HufManager erinnert dich automatisch, wenn ein Pferd wieder dran ist. Kein Termin geht verloren.',
    position: 'bottom',
  },
  {
    target: '[data-tour="invite-link"]',
    title: 'Kunden einladen',
    description: 'Teile diesen Link mit deinen Kunden — sie sehen dann ihre Pferde-Akte und können Termine buchen.',
    position: 'bottom',
  },
  {
    target: '[data-tour="checklist"]',
    title: 'Erste Schritte',
    description: 'Arbeite die Punkte ab und dein HufManager ist vollständig eingerichtet.',
    position: 'bottom',
  },
  {
    target: 'header',
    title: 'So sieht es deine Demo-Kundin',
    description: 'Alles was du hier dokumentierst, sieht die Demo-Kundin in ihrem Pferdeportal — in Echtzeit. Termine, Befunde, Rechnungen — alles vernetzt.',
    position: 'bottom',
  },
];

/**
 * Kunden-Tour
 */
export const customersTourSteps: TourStep[] = [
  {
    target: '[data-tour="customer-list"]',
    title: 'Deine Kundenliste',
    description: 'Alle Pferdebesitzer an einem Ort. Such nach Name, PLZ oder Ort.',
    position: 'bottom',
  },
  {
    target: '[data-tour="add-customer"]',
    title: 'Kunden anlegen',
    description: 'Name und Telefonnummer reichen — den Rest kannst du später ergänzen.',
    position: 'bottom',
  },
];

/**
 * Kalender-Tour
 */
export const calendarTourSteps: TourStep[] = [
  {
    target: '[data-tour="calendar-view"]',
    title: 'Dein Terminkalender',
    description: 'Alle Bearbeitungstermine im Überblick. Tippe auf einen Tag um einen neuen Termin zu planen.',
    position: 'bottom',
  },
  {
    target: '[data-tour="calendar-add"]',
    title: 'Termin erstellen',
    description: 'Wähl ein Pferd, ein Datum und los gehts. Der Kunde wird automatisch benachrichtigt.',
    position: 'left',
  },
];

/**
 * Rechnungen-Tour
 */
export const invoicesTourSteps: TourStep[] = [
  {
    target: '[data-tour="invoice-list"]',
    title: 'Deine Rechnungen',
    description: 'Erstelle professionelle Rechnungen in Sekunden — direkt aus einem abgeschlossenen Termin.',
    position: 'bottom',
  },
  {
    target: '[data-tour="create-invoice"]',
    title: 'Rechnung erstellen',
    description: 'Wähl den Kunden, die Leistung wird automatisch übernommen. PDF wird sofort generiert.',
    position: 'bottom',
  },
];

/**
 * Partner-App Tour (Fachpartner / Tierarzt / Physio)
 */
export const partnerTourSteps: TourStep[] = [
  {
    target: '[data-tour="partner-kpi"]',
    title: 'Dein Partner-Dashboard',
    description: 'Betreute Pferde, Termine, Behandlungen und Umsatz — dein Praxis-Cockpit auf einen Blick.',
    position: 'bottom',
  },
  {
    target: '[data-tour="partner-horses"]',
    title: 'Freigegebene Pferde',
    description: 'Hier siehst du alle Pferde, die dir vom Besitzer freigegeben wurden — mit Akte und Historie.',
    position: 'bottom',
  },
  {
    target: '[data-tour="partner-appointments"]',
    title: 'Deine Termine',
    description: 'Plane Behandlungstermine für freigegebene Pferde. Der Besitzer wird automatisch informiert.',
    position: 'bottom',
  },
  {
    target: '[data-tour="partner-notes"]',
    title: 'Behandlungsnotizen',
    description: 'Dokumentiere Befunde, Therapien und Empfehlungen — alles wird in der Pferdeakte gespeichert.',
    position: 'bottom',
  },
  {
    target: 'header',
    title: 'Vernetzung in Aktion',
    description: 'Dein Behandlungsbericht zu Luna wird automatisch für Maria (Besitzerin) und den Hufbearbeiter sichtbar — DSGVO-konform und in Echtzeit.',
    position: 'bottom',
  },
];

/**
 * Mitarbeiter-App Tour
 */
export const employeeTourSteps: TourStep[] = [
  {
    target: '[data-tour="employee-kpi"]',
    title: 'Dein Arbeitstag',
    description: 'Aufträge, erledigte Pferde, Arbeitszeit und Material — alles auf einen Blick.',
    position: 'bottom',
  },
  {
    target: '[data-tour="employee-tour"]',
    title: 'Meine Tour',
    description: 'Deine Tagesroute mit Navigation. Fahre Kunden effizient ab.',
    position: 'bottom',
  },
  {
    target: '[data-tour="employee-assignments"]',
    title: 'Heutige Aufträge',
    description: 'Dein Chef weist dir Pferde zu. Check ein, arbeite, check aus — automatische Zeiterfassung.',
    position: 'bottom',
  },
  {
    target: 'header',
    title: 'Vernetzung in Aktion',
    description: 'Wenn du bei Luna eincheckst und die Arbeit dokumentierst, sieht dein Chef und Maria (die Besitzerin) den Status in Echtzeit.',
    position: 'bottom',
  },
];

/**
 * Pferdebesitzer-App Tour (Client)
 */
export const clientTourSteps: TourStep[] = [
  {
    target: '#pferde-section',
    title: 'Deine Pferde',
    description: 'Alle deine Pferde mit Akte, Fotos und Gesundheitsverlauf. Tippe auf ein Pferd für Details.',
    position: 'bottom',
  },
  {
    target: '[data-tour="client-provider"]',
    title: 'Dein Hufbearbeiter',
    description: 'Hier siehst du wer Zugriff auf deine Pferdeakten hat. Du entscheidest wer was sehen darf.',
    position: 'bottom',
  },
  {
    target: '[data-tour="client-appointments"]',
    title: 'Termine & Buchung',
    description: 'Sieh kommende Termine, bestätige sie oder buche direkt einen neuen Termin.',
    position: 'bottom',
  },
  {
    target: '[data-tour="client-chat"]',
    title: 'Chat mit deinem Betreuer',
    description: 'Direkte Kommunikation mit deinem Hufbearbeiter — Fragen, Fotos, Terminabsprachen.',
    position: 'bottom',
  },
  {
    target: 'header',
    title: 'Vernetzung in Aktion',
    description: 'Alles was dein Hufbearbeiter bei Luna dokumentiert, siehst du hier — Befunde, Fotos, Rechnungen. Und Dr. Lisa Meier (Physiotherapeutin) hat ebenfalls Zugriff, den du jederzeit widerrufen kannst.',
    position: 'bottom',
  },
];
