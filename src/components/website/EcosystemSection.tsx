import { BarChart3, Euro, Calendar, Smartphone, MessageSquare, FileDown } from "lucide-react";
import dashboardImg from "@/assets/lp/app-dashboard.png";
import customerAppImg from "@/assets/lp/customer-app-home.png";

const EcosystemSection = () => (
  <section className="py-20 md:py-28 bg-zinc-950" id="ecosystem">
    <div className="container">
      <div className="text-center mb-16">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Das Ökosystem</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4">Ein System. Zwei Perspektiven.</h2>
        <p className="text-white/60 text-lg mt-4 max-w-2xl mx-auto">Du hast die Kontrolle. Deine Kunden haben den Service.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Provider App */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 p-6 md:p-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-primary/20 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary" /></div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Für dich</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Das Cockpit</h3>
            <p className="text-sm text-white/40 uppercase tracking-wider mb-4">Provider App</p>
            <p className="text-white/70 mb-6 leading-relaxed">Deine Kommandozentrale. Hier steuerst du dein Business. Alles im Blick, von der offenen Rechnung bis zum nächsten Termin.</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-white/80"><BarChart3 className="w-5 h-5 text-primary flex-shrink-0" /><span>Dashboard & Analysen</span></li>
              <li className="flex items-center gap-3 text-white/80"><Euro className="w-5 h-5 text-primary flex-shrink-0" /><span>Rechnungsstellung & Buchhaltung</span></li>
              <li className="flex items-center gap-3 text-white/80"><Calendar className="w-5 h-5 text-primary flex-shrink-0" /><span>Routenplanung & Kalender</span></li>
            </ul>
            <div className="relative mt-6">
              <div className="bg-zinc-800 rounded-t-xl p-2 flex items-center gap-2">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80" /><div className="w-3 h-3 rounded-full bg-yellow-500/80" /><div className="w-3 h-3 rounded-full bg-green-500/80" /></div>
                <div className="flex-1 bg-zinc-700 rounded h-5 mx-8" />
              </div>
              <div className="bg-zinc-900 p-1 rounded-b-xl border border-zinc-700">
                <img src={dashboardImg} alt="Hufi Dashboard" className="w-full rounded-lg" loading="lazy" />
              </div>
            </div>
          </div>
        </div>

        {/* Client App */}
        <div className="relative rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Smartphone className="w-5 h-5 text-primary" /></div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Für Besitzer</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-3">Der Service</h3>
            <p className="text-sm text-zinc-500 uppercase tracking-wider mb-4">Kunden App</p>
            <p className="text-zinc-600 mb-6 leading-relaxed">Kostenlos für deine Kunden. Sie sehen nur das, was sie sehen sollen. Schluss mit nervigen Rückfragen.</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-zinc-700"><Smartphone className="w-5 h-5 text-primary flex-shrink-0" /><span>Eigene Pferde verwalten</span></li>
              <li className="flex items-center gap-3 text-zinc-700"><MessageSquare className="w-5 h-5 text-primary flex-shrink-0" /><span>Chat & Termin-Anfragen</span></li>
              <li className="flex items-center gap-3 text-zinc-700"><FileDown className="w-5 h-5 text-primary flex-shrink-0" /><span>Rechnungen downloaden & Daten freigeben</span></li>
            </ul>
            <div className="flex justify-center mt-6">
              <div className="relative w-48 md:w-56">
                <div className="bg-zinc-900 rounded-[2.5rem] p-2 shadow-2xl">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-zinc-900 rounded-full z-10" />
                  <div className="bg-zinc-800 rounded-[2rem] overflow-hidden">
                    <img src={customerAppImg} alt="Hufi Kunden App" className="w-full" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default EcosystemSection;
