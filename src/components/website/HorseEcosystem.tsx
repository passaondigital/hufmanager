import { motion } from "framer-motion";
import { Smartphone, Stethoscope, Users, Calendar, Shield } from "lucide-react";

const personas = [
  {
    icon: Users,
    label: "Hufbearbeiter",
    angle: -90,
    bullets: ["Tourenplanung", "Dokumentation", "Rechnungen", "Kundenverwaltung", "Offlinefähig"],
    color: "from-primary to-orange-400",
  },
  {
    icon: Smartphone,
    label: "Pferdebesitzer",
    angle: -18,
    bullets: ["Terminbuchung", "Hufhistorie", "Befunde einsehen", "Chat mit Experten", "Erinnerungen"],
    color: "from-blue-400 to-cyan-400",
  },
  {
    icon: Stethoscope,
    label: "Therapeut",
    angle: 54,
    bullets: ["Behandlungspläne", "Befund-Upload", "Fortschritte", "Abrechnung", "Vernetzung"],
    color: "from-emerald-400 to-green-400",
  },
  {
    icon: Calendar,
    label: "Mitarbeiter",
    angle: 126,
    bullets: ["Aufgaben", "Touren", "Zeiterfassung", "Dokumentation", "Check-in/out"],
    color: "from-violet-400 to-purple-400",
  },
  {
    icon: Shield,
    label: "Partner",
    angle: 198,
    bullets: ["Kalender", "Rechnungen", "Pferdezugang", "Behandlungen", "DSGVO-konform"],
    color: "from-amber-400 to-yellow-400",
  },
];

// Radius for persona orbit (responsive)
const ORBIT_RADIUS_DESKTOP = 260;
const ORBIT_RADIUS_MOBILE = 150;

const HorseEcosystem = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-black">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px]" />
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
            Das Pferd im <span className="text-primary">Zentrum</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Alle Beteiligten – digital vernetzt. Ein Netzwerk, das dem Pferdewohl dient.
          </p>
        </motion.div>

        {/* Circle diagram */}
        <div className="relative mx-auto w-[340px] h-[340px] md:w-[600px] md:h-[600px]">
          {/* Orbit ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-white/10"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-4 md:inset-8 rounded-full border border-white/5"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />

          {/* Rotating pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />

          {/* Center horse */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center z-20 backdrop-blur-sm"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
          >
            <div className="text-center">
              <span className="text-4xl md:text-6xl block">🐴</span>
              <span className="text-[10px] md:text-xs font-bold text-primary mt-1 block">PFERDEWOHL</span>
            </div>
          </motion.div>

          {/* Persona nodes */}
          {personas.map((persona, i) => {
            const rad = (persona.angle * Math.PI) / 180;
            return (
              <PersonaNode
                key={persona.label}
                persona={persona}
                index={i}
                rad={rad}
              />
            );
          })}

          {/* Connection lines (animated) */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 600 600">
            {personas.map((persona, i) => {
              const rad = (persona.angle * Math.PI) / 180;
              const x = 300 + ORBIT_RADIUS_DESKTOP * Math.cos(rad);
              const y = 300 + ORBIT_RADIUS_DESKTOP * Math.sin(rad);
              return (
                <motion.line
                  key={i}
                  x1="300" y1="300" x2={x} y2={y}
                  stroke="url(#lineGrad)"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.4 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                />
              );
            })}
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Mobile list fallback for bullets */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          {personas.map((persona, i) => {
            const Icon = persona.icon;
            return (
              <motion.div
                key={persona.label}
                className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${persona.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">{persona.label}</span>
                </div>
                <ul className="space-y-1">
                  {persona.bullets.map((b) => (
                    <li key={b} className="text-xs text-white/50 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* Individual persona node on the circle */
const PersonaNode = ({
  persona,
  index,
  rad,
}: {
  persona: typeof personas[0];
  index: number;
  rad: number;
}) => {
  const Icon = persona.icon;

  return (
    <>
      {/* Desktop position */}
      <motion.div
        className="absolute z-20 hidden md:flex flex-col items-center"
        style={{
          left: `calc(50% + ${ORBIT_RADIUS_DESKTOP * Math.cos(rad)}px)`,
          top: `calc(50% + ${ORBIT_RADIUS_DESKTOP * Math.sin(rad)}px)`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 + index * 0.1, type: "spring" }}
      >
        <motion.div
          className={`w-14 h-14 rounded-full bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-lg shadow-black/30 border-2 border-white/20 cursor-default`}
          whileHover={{ scale: 1.15 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="h-6 w-6 text-white" />
        </motion.div>
        <span className="mt-2 text-xs font-semibold text-white/80 whitespace-nowrap">{persona.label}</span>
      </motion.div>

      {/* Mobile position */}
      <motion.div
        className="absolute z-20 flex md:hidden flex-col items-center"
        style={{
          left: `calc(50% + ${ORBIT_RADIUS_MOBILE * Math.cos(rad)}px)`,
          top: `calc(50% + ${ORBIT_RADIUS_MOBILE * Math.sin(rad)}px)`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 + index * 0.1, type: "spring" }}
      >
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-lg border border-white/20`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="mt-1 text-[9px] font-semibold text-white/70 whitespace-nowrap">{persona.label}</span>
      </motion.div>
    </>
  );
};

export default HorseEcosystem;
