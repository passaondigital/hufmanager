import { CheckCircle2, MapPinned, Navigation, Play } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

const steps = [
  {
    icon: MapPinned,
    title: "1. Route planen",
    text: "HufManager sortiert deine heutigen Stopps sinnvoll und berechnet die Fahrstrecke.",
  },
  {
    icon: Play,
    title: "2. Tour starten",
    text: "Ab jetzt arbeitest du nur noch den naechsten Stopp ab.",
  },
  {
    icon: Navigation,
    title: "3. Fahren & erledigen",
    text: "Navigation starten, Termin abschliessen und direkt zum naechsten Kunden weiter.",
  },
] as const;

export function TourQuickGuide() {
  return (
    <section className="hm-card mb-4 p-4 sm:p-5" aria-label="So funktioniert deine Tour">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-semibold text-[var(--hm-text-primary)]">So funktioniert deine Tour</h2>
            <HelpTip
              title="Tour in 3 Schritten"
              description="Du musst nicht alle Tour-Funktionen kennen. Route planen, Tour starten und danach immer nur den naechsten Stopp bearbeiten."
            />
          </div>
          <p className="mt-1 text-xs text-[var(--hm-text-secondary)]">
            Der normale Arbeitsweg bleibt bewusst einfach. Manuelle Reihenfolge und Fahrtenbuch sind Zusatzfunktionen.
          </p>
        </div>
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl bg-[var(--hm-surface-elevated)] p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-[var(--hm-text-primary)]">{title}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--hm-text-secondary)]">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs text-[var(--hm-text-secondary)]">
        <span className="font-medium text-orange-600">Ankunftszeit:</span>
        <span>
          Die Live-Ankunft wird beim naechsten Stopp angezeigt, sobald Standort und Fahrzeit sicher berechnet werden koennen.
        </span>
        <HelpTip
          title="Voraussichtliche Ankunft"
          description="Die ETA soll aus deinem aktuellen Standort und der echten Fahrzeit entstehen. HufManager zeigt sie nur an, wenn sie verlaesslich berechnet werden kann, statt eine Zeit zu raten."
        />
      </div>
    </section>
  );
}
