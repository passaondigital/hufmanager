import { motion } from "framer-motion";
import { Smartphone, Stethoscope, Users, Hammer } from "lucide-react";

const personas = [
  {
    icon: Smartphone,
    label: "PferdebesitzerInnen",
    subtitle: "& StallbetreiberInnen",
    bullets: ["Pferde-Akte & Historie", "Terminbuchung & Erinnerungen", "Befunde einsehen", "Chat mit Profis", "Stallverwaltung"],
    color: "from-sky-400 to-blue-500",
    glow: "sky-400",
  },
  {
    icon: Hammer,
    label: "HufbearbeiterInnen",
    subtitle: "aller Art",
    bullets: ["Tourenplanung", "Dokumentation & Fotos", "Rechnungswesen", "Kundenverwaltung", "Offlinefähig"],
    color: "from-primary to-orange-500",
    glow: "primary",
  },
  {
    icon: Stethoscope,
    label: "TherapeutInnen",
    subtitle: "& BehandlerInnen",
    bullets: ["Behandlungspläne", "Befund-Upload", "Fortschrittskontrolle", "Abrechnung", "Vernetzung"],
    color: "from-emerald-400 to-teal-500",
    glow: "emerald-400",
  },
  {
    icon: Users,
    label: "MitarbeiterInnen",
    subtitle: "& Team",
    bullets: ["Aufgabenverwaltung", "Tourenausführung", "Zeiterfassung", "Dokumentation", "Check-in / Check-out"],
    color: "from-violet-400 to-purple-500",
    glow: "violet-400",
  },
];

// Positions for 4 nodes: top, right, bottom, left (clock positions)
const NODE_POSITIONS = [
  { x: 0, y: -1 },   // top
  { x: 1, y: 0 },    // right
  { x: 0, y: 1 },    // bottom
  { x: -1, y: 0 },   // left
];

const RADIUS_DESKTOP = 220;
const RADIUS_MOBILE = 120;
const CENTER = 300;

// Generate all pairs for mesh connections
const connectionPairs: [number, number][] = [];
for (let i = 0; i < personas.length; i++) {
  for (let j = i + 1; j < personas.length; j++) {
    connectionPairs.push([i, j]);
  }
}

