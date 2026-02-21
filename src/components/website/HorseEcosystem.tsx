import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Stethoscope, Users, Hammer, Check, ChevronRight } from "lucide-react";

const personas = [
  {
    icon: Smartphone,
    label: "PferdebesitzerInnen",
    subtitle: "& StallbetreiberInnen",
    bullets: ["Pferde-Akte & Historie", "Terminbuchung & Erinnerungen", "Befunde einsehen", "Chat mit Profis", "Stallverwaltung"],
    gradient: "from-sky-400 to-blue-500",
    accentHsl: "199 89% 60%",
  },
  {
    icon: Hammer,
    label: "HufbearbeiterInnen",
    subtitle: "aller Art",
    bullets: ["Tourenplanung", "Dokumentation & Fotos", "Rechnungswesen", "Kundenverwaltung", "Offlinefähig"],
    gradient: "from-primary to-orange-500",
    accentHsl: "var(--primary)",
  },
  {
    icon: Stethoscope,
    label: "TherapeutInnen",
    subtitle: "& BehandlerInnen",
    bullets: ["Behandlungspläne", "Befund-Upload", "Fortschrittskontrolle", "Abrechnung", "Vernetzung"],
    gradient: "from-emerald-400 to-teal-500",
    accentHsl: "160 64% 55%",
  },
  {
    icon: Users,
    label: "MitarbeiterInnen",
    subtitle: "& Team",
    bullets: ["Aufgabenverwaltung", "Tourenausführung", "Zeiterfassung", "Dokumentation", "Check-in / Check-out"],
    gradient: "from-violet-400 to-purple-500",
    accentHsl: "263 70% 74%",
  },
];

/* ── SVG layout constants ── */
const CX = 400;
const CY = 300;
const R = 200;
const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // top, right, bottom, left
const nodeCoords = angles.map((a) => ({
  x: CX + R * Math.cos(a),
  y: CY + R * Math.sin(a),
}));

/* All unique pairs for mesh lines */
const pairs: [number, number][] = [];
for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pairs.push([i, j]);

