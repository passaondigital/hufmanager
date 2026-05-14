// Schnell-Match für häufige berufsspezifische Szenarien
// Kein AI-Call nötig — direkt lokal beantwortet

export interface ScenarioMatch {
  text: string;           // Antworttext
  spoken?: string;        // TTS-optimierte Version (kürzer)
  needsSlot?: string;     // Nächste Frage die Hufi stellen soll
  slotKey?: string;       // Welcher Slot gefüllt wird
  actions?: Array<{ label: string; route: string }>;
}

interface Scenario {
  patterns: RegExp[];
  roles?: string[];       // undefined = alle Rollen
  match: (ctx?: { appointmentCount?: number; unpaidCount?: number }) => ScenarioMatch;
}

export const SCENARIOS: Scenario[] = [
  // ── Wetter / Tour ─────────────────────────────────────────────────────────
  {
    patterns: [/\b(regnet|regen|nass|sturm|gewitter|frost|eis|schnee)\b/i],
    roles: ["provider"],
    match: (ctx) => ({
      text: ctx?.appointmentCount
        ? `Du hast heute ${ctx.appointmentCount} Termine. Soll ich deine Kunden über das Wetter informieren?`
        : "Soll ich deine heutigen Kunden über das Wetter informieren? Alle oder bestimmte?",
      spoken: "Soll ich deine heutigen Kunden informieren?",
      needsSlot: "Alle heutigen Kunden, oder bestimmte?",
      slotKey: "weather_notify_whom",
    }),
  },
  {
    patterns: [/\b(termin|tour|fahrt).*(absag|cancel|verschie)/i, /\b(absag|verschie).*(termin|tour)/i],
    roles: ["provider"],
    match: () => ({
      text: "Welchen Termin möchtest du absagen — einen bestimmten, oder alle für heute?",
      spoken: "Welchen Termin soll ich absagen?",
      needsSlot: "Bestimmter Termin oder alle für heute?",
      slotKey: "cancel_which",
    }),
  },
  {
    patterns: [/\b(route|tour|weg|strecke|reihenfolge).*(heute|morgen|planen|optimier)/i,
               /\b(heute|morgen).*(route|tour|weg|strecke)/i],
    roles: ["provider"],
    match: (ctx) => ({
      text: ctx?.appointmentCount
        ? `Du hast ${ctx.appointmentCount} Termine. Ich kann dir die optimierte Reihenfolge anzeigen.`
        : "Ich zeige dir deine Tagesroute.",
      spoken: "Hier ist deine Route für heute.",
      actions: [{ label: "Route anzeigen", route: "/kalender" }],
    }),
  },

  // ── Kunden-Kommunikation ──────────────────────────────────────────────────
  {
    patterns: [/\b(alle|heutige).*(kunden|klienten).*(informier|benachrichtig|schreib)/i,
               /\b(informier|benachrichtig|schreib).*(alle|heutige).*(kunden|klienten)/i],
    roles: ["provider"],
    match: () => ({
      text: "Worüber soll ich sie informieren — Terminverschiebung, Erinnerung, oder etwas anderes?",
      spoken: "Worüber soll ich die Kunden informieren?",
      needsSlot: "Verschiebung, Erinnerung oder anderes?",
      slotKey: "notify_topic",
    }),
  },
  {
    patterns: [/\b(erinnerung|reminder).*(schick|send|schreib)/i,
               /\b(schick|send).*(erinnerung|reminder)/i],
    roles: ["provider"],
    match: () => ({
      text: "Terminerinnerung für welche Kunden — alle morgen, alle diese Woche, oder bestimmte?",
      spoken: "Terminerinnerung für welche Kunden?",
      needsSlot: "Alle morgen, diese Woche, oder bestimmte?",
      slotKey: "reminder_whom",
    }),
  },

  // ── Abrechnung ────────────────────────────────────────────────────────────
  {
    patterns: [/\b(rechnung|invoice).*(erstell|neu|anlegen)/i,
               /\b(erstell|anlegen).*(rechnung|invoice)/i],
    roles: ["provider"],
    match: () => ({
      text: "Rechnung für welchen Kunden und welches Pferd?",
      spoken: "Rechnung für wen?",
      needsSlot: "Name des Kunden oder Pferdes?",
      slotKey: "invoice_client",
      actions: [{ label: "Neue Rechnung", route: "/rechnungen" }],
    }),
  },
  {
    patterns: [/\b(wieviel|wie viel).*(verdien|einnahmen|umsatz)/i,
               /\b(einnahmen|umsatz|verdienst).*(woche|monat|heute)/i],
    roles: ["provider"],
    match: () => ({
      text: "Deine Einnahmen-Übersicht findest du in der Analyse.",
      spoken: "Deine Einnahmen-Übersicht.",
      actions: [{ label: "Analyse öffnen", route: "/analyse" }],
    }),
  },

  // ── Pferdegesundheit ──────────────────────────────────────────────────────
  {
    patterns: [/\b(strahlfäule|thrush)/i],
    match: () => ({
      text: "Strahlfäule: Huf täglich reinigen, trockene Einstreu, Kupfersulfat oder Ichthyol auftragen. Bei tiefem Befall Tierarzt einbeziehen.",
      spoken: "Strahlfäule: Huf täglich reinigen, trockenlegen, und wenn nötig Tierarzt.",
    }),
  },
  {
    patterns: [/\b(hufrehe|laminitis)/i],
    match: () => ({
      text: "Hufrehe-Verdacht: Sofort Tierarzt anrufen. Kein Treiben, weiche Einstreu, Kühlwasser falls akut. Das ist ein Notfall.",
      spoken: "Hufrehe-Verdacht ist ein Notfall. Sofort den Tierarzt anrufen.",
      actions: [{ label: "Tierarzt-Finder", route: "/tierarzt-finder" }],
    }),
  },
  {
    patterns: [/\b(lahmt|lahmheit|lahm)\b/i],
    match: () => ({
      text: "Lahmheit: Ursache suchen (Stein, Nagel, Abszess, Huf-/Gliedmaßenproblem). Bei Unsicherheit sofort Tierarzt. Kein weiteres Reiten bis zur Klärung.",
      spoken: "Lahmheit: Ursache suchen, bei Unsicherheit sofort Tierarzt.",
    }),
  },
  {
    patterns: [/\b(bockhuf|bockhufe)/i],
    match: () => ({
      text: "Bockhuf: Regelmäßige Hufpflege mit gezieltem Korrekturschnitt, ggf. Huforthopädie. Ursachen oft Bewegungsmangel, Fehlbelastung oder genetisch.",
      spoken: "Bockhuf braucht regelmäßigen Korrekturschnitt und ggf. Huforthopädie.",
    }),
  },
  {
    patterns: [/\b(ems|equines metabolisches syndrom)/i],
    match: () => ({
      text: "EMS: Insulinresistenz beim Pferd — Zuckergras meiden, Bewegung, Gewichtsreduktion. Immer mit Tierarzt besprechen.",
      spoken: "EMS: Zuckergras meiden, mehr Bewegung, und Tierarzt einbeziehen.",
    }),
  },
  {
    patterns: [/\b(cushing|ppid)/i],
    match: () => ({
      text: "Cushing (PPID): Hormonelle Erkrankung älterer Pferde. Medikamentös behandelbar (Pergolid). Tierarzt zur Diagnose und Behandlung.",
      spoken: "Cushing ist medikamentös behandelbar. Tierarzt für Diagnose.",
    }),
  },

  // ── Hufbearbeitung ────────────────────────────────────────────────────────
  {
    patterns: [/\b(intervall|rhythmus|pflegerhythmus|wie oft)/i],
    roles: ["provider"],
    match: () => ({
      text: "Empfohlene Intervalle: 4 Wochen bei intensiver Arbeit, 6 Wochen Standard, 8 Wochen bei wenig Beanspruchung und guten Hufen.",
      spoken: "Standard-Intervall sind sechs Wochen. Bei intensiver Arbeit vier, bei wenig Beanspruchung acht.",
    }),
  },
  {
    patterns: [/\b(überfällig|überfällige|overdue)\b.*\b(pferd|pferde|termin)/i,
               /\b(pferd|pferde)\b.*\b(überfällig|overdue)\b/i],
    roles: ["provider"],
    match: (_ctx) => ({
      text: "Ich zeige dir die überfälligen Pferde.",
      spoken: "Hier sind die überfälligen Pferde.",
      actions: [{ label: "Pferde öffnen", route: "/pferde" }],
    }),
  },

  // ── Account / App ──────────────────────────────────────────────────────────
  {
    patterns: [/\b(hilfe|help|faq|anleitung|wie funktioniert)\b/i],
    match: () => ({
      text: "Im FAQ findest du Antworten auf häufige Fragen.",
      spoken: "Im FAQ findest du alle Antworten.",
      actions: [{ label: "FAQ öffnen", route: "/hufi/faq" }],
    }),
  },
  {
    patterns: [/\b(datenschutz|dsgvo|meine daten)\b/i],
    match: () => ({
      text: "Alle deine Daten liegen auf EU-Servern in Frankfurt. Kein Drittland-Transfer, kein KI-Training mit deinen Daten. Export jederzeit möglich.",
      spoken: "Deine Daten liegen sicher in Deutschland. Kein Training, jederzeit exportierbar.",
    }),
  },
];

export function matchScenario(
  text: string,
  userRole: string | null,
  ctx?: { appointmentCount?: number; unpaidCount?: number }
): ScenarioMatch | null {
  const lower = text.toLowerCase();
  for (const scenario of SCENARIOS) {
    if (scenario.roles && userRole && !scenario.roles.includes(userRole)) continue;
    if (scenario.patterns.some((p) => p.test(lower))) {
      return scenario.match(ctx);
    }
  }
  return null;
}
