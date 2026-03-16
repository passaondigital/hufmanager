/**
 * Gemeinsame Demo-Daten für alle Portal-Demos
 * WICHTIG: Alle Namen, E-Mails und Daten sind fiktiv (Demo-Daten)
 */

// ─── Gemeinsame Pferde-Demo-Daten ────────────────────────────
export const DEMO_PFERDE = [
  { id: "EQ-D001", name: "Amara", rasse: "Westfale", alter: "8 J.", besitzer: "Demo-Besitzer A", chipNr: "276098100000001", status: "gesund", letzteBeh: "12.03.2025", impfStatus: "aktuell", praeventionScore: 85 },
  { id: "EQ-D002", name: "Nordlicht", rasse: "Hannoveraner", alter: "12 J.", besitzer: "Demo-Besitzer B", chipNr: "276098100000002", status: "in_behandlung", letzteBeh: "08.03.2025", impfStatus: "fällig", praeventionScore: 62 },
  { id: "EQ-D003", name: "Windstoß", rasse: "Trakehner", alter: "6 J.", besitzer: "Demo-Besitzer C", chipNr: "276098100000003", status: "gesund", letzteBeh: "01.03.2025", impfStatus: "aktuell", praeventionScore: 91 },
  { id: "EQ-D004", name: "Pfeffer", rasse: "Isländer", alter: "15 J.", besitzer: "Demo-Besitzer D", chipNr: "276098100000004", status: "chronisch", letzteBeh: "28.02.2025", impfStatus: "überfällig", praeventionScore: 48 },
  { id: "EQ-D005", name: "Schattenspiel", rasse: "Friese", alter: "10 J.", besitzer: "Demo-Besitzer E", chipNr: "276098100000005", status: "gesund", letzteBeh: "15.03.2025", impfStatus: "aktuell", praeventionScore: 77 },
  { id: "EQ-D006", name: "Goldstaub", rasse: "Haflinger", alter: "14 J.", besitzer: "Demo-Besitzer F", chipNr: "276098100000006", status: "in_behandlung", letzteBeh: "10.03.2025", impfStatus: "fällig", praeventionScore: 70 },
];

// ─── Gemeinsame Nutzer-Templates ────────────────────────────
export function createDemoNutzer(portalPrefix: string, orgDomain: string) {
  return [
    { name: "Demo-Admin", rolle: "Admin", email: `demo.admin@${orgDomain}`, letzterLogin: "Heute, 14:32" },
    { name: "Demo-Bearbeiter 1", rolle: "Sachbearbeiter", email: `demo.bearbeiter1@${orgDomain}`, letzterLogin: "Heute, 11:15" },
    { name: "Demo-Bearbeiter 2", rolle: "Sachbearbeiter", email: `demo.bearbeiter2@${orgDomain}`, letzterLogin: "Gestern, 16:48" },
    { name: "Demo-Viewer", rolle: "Viewer", email: `demo.viewer@${orgDomain}`, letzterLogin: "12.03.2025" },
  ];
}

// ─── Gemeinsame Mitarbeiter-Templates ────────────────────────
export function createDemoMitarbeiter(orgDomain: string) {
  return [
    { id: "MA-D01", name: "Demo-Leiter", position: "Teamleitung", email: `demo.leiter@${orgDomain}`, abteilung: "Verwaltung", status: "aktiv", seit: "2020" },
    { id: "MA-D02", name: "Demo-Mitarbeiter A", position: "Sachbearbeiter/in", email: `demo.ma-a@${orgDomain}`, abteilung: "Kundenservice", status: "aktiv", seit: "2021" },
    { id: "MA-D03", name: "Demo-Mitarbeiter B", position: "Außendienst", email: `demo.ma-b@${orgDomain}`, abteilung: "Vertrieb", status: "aktiv", seit: "2022" },
    { id: "MA-D04", name: "Demo-Mitarbeiter C", position: "Praktikant/in", email: `demo.ma-c@${orgDomain}`, abteilung: "Verwaltung", status: "inaktiv", seit: "2024" },
  ];
}

// ─── Chat-Demo-Nachrichten ────────────────────────────
export const DEMO_CHAT_MESSAGES = [
  { id: "msg-1", absender: "Demo-Admin", text: "Bitte den Bericht zum Quartal vorbereiten.", zeit: "14:32", typ: "eingehend" as const },
  { id: "msg-2", absender: "Du", text: "Wird erledigt, bis wann?", zeit: "14:35", typ: "ausgehend" as const },
  { id: "msg-3", absender: "Demo-Admin", text: "Bis Freitag 17:00 wäre ideal.", zeit: "14:36", typ: "eingehend" as const },
  { id: "msg-4", absender: "Demo-Besitzer A", text: "Können Sie mir die letzte Dokumentation zu Amara schicken?", zeit: "11:20", typ: "eingehend" as const },
  { id: "msg-5", absender: "Du", text: "Natürlich, ist angehängt.", zeit: "11:45", typ: "ausgehend" as const },
];

export const DEMO_CHAT_KONTAKTE = [
  { id: "k1", name: "Demo-Admin", rolle: "Admin", letzteNachricht: "Bis Freitag 17:00 wäre ideal.", zeit: "14:36", ungelesen: 0 },
  { id: "k2", name: "Demo-Besitzer A", rolle: "Pferdebesitzer", letzteNachricht: "Können Sie mir die letzte Dokumentation schicken?", zeit: "11:20", ungelesen: 1 },
  { id: "k3", name: "Demo-Hufbearbeiter", rolle: "Provider", letzteNachricht: "Termin bestätigt für nächste Woche.", zeit: "Gestern", ungelesen: 0 },
  { id: "k4", name: "Demo-Tierärztin", rolle: "Partner", letzteNachricht: "Befund ist in der Akte hinterlegt.", zeit: "Mo", ungelesen: 2 },
];

// ─── HM Connect Kontakte ────────────────────────────
export const DEMO_HM_CONNECT = [
  { id: "hmc-1", name: "Demo-Hufbearbeiter #PID-001", typ: "Provider", status: "verbunden", seit: "Jan 2024", pferde: 3 },
  { id: "hmc-2", name: "Demo-Tierarztpraxis", typ: "Partner (Vet)", status: "verbunden", seit: "Mär 2024", pferde: 5 },
  { id: "hmc-3", name: "Demo-Physiotherapeut", typ: "Partner (Physio)", status: "ausstehend", seit: "–", pferde: 0 },
  { id: "hmc-4", name: "Demo-Reitstall Sonnenhof", typ: "Betrieb", status: "verbunden", seit: "Okt 2023", pferde: 12 },
];
