import { TourStep } from './SpotlightTour';

/**
 * Demo Tour System – Topic-based tours for each role
 * Each role has 5 topics, each with quick (5 steps) and detailed (10-12 steps) variants
 */

export type DemoRole = 'provider' | 'client' | 'partner' | 'employee';

export interface DemoTourTopic {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export interface DemoTourConfig {
  topics: DemoTourTopic[];
  steps: Record<string, { quick: TourStep[]; detailed: TourStep[] }>;
}

// ─── PROVIDER (Hufbearbeiter) ───────────────────────────────────────────────

const providerTopics: DemoTourTopic[] = [
  { id: 'termine', emoji: '📅', label: 'Termine & Touren', description: 'Tagesplanung, Navigation und Terminverwaltung' },
  { id: 'pferdeakte', emoji: '🐴', label: 'Pferdeakte & Dokumentation', description: 'Befunde, Fotos und Behandlungshistorie' },
  { id: 'rechnungen', emoji: '💶', label: 'Rechnungen & Buchhaltung', description: 'Rechnungen erstellen, Umsätze verfolgen' },
  { id: 'kunden', emoji: '👥', label: 'Kunden & Kommunikation', description: 'Kundenliste, Einladungen und Chat' },
  { id: 'vernetzung', emoji: '🔗', label: 'Vernetzung mit Tierarzt & Team', description: 'Fachpartner, Mitarbeiter und gemeinsame Akten' },
];

const providerSteps: Record<string, { quick: TourStep[]; detailed: TourStep[] }> = {
  termine: {
    quick: [
      { target: '[data-tour="stats-grid"]', title: 'Deine Wochentermine', description: 'Hier siehst du auf einen Blick, wie viele Termine diese Woche anstehen und wie viele heute fällig sind.', position: 'bottom' },
      { target: '[data-tour="due-appointments"]', title: 'Fällige Pferde', description: 'HufManager erinnert dich automatisch, wenn ein Pferd wieder dran ist. Kein Termin geht verloren.', position: 'bottom' },
      { target: '[data-tour="checklist"]', title: 'Tour planen', description: 'Unter „Touren" planst du deine Tagesroute. HufManager optimiert die Reihenfolge für minimale Fahrtzeit.', position: 'bottom' },
      { target: '[data-tour="invite-link"]', title: 'Kunden einladen', description: 'Teile diesen Link – dein Kunde sieht dann seine Pferdeakte und kann Termine buchen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Alles was du hier dokumentierst, sehen deine Kunden und Fachpartner in Echtzeit. So arbeitet das Netzwerk zusammen.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="stats-grid"]', title: 'Dein Dashboard', description: 'Kunden, Termine, Anfragen und Umsatz — alles tagesaktuell. Tippe auf eine Kachel um direkt in den Bereich zu springen.', position: 'bottom' },
      { target: '[data-tour="due-appointments"]', title: 'Fällige Termine', description: 'HufManager berechnet automatisch, wann jedes Pferd wieder dran ist. Du siehst hier alle überfälligen und bald fälligen Pferde.', position: 'bottom' },
      { target: '[data-tour="checklist"]', title: 'Erste Schritte', description: 'Arbeite diese Punkte ab und dein HufManager ist vollständig eingerichtet. Jeder Haken bringt dich näher zum perfekten Workflow.', position: 'bottom' },
      { target: '[data-tour="invite-link"]', title: 'Kunden einladen', description: 'Teile diesen Link per WhatsApp oder E-Mail. Dein Kunde registriert sich und hat sofort Zugriff auf seine Pferdeakte.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Zum Kalender', description: 'Tippe auf „Termine diese Woche" um deinen Kalender zu öffnen. Dort siehst du die Wochen- und Monatsansicht.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Tour-Manager', description: 'Im Bereich „Touren" planst du deine Tagesroute mit Karte. HufManager optimiert die Reihenfolge und zeigt dir die Navigation.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Termin abschließen', description: 'Nach der Bearbeitung dokumentierst du Befunde, Fotos und lässt den Kunden digital unterschreiben. Die Rechnung wird automatisch vorbereitet.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Erinnerungen', description: 'HufManager sendet automatisch Terminerinnerungen an deine Kunden — per Push-Benachrichtigung oder E-Mail.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Wiederkehrende Termine', description: 'Erstelle Serien-Termine für regelmäßige Bearbeitungsintervalle. HufManager plant automatisch den nächsten Termin.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Stallgruppen', description: 'Fasse Pferde am gleichen Standort zusammen und bearbeite sie in einem Besuch — spart Fahrzeit und Organisation.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Wenn du bei Luna die Bearbeitung dokumentierst, sieht die Demo-Kundin (Besitzerin) den Befund sofort in ihrer App. Die Demo-Tierärztin hat ebenfalls Zugriff — alles DSGVO-konform.', position: 'bottom' },
    ],
  },
  pferdeakte: {
    quick: [
      { target: '[data-tour="stats-grid"]', title: 'Pferdeübersicht', description: 'Unter „Kunden" findest du alle Pferde mit ihrer kompletten Akte — Befunde, Fotos und Behandlungshistorie.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Befund dokumentieren', description: 'Beim Termin-Abschluss dokumentierst du den Hufbefund mit Fotos und Notizen. Alles wird automatisch in der Akte gespeichert.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Fotoprotokoll', description: 'Vorher/Nachher-Fotos direkt mit dem Handy aufnehmen. Die Fotos sind sofort in der Pferdeakte sichtbar.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Gesundheitsverlauf', description: 'Der Zeitstrahl zeigt die komplette Behandlungshistorie. Ideal für Verlaufskontrollen und Tierarzt-Absprachen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Dokumentation wird automatisch für den Besitzer und freigegebene Fachpartner sichtbar — in Echtzeit.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="stats-grid"]', title: 'Pferdeübersicht', description: 'Jeder Kunde hat Pferde. Unter „Kunden" → Pferd wählen öffnest du die digitale Pferdeakte mit allen Details.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Stammdaten', description: 'Rasse, Alter, Besonderheiten, Stallort — alle wichtigen Infos auf einen Blick. Der Besitzer kann diese ebenfalls pflegen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Hufbefund', description: 'Beim Abschluss eines Termins dokumentierst du den aktuellen Hufbefund. Wähle aus Vorlagen oder schreibe frei.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Fotos aufnehmen', description: 'Vorher/Nachher-Fotos direkt mit der Kamera aufnehmen. Die Fotos werden automatisch dem richtigen Termin zugeordnet.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Ganganalyse', description: 'Halte per Video fest, wie das Pferd läuft. Der Link wird in der Akte gespeichert und ist für alle Beteiligten abrufbar.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Zeitstrahl', description: 'Die komplette Behandlungshistorie als Zeitstrahl — perfekt für Verlaufskontrollen und Muster-Erkennung.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Behandlungsnotizen', description: 'Freitextnotizen, die nur du oder auch der Besitzer sehen kann. Du entscheidest, was geteilt wird.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Preisgruppen', description: 'Hinterlege pferdespezifische Preise oder nutze deine Standardpreisliste. HufManager rechnet automatisch korrekt ab.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'PDF-Export', description: 'Exportiere die Pferdeakte als PDF — ideal für den Tierarzt oder den Besitzer. Professionell formatiert mit deinem Logo.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Digitale Unterschrift', description: 'Der Besitzer unterschreibt direkt auf dem Handy. Die Unterschrift wird dem Termin zugeordnet und in der Akte gespeichert.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Die Pferdeakte ist das Herzstück des Netzwerks: Besitzer, Hufbearbeiter, Tierarzt und Physiotherapeut arbeiten an einer gemeinsamen Akte.', position: 'bottom' },
    ],
  },
  rechnungen: {
    quick: [
      { target: '[data-tour="stats-grid"]', title: 'Umsatz im Blick', description: 'Die Kachel „Umsatz (Monat)" zeigt dir deinen aktuellen Monatserlös mit Vergleich zum Vormonat.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Rechnung erstellen', description: 'Nach einem Termin wird die Rechnung automatisch vorbereitet. Ein Klick genügt zum Versenden.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'PDF & Versand', description: 'Professionelle PDF-Rechnung mit deinem Logo. Versand per E-Mail oder WhatsApp direkt aus der App.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Zahlungsstatus', description: 'Behalte den Überblick: Offen, bezahlt, überfällig. HufManager erinnert automatisch bei offenen Rechnungen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Kunde sieht seine Rechnungen in seiner App und kann den Zahlungsstatus selbst einsehen.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="stats-grid"]', title: 'Umsatz-Dashboard', description: 'Dein Monats- und Jahresumsatz auf einen Blick. Vergleiche mit Vormonaten und erkenne Trends.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Automatische Rechnungserstellung', description: 'Wenn du einen Termin abschließt, wird die Rechnung automatisch mit allen Leistungen vorbereitet.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Leistungspositionen', description: 'Erstelle deine Preisliste einmalig. Bei jedem Termin werden die Positionen automatisch übernommen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Zu-/Abschläge', description: 'Fahrtkosten, Notfallzuschläge oder Rabatte — alles direkt auf der Rechnung mit Begründung.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'PDF-Design', description: 'Professionelles Layout mit deinem Logo, Bankdaten und Steuernummer. Einmal einrichten, immer nutzen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Versandoptionen', description: 'Versende per E-Mail oder generiere einen WhatsApp-Link. Der Kunde erhält die Rechnung sofort.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Zahlungsverfolgung', description: 'Markiere Rechnungen als bezahlt, sende Zahlungserinnerungen und behalte den Cashflow im Blick.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Steuer & MwSt.', description: 'Kleinunternehmerregelung oder MwSt.-pflichtig — HufManager rechnet korrekt ab und zeigt die Steuer separat aus.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Export & Buchhaltung', description: 'Exportiere alle Rechnungen als CSV für deinen Steuerberater. Alle Daten sauber aufbereitet.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Rechnungsnummern', description: 'Fortlaufende Nummern werden automatisch vergeben. Du kannst das Format anpassen (z.B. RE-2026-001).', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Kunde sieht seine Rechnungen und den Zahlungsstatus direkt in seiner App. Transparenz schafft Vertrauen.', position: 'bottom' },
    ],
  },
  kunden: {
    quick: [
      { target: '[data-tour="stats-grid"]', title: 'Deine Kunden', description: 'Unter „Kunden" findest du alle Pferdebesitzer mit Kontaktdaten, Pferden und Terminhistorie.', position: 'bottom' },
      { target: '[data-tour="invite-link"]', title: 'Kunden einladen', description: 'Teile deinen persönlichen Link. Der Kunde registriert sich und ist sofort in deinem System.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Kommunikation', description: 'Direkter Chat mit deinen Kunden — Fragen, Fotos, Terminabsprachen. Alles an einem Ort.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Kundengruppen', description: 'Gruppiere Kunden nach Region oder Stallgemeinschaft für effiziente Tourenplanung.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Kunden sehen ihre Pferdeakte, buchen Termine und chatten mit dir — alles aus einer App.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="stats-grid"]', title: 'Kundenliste', description: 'Alle Pferdebesitzer sortiert und durchsuchbar. Filter nach Name, PLZ, Ort oder letztem Termin.', position: 'bottom' },
      { target: '[data-tour="invite-link"]', title: 'Kunden einladen', description: 'Teile deinen persönlichen Einladungslink per WhatsApp, SMS oder E-Mail. Der Kunde registriert sich in 30 Sekunden.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Kundenprofil', description: 'Kontaktdaten, Adresse, Pferde, Terminhistorie und offene Rechnungen — alles auf einer Seite.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'In-App Chat', description: 'Kommuniziere direkt mit deinen Kunden. Teile Fotos, beantworte Fragen und kläre Termine.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Broadcast-Nachrichten', description: 'Sende eine Nachricht an alle Kunden gleichzeitig — ideal für Urlaubsankündigungen oder Preisänderungen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Kundengruppen', description: 'Gruppiere Kunden nach Stallgemeinschaft oder Region. Plane Touren effizienter mit Gruppenbesuchen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Neukundenanfragen', description: 'Über deine Website kommen Anfragen rein. Prüfe sie, nimm an oder lehne ab — alles in der App.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Kundenstatus', description: 'Aktiv, pausiert oder archiviert — behalte den Überblick über deinen Kundenstamm.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Automatische Erinnerungen', description: 'HufManager erinnert Kunden automatisch an fällige Termine — du musst nichts tun.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'DSGVO-konform', description: 'Einwilligungen werden dokumentiert. Kunden können ihre Daten jederzeit exportieren oder löschen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Kunde Maria sieht Lunas Akte in Echtzeit. Wenn der Tierarzt einen Befund einträgt, wird Maria sofort informiert.', position: 'bottom' },
    ],
  },
  vernetzung: {
    quick: [
      { target: '[data-tour="stats-grid"]', title: 'Das Netzwerk', description: 'HufManager verbindet Hufbearbeiter, Pferdebesitzer, Tierärzte und Physiotherapeuten in einem System.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Fachpartner einladen', description: 'Lade Tierärzte oder Physiotherapeuten ein. Sie bekommen Zugriff auf die freigegebenen Pferdeakten.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Mitarbeiter verwalten', description: 'Dein Team bekommt eigene Zugänge mit zugewiesenen Aufträgen und Tourenplanung.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Gemeinsame Akte', description: 'Alle Beteiligten dokumentieren in einer gemeinsamen Pferdeakte — keine doppelten Unterlagen mehr.', position: 'bottom' },
      { target: 'header', title: '🔗 So funktioniert die Vernetzung', description: 'Du dokumentierst → Maria (Besitzerin) sieht den Befund → Dr. Meier (Tierärztin) ergänzt ihre Diagnose → Alle haben den gleichen Wissensstand.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="stats-grid"]', title: 'Das Ökosystem', description: 'HufManager ist mehr als eine App — es ist ein Netzwerk für alle, die mit Pferden arbeiten.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Rollen im Netzwerk', description: '4 Rollen: Hufbearbeiter (du), Pferdebesitzer (dein Kunde), Fachpartner (Tierarzt/Physio) und Mitarbeiter (dein Team).', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Zugriff steuern', description: 'Der Pferdebesitzer entscheidet, wer Zugriff auf die Akte bekommt. Du kannst Zugriff anfragen, aber nicht erzwingen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Fachpartner einladen', description: 'Empfiehl einem Tierarzt, sich bei HufManager zu registrieren. Er kann dann auf freigegebene Akten zugreifen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Geteilte Befunde', description: 'Wenn du einen Befund einträgst, sehen der Besitzer und freigegebene Fachpartner ihn sofort — in Echtzeit.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Mitarbeiter anlegen', description: 'Erstelle Mitarbeiter-Zugänge. Weise Aufträge zu und verfolge den Fortschritt auf der Karte.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Mitarbeiter-Touren', description: 'Dein Team fährt eigene Touren mit optimierter Route. Du siehst den Live-Status jedes Mitarbeiters.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Behandlungshistorie', description: 'Die gesamte Behandlungshistorie über alle Disziplinen hinweg — Huf, Tierarzt, Physio — in einer Akte.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'DSGVO & Datenschutz', description: 'Jeder Zugriff wird protokolliert. Der Besitzer hat die volle Kontrolle und kann Zugriff jederzeit widerrufen.', position: 'bottom' },
      { target: '[data-tour="stats-grid"]', title: 'Benachrichtigungen', description: 'Alle Beteiligten werden bei wichtigen Änderungen informiert — neue Befunde, Termine, Nachrichten.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung live erleben', description: 'Logge dich als „Maria" (Pferdebesitzerin) oder „Dr. Meier" (Partnerin) ein und sieh die gleiche Akte aus einer anderen Perspektive.', position: 'bottom' },
    ],
  },
};

// ─── CLIENT (Pferdebesitzer) ────────────────────────────────────────────────

const clientTopics: DemoTourTopic[] = [
  { id: 'pferde', emoji: '🐴', label: 'Meine Pferde', description: 'Pferdeakten, Fotos und Gesundheitsverlauf' },
  { id: 'freigaben', emoji: '🔓', label: 'Zugriff & Freigaben', description: 'Wer darf was sehen? Du entscheidest.' },
  { id: 'termine', emoji: '📅', label: 'Termine & Buchung', description: 'Termine einsehen, bestätigen und buchen' },
  { id: 'kommunikation', emoji: '💬', label: 'Chat & Nachrichten', description: 'Direkte Kommunikation mit deinem Betreuer' },
  { id: 'vernetzung', emoji: '🔗', label: 'Vernetzung erleben', description: 'So arbeiten alle Beteiligten zusammen' },
];

const clientSteps: Record<string, { quick: TourStep[]; detailed: TourStep[] }> = {
  pferde: {
    quick: [
      { target: '#pferde-section', title: 'Deine Pferde', description: 'Alle deine Pferde mit Akte, Fotos und Gesundheitsverlauf. Tippe auf ein Pferd für Details.', position: 'bottom' },
      { target: '#pferde-section', title: 'Pferdeakte', description: 'Befunde, Fotos, Behandlungshistorie — alles was dein Hufbearbeiter dokumentiert, siehst du hier.', position: 'bottom' },
      { target: '#pferde-section', title: 'Fotos & Befunde', description: 'Vorher/Nachher-Fotos und detaillierte Hufbefunde für jede Bearbeitung.', position: 'bottom' },
      { target: '#pferde-section', title: 'Gesundheitsverlauf', description: 'Der Zeitstrahl zeigt die komplette Geschichte — Hufbearbeitung, Tierarztbesuche und Behandlungen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Alles was dein Hufbearbeiter bei Luna dokumentiert, siehst du hier. Auch Dr. Meier (Tierärztin) hat Zugriff — den du jederzeit widerrufen kannst.', position: 'bottom' },
    ],
    detailed: [
      { target: '#pferde-section', title: 'Deine Pferde', description: 'Hier sind alle deine Pferde aufgelistet. Tippe auf ein Pferd um die vollständige Akte zu öffnen.', position: 'bottom' },
      { target: '#pferde-section', title: 'Stammdaten', description: 'Name, Rasse, Geburtsdatum, Stallort und besondere Hinweise — alles auf einen Blick.', position: 'bottom' },
      { target: '#pferde-section', title: 'Aktuelle Befunde', description: 'Der letzte Hufbefund deines Hufbearbeiters mit Fotos und Notizen.', position: 'bottom' },
      { target: '#pferde-section', title: 'Fotoprotokoll', description: 'Vorher/Nachher-Fotos zu jeder Bearbeitung — chronologisch sortiert.', position: 'bottom' },
      { target: '#pferde-section', title: 'Zeitstrahl', description: 'Die komplette Behandlungshistorie als Zeitstrahl. Perfekt für Verlaufskontrollen.', position: 'bottom' },
      { target: '#pferde-section', title: 'Tierarzt-Befunde', description: 'Wenn ein Fachpartner (Tierarzt/Physio) Zugriff hat, siehst du auch seine Befunde hier.', position: 'bottom' },
      { target: '#pferde-section', title: 'Dokumente & PDFs', description: 'Rechnungen, Behandlungsprotokolle und Berichte — alles als PDF herunterladbar.', position: 'bottom' },
      { target: '#pferde-section', title: 'Eigene Notizen', description: 'Halte eigene Beobachtungen fest — Lahmheit, Futterumstellung, Verhaltensänderungen.', position: 'bottom' },
      { target: '#pferde-section', title: 'Pferd hinzufügen', description: 'Hast du ein neues Pferd? Füge es hinzu und verknüpfe es mit deinem Hufbearbeiter.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Die Pferdeakte verbindet alle Beteiligten: Du, dein Hufbearbeiter und der Tierarzt — eine Akte, ein Wissensstand.', position: 'bottom' },
    ],
  },
  freigaben: {
    quick: [
      { target: '[data-tour="client-provider"]', title: 'Dein Hufbearbeiter', description: 'Hier siehst du, welcher Hufbearbeiter Zugriff auf deine Pferdeakten hat.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Zugriff steuern', description: 'Du entscheidest, wer deine Pferdeakten sehen darf. Jederzeit widerrufbar.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Fachpartner freigeben', description: 'Gib deinem Tierarzt oder Physiotherapeuten Zugriff — sie sehen dann die Akte und können dokumentieren.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Datenschutz', description: 'DSGVO-konform: Jeder Zugriff wird protokolliert. Du hast die volle Kontrolle über deine Daten.', position: 'bottom' },
      { target: 'header', title: '🔗 Du bestimmst', description: 'Du gibst deinem Hufbearbeiter und Tierarzt Zugriff. Sie arbeiten an einer gemeinsamen Akte — aber nur mit deiner Erlaubnis.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="client-provider"]', title: 'Dein Hufbearbeiter', description: 'Hier ist dein verbundener Hufbearbeiter. Er hat Zugriff auf die Akten deiner Pferde.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Zugriffsrechte', description: 'Du kannst detailliert steuern: Basisdaten, Befunde, Fotos — was soll der Fachpartner sehen können?', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Neuen Partner einladen', description: 'Lade einen Tierarzt oder Physiotherapeuten ein. Er bekommt eine Einladung per E-Mail.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Zugriff widerrufen', description: 'Du kannst den Zugriff jederzeit widerrufen. Der Fachpartner sieht dann sofort nichts mehr.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Zugriffsprotokolle', description: 'Jeder Zugriff auf deine Daten wird protokolliert. Du siehst, wer wann was eingesehen hat.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Mehrere Profis', description: 'Du kannst mehreren Fachleuten Zugriff geben — z.B. Hufbearbeiter UND Tierarzt gleichzeitig.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Behandlungsrechte', description: 'Fachpartner können auch Termine für deine Pferde anlegen — wenn du das erlaubst.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Wechsel des Betreuers', description: 'Betreuer wechseln? Zugriff für den alten widerrufen, neuen einladen. Deine Daten bleiben erhalten.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Datenexport', description: 'Exportiere alle deine Daten jederzeit als PDF oder CSV. Deine Daten gehören dir.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Hufbearbeiter dokumentiert, dein Tierarzt ergänzt — und du hast den vollen Überblick in einer App.', position: 'bottom' },
    ],
  },
  termine: {
    quick: [
      { target: '[data-tour="client-appointments"]', title: 'Deine Termine', description: 'Hier siehst du alle kommenden und vergangenen Termine für deine Pferde.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termin bestätigen', description: 'Dein Hufbearbeiter schlägt Termine vor. Bestätige sie mit einem Tipp.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termin buchen', description: 'Du kannst auch selbst einen neuen Termin buchen — direkt in der App.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Erinnerungen', description: 'HufManager erinnert dich rechtzeitig an anstehende Termine per Push-Nachricht.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Wenn dein Hufbearbeiter den Termin abschließt, siehst du sofort den Befund und die Rechnung in deiner App.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="client-appointments"]', title: 'Terminübersicht', description: 'Alle Termine für deine Pferde — chronologisch sortiert mit Status und Details.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Terminvorschlag', description: 'Dein Hufbearbeiter plant den nächsten Termin. Du bekommst eine Benachrichtigung zur Bestätigung.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Selbst buchen', description: 'Buche direkt einen neuen Termin. Wähle Pferd, Leistung und Wunschdatum.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termindetails', description: 'Tippe auf einen Termin für alle Details: Uhrzeit, Ort, Leistung und Hufbearbeiter.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Terminerinnerung', description: 'Automatische Erinnerungen 24h und 1h vor dem Termin — per Push oder E-Mail.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termin absagen', description: 'Termine können bis 24h vorher abgesagt oder verschoben werden.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Regelmäßige Termine', description: 'Wiederkehrende Termine für regelmäßige Hufbearbeitung — z.B. alle 6-8 Wochen.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termin abgeschlossen', description: 'Nach dem Termin siehst du den Befund, Fotos und die Rechnung direkt in der App.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Bewertung', description: 'Bewerte den Termin und gib deinem Hufbearbeiter Feedback — hilft bei der Qualitätsverbesserung.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Der Termin verbindet alles: Dokumentation, Rechnung und Kommunikation — automatisch verknüpft.', position: 'bottom' },
    ],
  },
  kommunikation: {
    quick: [
      { target: '[data-tour="client-chat"]', title: 'Dein Chat', description: 'Direkter Draht zu deinem Hufbearbeiter. Fragen, Fotos, Terminabsprachen — alles hier.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Fotos teilen', description: 'Teile Fotos vom Huf oder Pferd direkt im Chat. Dein Hufbearbeiter kann sofort einschätzen.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Benachrichtigungen', description: 'Push-Nachrichten bei neuen Nachrichten, Terminerinnerungen und Befunden.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Alle Infos gebündelt', description: 'Chat, Termine und Akte — alles in einer App statt über WhatsApp, E-Mail und Telefon verstreut.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Kommunikation auf Augenhöhe: Du bist immer informiert und musst nicht hinterhertelefonieren.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="client-chat"]', title: 'Chat öffnen', description: 'Tippe hier um den Chat mit deinem Hufbearbeiter zu öffnen.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Nachricht senden', description: 'Schreibe eine Nachricht — dein Hufbearbeiter bekommt eine Push-Benachrichtigung.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Fotos senden', description: 'Teile Fotos direkt aus der Galerie oder Kamera. Ideal bei akuten Problemen.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Chatverlauf', description: 'Der gesamte Verlauf bleibt gespeichert. Scrolle zurück für ältere Nachrichten.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Lesebestätigung', description: 'Du siehst, wenn dein Hufbearbeiter deine Nachricht gelesen hat.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Push-Benachrichtigungen', description: 'Aktiviere Push-Nachrichten um keine Antwort zu verpassen.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Datenschutz', description: 'Alle Nachrichten sind Ende-zu-Ende verschlüsselt und DSGVO-konform gespeichert.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Mehrere Kontakte', description: 'Du kannst auch mit deinem Tierarzt oder Physiotherapeuten chatten — wenn sie im Netzwerk sind.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Eine App für alles: Chat, Akte, Termine. Kein Medienbruch, kein Chaos.', position: 'bottom' },
    ],
  },
  vernetzung: {
    quick: [
      { target: '#pferde-section', title: 'Alles an einem Ort', description: 'Hufbearbeiter, Tierarzt, Physiotherapeut — alle arbeiten an der gleichen Pferdeakte.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Du hast die Kontrolle', description: 'Du gibst Zugriff, du widerrufst. Jeder Zugriff wird protokolliert.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termine über alle Disziplinen', description: 'Hufbearbeitung, Tierarztbesuch, Physiotherapie — alle Termine in einem Kalender.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Kommunikation', description: 'Chatte mit jedem Betreuer direkt aus der App. Keine WhatsApp-Gruppen mehr nötig.', position: 'bottom' },
      { target: 'header', title: '🔗 So funktioniert die Vernetzung', description: 'Dein Hufbearbeiter dokumentiert → du siehst den Befund → der Tierarzt ergänzt seine Diagnose → alle haben den gleichen Wissensstand.', position: 'bottom' },
    ],
    detailed: [
      { target: '#pferde-section', title: 'Das Netzwerk', description: 'HufManager verbindet alle Menschen, die sich um dein Pferd kümmern, in einem digitalen Ökosystem.', position: 'bottom' },
      { target: '[data-tour="client-provider"]', title: 'Dein Kernteam', description: 'Hufbearbeiter, Tierarzt und Physiotherapeut — alle mit kontrolliertem Zugriff auf die Pferdeakte.', position: 'bottom' },
      { target: '#pferde-section', title: 'Gemeinsame Akte', description: 'Jeder Fachmann dokumentiert in der gleichen Akte. Du siehst alles — keine Informationslücken.', position: 'bottom' },
      { target: '[data-tour="client-appointments"]', title: 'Termine koordiniert', description: 'Alle Behandlungstermine in einem Kalender. Keine Terminkollisionen mehr.', position: 'bottom' },
      { target: '[data-tour="client-chat"]', title: 'Direkte Kommunikation', description: 'Chatte mit jedem Betreuer. Teile Fotos und Beobachtungen in Echtzeit.', position: 'bottom' },
      { target: '#pferde-section', title: 'Befunde vergleichen', description: 'Vergleiche Hufbefunde über die Zeit. Erkenne Trends und Verbesserungen.', position: 'bottom' },
      { target: '#pferde-section', title: 'Automatische Updates', description: 'Sobald ein Betreuer etwas dokumentiert, bekommst du eine Benachrichtigung.', position: 'bottom' },
      { target: '#pferde-section', title: 'Datenschutz & Kontrolle', description: 'DSGVO-konform: Du hast die volle Kontrolle. Zugriffsprotokolle zeigen, wer wann was eingesehen hat.', position: 'bottom' },
      { target: '#pferde-section', title: 'Betreuerwechsel', description: 'Wechselst du den Hufbearbeiter? Die Akte bleibt bei dir. Neuer Betreuer, gleiche Daten.', position: 'bottom' },
      { target: 'header', title: '🔗 Erlebe es selbst', description: 'Logge dich als Hufbearbeiter ein und sieh, wie deine Dokumentation für alle sichtbar wird. Das ist Vernetzung in Aktion.', position: 'bottom' },
    ],
  },
};

// ─── PARTNER (Fachpartner / Tierarzt / Physio) ─────────────────────────────

const partnerTopics: DemoTourTopic[] = [
  { id: 'dashboard', emoji: '📊', label: 'Mein Partner-Dashboard', description: 'KPIs, betreute Pferde und Überblick' },
  { id: 'pferde', emoji: '🐴', label: 'Freigegebene Pferde', description: 'Akten einsehen und Befunde ergänzen' },
  { id: 'behandlung', emoji: '📋', label: 'Behandlung dokumentieren', description: 'Befunde, Therapien und Empfehlungen' },
  { id: 'termine', emoji: '📅', label: 'Termine planen', description: 'Behandlungstermine für freigegebene Pferde' },
  { id: 'vernetzung', emoji: '🔗', label: 'Vernetzung im Team', description: 'Zusammenarbeit mit Hufbearbeiter & Besitzer' },
];

const partnerSteps: Record<string, { quick: TourStep[]; detailed: TourStep[] }> = {
  dashboard: {
    quick: [
      { target: '[data-tour="partner-kpi"]', title: 'Dein Cockpit', description: 'Betreute Pferde, Termine und Behandlungen auf einen Blick. Dein Praxis-Dashboard.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Nächste Termine', description: 'Deine kommenden Behandlungstermine — sortiert nach Datum.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Freigegebene Pferde', description: 'Alle Pferde, die dir vom Besitzer freigegeben wurden, mit kompletter Akte.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Schnellzugriffe', description: 'Tippe auf eine KPI-Kachel um direkt in den jeweiligen Bereich zu springen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Behandlung wird automatisch für Maria (Besitzerin) und den Hufbearbeiter sichtbar — DSGVO-konform und in Echtzeit.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="partner-kpi"]', title: 'Partner-Dashboard', description: 'Dein persönliches Dashboard als Fachpartner. Alle wichtigen Zahlen auf einen Blick.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Betreute Pferde', description: 'Die Anzahl der Pferde, für die du aktuell Zugriff hast — inklusive Link zur Übersicht.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Kommende Termine', description: 'Deine nächsten Behandlungstermine mit Pferd, Besitzer und Uhrzeit.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Letzte Behandlungen', description: 'Übersicht der kürzlich durchgeführten Behandlungen mit Befundstatus.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Pferdeliste', description: 'Alle freigegebenen Pferde mit Filteroptionen und Schnellzugriff auf die Akte.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Behandlungsstatistik', description: 'Wie viele Behandlungen pro Monat? Welche Trends? Dein Leistungsüberblick.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Umsatzüberblick', description: 'Dein Umsatz aus Behandlungen — nach Monat und Leistungsart aufgeschlüsselt.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Benachrichtigungen', description: 'Neue Freigaben, Terminanfragen und Nachrichten — alles im Benachrichtigungscenter.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Behandlungsbericht zu Luna wird automatisch für die Besitzerin und den Hufbearbeiter sichtbar.', position: 'bottom' },
    ],
  },
  pferde: {
    quick: [
      { target: '[data-tour="partner-horses"]', title: 'Freigegebene Pferde', description: 'Hier siehst du alle Pferde, für die dir ein Besitzer Zugriff gegeben hat.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Pferdeakte öffnen', description: 'Tippe auf ein Pferd für die vollständige Akte — Befunde, Fotos, Behandlungshistorie.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Vorherige Befunde', description: 'Sieh dir an, was der Hufbearbeiter und andere Fachpartner dokumentiert haben.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Zugriffsstatus', description: 'Du siehst, welche Rechte du hast: Nur lesen, oder auch dokumentieren und Termine anlegen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Die gleiche Akte, verschiedene Perspektiven: Du, der Hufbearbeiter und der Besitzer — alle auf dem gleichen Stand.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="partner-horses"]', title: 'Pferdeübersicht', description: 'Liste aller Pferde mit Freigabe. Filter nach Name, Besitzer oder letzter Behandlung.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Akte einsehen', description: 'Vollständige Pferdeakte mit Stammdaten, Fotos und chronologischer Behandlungshistorie.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Hufbefunde', description: 'Befunde des Hufbearbeiters einsehen — wichtig für deine eigene Diagnose und Behandlung.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Vorherige Behandlungen', description: 'Deine eigenen und die Behandlungen anderer Fachpartner im Überblick.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Fotoprotokoll', description: 'Fotos aller Beteiligten chronologisch sortiert — ideal für Verlaufsbeurteilung.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Zeitstrahl', description: 'Die gesamte Geschichte des Pferdes über alle Disziplinen hinweg.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Besitzer kontaktieren', description: 'Chatte direkt mit dem Besitzer aus der Pferdeakte heraus.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Neue Freigaben', description: 'Wenn ein Besitzer dir ein neues Pferd freigibt, bekommst du eine Benachrichtigung.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Du siehst die Arbeit des Hufbearbeiters, ergänzt deine Diagnose — und der Besitzer hat alles in einer Akte.', position: 'bottom' },
    ],
  },
  behandlung: {
    quick: [
      { target: '[data-tour="partner-horses"]', title: 'Behandlung starten', description: 'Wähle ein Pferd und starte die Dokumentation deiner Behandlung.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Befund eingeben', description: 'Dokumentiere Diagnose, Therapie und Empfehlungen. Alles wird in der Akte gespeichert.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Fotos hinzufügen', description: 'Mache Fotos während der Behandlung — sie werden automatisch zugeordnet.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Empfehlung teilen', description: 'Deine Empfehlungen werden dem Besitzer und dem Hufbearbeiter angezeigt.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Behandlungsnotiz zu Luna wird sofort für Maria und den Hufbearbeiter sichtbar — gemeinsam optimal versorgen.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="partner-horses"]', title: 'Pferd auswählen', description: 'Wähle aus der Liste der freigegebenen Pferde das Pferd, das du behandeln möchtest.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Anamnese', description: 'Prüfe die bisherige Historie: Was hat der Hufbearbeiter zuletzt dokumentiert? Gab es Auffälligkeiten?', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Diagnose', description: 'Dokumentiere deine Diagnose strukturiert. Nutze Vorlagen oder schreibe frei.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Therapie', description: 'Halte die durchgeführte Behandlung fest: Maßnahmen, Medikamente, Dosierungen.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Fotos & Videos', description: 'Dokumentiere visuell: Fotos, Röntgenbilder, Ultraschall — alles in der Akte.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Empfehlungen', description: 'Schreibe Empfehlungen für den Besitzer und andere Fachpartner. Diese werden prominent angezeigt.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Folgetermin', description: 'Plane direkt den nächsten Kontrolltermin — der Besitzer wird automatisch benachrichtigt.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Behandlung abschließen', description: 'Schließe die Behandlung ab. Alle Beteiligten werden über den neuen Eintrag informiert.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Rechnung erstellen', description: 'Erstelle eine Rechnung direkt aus der Behandlung — Leistungen werden übernommen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Dokumentation fließt automatisch in die Pferdeakte. Der Hufbearbeiter sieht deine Empfehlung beim nächsten Besuch.', position: 'bottom' },
    ],
  },
  termine: {
    quick: [
      { target: '[data-tour="partner-appointments"]', title: 'Deine Termine', description: 'Alle Behandlungstermine für freigegebene Pferde im Überblick.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Termin erstellen', description: 'Plane einen Behandlungstermin — der Besitzer wird automatisch informiert.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Terminbestätigung', description: 'Der Besitzer bestätigt den Termin in seiner App. Du siehst den Status sofort.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Termin abschließen', description: 'Nach der Behandlung dokumentierst du den Befund und schließt den Termin ab.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Termin wird in Marias Kalender angezeigt. Nach der Behandlung sieht sie den Befund sofort.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="partner-appointments"]', title: 'Terminkalender', description: 'Alle deine Behandlungstermine — kommende und vergangene — im Überblick.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Neuen Termin anlegen', description: 'Wähle Pferd, Datum und Leistungsart. Der Besitzer bekommt eine Benachrichtigung.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Terminstatus', description: 'Vorgeschlagen → Bestätigt → Durchgeführt → Abgeschlossen. Jeder Status wird synchronisiert.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Termin verschieben', description: 'Termine können unkompliziert verschoben werden — der Besitzer wird automatisch informiert.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Erinnerungen', description: 'Automatische Erinnerungen für dich und den Besitzer — kein Termin geht verloren.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Vor-Ort-Dokumentation', description: 'Beim Termin: Befund eingeben, Fotos machen, Therapie dokumentieren — alles mobil.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Termin abschließen', description: 'Schließe den Termin ab und löse damit die Rechnung aus. Alles automatisch verknüpft.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Wiederkehrende Termine', description: 'Erstelle Serien für regelmäßige Kontrollen — z.B. alle 4 Wochen Physiotherapie.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Termin, Marias Bestätigung, deine Dokumentation — alles fließt automatisch zusammen.', position: 'bottom' },
    ],
  },
  vernetzung: {
    quick: [
      { target: '[data-tour="partner-kpi"]', title: 'Dein Netzwerk', description: 'Du bist Teil eines Teams: Besitzer, Hufbearbeiter und Fachpartner arbeiten zusammen.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Gemeinsame Akte', description: 'Alle dokumentieren in einer Akte — keine doppelten Unterlagen, kein Informationsverlust.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Koordinierte Termine', description: 'Sieh die Termine aller Beteiligten — vermeide Doppelbuchungen und koordiniere Behandlungen.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Automatische Updates', description: 'Wenn der Hufbearbeiter einen neuen Befund einträgt, wirst du sofort informiert.', position: 'bottom' },
      { target: 'header', title: '🔗 So arbeitet das Team', description: 'Du dokumentierst → der Hufbearbeiter sieht deine Empfehlung → Maria hat den Überblick. Echte interdisziplinäre Zusammenarbeit.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="partner-kpi"]', title: 'Das Ökosystem', description: 'HufManager verbindet alle Fachleute rund ums Pferd in einem digitalen Netzwerk.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Deine Rolle', description: 'Als Fachpartner hast du kontrollierten Zugriff auf freigegebene Pferdeakten.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Interdisziplinäre Akte', description: 'Hufbefund + Tierarztdiagnose + Physio-Therapieplan — alles in einer Akte.', position: 'bottom' },
      { target: '[data-tour="partner-horses"]', title: 'Befunde des Hufbearbeiters', description: 'Sieh dir an, was der Hufbearbeiter beim letzten Besuch dokumentiert hat — wichtig für deine Behandlung.', position: 'bottom' },
      { target: '[data-tour="partner-appointments"]', title: 'Terminkoordination', description: 'Plane Behandlungen abgestimmt auf die Hufbearbeitung — optimale Versorgung für das Pferd.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Benachrichtigungen', description: 'Neue Freigabe? Neuer Befund? Terminänderung? Du wirst sofort informiert.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Direkte Kommunikation', description: 'Chatte mit dem Besitzer direkt aus der App. Kläre Fragen schnell und unkompliziert.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Empfehlungen teilen', description: 'Deine Behandlungsempfehlungen werden dem Hufbearbeiter prominent angezeigt.', position: 'bottom' },
      { target: '[data-tour="partner-kpi"]', title: 'Datenschutz', description: 'DSGVO-konform: Der Besitzer kontrolliert den Zugriff. Jeder Zugriff wird protokolliert.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung live', description: 'Logge dich als Hufbearbeiter oder Pferdebesitzerin ein und sieh die gleiche Akte aus einer anderen Perspektive.', position: 'bottom' },
    ],
  },
};

// ─── EMPLOYEE (Mitarbeiter) ─────────────────────────────────────────────────

const employeeTopics: DemoTourTopic[] = [
  { id: 'auftraege', emoji: '📋', label: 'Meine Aufträge', description: 'Zugewiesene Pferde und Tagesaufgaben' },
  { id: 'tour', emoji: '🗺️', label: 'Tour starten', description: 'Tagesroute, Navigation und Check-in' },
  { id: 'dokumentation', emoji: '📝', label: 'Dokumentation', description: 'Befunde, Fotos und Unterschriften' },
  { id: 'zeit', emoji: '⏱️', label: 'Zeiterfassung', description: 'Arbeitszeit und Material tracken' },
  { id: 'vernetzung', emoji: '🔗', label: 'Vernetzung mit Chef & Kunde', description: 'Live-Status und Kommunikation' },
];

const employeeSteps: Record<string, { quick: TourStep[]; detailed: TourStep[] }> = {
  auftraege: {
    quick: [
      { target: '[data-tour="employee-kpi"]', title: 'Dein Arbeitstag', description: 'Aufträge, erledigte Pferde, Arbeitszeit — alles auf einen Blick.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Heutige Aufträge', description: 'Dein Chef hat dir Pferde zugewiesen. Hier siehst du, was heute ansteht.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Auftrag öffnen', description: 'Tippe auf einen Auftrag für Details: Pferd, Besitzer, Standort und besondere Hinweise.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Fortschritt', description: 'Sieh deinen Tagesfortschritt: Wie viele Pferde erledigt, wie viele noch offen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Wenn du bei Luna eincheckst, sehen dein Chef und die Besitzerin den Status in Echtzeit.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="employee-kpi"]', title: 'Mitarbeiter-Dashboard', description: 'Dein persönliches Dashboard mit allen wichtigen Tages-KPIs.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Aufträge heute', description: 'Die Anzahl der dir zugewiesenen Aufträge für heute.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Erledigte Pferde', description: 'Wie viele Pferde hast du heute schon bearbeitet? Dein Fortschritt in Echtzeit.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Auftragsliste', description: 'Alle heutigen Aufträge mit Pferd, Besitzer, Standort und Status.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Auftragsdetails', description: 'Tippe für Details: Pferdehistorie, besondere Hinweise, letzte Bearbeitung.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Reihenfolge', description: 'Die Reihenfolge ist von deinem Chef optimiert — für minimale Fahrzeit.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Neue Aufträge', description: 'Dein Chef kann auch unterwegs Aufträge hinzufügen — du bekommst eine Push-Nachricht.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Tagesabschluss', description: 'Am Ende des Tages siehst du die Zusammenfassung: Pferde, Kilometer, Arbeitszeit.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Fortschritt ist für deinen Chef in Echtzeit sichtbar. Die Besitzer werden automatisch informiert.', position: 'bottom' },
    ],
  },
  tour: {
    quick: [
      { target: '[data-tour="employee-tour"]', title: 'Meine Tour', description: 'Deine Tagesroute mit allen Stationen auf der Karte. Optimiert für kurze Wege.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Navigation', description: 'Tippe auf eine Station um die Navigation zu starten — direkt zu Google/Apple Maps.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Check-in', description: 'Am Standort angekommen? Check ein — die Arbeitszeit wird automatisch erfasst.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Check-out', description: 'Fertig mit der Bearbeitung? Check aus — Zeit, Fotos und Befund werden gespeichert.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Chef sieht deinen Live-Standort und Fortschritt. Die Besitzer erhalten eine ETA.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="employee-tour"]', title: 'Tour-Übersicht', description: 'Deine Tagesroute als Karte mit allen Stationen, Entfernungen und geschätzter Fahrzeit.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Route optimiert', description: 'Die Reihenfolge ist von deinem Chef für minimale Fahrzeit optimiert.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Navigation starten', description: 'Ein Tipp auf eine Station öffnet die Navigation in deiner bevorzugten Karten-App.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Check-in am Standort', description: 'Angekommen? Swipe zum Check-in. Die Arbeitszeit für dieses Pferd beginnt.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Vor-Ort-Arbeit', description: 'Während der Bearbeitung: Dokumentiere Befunde, mache Fotos, erfasse Material.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Check-out', description: 'Fertig? Swipe zum Check-out. Die Arbeitszeit wird gestoppt, der Befund gespeichert.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Nächste Station', description: 'Nach dem Check-out wird dir automatisch die nächste Station angezeigt.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Live-Status', description: 'Dein Chef sieht in Echtzeit, wo du bist und wie weit du fortgeschritten bist.', position: 'bottom' },
      { target: '[data-tour="employee-tour"]', title: 'Tour beenden', description: 'Am Ende des Tages beendest du die Tour. Die Zusammenfassung wird automatisch erstellt.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Check-in bei Luna löst eine ETA-Benachrichtigung an die Besitzerin aus. Dein Chef sieht den Fortschritt live.', position: 'bottom' },
    ],
  },
  dokumentation: {
    quick: [
      { target: '[data-tour="employee-assignments"]', title: 'Befund dokumentieren', description: 'Nach der Bearbeitung: Hufbefund eingeben mit Freitext oder Vorlage.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Fotos aufnehmen', description: 'Vorher/Nachher-Fotos direkt mit dem Handy — automatisch dem Termin zugeordnet.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Unterschrift', description: 'Der Besitzer unterschreibt digital auf deinem Handy — schnell und rechtssicher.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Alles gespeichert', description: 'Befund, Fotos und Unterschrift werden sofort in die Pferdeakte übernommen.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Dokumentation ist sofort für deinen Chef, den Besitzer und freigegebene Fachpartner sichtbar.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="employee-assignments"]', title: 'Dokumentation starten', description: 'Nach dem Check-in: Öffne den Dokumentationsmodus für das aktuelle Pferd.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Hufbefund', description: 'Dokumentiere den Hufzustand: Stellung, Beschlag, Auffälligkeiten. Nutze Vorlagen für Effizienz.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Fotos vorher', description: 'Mache Fotos vor der Bearbeitung — alle vier Hufe, von vorne und der Seite.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Bearbeitung durchführen', description: 'Während du arbeitest, erfasst HufManager automatisch deine Arbeitszeit.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Fotos nachher', description: 'Nach der Bearbeitung: Nochmal Fotos für den Vergleich. Wird automatisch als „Nachher" markiert.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Material erfassen', description: 'Welche Materialien hast du verwendet? Nägel, Eisen, Polster — wird für die Abrechnung gespeichert.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Notizen', description: 'Besondere Hinweise für den nächsten Besuch oder den Chef — hier festhalten.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Ganganalyse', description: 'Optional: Video der Ganganalyse aufnehmen und in der Akte speichern.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Digitale Unterschrift', description: 'Der Besitzer unterschreibt auf deinem Handy. Die Unterschrift wird dem Termin zugeordnet.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Abschluss', description: 'Befund speichern und Check-out. Alles wird sofort synchronisiert.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Deine Dokumentation fließt in Echtzeit an deinen Chef und in die Akte. Die Besitzerin sieht die Fotos sofort.', position: 'bottom' },
    ],
  },
  zeit: {
    quick: [
      { target: '[data-tour="employee-kpi"]', title: 'Arbeitszeit', description: 'Deine heutige Arbeitszeit wird automatisch beim Check-in/Check-out erfasst.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Fahrzeit', description: 'Die Fahrzeit zwischen Stationen wird ebenfalls getrackt.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Material', description: 'Erfasse verwendetes Material — wird für die Abrechnung übernommen.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Tagesübersicht', description: 'Am Ende des Tages siehst du: Gesamtzeit, Pferde, Kilometer und Materialverbrauch.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Chef sieht deine Arbeitszeiten und kann die Abrechnung vorbereiten — ohne Zettelwirtschaft.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="employee-kpi"]', title: 'Zeiterfassung', description: 'HufManager erfasst deine Arbeitszeit automatisch beim Check-in und Check-out.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Pro Pferd', description: 'Die Bearbeitungszeit wird pro Pferd aufgeschlüsselt — für genaue Kalkulation.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Fahrzeit', description: 'Die Fahrzeit zwischen den Stationen wird separat erfasst.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Pausen', description: 'Pausenzeiten manuell erfassen — werden von der Arbeitszeit abgezogen.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Material', description: 'Nägel, Eisen, Polster — erfasse alles was du verbrauchst. Wird mit Standardpreisen bewertet.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Kilometerstand', description: 'Trage deinen Kilometerstand ein — Start und Ende des Tages für die Fahrkostenabrechnung.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Tagesabschluss', description: 'Am Ende: Gesamtübersicht mit Arbeitszeit, Pferden, Kilometern und Material.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Monatsübersicht', description: 'Sieh deine Monatsstatistik: Arbeitstage, Stunden, bearbeitete Pferde.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung in Aktion', description: 'Dein Chef hat alle Daten für die Lohnabrechnung — automatisch aus deinen Check-ins generiert.', position: 'bottom' },
    ],
  },
  vernetzung: {
    quick: [
      { target: '[data-tour="employee-kpi"]', title: 'Dein Chef', description: 'Dein Chef weist dir Aufträge zu und sieht deinen Fortschritt in Echtzeit.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Live-Updates', description: 'Jeder Check-in und Check-out wird sofort an deinen Chef gemeldet.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Kunden-Info', description: 'Die Pferdebesitzer sehen, dass du auf dem Weg bist — mit geschätzter Ankunftszeit.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Team-Kommunikation', description: 'Bei Fragen oder Problemen: Nachricht an deinen Chef direkt aus der App.', position: 'bottom' },
      { target: 'header', title: '🔗 So arbeitet das Team', description: 'Chef plant → Du fährst → Kunden werden informiert → Alles wird dokumentiert. Ein nahtloser Workflow.', position: 'bottom' },
    ],
    detailed: [
      { target: '[data-tour="employee-kpi"]', title: 'Teamarbeit', description: 'HufManager verbindet dich mit deinem Chef, den Kunden und dem ganzen Netzwerk.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Chef-Dashboard', description: 'Dein Chef sieht alle Mitarbeiter auf einer Karte — Standort, Status und Fortschritt.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Auftragsverteilung', description: 'Dein Chef verteilt Aufträge per Drag & Drop. Du bekommst eine Push-Nachricht.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Live-Tracking', description: 'Dein Standort und Status werden alle 30 Sekunden aktualisiert — für optimale Koordination.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'ETA für Kunden', description: 'Pferdebesitzer sehen eine geschätzte Ankunftszeit — weniger Anrufe, mehr Transparenz.', position: 'bottom' },
      { target: '[data-tour="employee-assignments"]', title: 'Probleme melden', description: 'Pferd krank? Niemand da? Melde es direkt in der App — dein Chef wird sofort informiert.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Notfall-Aufträge', description: 'Dein Chef kann spontane Aufträge hinzufügen — du bekommst sie direkt auf die Route.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Offline-Modus', description: 'Kein Netz? Kein Problem. Dokumentiere offline — die Daten werden synchronisiert, sobald du wieder online bist.', position: 'bottom' },
      { target: '[data-tour="employee-kpi"]', title: 'Feedback', description: 'Dein Chef kann dir Feedback zu Bearbeitungen geben — direkt in der App.', position: 'bottom' },
      { target: 'header', title: '🔗 Vernetzung live', description: 'Logge dich als Hufbearbeiter (Chef) ein und sieh, wie er deine Aufträge verwaltet und deinen Fortschritt trackt.', position: 'bottom' },
    ],
  },
};

// ─── EXPORT ─────────────────────────────────────────────────────────────────

export const demoTourConfigs: Record<DemoRole, DemoTourConfig> = {
  provider: { topics: providerTopics, steps: providerSteps },
  client: { topics: clientTopics, steps: clientSteps },
  partner: { topics: partnerTopics, steps: partnerSteps },
  employee: { topics: employeeTopics, steps: employeeSteps },
};

/** CTA step appended as the very last step of every tour */
export const ctaStep: TourStep = {
  target: 'header',
  title: '✨ Bereit für deinen eigenen Account?',
  description: 'Du hast gesehen, wie HufManager funktioniert. Erstelle jetzt deinen eigenen Account und digitalisiere deinen Betrieb — kostenlos testen!',
  position: 'bottom',
};
