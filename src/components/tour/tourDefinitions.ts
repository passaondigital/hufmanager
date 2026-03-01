import { TourStep } from './SpotlightTour';

/**
 * Dashboard-Tour: Hauptübersicht erklären
 */
export const dashboardTourSteps: TourStep[] = [
  {
    target: '[data-tour="stats-grid"]',
    title: 'Deine Zahlen auf einen Blick',
    description: 'Hier siehst du Kunden, Termine, Anfragen und Umsatz — alles tagesaktuell.',
    position: 'bottom',
  },
  {
    target: '[data-tour="recent-horses"]',
    title: 'Letzte Pferde',
    description: 'Schnellzugriff auf die Pferde, die du zuletzt bearbeitet hast. Ein Tap und du bist in der Akte.',
    position: 'bottom',
  },
  {
    target: '[data-tour="invite-link"]',
    title: 'Kunden einladen',
    description: 'Teile diesen Link mit deinen Kunden — sie sehen dann ihre Pferde-Akte und können Termine buchen.',
    position: 'bottom',
  },
  {
    target: '[data-tour="due-appointments"]',
    title: 'Fällige Termine',
    description: 'HufManager erinnert dich automatisch, wenn ein Pferd wieder dran ist. Kein Termin geht verloren.',
    position: 'bottom',
  },
  {
    target: '[data-tour="checklist"]',
    title: 'Deine Checkliste',
    description: 'Hier siehst du was noch fehlt. Arbeite die Punkte ab und dein HufManager ist vollständig eingerichtet.',
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
