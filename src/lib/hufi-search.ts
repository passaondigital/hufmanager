import { supabase } from "@/integrations/supabase/client";
import { chatWithHufAI } from "./ai-routing";
import { updateHufiMemory } from "./hufi-brain";
import type { BefundResult } from "./autoflow-service";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HufiSearchResult {
  type: "internal" | "web" | "shop" | "hersteller";
  name: string;
  description: string;
  location?: string;
  distance?: number;
  rating?: number;
  contact?: string;
  url?: string;
  relevanceScore: number;
}

export interface SearchSuggestion {
  query: string;
  searchType: "dienstleister" | "fachgeschäft" | "onlineshop" | "hersteller" | "auto";
  description: string;
  urgent: boolean;
}

// ── Haversine distance (km) ───────────────────────────────────────────────────

function km(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Location permission ───────────────────────────────────────────────────────

export async function requestLocationPermission(
  userId: string,
  persist = false,
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (persist) {
          await updateHufiMemory(userId, "permission", "location_consent", {
            granted: true,
            lat: loc.lat,
            lng: loc.lng,
            timestamp: new Date().toISOString(),
          }, "manual");
        }
        resolve(loc);
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 300_000 },
    );
  });
}

// ── Stage 1: Internal Hufi community ─────────────────────────────────────────

async function searchInternal(
  query: string,
  location?: { lat: number; lng: number },
): Promise<HufiSearchResult[]> {
  const lower = query.toLowerCase();

  const { data } = await supabase
    .from("profiles")
    .select("full_name, business_name, bio, geo_lat, geo_lng, city, phone, email, reliability_score")
    .eq("is_discoverable", true)
    .not("geo_lat", "is", null)
    .limit(30);

  if (!data || data.length === 0) return [];

  type Row = typeof data[number];
  return (data as Row[])
    .map((p) => {
      const text = [p.full_name, p.business_name, p.bio, p.city]
        .filter(Boolean).join(" ").toLowerCase();
      let score = 0.3;
      for (const word of lower.split(" ")) if (text.includes(word)) score += 0.2;

      const dist =
        location && p.geo_lat && p.geo_lng
          ? Math.round(km(location.lat, location.lng, p.geo_lat, p.geo_lng) * 10) / 10
          : undefined;

      return {
        type: "internal" as const,
        name: (p.business_name ?? p.full_name ?? "Hufpfleger"),
        description: (p.bio?.slice(0, 90) ?? "Hufpflege-Profi · Hufi-Community"),
        location: p.city ?? undefined,
        distance: dist,
        rating: p.reliability_score ?? undefined,
        contact: p.phone ?? p.email ?? undefined,
        relevanceScore: dist !== undefined ? score + Math.max(0, 0.3 - dist / 100) : score,
        _dist: dist,
      };
    })
    .filter((r) => r.relevanceScore > 0.25 && (r._dist === undefined || r._dist < 80))
    .sort((a, b) => {
      if (a._dist !== undefined && b._dist !== undefined) return a._dist - b._dist;
      return b.relevanceScore - a.relevanceScore;
    })
    .slice(0, 4)
    .map(({ _dist: _d, ...r }) => r);
}

// ── Stage 1.5: hufi_dienstleister directory ───────────────────────────────────

async function searchDirectory(
  query: string,
  location?: { lat: number; lng: number },
): Promise<HufiSearchResult[]> {
  try {
    const db = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    const { data } = (await db("hufi_dienstleister")
      .select("name, category, specializations, city, phone, email, website, geo_lat, geo_lng, rating")
      .limit(20)) as { data: Array<{
        name: string; category: string; specializations: string[];
        city: string | null; phone: string | null; email: string | null;
        website: string | null; geo_lat: number | null; geo_lng: number | null;
        rating: number | null;
      }> | null };

    if (!data) return [];
    const lower = query.toLowerCase();

    return data
      .filter((d) => {
        const t = [d.name, d.category, ...(d.specializations ?? [])].join(" ").toLowerCase();
        return lower.split(" ").some((w) => t.includes(w));
      })
      .map((d) => ({
        type: "internal" as const,
        name: d.name,
        description: `${d.category}${d.city ? ` · ${d.city}` : ""}`,
        location: d.city ?? undefined,
        distance:
          location && d.geo_lat && d.geo_lng
            ? Math.round(km(location.lat, location.lng, d.geo_lat, d.geo_lng) * 10) / 10
            : undefined,
        contact: d.phone ?? d.email ?? d.website ?? undefined,
        url: d.website ?? undefined,
        rating: d.rating ?? undefined,
        relevanceScore: 0.75,
      }));
  } catch {
    return [];
  }
}

// ── Stage 2: AI-generated suggestions ────────────────────────────────────────