const HorseEcosystem = () => {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="relative py-24 md:py-36 overflow-hidden bg-black">
      {/* Ambient bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/[0.06] rounded-full blur-[200px]" />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-widest mb-3">
            Das Ökosystem
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Alle Profis –{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">
              ein Netzwerk
            </span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Jede Rolle verbunden mit jeder. Rund um das Pferd – digital, sicher und in Echtzeit.
          </p>
        </motion.div>

        {/* ── Network Diagram (desktop) ── */}
        <div className="hidden md:block relative mx-auto" style={{ maxWidth: 800 }}>
          <svg viewBox="0 0 800 600" className="w-full h-auto">
            <defs>
              {/* Glow filter */}
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* ── Mesh connection lines ── */}
            {pairs.map(([a, b], idx) => {
              const isHighlighted = active === null || active === a || active === b;
              return (
                <motion.line
                  key={`line-${a}-${b}`}
                  x1={nodeCoords[a].x}
                  y1={nodeCoords[a].y}
                  x2={nodeCoords[b].x}
                  y2={nodeCoords[b].y}
                  stroke="white"
                  strokeWidth={isHighlighted ? 1.5 : 0.5}
                  strokeOpacity={isHighlighted ? 0.15 : 0.04}
                  strokeDasharray={active !== null && !isHighlighted ? "4 8" : "none"}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                />
              );
            })}

            {/* ── Animated data particles on lines ── */}
            {pairs.map(([a, b], idx) => {
              const isHighlighted = active === null || active === a || active === b;
              if (!isHighlighted) return null;
              return (
                <circle key={`dot-${a}-${b}`} r="2" fill="white" opacity="0.5">
                  <animateMotion
                    dur={`${5 + idx * 0.8}s`}
                    repeatCount="indefinite"
                    path={`M${nodeCoords[a].x},${nodeCoords[a].y} L${nodeCoords[b].x},${nodeCoords[b].y}`}
                  />
                </circle>
              );
            })}

            {/* ── Lines from nodes to center ── */}
            {nodeCoords.map((c, i) => (
              <motion.line
                key={`radial-${i}`}
                x1={CX} y1={CY} x2={c.x} y2={c.y}
                stroke="white"
                strokeWidth="0.8"
                strokeOpacity={active === null || active === i ? 0.1 : 0.03}
                strokeDasharray="3 6"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
              />
            ))}

            {/* ── Center hub ── */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
            >
              {/* Outer pulse */}
              <motion.circle
                cx={CX} cy={CY} r="52"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity="0.2"
                animate={{ r: [52, 60, 52], opacity: [0.2, 0.05, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Background circle */}
              <circle cx={CX} cy={CY} r="46" fill="rgba(0,0,0,0.7)" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" />
              {/* Inner ring */}
              <circle cx={CX} cy={CY} r="36" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeOpacity="0.2" />
              {/* Text */}
              <text x={CX} y={CY - 6} textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">
                🐴
              </text>
              <text x={CX} y={CY + 18} textAnchor="middle" fill="hsl(var(--primary))" fontSize="7" fontWeight="700" letterSpacing="2">
                PFERDEWOHL
              </text>
            </motion.g>

            {/* ── Outer nodes ── */}
            {personas.map((p, i) => {
              const coord = nodeCoords[i];
              const isActive = active === i;
              const isDimmed = active !== null && active !== i;
              return (
                <motion.g
                  key={p.label}
                  className="cursor-pointer"
                  onClick={() => setActive(isActive ? null : i)}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1, type: "spring" }}
                  style={{ opacity: isDimmed ? 0.3 : 1 }}
                >
                  {/* Glow behind node */}
                  {isActive && (
                    <motion.circle
                      cx={coord.x} cy={coord.y} r="40"
                      fill={`hsl(${p.accentHsl})`}
                      opacity="0.12"
                      filter="url(#softGlow)"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    />
                  )}
                  {/* Node background */}
                  <circle
                    cx={coord.x} cy={coord.y} r="30"
                    fill="rgba(15,15,15,0.9)"
                    stroke={isActive ? `hsl(${p.accentHsl})` : "rgba(255,255,255,0.12)"}
                    strokeWidth={isActive ? 2 : 1}
                  />
                  {/* Icon placeholder — render via foreignObject */}
                  <foreignObject
                    x={coord.x - 12} y={coord.y - 12}
                    width="24" height="24"
                  >
                    <NodeIcon icon={p.icon} />
                  </foreignObject>
                  {/* Label */}
                  <text
                    x={coord.x}
                    y={coord.y + 46}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="700"
                    opacity={isDimmed ? 0.4 : 0.9}
                  >
                    {p.label}
                  </text>
                  <text
                    x={coord.x}
                    y={coord.y + 60}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    opacity={isDimmed ? 0.2 : 0.4}
                  >
                    {p.subtitle}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* ── Detail Panel (expands below diagram) ── */}
        <AnimatePresence>
          {active !== null && (
            <motion.div
              className="hidden md:block max-w-2xl mx-auto mt-8"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DetailCard persona={personas[active]} onClose={() => setActive(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile: stacked cards ── */}
        <div className="md:hidden space-y-3">
          {personas.map((persona, i) => (
            <MobileCard
              key={persona.label}
              persona={persona}
              index={i}
              isActive={active === i}
              onToggle={() => setActive(active === i ? null : i)}
            />
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          className="text-center text-sm text-white/25 mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          Jede Rolle verbunden mit jeder – für lückenlose Kommunikation rund ums Pferd.
        </motion.p>
      </div>
    </section>
  );
};

/* ── NodeIcon (renders lucide icon inside foreignObject) ── */
const NodeIcon = ({ icon: Icon }: { icon: typeof Smartphone }) => (
  <div className="w-6 h-6 flex items-center justify-center">
    <Icon className="w-5 h-5 text-white/80" />
  </div>
);

/* ── Detail Card ── */
const DetailCard = ({
  persona,
  onClose,
}: {
  persona: typeof personas[0];
  onClose: () => void;
}) => {
  const Icon = persona.icon;
  return (
    <div
      className="relative rounded-2xl border border-white/10 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Accent top line */}
      <div className={`h-px w-full bg-gradient-to-r ${persona.gradient}`} />

      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${persona.gradient} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{persona.label}</h3>
              <p className="text-sm text-white/40">{persona.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors text-sm"
          >
            Schließen
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {persona.bullets.map((b, bi) => (
            <motion.div
              key={b}
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: bi * 0.04 }}
            >
              <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${persona.gradient} flex items-center justify-center flex-shrink-0`}>
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-white/65">{b}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Mobile Card ── */
const MobileCard = ({
  persona,
  index,
  isActive,
  onToggle,
}: {
  persona: typeof personas[0];
  index: number;
  isActive: boolean;
  onToggle: () => void;
}) => {
  const Icon = persona.icon;

  return (
    <motion.div
      className="rounded-xl border border-white/[0.08] overflow-hidden cursor-pointer"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      onClick={onToggle}
    >
      <div className={`h-px w-full bg-gradient-to-r ${persona.gradient}`} />
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${persona.gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-white text-sm">{persona.label}</span>
          <span className="text-xs text-white/35 ml-2">{persona.subtitle}</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${isActive ? "rotate-90" : ""}`} />
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/[0.05]">
              <ul className="space-y-2">
                {persona.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-white/55">
                    <div className={`w-4 h-4 rounded bg-gradient-to-br ${persona.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HorseEcosystem;
