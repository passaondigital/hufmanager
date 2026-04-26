import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";

/* ── Types ───────────────────────────────────────────────── */
type CellValue = "full" | "partial" | "none";

interface Provider {
  key: string;
  name: string;
  category: string;
  origin: string;
  price: string;
  highlight?: boolean;
}

interface FeatureRow {
  name: string;
  values: Record<string, CellValue>;
}

interface FeatureGroup {
  label: string;
  color: string;
  rows: FeatureRow[];
}

/* ── Data ────────────────────────────────────────────────── */
const PROVIDERS: Provider[] = [
  { key: "huf", name: "Hufi Pferdeakte", category: "Pferdeakte + Tresor", origin: "DACH", price: "Akte: Kostenlos / Tresor: Premium", highlight: true },
  { key: "fei", name: "FEI Equipass", category: "Digitaler Pferdepass", origin: "International (FEI)", price: "Kostenlos (FEI-Pferde)" },
  { key: "happie", name: "Happie Horse", category: "Pferdebesitzer-App", origin: "Hamburg, DE", price: "Freemium (30–60€/Jahr)" },
  { key: "barncat", name: "Barncat", category: "Pferdebesitzer-App", origin: "USA", price: "Kostenlos + Premium" },
  { key: "hoofproof", name: "Hoofproof", category: "Farrier-Tool", origin: "UK", price: "Abo" },
  { key: "equinet", name: "EQUINET (Mustad)", category: "Farrier-Tool", origin: "Global", price: "Abo" },
  { key: "debevet", name: "debevet / vetpraxis.de", category: "Tierarzt-Software", origin: "Deutschland", price: "Ab ~60€/Monat" },
  { key: "covet", name: "CoVet AI", category: "AI Vet Scribe", origin: "Kanada", price: "Ab $49/Monat" },
];

const v = (huf: CellValue, fei: CellValue, happie: CellValue, barncat: CellValue, hoofproof: CellValue, equinet: CellValue, debevet: CellValue, covet: CellValue): Record<string, CellValue> => ({
  huf, fei, happie, barncat, hoofproof, equinet, debevet, covet,
});

const GROUPS: FeatureGroup[] = [
  {
    label: "BERUFSGATTUNGEN",
    color: "#F5970A",
    rows: [
      { name: "Hufakte / Hufbefund", values: v("full","none","none","partial","partial","none","none","none") },
      { name: "Tierarzt / Vet-Bereich", values: v("full","partial","partial","partial","none","none","full","full") },
      { name: "Osteopathie / Physiotherapie", values: v("full","none","none","none","none","none","none","none") },
      { name: "Pferdezahnarzt / Dentist", values: v("full","none","none","none","none","none","none","none") },
      { name: "Sattler / Sattelanpassung", values: v("full","none","none","none","none","none","none","none") },
      { name: "Reitlehrer / Trainer", values: v("full","none","partial","none","none","none","none","none") },
      { name: "Futterberater / Ernährung", values: v("full","none","partial","none","none","none","none","none") },
      { name: "Stallbetreiber / Haltung", values: v("full","none","partial","none","none","none","none","none") },
    ],
  },
  {
    label: "TRESOR & SICHERHEIT",
    color: "#0A0700",
    rows: [
      { name: "Tresor (Verträge, Urkunden, Pass)", values: v("full","none","none","none","none","none","none","none") },
      { name: "PostIdent-Verifizierung", values: v("full","none","none","none","none","none","none","none") },
      { name: "Notfall-Kontakt & Zugriff", values: v("full","none","none","none","none","none","none","none") },
      { name: "Besitzerwechsel-Funktion", values: v("full","none","none","none","none","none","none","none") },
    ],
  },
  {
    label: "PLATTFORM",
    color: "#3b82f6",
    rows: [
      { name: "Multi-Dienstleister-Zugriff", values: v("full","none","none","none","none","none","none","none") },
      { name: "AI-Befund / AI-Scribe", values: v("full","none","partial","none","none","none","none","full") },
      { name: "Offline-Modus", values: v("full","full","none","none","full","none","full","full") },
      { name: "DSGVO-konform", values: v("full","partial","full","none","none","none","full","none") },
      { name: "Equipass-kompatibel", values: v("full","full","none","none","none","none","none","none") },
      { name: "Foto-Vergleich über Zeit", values: v("full","none","none","full","partial","none","none","none") },
      { name: "QR-Code Notfall-Zugang", values: v("full","none","none","none","none","none","none","none") },
      { name: "Chronologische Timeline", values: v("full","none","full","full","none","none","partial","none") },
      { name: "Selektives Teilen / Freigabe", values: v("full","partial","partial","none","partial","none","partial","partial") },
    ],
  },
  {
    label: "PREIS",
    color: "#22c55e",
    rows: [
      { name: "Kostenlose Basis-Version", values: v("full","full","full","full","none","none","none","none") },
    ],
  },
];

