/**
 * Gemeinsame Demo-Daten für alle Portal-Demos
 * WICHTIG: Alle Namen, E-Mails und Daten sind fiktiv (Demo-Daten)
 * 
 * System-ID Schema:
 *   #PID  = Provider (Hufbearbeiter)
 *   #KID  = Kunde (Pferdebesitzer)
 *   #EQID = Equine (Pferd)
 *   #PRID = Partner (Tierarzt, Physio etc.)
 *   #OID  = Organisation (Versicherung, Verband, Hersteller etc.)
 */

// ─── Gemeinsame Pferde-Demo-Daten ────────────────────────────
export const DEMO_PFERDE = [
  { id: "#EQID-D001", name: "Amara", rasse: "Westfale", alter: "8 J.", besitzer: "Demo-Besitzer A", besitzerId: "#KID-D001", chipNr: "276098100000001", status: "gesund", letzteBeh: "12.03.2025", impfStatus: "aktuell", praeventionScore: 85, provider: "#PID-D001" },
  { id: "#EQID-D002", name: "Nordlicht", rasse: "Hannoveraner", alter: "12 J.", besitzer: "Demo-Besitzer B", besitzerId: "#KID-D002", chipNr: "276098100000002", status: "in_behandlung", letzteBeh: "08.03.2025", impfStatus: "fällig", praeventionScore: 62, provider: "#PID-D001" },
  { id: "#EQID-D003", name: "Windstoß", rasse: "Trakehner", alter: "6 J.", besitzer: "Demo-Besitzer C", besitzerId: "#KID-D003", chipNr: "276098100000003", status: "gesund", letzteBeh: "01.03.2025", impfStatus: "aktuell", praeventionScore: 91, provider: "#PID-D002" },
  { id: "#EQID-D004", name: "Pfeffer", rasse: "Isländer", alter: "15 J.", besitzer: "Demo-Besitzer D", besitzerId: "#KID-D004", chipNr: "276098100000004", status: "chronisch", letzteBeh: "28.02.2025", impfStatus: "überfällig", praeventionScore: 48, provider: "#PID-D002" },
  { id: "#EQID-D005", name: "Schattenspiel", rasse: "Friese", alter: "10 J.", besitzer: "Demo-Besitzer E", besitzerId: "#KID-D005", chipNr: "276098100000005", status: "gesund", letzteBeh: "15.03.2025", impfStatus: "aktuell", praeventionScore: 77, provider: "#PID-D001" },
  { id: "#EQID-D006", name: "Goldstaub", rasse: "Haflinger", alter: "14 J.", besitzer: "Demo-Besitzer F", besitzerId: "#KID-D006", chipNr: "276098100000006", status: "in_behandlung", letzteBeh: "10.03.2025", impfStatus: "fällig", praeventionScore: 70, provider: "#PID-D003" },
];

// ─── Gemeinsame Nutzer-Templates ────────────────────────────
export function createDemoNutzer(portalPrefix: string, orgDomain: string, orgId: string = "#OID-D001") {
  return [
    { id: "#KID-DA01", name: "Demo-Admin", rolle: "Admin", email: `demo.admin@${orgDomain}`, letzterLogin: "Heute, 14:32", orgId },
    { id: "#KID-DA02", name: "Demo-Bearbeiter 1", rolle: "Sachbearbeiter", email: `demo.bearbeiter1@${orgDomain}`, letzterLogin: "Heute, 11:15", orgId },
    { id: "#KID-DA03", name: "Demo-Bearbeiter 2", rolle: "Sachbearbeiter", email: `demo.bearbeiter2@${orgDomain}`, letzterLogin: "Gestern, 16:48", orgId },
    { id: "#KID-DA04", name: "Demo-Viewer", rolle: "Viewer", email: `demo.viewer@${orgDomain}`, letzterLogin: "12.03.2025", orgId },
  ];
}

