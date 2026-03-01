// Central role permissions data for RoleComparisonTable

export type PermissionLevel = "yes" | "no" | "permission" | "own" | "assigned" | "request" | "teamlead";

export interface PermissionRow {
  feature: string;
  client: PermissionLevel;
  provider: PermissionLevel;
  partner: PermissionLevel;
  employee: PermissionLevel;
  admin: PermissionLevel;
}

export interface PermissionSection {
  title: string;
  rows: PermissionRow[];
}

export const ROLE_LABELS = {
  client: "🐴 Pferdebesitzer",
  provider: "🔧 Hufpfleger",
  partner: "🤝 Fachpartner",
  employee: "👷 Mitarbeiter",
  admin: "👑 Admin",
} as const;

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  yes: "✅",
  no: "❌",
  permission: "Mit Erlaubnis",
  own: "Eigene",
  assigned: "Zugewiesene",
  request: "Anfrage",
  teamlead: "Team Lead",
};

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    title: "Profil & Account",
    rows: [
      { feature: "Konto erstellen", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Profil bearbeiten", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Konto löschen", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Daten exportieren", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Avatar hochladen", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
    ],
  },
  {
    title: "Pferdedaten",
    rows: [
      { feature: "Pferd anlegen", client: "yes", provider: "yes", partner: "no", employee: "no", admin: "yes" },
      { feature: "Pferd bearbeiten", client: "yes", provider: "permission", partner: "no", employee: "no", admin: "yes" },
      { feature: "Stammdaten sehen", client: "yes", provider: "permission", partner: "permission", employee: "permission", admin: "yes" },
      { feature: "Medizinische Daten sehen", client: "yes", provider: "permission", partner: "permission", employee: "permission", admin: "yes" },
      { feature: "Huf-Historie sehen", client: "yes", provider: "yes", partner: "permission", employee: "assigned", admin: "yes" },
      { feature: "Befunde schreiben", client: "no", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Fotos hinzufügen", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Pferd löschen", client: "yes", provider: "no", partner: "no", employee: "no", admin: "yes" },
    ],
  },
  {
    title: "Termine",
    rows: [
      { feature: "Termine sehen (eigene)", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Termin erstellen", client: "request", provider: "yes", partner: "own", employee: "assigned", admin: "yes" },
      { feature: "Termin bestätigen", client: "yes", provider: "yes", partner: "no", employee: "no", admin: "yes" },
      { feature: "Termin absagen", client: "yes", provider: "yes", partner: "yes", employee: "no", admin: "yes" },
      { feature: "Termin abschließen", client: "no", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Kalender sehen", client: "own", provider: "yes", partner: "own", employee: "assigned", admin: "yes" },
      { feature: "Terminanfrage stellen", client: "yes", provider: "no", partner: "no", employee: "no", admin: "no" },
    ],
  },
  {
    title: "Rechnungen",
    rows: [
      { feature: "Rechnungen empfangen", client: "yes", provider: "no", partner: "no", employee: "no", admin: "yes" },
      { feature: "Rechnungen erstellen", client: "no", provider: "yes", partner: "yes", employee: "no", admin: "yes" },
      { feature: "Rechnungen einsehen", client: "own", provider: "own", partner: "own", employee: "no", admin: "yes" },
      { feature: "PDF herunterladen", client: "yes", provider: "yes", partner: "yes", employee: "no", admin: "yes" },
      { feature: "Bezahlen", client: "yes", provider: "no", partner: "no", employee: "no", admin: "no" },
    ],
  },
  {
    title: "Kommunikation",
    rows: [
      { feature: "Chat mit Provider", client: "yes", provider: "yes", partner: "no", employee: "yes", admin: "yes" },
      { feature: "Chat mit Besitzer", client: "yes", provider: "yes", partner: "yes", employee: "permission", admin: "yes" },
      { feature: "Chat mit Partner", client: "yes", provider: "no", partner: "yes", employee: "no", admin: "yes" },
      { feature: "Chat mit Mitarbeiter", client: "no", provider: "yes", partner: "no", employee: "yes", admin: "yes" },
      { feature: "Team-Chat", client: "no", provider: "yes", partner: "no", employee: "yes", admin: "yes" },
      { feature: "Benachrichtigungen", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
    ],
  },
  {
    title: "Freigaben & Datenschutz",
    rows: [
      { feature: "Freigaben verwalten (eigene)", client: "yes", provider: "no", partner: "no", employee: "no", admin: "yes" },
      { feature: "Freigabe anfragen", client: "no", provider: "yes", partner: "yes", employee: "no", admin: "no" },
      { feature: "Freigabe erteilen", client: "yes", provider: "no", partner: "no", employee: "no", admin: "yes" },
      { feature: "Freigabe entziehen", client: "yes", provider: "no", partner: "no", employee: "no", admin: "yes" },
      { feature: "Wer hat Zugriff sehen", client: "yes", provider: "yes", partner: "no", employee: "no", admin: "yes" },
    ],
  },
  {
    title: "Geschäftsfunktionen",
    rows: [
      { feature: "Dashboard Business", client: "no", provider: "yes", partner: "own", employee: "no", admin: "yes" },
      { feature: "Umsatz-Analyse", client: "no", provider: "yes", partner: "own", employee: "no", admin: "yes" },
      { feature: "Mitarbeiter verwalten", client: "no", provider: "yes", partner: "no", employee: "teamlead", admin: "yes" },
      { feature: "Leistungskatalog", client: "no", provider: "yes", partner: "yes", employee: "own", admin: "yes" },
      { feature: "Tourenplanung", client: "no", provider: "yes", partner: "no", employee: "assigned", admin: "yes" },
      { feature: "Materialverwaltung", client: "no", provider: "yes", partner: "no", employee: "yes", admin: "yes" },
    ],
  },
  {
    title: "KI & Tools",
    rows: [
      { feature: "Hufi KI-Chat", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "HufCam", client: "yes", provider: "yes", partner: "yes", employee: "yes", admin: "yes" },
      { feature: "Hufanalyse", client: "no", provider: "yes", partner: "own", employee: "assigned", admin: "yes" },
      { feature: "AutoFlow", client: "no", provider: "yes", partner: "no", employee: "no", admin: "yes" },
      { feature: "HM Connect", client: "no", provider: "yes", partner: "yes", employee: "no", admin: "yes" },
    ],
  },
];
