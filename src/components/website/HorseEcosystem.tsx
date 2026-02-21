import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Stethoscope, Users, Hammer, X, Check } from "lucide-react";

const personas = [
  {
    icon: Smartphone,
    label: "PferdebesitzerInnen",
    subtitle: "& StallbetreiberInnen",
    bullets: ["Pferde-Akte & Historie", "Terminbuchung & Erinnerungen", "Befunde einsehen", "Chat mit Profis", "Stallverwaltung"],
    color: "from-sky-400 to-blue-500",
    accent: "#38bdf8",
    position: { col: 0, row: 0 }, // top-left
  },
  {
    icon: Hammer,
    label: "HufbearbeiterInnen",
    subtitle: "aller Art",
    bullets: ["Tourenplanung", "Dokumentation & Fotos", "Rechnungswesen", "Kundenverwaltung", "Offlinefähig"],
    color: "from-primary to-orange-500",
    accent: "hsl(var(--primary))",
    position: { col: 1, row: 0 }, // top-right
  },
  {
    icon: Stethoscope,
    label: "TherapeutInnen",
    subtitle: "& BehandlerInnen",
    bullets: ["Behandlungspläne", "Befund-Upload", "Fortschrittskontrolle", "Abrechnung", "Vernetzung"],
    color: "from-emerald-400 to-teal-500",
    accent: "#34d399",
    position: { col: 0, row: 1 }, // bottom-left
  },
  {
    icon: Users,
    label: "MitarbeiterInnen",
    subtitle: "& Team",
    bullets: ["Aufgabenverwaltung", "Tourenausführung", "Zeiterfassung", "Dokumentation", "Check-in / Check-out"],
    color: "from-violet-400 to-purple-500",
    accent: "#a78bfa",
    position: { col: 1, row: 1 }, // bottom-right
  },
];

/* Isometric transform helper */
const ISO_SKEW = "rotateX(12deg) rotateZ(-2deg)";

const HorseEcosystem = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section className="relative py-24 md:py-36 overflow-hidden bg-black">
      {/* Background ambience */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/8 rounded-full blur-[250px]" />
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-sky-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[150px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
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
            Alle Profis – <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">ein Netzwerk</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Klicke auf eine Rolle, um zu sehen, was HufManager für sie bereithält.
          </p>
        </motion.div>

        {/* Isometric Grid */}
        <div className="relative mx-auto max-w-4xl" style={{ perspective: "1200px" }}>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6"
            style={{ transformStyle: "preserve-3d", transform: ISO_SKEW }}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {personas.map((persona, i) => (
              <IsometricBlock
                key={persona.label}
                persona={persona}
                index={i}
                isActive={activeIndex === i}
                onToggle={() => setActiveIndex(activeIndex === i ? null : i)}
              />
            ))}
          </motion.div>

          {/* Central horse badge — floating above the grid */}
          <motion.div
            className="absolute top-1/2 left-1/2 z-40 pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) ${ISO_SKEW}`,
              transformStyle: "preserve-3d",
            }}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
          >
            <div className="relative">
              {/* Glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                className="w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-primary/40 flex items-center justify-center backdrop-blur-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)",
                  boxShadow: "0 0 40px hsl(var(--primary) / 0.25), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <div className="text-center">
                  <span className="text-3xl md:text-4xl block leading-none">🐴</span>
                  <span className="text-[7px] md:text-[9px] font-bold text-primary/80 mt-0.5 block tracking-[0.2em] uppercase">Pferdewohl</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Connection lines SVG overlay */}
          <svg className="absolute inset-0 w-full h-full z-30 pointer-events-none hidden md:block" style={{ transform: ISO_SKEW }}>
            <defs>
              <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                <stop offset="50%" stopColor="white" stopOpacity="0.06" />
                <stop offset="100%" stopColor="white" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            {/* Diagonal crosses */}
            <motion.line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#line-grad)" strokeWidth="1" strokeDasharray="6 8"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.6 }} />
            <motion.line x1="75%" y1="25%" x2="25%" y2="75%" stroke="url(#line-grad)" strokeWidth="1" strokeDasharray="6 8"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.8 }} />
          </svg>
        </div>

        {/* Tagline */}
        <motion.p
          className="text-center text-sm text-white/30 mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
        >
          Jede Rolle verbunden mit jeder – für lückenlose Kommunikation rund ums Pferd.
        </motion.p>
      </div>
    </section>
  );
};

/* ─── Isometric Block ─── */
const IsometricBlock = ({
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
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 30, rotateX: -5 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
      onClick={onToggle}
      layout
    >
      {/* 3D shadow / depth layer */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${persona.accent}22, transparent)`,
          transform: "translate(6px, 6px)",
          filter: "blur(2px)",
          opacity: isActive ? 0.5 : 0.2,
          transition: "opacity 0.3s",
        }}
      />

      {/* Main block */}
      <motion.div
        className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
          isActive
            ? "border-white/20 shadow-2xl"
            : "border-white/[0.08] hover:border-white/[0.15]"
        }`}
        style={{
          background: isActive
            ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: isActive
            ? `0 25px 60px -12px rgba(0,0,0,0.5), 0 0 30px ${persona.accent}15`
            : "0 10px 30px -10px rgba(0,0,0,0.3)",
        }}
        whileHover={{ y: isActive ? 0 : -4 }}
        layout
      >
        {/* Top accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${persona.color}`} />

        {/* Header row */}
        <div className="flex items-center gap-4 p-5 md:p-6">
          <motion.div
            className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-xl flex-shrink-0`}
            style={{
              boxShadow: `0 8px 24px ${persona.accent}30`,
            }}
            whileHover={{ rotate: 6, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Icon className="h-7 w-7 text-white" />
            {/* Shimmer */}
            <div
              className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, transparent 100%)",
              }}
            />
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base md:text-lg leading-tight">{persona.label}</h3>
            <p className="text-xs md:text-sm text-white/40 mt-0.5">{persona.subtitle}</p>
          </div>

          {/* Toggle indicator */}
          <motion.div
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors duration-300 ${
              isActive ? "border-primary/50 bg-primary/20" : "border-white/10 bg-white/5"
            }`}
            animate={{ rotate: isActive ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isActive ? (
              <X className="w-4 h-4 text-primary" />
            ) : (
              <motion.div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            )}
          </motion.div>
        </div>

        {/* Expandable detail panel */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                <div className="border-t border-white/[0.06] pt-4">
                  <ul className="space-y-2.5">
                    {persona.bullets.map((bullet, bi) => (
                      <motion.li
                        key={bullet}
                        className="flex items-center gap-3 text-sm text-white/70"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + bi * 0.05 }}
                      >
                        <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${persona.color} flex items-center justify-center flex-shrink-0`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        {bullet}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default HorseEcosystem;