// ─── Gemeinsame Mitarbeiter-Templates ────────────────────────
export function createDemoMitarbeiter(orgDomain: string, orgId: string = "#OID-D001") {
  return [
    { id: "#KID-DM01", name: "Demo-Leiter", position: "Teamleitung", email: `demo.leiter@${orgDomain}`, abteilung: "Verwaltung", status: "aktiv", seit: "2020", orgId },
    { id: "#KID-DM02", name: "Demo-Mitarbeiter A", position: "Sachbearbeiter/in", email: `demo.ma-a@${orgDomain}`, abteilung: "Kundenservice", status: "aktiv", seit: "2021", orgId },
    { id: "#KID-DM03", name: "Demo-Mitarbeiter B", position: "Außendienst", email: `demo.ma-b@${orgDomain}`, abteilung: "Vertrieb", status: "aktiv", seit: "2022", orgId },
    { id: "#KID-DM04", name: "Demo-Mitarbeiter C", position: "Praktikant/in", email: `demo.ma-c@${orgDomain}`, abteilung: "Verwaltung", status: "inaktiv", seit: "2024", orgId },
  ];
}

// ─── Chat-Demo-Nachrichten ────────────────────────────
export const DEMO_CHAT_MESSAGES = [
  { id: "msg-1", absender: "Demo-Admin", absenderId: "#KID-DA01", text: "Bitte den Bericht zum Quartal vorbereiten.", zeit: "14:32", typ: "eingehend" as const },
  { id: "msg-2", absender: "Du", absenderId: "", text: "Wird erledigt, bis wann?", zeit: "14:35", typ: "ausgehend" as const },
  { id: "msg-3", absender: "Demo-Admin", absenderId: "#KID-DA01", text: "Bis Freitag 17:00 wäre ideal.", zeit: "14:36", typ: "eingehend" as const },
  { id: "msg-4", absender: "Demo-Besitzer A", absenderId: "#KID-D001", text: "Können Sie mir die letzte Dokumentation zu Amara (#EQID-D001) schicken?", zeit: "11:20", typ: "eingehend" as const },
  { id: "msg-5", absender: "Du", absenderId: "", text: "Natürlich, ist angehängt.", zeit: "11:45", typ: "ausgehend" as const },
];

export const DEMO_CHAT_KONTAKTE = [
  { id: "k1", name: "Demo-Admin", visibleId: "#KID-DA01", rolle: "Admin", letzteNachricht: "Bis Freitag 17:00 wäre ideal.", zeit: "14:36", ungelesen: 0 },
  { id: "k2", name: "Demo-Besitzer A", visibleId: "#KID-D001", rolle: "Pferdebesitzer", letzteNachricht: "Können Sie mir die letzte Dokumentation schicken?", zeit: "11:20", ungelesen: 1 },
  { id: "k3", name: "Demo-Hufbearbeiter", visibleId: "#PID-D001", rolle: "Provider", letzteNachricht: "Termin bestätigt für nächste Woche.", zeit: "Gestern", ungelesen: 0 },
  { id: "k4", name: "Demo-Tierärztin", visibleId: "#PRID-D001", rolle: "Partner", letzteNachricht: "Befund ist in der Akte hinterlegt.", zeit: "Mo", ungelesen: 2 },
];

// ─── Hufi Connect Kontakte ────────────────────────────
export const DEMO_HM_CONNECT = [
  { id: "hmc-1", name: "Demo-Hufbearbeiter", visibleId: "#PID-D001", typ: "Provider", status: "verbunden", seit: "Jan 2024", pferde: 3 },
  { id: "hmc-2", name: "Demo-Tierarztpraxis", visibleId: "#PRID-D001", typ: "Partner (Vet)", status: "verbunden", seit: "Mär 2024", pferde: 5 },
  { id: "hmc-3", name: "Demo-Physiotherapeut", visibleId: "#PRID-D002", typ: "Partner (Physio)", status: "ausstehend", seit: "–", pferde: 0 },
  { id: "hmc-4", name: "Demo-Reitstall Sonnenhof", visibleId: "#OID-D010", typ: "Betrieb", status: "verbunden", seit: "Okt 2023", pferde: 12 },
];