async function searchWithAI(
  query: string,
  searchType: string,
  userId: string,
  location?: { lat: number; lng: number },
): Promise<HufiSearchResult[]> {
  try {
    const locHint = location
      ? `Nutzer-Standort: ca. ${location.lat.toFixed(2)}° N, ${location.lng.toFixed(2)}° E.`
      : "";

    const prompt = `Du bist Suchassistent für Pferde-/Hufpflege. Gib 3 konkrete Empfehlungen für: "${query}" (Typ: ${searchType}). ${locHint}
Antworte NUR mit JSON-Array:
[{"name":"...","description":"(max 80 Zeichen)","location":"Stadt oder Online","contact":"URL oder Tel","type":"${searchType === "onlineshop" || searchType === "hersteller" ? "shop" : "web"}"}]`;

    const raw = await chatWithHufAI([{ role: "user", content: prompt }], userId, "hufiai-fast");
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    return (JSON.parse(match[0]) as Array<{
      name: string; description: string; location?: string; contact?: string; type?: string;
    }>).map((item, i) => ({
      type: (item.type === "shop" ? "shop" : "web") as HufiSearchResult["type"],
      name: item.name,
      description: item.description,
      location: item.location,
      contact: item.contact,
      relevanceScore: 0.45 - i * 0.05,
    }));
  } catch {
    return [];
  }
}

// ── Stage 3: Predefined shop matches ─────────────────────────────────────────

const SHOP_CATALOG: Array<{ keywords: string[]; results: HufiSearchResult[] }> = [
  {
    keywords: ["kupfersulfat", "strahlfäule", "pododermatitis", "cunei"],
    results: [
      { type: "shop", name: "Kupfersulfat-Lösung 5% · 500 ml", description: "Bewährtes Mittel gegen Strahlfäule", contact: "amazon.de", url: "https://www.amazon.de/s?k=kupfersulfat+pferd", relevanceScore: 0.92 },
      { type: "shop", name: "HufVital Strahlfäule-Spray", description: "Fertiglösung, einfache Anwendung, 250 ml", contact: "horse24.de", url: "https://www.horse24.de", relevanceScore: 0.88 },
    ],
  },
  {
    keywords: ["rehe", "hufrehe", "laminitis", "rotationsrehe"],
    results: [
      { type: "hersteller", name: "EponaShoe Rehe-Schutzhufeisen", description: "Orthopädische Hufeisen für Rehe-Pferde", contact: "eponashoe.com", url: "https://www.eponashoe.com", relevanceScore: 0.9 },
      { type: "shop", name: "Rehe-Rehband Vollpolster", description: "Weichpolster zur Druckentlastung", contact: "equiva.com", relevanceScore: 0.82 },
    ],
  },
  {
    keywords: ["hufoel", "hufpflegeöl", "balsam", "hufpflege"],
    results: [
      { type: "shop", name: "Effol Huf-Balsam 500 ml", description: "Nährende Hufpflege für trockene Hufe", contact: "equiva.com", relevanceScore: 0.78 },
    ],
  },
  {
    keywords: ["abszess", "hufabszess"],
    results: [
      { type: "shop", name: "Huf-Desinfektion Spray", description: "Schnelle Desinfektion nach Abszess", contact: "pferdegrosshandel.de", relevanceScore: 0.8 },
    ],
  },
];

function searchProducts(query: string): HufiSearchResult[] {
  const lower = query.toLowerCase();
  for (const entry of SHOP_CATALOG) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.results;
  }
  return [];
}

// ── Search log ────────────────────────────────────────────────────────────────

async function logSearch(
  userId: string,
  query: string,
  searchType: string,
  resultsCount: number,
  locationUsed: boolean,
): Promise<void> {
  try {
    const db = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);
    await db("hufi_search_log").insert({
      user_id: userId,
      query,
      search_type: searchType,
      results_count: resultsCount,
      location_used: locationUsed,
      location_consented: locationUsed,
    });
  } catch {
    // Non-critical
  }
}

// ── Main search ───────────────────────────────────────────────────────────────

