// Reines Wetter-Modul (Open-Meteo). Der Briefing-Teil, der früher hier lag
// (BriefingPayload/buildBriefingPayload/shouldShowBriefing), ist entfernt --
// war ein Duplikat von hufi-briefing.ts mit kollidierendem State (gleicher
// Typname BriefingPayload, zwei unabhängige TTL-Systeme), siehe
// AGENT_ANALYSE.md Etappe 4. hufi-briefing.ts ist jetzt die einzige
// Briefing-Quelle (kalendertag-gebunden statt 4h-TTL).

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