const TOTAL_FEATURES = GROUPS.reduce((sum, g) => sum + g.rows.length, 0);

function calcScore(providerKey: string): number {
  let score = 0;
  GROUPS.forEach(g => g.rows.forEach(r => {
    const val = r.values[providerKey];
    if (val === "full") score += 1;
    else if (val === "partial") score += 0.5;
  }));
  return score;
}

/* ── Cell renderer ───────────────────────────────────────── */
function CellIcon({ value }: { value: CellValue }) {
  if (value === "full") return <span className="text-lg font-bold" style={{ color: "#22c55e" }}>✓</span>;
  if (value === "partial") return <span className="text-lg font-bold" style={{ color: "#F5970A" }}>○</span>;
  return <span className="text-lg" style={{ color: "#d1d5db" }}>—</span>;
}

/* ── Component ───────────────────────────────────────────── */
export default function PferdeakteComparisonTable() {
  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(new Set());

  const visibleProviders = useMemo(
    () => PROVIDERS.filter(p => p.highlight || !hiddenProviders.has(p.key)),
    [hiddenProviders]
  );

  const toggleProvider = (key: string) => {
    setHiddenProviders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    PROVIDERS.forEach(p => { map[p.key] = calcScore(p.key); });
    return map;
  }, []);

  return (
    <section className="py-16 md:py-24 px-4" style={{ backgroundColor: "#ffffff" }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#F5970A" }}>
            MARKTVERGLEICH 2026
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4" style={{ color: "#0A0700" }}>
            Die Hufi Pferdeakte{" "}
            <span style={{ color: "#F5970A" }}>vs. alle anderen.</span>
          </h2>
          <p className="text-base md:text-lg max-w-3xl mx-auto" style={{ color: "#6b7280" }}>
            Kein System weltweit vereint alle Berufsgattungen rund ums Pferd in einer Akte.
            Kein System bietet einen PostIdent-gesicherten Tresor für Eigentumsdokumente.{" "}
            <span className="font-semibold" style={{ color: "#0A0700" }}>Bis jetzt.</span>
          </p>
        </div>

        {/* ── Legend ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-sm" style={{ color: "#6b7280" }}>
          <span className="flex items-center gap-1.5">
            <span className="font-bold" style={{ color: "#22c55e" }}>✓</span> Vollständig
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-bold" style={{ color: "#F5970A" }}>○</span> Teilweise
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: "#d1d5db" }}>—</span> Nicht vorhanden
          </span>
        </div>

        {/* ── Toggle buttons ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {PROVIDERS.map(p => {
            const active = p.highlight || !hiddenProviders.has(p.key);
            return (
              <button
                key={p.key}
                disabled={p.highlight}
                onClick={() => !p.highlight && toggleProvider(p.key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                style={
                  p.highlight
                    ? { backgroundColor: "#F5970A", color: "#fff", borderColor: "#F5970A", cursor: "default" }
                    : active
                      ? { backgroundColor: "#0A0700", color: "#fff", borderColor: "#0A0700" }
                      : { backgroundColor: "#f3f4f6", color: "#9ca3af", borderColor: "#e5e7eb" }
                }
              >
                {p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name}
              </button>
            );
          })}
        </div>

        {/* ── Table ────────────────────────────────────────── */}
        <div className="relative overflow-x-auto rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full border-collapse text-sm" style={{ minWidth: `${160 + visibleProviders.length * 130}px` }}>

            {/* Provider header rows */}
            <thead>
              {/* Name row */}
              <tr>
                <th className="sticky left-0 z-20 px-4 py-3 text-left text-xs font-semibold" style={{ backgroundColor: "#0A0700", color: "rgba(255,255,255,0.5)", minWidth: 160, width: 160 }}>
                  Feature
                </th>
                {visibleProviders.map(p => (
                  <th
                    key={p.key}
                    className="px-3 py-3 text-center text-xs font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: p.highlight ? "#F5970A" : "#0A0700",
                      color: "#fff",
                      minWidth: 120,
                    }}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
              {/* Category row */}
              <tr>
                <td className="sticky left-0 z-20 px-4 py-1.5 text-[10px]" style={{ backgroundColor: "#1a1a1a", color: "rgba(255,255,255,0.4)" }}>
                  Kategorie
                </td>
                {visibleProviders.map(p => (
                  <td key={p.key} className="px-3 py-1.5 text-center text-[10px]" style={{ backgroundColor: p.highlight ? "#e08a09" : "#1a1a1a", color: "rgba(255,255,255,0.6)" }}>
                    {p.category}
                  </td>
                ))}
              </tr>
              {/* Origin row */}
              <tr>
                <td className="sticky left-0 z-20 px-4 py-1.5 text-[10px]" style={{ backgroundColor: "#1a1a1a", color: "rgba(255,255,255,0.4)" }}>
                  Herkunft
                </td>
                {visibleProviders.map(p => (
                  <td key={p.key} className="px-3 py-1.5 text-center text-[10px]" style={{ backgroundColor: p.highlight ? "#e08a09" : "#1a1a1a", color: "rgba(255,255,255,0.6)" }}>
                    {p.origin}
                  </td>
                ))}
              </tr>
              {/* Price row */}
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <td className="sticky left-0 z-20 px-4 py-1.5 text-[10px]" style={{ backgroundColor: "#1a1a1a", color: "rgba(255,255,255,0.4)" }}>
                  Preis
                </td>
                {visibleProviders.map(p => (
                  <td key={p.key} className="px-3 py-1.5 text-center text-[10px]" style={{ backgroundColor: p.highlight ? "#e08a09" : "#1a1a1a", color: "rgba(255,255,255,0.6)" }}>
                    {p.price}
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {GROUPS.map((group) => (
                <>
                  {/* Group header */}
                  <tr key={`group-${group.label}`}>
                    <td
                      colSpan={visibleProviders.length + 1}
                      className="px-4 py-2 text-xs font-bold tracking-wider uppercase"
                      style={{ backgroundColor: "#f9fafb", color: group.color, borderBottom: `2px solid ${group.color}` }}
                    >
                      {group.label}
                    </td>
                  </tr>
                  {/* Feature rows */}
                  {group.rows.map((row, ri) => (
                    <tr
                      key={row.name}
                      className="transition-colors duration-100"
                      style={{ backgroundColor: ri % 2 === 0 ? "#ffffff" : "#fafafa" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#f5f5f5"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ri % 2 === 0 ? "#ffffff" : "#fafafa"; }}
                    >
                      <td
                        className="sticky left-0 z-10 px-4 py-2.5 text-xs font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: "inherit",
                          color: "#374151",
                          minWidth: 160,
                          borderRight: "1px solid #e5e7eb",
                        }}
                      >
                        {row.name}
                      </td>
                      {visibleProviders.map(p => (
                        <td
                          key={p.key}
                          className="px-3 py-2.5 text-center"
                          style={p.highlight ? { backgroundColor: "rgba(245,151,10,0.06)" } : undefined}
                        >
                          <CellIcon value={row.values[p.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}

              {/* ── Score row ──────────────────────────────── */}
              <tr style={{ borderTop: "3px solid #0A0700" }}>
                <td className="sticky left-0 z-20 px-4 py-4 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: "#0A0700", color: "#fff", minWidth: 160 }}>
                  Gesamt-Score
                </td>
                {visibleProviders.map(p => {
                  const s = scores[p.key];
                  const pct = Math.round((s / TOTAL_FEATURES) * 100);
                  return (
                    <td
                      key={p.key}
                      className="px-3 py-4 text-center"
                      style={{
                        backgroundColor: p.highlight ? "#F5970A" : "#0A0700",
                        color: "#fff",
                      }}
                    >
                      <div className="text-2xl font-extrabold leading-none">{pct}%</div>
                      <div className="text-[10px] mt-1 opacity-70">{s}/{TOTAL_FEATURES}</div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── CTA Block ───────────────────────────────────── */}
        <div
          className="mt-16 rounded-2xl px-6 md:px-12 py-12 md:py-16 text-center"
          style={{
            background: "linear-gradient(135deg, #0A0700 0%, #1a1708 50%, #0A0700 100%)",
          }}
        >
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#F5970A" }}>
            DIE NR. 1 PFERDEAKTE
          </p>
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-1">
            Pferdeakte kostenlos. Tresor Premium.
          </h3>
          <p className="text-xl md:text-2xl font-bold mb-6" style={{ color: "#F5970A" }}>
            PostIdent-gesichert. DSGVO-konform.
          </p>
          <p className="text-sm md:text-base max-w-2xl mx-auto mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
            Die einzige Pferdeakte, die alle Berufsgattungen vereint – Hufpfleger, Tierarzt, Osteopath,
            Physiotherapeut, Zahnarzt, Sattler, Trainer & Besitzer. Mit dem einzigen PostIdent-gesicherten
            Dokumenten-Tresor für Kaufverträge, Versicherungen und Eigentumsurkunden.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: "#F5970A", color: "#fff" }}
            >
              Pferdeakte erstellen – Kostenlos
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold border-2 transition-all hover:bg-white/5"
              style={{ borderColor: "#F5970A", color: "#F5970A" }}
            >
              Tresor aktivieren
            </a>
          </div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            #ZukunftHuf2030 · Vom Stall für den Stall · PASSAON / Barhuf Service Schmid
          </p>
        </div>
      </div>
    </section>
  );
}
