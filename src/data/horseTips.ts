export interface HorseTip {
  id: string;
  category: "hufpflege" | "intervall" | "saisonal" | "allgemein";
  categoryLabel: string;
  emoji: string;
  text: string;
}

export const HORSE_TIPS: HorseTip[] = [
  {
    id: "tip-1",
    category: "hufpflege",
    categoryLabel: "Hufpflege",
    emoji: "🧹",
    text: "Hufe täglich auskratzen verhindert Faulnis — besonders wichtig bei feuchtem Wetter.",
  },
  {
    id: "tip-2",
    category: "hufpflege",
    categoryLabel: "Hufpflege",
    emoji: "💧",
    text: "Vermeide es, die Hufe dauerhaft in Nässe stehen zu lassen. Trockene Liegeflächen sind das A und O.",
  },
  {
    id: "tip-3",
    category: "intervall",
    categoryLabel: "Intervall",
    emoji: "📅",
    text: "Bei den meisten Pferden empfiehlt sich ein Beschlag- oder Ausschnitt-Rhythmus von 6–8 Wochen.",
  },
  {
    id: "tip-4",
    category: "intervall",
    categoryLabel: "Intervall",
    emoji: "⏰",
    text: "Zu lange Intervalle können zu Fehlstellungen führen. Lieber einmal zu früh als zu spät.",
  },
  {
    id: "tip-5",
    category: "saisonal",
    categoryLabel: "Saisonal",
    emoji: "🌱",
    text: "Im Frühjahr wachsen Hufe schneller — plane deinen nächsten Termin etwas früher.",
  },
  {
    id: "tip-6",
    category: "saisonal",
    categoryLabel: "Saisonal",
    emoji: "❄️",
    text: "Im Winter brauchen Hufe besonderen Schutz. Schneeklumpen zwischen den Eisen regelmäßig entfernen.",
  },
  {
    id: "tip-7",
    category: "saisonal",
    categoryLabel: "Saisonal",
    emoji: "☀️",
    text: "Sommerhitze trocknet Hufe aus. Hufpflege-Öl oder -Fett kann helfen, die Feuchtigkeit zu halten.",
  },
  {
    id: "tip-8",
    category: "allgemein",
    categoryLabel: "Allgemein",
    emoji: "💪",
    text: "Huf ohne Sohle, Pferd ohne Kraft — regelmäßige Pflege ist das Fundament.",
  },
  {
    id: "tip-9",
    category: "allgemein",
    categoryLabel: "Allgemein",
    emoji: "👀",
    text: "Achte auf Risse im Huf. Kleine Risse sind normal, tiefe Risse sollten vom Hufpfleger begutachtet werden.",
  },
  {
    id: "tip-10",
    category: "allgemein",
    categoryLabel: "Allgemein",
    emoji: "🐴",
    text: "Ein gesunder Huf hat eine gleichmäßige Temperatur. Ist ein Huf auffällig warm, lieber den Tierarzt fragen.",
  },
  {
    id: "tip-11",
    category: "hufpflege",
    categoryLabel: "Hufpflege",
    emoji: "🔍",
    text: "Nach dem Auskratzen den Strahl auf Fäulnis prüfen — ein fauliger Geruch ist ein Warnsignal.",
  },
  {
    id: "tip-12",
    category: "allgemein",
    categoryLabel: "Allgemein",
    emoji: "🥕",
    text: "Biotin und Zink im Futter unterstützen ein gesundes Hufwachstum. Frag deinen Tierarzt nach der richtigen Dosierung.",
  },
];

/**
 * Returns 3 tips based on the current calendar week.
 * Same tips for all users in the same week.
 */
export function getTipsForCurrentWeek(): HorseTip[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  
  const tips: HorseTip[] = [];
  const totalTips = HORSE_TIPS.length;
  
  for (let i = 0; i < 3; i++) {
    const index = (weekNumber * 3 + i) % totalTips;
    tips.push(HORSE_TIPS[index]);
  }
  
  return tips;
}
