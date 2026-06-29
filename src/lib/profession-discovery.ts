// Discovery-Inhalte fürs Hufi-Onboarding: pro Beruf eine Use-Case-Verfeinerung,
// antippbare Herausforderungen und Hufis konkreter Nutzen-Pitch je Herausforderung.
// Genutzt vom HufiOnboardingChat (3-Schlag-Discovery) und beim Memory-Seeding.

export interface DiscoveryQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface ChallengeChip {
  key: string;
  label: string;
  /** Hufis Value-First-Antwort auf genau diese Herausforderung. */
  solution: string;
}

export interface ProfessionDiscovery {
  useCase: DiscoveryQuestion;
  challenges: ChallengeChip[];
}

// ── Wiederverwendbare Herausforderungen (gemappt auf echte Hufi-Fähigkeiten) ──
const C = {
  termine: {
    key: "termine",
    label: "Terminplanung & Erinnerungen",
    solution: "Ich plane deine Termine, optimiere die Tagesroute und erinnere Kunden automatisch — du musst nicht mehr hinterhertelefonieren.",
  },
  rechnungen: {
    key: "rechnungen",
    label: "Rechnungen schreiben",
    solution: "Sag mir einfach Kunde + Leistung (z.B. Rechnung für Bella, Behandlung 80 €) und ich erstelle die Rechnung samt PDF in Sekunden.",
  },
  doku: {
    key: "doku",
    label: "Dokumentation & Befunde",
    solution: "Diktier mir den Befund, ich lege ihn strukturiert in der Pferdeakte ab — auffindbar beim nächsten Termin.",
  },
  route: {
    key: "route",
    label: "Fahrtwege & Anfahrt",
    solution: "Ich optimiere deine Tagesroute und rechne Fahrtzeit, Kilometer und Sprit gleich mit.",
  },
  material: {
    key: "material",
    label: "Material & Lager",
    solution: "Ich behalte deinen Bestand im Auge und melde mich, bevor dir etwas ausgeht.",
  },
  kommunikation: {
    key: "kommunikation",
    label: "Kundenkommunikation",
    solution: "Ich entwerfe Nachrichten und halte deine Kunden auf dem Laufenden — in deinem Ton.",
  },
  buchhaltung: {
    key: "buchhaltung",
    label: "Buchhaltung & Steuer",
    solution: "Belege scannen, EÜR, USt-Voranmeldung — ich halte deine Zahlen sortiert und exportbereit für den Steuerberater.",
  },
  planung: {
    key: "planung",
    label: "Wiederkehrende Intervalle",
    solution: "Ich erkenne die passenden Intervalle pro Pferd und schlage den nächsten Termin proaktiv vor.",
  },
} satisfies Record<string, ChallengeChip>;

export const PROFESSION_DISCOVERY: Record<string, ProfessionDiscovery> = {
  hoof_care: {
    useCase: {
      id: "setup",
      question: "Wie arbeitest du hauptsächlich?",
      options: ["Mobil unterwegs", "Am festen Stall", "Allein", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.route, C.material, C.doku, C.planung],
  },
  farrier: {
    useCase: {
      id: "setup",
      question: "Womit verbringst du die meiste Zeit?",
      options: ["Barhuf/Natur", "Beschlag", "Ortho/Spezial", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.route, C.material, C.doku, C.planung],
  },
  osteopath: {
    useCase: {
      id: "setup",
      question: "Wie ist dein Arbeitsalltag?",
      options: ["Rein mobil", "Praxis + mobil", "Allein", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.doku, C.route, C.kommunikation, C.buchhaltung],
  },
  physiotherapist: {
    useCase: {
      id: "setup",
      question: "Wie ist dein Arbeitsalltag?",
      options: ["Rein mobil", "Praxis + mobil", "Allein", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.doku, C.route, C.kommunikation, C.buchhaltung],
  },
  dentist: {
    useCase: {
      id: "setup",
      question: "Wie arbeitest du?",
      options: ["Mobil", "Mit Sedierung", "Mit Tierarzt-Kooperation", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.doku, C.route, C.planung, C.kommunikation],
  },
  saddler: {
    useCase: {
      id: "setup",
      question: "Was ist dein Schwerpunkt?",
      options: ["Anpassung vor Ort", "Werkstatt", "Neuanfertigung", "Reparatur"],
    },
    challenges: [C.termine, C.rechnungen, C.material, C.doku, C.kommunikation, C.buchhaltung],
  },
  vet_mobile: {
    useCase: {
      id: "setup",
      question: "Wie ist deine Praxis aufgestellt?",
      options: ["Rein mobil", "Praxis + Hausbesuche", "Allein", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.doku, C.material, C.route, C.buchhaltung],
  },
  riding_instructor: {
    useCase: {
      id: "setup",
      question: "Wie unterrichtest du?",
      options: ["Einzelstunden", "Gruppen", "Turniervorbereitung", "Mehrere Ställe"],
    },
    challenges: [C.termine, C.rechnungen, C.kommunikation, C.doku, C.buchhaltung],
  },
  massage: {
    useCase: {
      id: "setup",
      question: "Wie arbeitest du?",
      options: ["Rein mobil", "Fester Ort", "Allein", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.doku, C.route, C.kommunikation],
  },
  other: {
    useCase: {
      id: "setup",
      question: "Wie arbeitest du hauptsächlich?",
      options: ["Mobil unterwegs", "Fester Ort", "Allein", "Mit Team"],
    },
    challenges: [C.termine, C.rechnungen, C.doku, C.kommunikation, C.buchhaltung],
  },
};

export function getProfessionDiscovery(professionType?: string | null): ProfessionDiscovery {
  if (professionType && PROFESSION_DISCOVERY[professionType]) {
    return PROFESSION_DISCOVERY[professionType];
  }
  return PROFESSION_DISCOVERY.other;
}

/** Pitch-Text für eine Liste gewählter Herausforderungs-Keys, in stabiler Reihenfolge. */
export function buildValuePitch(professionType: string | null, challengeKeys: string[]): string[] {
  const disc = getProfessionDiscovery(professionType);
  return challengeKeys
    .map((k) => disc.challenges.find((c) => c.key === k)?.solution)
    .filter((s): s is string => Boolean(s));
}