export async function hufiSearch(
  query: string,
  userId: string,
  searchType: "dienstleister" | "fachgeschäft" | "onlineshop" | "hersteller" | "auto",
  location?: { lat: number; lng: number },
): Promise<HufiSearchResult[]> {
  const results: HufiSearchResult[] = [];

  // Stage 1+1.5: internal community + directory
  if (searchType !== "onlineshop" && searchType !== "hersteller") {
    const [internal, directory] = await Promise.all([
      searchInternal(query, location),
      searchDirectory(query, location),
    ]);
    results.push(...internal, ...directory);
  }

  // Stage 3: products (fast, no AI)
  if (searchType === "onlineshop" || searchType === "hersteller" || searchType === "auto") {
    results.push(...searchProducts(query));
  }

  // Stage 2: AI fallback if < 2 results
  if (results.length < 2) {
    const ai = await searchWithAI(query, searchType, userId, location);
    results.push(...ai);
  }

  const dedupedNames = new Set<string>();
  const final: HufiSearchResult[] = [];
  for (const r of results.sort((a, b) => b.relevanceScore - a.relevanceScore)) {
    if (!dedupedNames.has(r.name)) { dedupedNames.add(r.name); final.push(r); }
    if (final.length >= 6) break;
  }

  await logSearch(userId, query, searchType, final.length, !!location);
  return final;
}

// ── Befund → search suggestion mapping ───────────────────────────────────────

const BEFUND_SEARCH_MAP: Array<{
  keywords: string[];
  suggestions: SearchSuggestion[];
}> = [
  {
    keywords: ["strahlfäule", "pododermatitis", "fäule"],
    suggestions: [
      { query: "Kupfersulfat Strahlfäule Huf", searchType: "onlineshop", description: "Kupfersulfat-Lösung im Shop", urgent: false },
      { query: "Hufpfleger Strahlfäule spezialisiert", searchType: "dienstleister", description: "Spezialist für Strahlfäule", urgent: false },
    ],
  },
  {
    keywords: ["rehe", "hufrehe", "laminitis", "rotationsrehe"],
    suggestions: [
      { query: "Tierarzt Pferd Notfall Rehe Hufrehe", searchType: "dienstleister", description: "Tierarzt in der Nähe (Notfall)", urgent: true },
      { query: "Huforthopäde Rehe Erfahrung", searchType: "dienstleister", description: "Huforthopäde mit Rehe-Spezialisierung", urgent: true },
      { query: "Rehe Schutzhufeisen orthopädisch", searchType: "hersteller", description: "Orthopädische Rehe-Versorgung", urgent: false },
    ],
  },
  {
    keywords: ["spat", "spavin", "sprunggelenk arthrose"],
    suggestions: [
      { query: "Tierarzt Pferd Sprunggelenk Spat Diagnose", searchType: "dienstleister", description: "Tierarzt für Spat-Diagnose", urgent: false },
      { query: "Hufpfleger Ganganomalien Erfahrung", searchType: "dienstleister", description: "Spezialist für Ganganomalien", urgent: false },
    ],
  },
  {
    keywords: ["bockhuf", "hufkorrektur", "stellungskorrektur"],
    suggestions: [
      { query: "Hufpfleger Bockhufkorrektur Spezial", searchType: "dienstleister", description: "Spezialist für Bockhufkorrektur", urgent: false },
    ],
  },
  {
    keywords: ["abszess", "hufabszess"],
    suggestions: [
      { query: "Tierarzt Pferd Hufabszess Notfall", searchType: "dienstleister", description: "Tierarzt für Hufabszess", urgent: true },
      { query: "Huf Desinfektion Abszess Produkt", searchType: "onlineshop", description: "Desinfektionsmittel kaufen", urgent: false },
    ],
  },
];

export function getBefundSearchSuggestions(befund: BefundResult): SearchSuggestion[] {
  const text = [befund.befund_text ?? "", befund.massnahme ?? "", ...(befund.fachbegriffe ?? [])]
    .join(" ").toLowerCase();

  const seen = new Set<string>();
  const out: SearchSuggestion[] = [];
  for (const { keywords, suggestions } of BEFUND_SEARCH_MAP) {
    if (keywords.some((k) => text.includes(k))) {
      for (const s of suggestions) {
        if (!seen.has(s.query)) { seen.add(s.query); out.push(s); }
      }
    }
  }
  return out.slice(0, 4);
}

export function buildSearchSuggestionText(
  befund: BefundResult,
  suggestions: SearchSuggestion[],
): string {
  const horse = befund.pferd_name ?? "Dein Pferd";
  const hasEmergency = suggestions.some((s) => s.urgent);
  const lines = suggestions.map((s, i) => `${i + 1}️⃣ ${s.description}`).join("\n");

  if (hasEmergency) {
    const diagnosis = befund.fachbegriffe?.[0] ?? befund.befund_text?.slice(0, 40) ?? "Befund";
    return `⚠️ ${horse} — ${diagnosis} erfordert besondere Aufmerksamkeit.\nIch suche sofort:\n\n${lines}\n\n📍 Standort-Freigabe erlaubt mir Anbieter in deiner Nähe zu finden.\n\nDarf ich suchen?`;
  }
  return `🔍 Basierend auf dem Befund für ${horse}:\n\n${lines}\n\nSoll ich suchen?`;
}
