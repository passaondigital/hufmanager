import { Shield } from "lucide-react";

export function DataSovereigntyBadge() {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 md:p-8">
      {/* Glow effect */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0 p-3 rounded-full bg-orange-500/20 border border-orange-500/30">
          <Shield className="h-8 w-8 text-orange-400" />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl md:text-2xl font-bold text-foreground">
            🛡️ Du entscheidest. Immer.
          </h3>
          
          <p className="text-muted-foreground leading-relaxed">
            Im Hufi hat der Pferdebesitzer die vollständige Datenhoheit über sein Pferd.
            Das bedeutet konkret:
          </p>
          
          <ul className="space-y-2 text-sm">
            {[
              "Kein Hufpfleger sieht dein Pferd ohne deine Erlaubnis",
              "Kein Tierarzt, kein Physiotherapeut, kein Trainer — niemand ohne dein Ja",
              "Du siehst jederzeit wer Zugriff hat",
              "Du kannst jeden Zugriff sofort entziehen",
              "Du bestimmst welche Daten geteilt werden",
              "Deine Daten bleiben auf deutschen Servern",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="text-foreground">{text}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs font-semibold text-orange-400 italic">
            Das ist kein Versprechen — das ist technisch so gebaut.
          </p>
        </div>
      </div>
    </div>
  );
}
