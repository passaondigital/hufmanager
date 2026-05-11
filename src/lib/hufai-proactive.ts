import type { HufiContext } from "./hufi-brain";

// ── TTL Gate ─────────────────────────────────────────────────────────────────
// Briefing shows at most once every 4 hours per device.

const BRIEFING_TTL_MS = 4 * 60 * 60 * 1000;
const BRIEFING_LS_KEY = "hufi_briefing_last_shown";

export function shouldShowBriefing(): boolean {
  const last = localStorage.getItem(BRIEFING_LS_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > BRIEFING_TTL_MS;
}

export function markBriefingShown(): void {
  localStorage.setItem(BRIEFING_LS_KEY, String(Date.now()));
}

// ── Weather (Open-Meteo, free, no API key) ────────────────────────────────────

export interface WeatherContext {
  todayCode: number;
  todayPrecipMm: number;
  tomorrowCode: number;
  tomorrowPrecipMm: number;
  tempMax: number;
}

function getStoredCoords(): { lat: number; lon: number } {
  const lat = parseFloat(localStorage.getItem("hufi_user_lat") ?? "");
  const lon = parseFloat(localStorage.getItem("hufi_user_lon") ?? "");
  if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  return { lat: 51.16, lon: 10.45 }; // Deutschland-Mitte
}

export async function fetchWeatherContext(): Promise<WeatherContext | null> {
  try {
    const { lat, lon } = getStoredCoords();
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("daily", "weathercode,precipitation_sum,temperature_2m_max");
    url.searchParams.set("timezone", "Europe/Berlin");
    url.searchParams.set("forecast_days", "2");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.daily;
    return {
      todayCode:       d.weathercode[0]       ?? 0,
      todayPrecipMm:   d.precipitation_sum[0] ?? 0,
      tomorrowCode:    d.weathercode[1]       ?? 0,
      tomorrowPrecipMm: d.precipitation_sum[1] ?? 0,
      tempMax:         d.temperature_2m_max[0] ?? 15,
    };
  } catch {
    return null;
  }
}

// WMO weather interpretation codes → short German label
function weatherLabel(code: number): string {
  if (code === 0)          return "klar";
  if (code <= 3)           return "teils bewölkt";
  if (code <= 48)          return "neblig";
  if (code <= 57)          return "Nieselregen";
  if (code <= 67)          return "Regen";
  if (code <= 77)          return "Schnee";
  if (code <= 82)          return "Schauer";
  if (code <= 86)          return "Schneeschauer";
  return "Gewitter";
}

function isWet(code: number, precipMm: number): boolean {
  return precipMm > 0.5 || (code >= 51 && code <= 99);
}

// ── Briefing ──────────────────────────────────────────────────────────────────

export interface BriefingAction {
  label: string;
  route: string;
}

export interface BriefingPayload {
  text: string;      // Full spoken text (all lines joined)
  lines: string[];   // Individual display lines
  actions: BriefingAction[];
}

export function buildBriefingPayload(
  ctx: HufiContext,
  weather: WeatherContext | null,
): BriefingPayload {
  const h = new Date().getHours();
  const greet = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const name = ctx.user.name?.split(" ")[0] ?? null;

  const lines: string[] = [];
  const actions: BriefingAction[] = [];

  // 1. Greeting + today's appointment count
  const n = ctx.todayAppointments.length;
  const apptText =
    n === 0 ? "Heute keine Termine geplant." :
    n === 1 ? "Heute 1 Termin." :
              `Heute ${n} Termine.`;
  lines.push(`${greet}${name ? ` ${name}` : ""}. ${apptText}`);
  if (n > 0) actions.push({ label: "Termine", route: "/kalender" });

  // 2. First overdue horse
  const overdue = ctx.overdueHorses[0];
  if (overdue) {
    lines.push(
      `Bei ${overdue.name} ist der letzte Huftermin ${overdue.weeks_overdue} Wochen her.`,
    );
    actions.push({ label: "Pferde planen", route: "/pferde" });
  }

  // 3. Weather alert for tomorrow
  if (weather && isWet(weather.tomorrowCode, weather.tomorrowPrecipMm)) {
    lines.push(
      `Morgen ${weatherLabel(weather.tomorrowCode)} — plane mehr Zeit für Offenstall-Kunden ein.`,
    );
  }

  // 4. Open invoices (only if notable)
  if (ctx.unpaidInvoices > 2) {
    lines.push(`${ctx.unpaidInvoices} offene Rechnungen warten.`);
    actions.push({ label: "Rechnungen", route: "/rechnungen" });
  }

  // 5. Leads (providers only)
  if (ctx.openLeads > 0 && ctx.user.role !== "client") {
    const label = ctx.openLeads === 1 ? "1 neue Anfrage." : `${ctx.openLeads} neue Anfragen.`;
    lines.push(label);
    actions.push({ label: "Anfragen", route: "/anfragen" });
  }

  // Deduplicate + cap actions at 4
  const seen = new Set<string>();
  const uniqueActions = actions.filter((a) => {
    if (seen.has(a.route)) return false;
    seen.add(a.route);
    return true;
  }).slice(0, 4);

  return {
    text: lines.join(" "),
    lines,
    actions: uniqueActions,
  };
}
