import { WifiOff, RefreshCw, Signal } from "lucide-react";

const OfflineSection = () => (
  <section className="py-20 md:py-28 bg-zinc-950">
    <div className="container">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-5">
              <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                Stall ist nicht Büro. <span className="text-primary">Offline ist Pflicht.</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed max-w-2xl">
                Zwischen Heuballen und Stallgasse gibt es kein WLAN. HufManager funktioniert komplett offline – Kunden anlegen, Termine abhaken, Befunde dokumentieren. Sobald du wieder Netz hast, synchronisiert sich alles automatisch.
              </p>
              <p className="text-white/50 text-base leading-relaxed max-w-2xl">
                Kein Laden, kein Warten, kein Datenverlust. Dein Workflow läuft, egal wo du stehst.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-white/60"><WifiOff className="w-4 h-4 text-primary" /><span>Vollständig offline nutzbar</span></div>
                <div className="flex items-center gap-2 text-sm text-white/60"><RefreshCw className="w-4 h-4 text-primary" /><span>Auto-Sync bei Netz</span></div>
                <div className="flex items-center gap-2 text-sm text-white/60"><Signal className="w-4 h-4 text-primary" /><span>Kein Datenverlust</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default OfflineSection;
