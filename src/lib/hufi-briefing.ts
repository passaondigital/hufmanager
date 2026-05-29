import type { HufiContext } from "@/lib/hufi-brain";

export type BriefingTime = "morning" | "midday" | "evening";

export interface BriefingSection {
  type: "appointments" | "route" | "weather" | "invoices" | "horses" | "leads";
  title: string;
  content: string;
  spoken: string;
  action?: { label: string; route: string };
}

export interface BriefingPayload {
  time: BriefingTime;
  greeting: string;
  sections: BriefingSection[];
  totalItems: number;
}

export function getCurrentBriefingTime(): BriefingTime | null {
  const h = new Date().getHours();
  if (h >= 7 && h < 9) return "morning";
  if (h >= 12 && h < 13) return "midday";
  if (h >= 18 && h < 20) return "evening";
  return null;
}

export function getBriefingStorageKey(userId: string, time: BriefingTime, date: string): string {
  return `hufi_briefing_${time}_${date}__u${userId.slice(-8)}`;
}

export function hasBriefingShownToday(userId: string, time: BriefingTime): boolean {
  const date = new Date().toISOString().slice(0, 10);
  return localStorage.getItem(getBriefingStorageKey(userId, time, date)) === "1";
}

export function markBriefingShown(userId: string, time: BriefingTime): void {
  const date = new Date().toISOString().slice(0, 10);
  localStorage.setItem(getBriefingStorageKey(userId, time, date), "1");
}

export function buildDailyBriefing(
  ctx: HufiContext,
  time: BriefingTime,
  weather?: { todayCode: number; todayPrecipMm: number; tempMax: number } | null
): BriefingPayload {
  const name = ctx.user.name?.split(" ")[0] ?? "";
  const h = new Date().getHours();
  const salutation = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const greeting = name ? `${salutation}, ${name}.` : `${salutation}.`;

  const sections: BriefingSection[] = [];

  // Termine heute
  const apptCount = ctx.todayAppointments.length;
  if (apptCount > 0) {
    const first = ctx.todayAppointments[0];
    const firstStr = first.time ? ` Erster um ${first.time.slice(0, 5)} Uhr` : "";
    sections.push({
      type: "appointments",
      title: "Termine heute",
      content: `${apptCount} ${apptCount === 1 ? "Termin" : "Termine"} heute.${firstStr}`,
      spoken: `Du hast heute ${apptCount} ${apptCount === 1 ? "Termin" : "Termine"}.${firstStr}`,
      action: { label: "Kalender öffnen", route: "/kalender" },
    });
  } else if (time === "morning") {
    sections.push({
      type: "appointments",
      title: "Termine heute",
      content: "Heute keine Termine.",
      spoken: "Heute hast du keine Termine.",
    });
  }

  // Offene Rechnungen
  if (ctx.unpaidInvoices > 0) {
    sections.push({
      type: "invoices",
      title: "Offene Rechnungen",
      content: `${ctx.unpaidInvoices} offene ${ctx.unpaidInvoices === 1 ? "Rechnung" : "Rechnungen"}.`,
      spoken: `Du hast noch ${ctx.unpaidInvoices} offene ${ctx.unpaidInvoices === 1 ? "Rechnung" : "Rechnungen"}.`,
      action: { label: "Rechnungen", route: "/rechnungen" },
    });
  }

  // Neue Leads
  if (ctx.openLeads > 0) {
    sections.push({
      type: "leads",
      title: "Neue Anfragen",
      content: `${ctx.openLeads} neue ${ctx.openLeads === 1 ? "Anfrage" : "Anfragen"}.`,
      spoken: `Es gibt ${ctx.openLeads} neue ${ctx.openLeads === 1 ? "Anfrage" : "Anfragen"}.`,
      action: { label: "Anfragen ansehen", route: "/kunden" },
    });
  }

  // Wetter (nur morgens)
  if (time === "morning" && weather) {
    const isRainy = weather.todayPrecipMm >= 2;
    const isCold = weather.tempMax < 4;
    if (isRainy || isCold) {
      const warn = isRainy ? "Regen heute" : "Frost heute";
      sections.push({
        type: "weather",
        title: "Wetterhinweis",
        content: `${warn} — ${weather.tempMax}°C. Route anpassen?`,
        spoken: `Achtung: ${warn}. Maximal ${weather.tempMax} Grad.`,
      });
    }
  }

  return {
    time,
    greeting,
    sections,
    totalItems: sections.length,
  };
}