const HorseEcosystem = () => {
  return (
    <section className="relative py-24 md:py-36 overflow-hidden bg-black">
      {/* Layered background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[200px]" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-widest mb-3">
            Das Ökosystem
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Alle Profis – <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">ein Netzwerk</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Jeder verbunden mit jedem. Rund um das Pferd – digital, sicher und in Echtzeit.
          </p>
        </motion.div>

        {/* Interactive Circle Diagram */}
        <div className="relative mx-auto w-[300px] h-[300px] md:w-[600px] md:h-[600px]">
          {/* Outer decorative rings */}
          <motion.div
            className="absolute inset-0 rounded-full border border-white/[0.06]"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-6 md:inset-12 rounded-full border border-white/[0.04]"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.1 }}
          />
          <motion.div
            className="absolute inset-12 md:inset-24 rounded-full border border-white/[0.03]"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.15 }}
          />

          {/* Slow rotating accent ring */}
          <motion.div
            className="absolute inset-2 md:inset-4 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.15), transparent, transparent)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Connection mesh (SVG) — all-to-all */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 600 600">
            <defs>
              <linearGradient id="meshGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="meshGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="meshGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="meshGrad3" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="meshGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="meshGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.15" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connection lines with animated flow */}
            {connectionPairs.map(([a, b], idx) => {
              const ax = CENTER + RADIUS_DESKTOP * NODE_POSITIONS[a].x;
              const ay = CENTER + RADIUS_DESKTOP * NODE_POSITIONS[a].y;
              const bx = CENTER + RADIUS_DESKTOP * NODE_POSITIONS[b].x;
              const by = CENTER + RADIUS_DESKTOP * NODE_POSITIONS[b].y;
              return (
                <g key={`conn-${a}-${b}`}>
                  {/* Glow line */}
                  <motion.line
                    x1={ax} y1={ay} x2={bx} y2={by}
                    stroke={`url(#meshGrad${idx})`}
                    strokeWidth="2"
                    filter="url(#glow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.6 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 + idx * 0.12 }}
                  />
                  {/* Animated dot traveling along line */}
                  <motion.circle
                    r="3"
                    fill="white"
                    opacity="0.7"
                    filter="url(#glow)"
                  >
                    <animateMotion
                      dur={`${4 + idx}s`}
                      repeatCount="indefinite"
                      path={`M${ax},${ay} L${bx},${by}`}
                    />
                  </motion.circle>
                </g>
              );
            })}

            {/* Lines to center */}
            {NODE_POSITIONS.map((pos, i) => {
              const nx = CENTER + RADIUS_DESKTOP * pos.x;
              const ny = CENTER + RADIUS_DESKTOP * pos.y;
              return (
                <motion.line
                  key={`center-${i}`}
                  x1={CENTER} y1={CENTER} x2={nx} y2={ny}
                  stroke="white"
                  strokeWidth="1"
                  strokeOpacity="0.08"
                  strokeDasharray="4 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                />
              );
            })}
          </svg>

          {/* Center horse element */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-32 md:h-32 rounded-full z-30 flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.05) 70%, transparent 100%)",
              boxShadow: "0 0 60px hsl(var(--primary) / 0.2), inset 0 0 30px hsl(var(--primary) / 0.1)",
            }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
          >
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border border-primary/30 flex items-center justify-center backdrop-blur-sm bg-black/40">
              <div className="text-center">
                <span className="text-3xl md:text-5xl block leading-none">🐴</span>
                <span className="text-[8px] md:text-[10px] font-bold text-primary/80 mt-0.5 block tracking-wider">PFERDEWOHL</span>
              </div>
            </div>
          </motion.div>

          {/* Persona nodes */}
          {personas.map((persona, i) => (
            <PersonaNode key={persona.label} persona={persona} index={i} position={NODE_POSITIONS[i]} />
          ))}
        </div>

        {/* Info cards below */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {personas.map((persona, i) => {
            const Icon = persona.icon;
            return (
              <motion.div
                key={persona.label}
                className="group relative rounded-2xl border border-white/[0.08] p-5 backdrop-blur-sm overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)" }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ borderColor: "rgba(255,255,255,0.15)", y: -2 }}
              >
                {/* Subtle gradient hover glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${persona.color} opacity-0 group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-500`} />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block leading-tight">{persona.label}</span>
                      <span className="text-[11px] text-white/40">{persona.subtitle}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {persona.bullets.map((b) => (
                      <li key={b} className="text-xs text-white/50 flex items-center gap-2">
                        <span className={`w-1 h-1 rounded-full bg-gradient-to-r ${persona.color} shrink-0`} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Connection tagline */}
        <motion.p
          className="text-center text-sm text-white/30 mt-8"
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

/* Individual persona node */
const PersonaNode = ({
  persona,
  index,
  position,
}: {
  persona: typeof personas[0];
  index: number;
  position: { x: number; y: number };
}) => {
  const Icon = persona.icon;

  return (
    <>
      {/* Desktop */}
      <motion.div
        className="absolute z-20 hidden md:flex flex-col items-center"
        style={{
          left: `calc(50% + ${RADIUS_DESKTOP * position.x}px)`,
          top: `calc(50% + ${RADIUS_DESKTOP * position.y}px)`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 + index * 0.12, type: "spring" }}
      >
        <motion.div
          className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-2xl border border-white/20 cursor-default`}
          whileHover={{ scale: 1.12, rotate: 3 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="h-7 w-7 text-white" />
          {/* Pulse ring */}
          <motion.div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${persona.color} opacity-40`}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
          />
        </motion.div>
        <span className="mt-2.5 text-xs font-bold text-white/90 whitespace-nowrap tracking-wide">{persona.label}</span>
        <span className="text-[10px] text-white/40">{persona.subtitle}</span>
      </motion.div>

      {/* Mobile */}
      <motion.div
        className="absolute z-20 flex md:hidden flex-col items-center"
        style={{
          left: `calc(50% + ${RADIUS_MOBILE * position.x}px)`,
          top: `calc(50% + ${RADIUS_MOBILE * position.y}px)`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 + index * 0.12, type: "spring" }}
      >
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-lg border border-white/20`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="mt-1 text-[8px] font-bold text-white/80 whitespace-nowrap">{persona.label}</span>
      </motion.div>
    </>
  );
};

export default HorseEcosystem;
