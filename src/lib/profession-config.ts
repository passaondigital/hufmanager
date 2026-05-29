export interface ProfessionConfig {
  type: string;
  label: string;
  emoji: string;
  menuItems: string[];
  dashboardWidgets: string[];
  serviceLabel: string;
  appointmentDuration: number;
  documentTypes: string[];
}

export const PROFESSION_CONFIGS: Record<string, ProfessionConfig> = {
  hoof_care: {
    type: "hoof_care",
    label: "Hufbearbeiter",
    emoji: "🐴",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "hufcam", "business", "connect", "analyse"],
    dashboardWidgets: ["next-appointment", "tour-planner", "open-invoices", "hoof-stats"],
    serviceLabel: "Hufbearbeitung",
    appointmentDuration: 60,
    documentTypes: ["huf-befund", "huf-foto", "beschlag-protokoll"],
  },
  osteopath: {
    type: "osteopath",
    label: "Osteopath",
    emoji: "🦴",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "business", "connect", "analyse"],
    dashboardWidgets: ["next-appointment", "tour-planner", "open-invoices", "treatment-stats"],
    serviceLabel: "Behandlung",
    appointmentDuration: 90,
    documentTypes: ["osteo-befund", "bewegungsanalyse", "therapieplan"],
  },
  physiotherapist: {
    type: "physiotherapist",
    label: "Physiotherapeut",
    emoji: "💆",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "business", "connect", "analyse"],
    dashboardWidgets: ["next-appointment", "tour-planner", "open-invoices", "treatment-stats"],
    serviceLabel: "Therapie",
    appointmentDuration: 75,
    documentTypes: ["physio-befund", "trainingsplan", "therapieprotokoll"],
  },
  dentist: {
    type: "dentist",
    label: "Equine Dentist",
    emoji: "🦷",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "business", "connect"],
    dashboardWidgets: ["next-appointment", "tour-planner", "open-invoices"],
    serviceLabel: "Zahnbehandlung",
    appointmentDuration: 45,
    documentTypes: ["zahn-befund", "zahn-foto", "sedierungsprotokoll"],
  },
  riding_instructor: {
    type: "riding_instructor",
    label: "Reitlehrer",
    emoji: "🏇",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "business"],
    dashboardWidgets: ["next-appointment", "open-invoices", "student-stats"],
    serviceLabel: "Reitstunde",
    appointmentDuration: 60,
    documentTypes: ["ausbildungsplan", "reitprotokoll"],
  },
  saddler: {
    type: "saddler",
    label: "Sattler",
    emoji: "🪡",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "lager", "business"],
    dashboardWidgets: ["next-appointment", "open-invoices", "material-stock"],
    serviceLabel: "Sattelanpassung",
    appointmentDuration: 90,
    documentTypes: ["sattel-protokoll", "anpassungsbericht", "mass-blatt"],
  },
  massage: {
    type: "massage",
    label: "Pferdemassage",
    emoji: "💬",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "business", "connect"],
    dashboardWidgets: ["next-appointment", "open-invoices"],
    serviceLabel: "Massage",
    appointmentDuration: 60,
    documentTypes: ["massage-protokoll", "spannungsbefund"],
  },
  vet_mobile: {
    type: "vet_mobile",
    label: "Mobiler Tierarzt",
    emoji: "🩺",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "lager", "business", "connect", "analyse"],
    dashboardWidgets: ["next-appointment", "tour-planner", "open-invoices", "emergency-contacts"],
    serviceLabel: "Behandlung",
    appointmentDuration: 45,
    documentTypes: ["tierarzt-befund", "labor-ergebnis", "impfprotokoll", "sedierungsprotokoll"],
  },
  other: {
    type: "other",
    label: "Sonstiges",
    emoji: "⚙️",
    menuItems: ["cockpit", "kalender", "kunden", "pferde", "rechnungen", "business", "connect"],
    dashboardWidgets: ["next-appointment", "open-invoices"],
    serviceLabel: "Termin",
    appointmentDuration: 60,
    documentTypes: ["allgemeiner-befund"],
  },
};

export function getProfessionConfig(professionType?: string | null): ProfessionConfig {
  if (professionType && PROFESSION_CONFIGS[professionType]) {
    return PROFESSION_CONFIGS[professionType];
  }
  return PROFESSION_CONFIGS.hoof_care;
}
