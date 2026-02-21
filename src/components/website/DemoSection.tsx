import { Button } from "@/components/ui/button";
import {
  Play, Hammer, Heart, Stethoscope, Users, Zap,
  Calendar, Euro, MapPin, FileText, BarChart3, Smartphone,
  MessageSquare, ClipboardList, Package, Bell, Shield, Bot,
  BookOpen, Headphones, HelpCircle, Camera, UserCheck, Receipt,
} from "lucide-react";

const featureCategories = [
  {
    title: "Termine & Touren",
    features: [
      { icon: Calendar, label: "Terminplanung & Kalender" },
      { icon: MapPin, label: "Routenplanung & Navigation" },
      { icon: Bell, label: "Automatische Erinnerungen" },
      { icon: ClipboardList, label: "Stallgruppen-Termine" },
    ],
  },
  {
    title: "Kunden & Pferde",
    features: [
      { icon: Users, label: "Kundenverwaltung" },
      { icon: Heart, label: "Digitale Pferdeakte" },
      { icon: Camera, label: "Huf-Dokumentation & Fotos" },
      { icon: UserCheck, label: "Kundenportal mit Selbstservice" },
    ],
  },
  {
    title: "Finanzen & Rechnungen",
    features: [
      { icon: Euro, label: "Rechnungsstellung" },
      { icon: Receipt, label: "Buchhaltungsexport" },
      { icon: BarChart3, label: "Umsatz-Dashboard" },
      { icon: FileText, label: "PDF-Rechnungen & Signaturen" },
    ],
  },
  {
    title: "Team & Ökosystem",
    features: [
      { icon: Users, label: "Mitarbeiterverwaltung" },
      { icon: Stethoscope, label: "Fachpartner-Anbindung" },
      { icon: Package, label: "Materialverwaltung" },
      { icon: MessageSquare, label: "Interner Chat" },
    ],
  },
  {
    title: "Automatisierung & KI",
    features: [
      { icon: Zap, label: "AutoFlow-Automatisierung" },
      { icon: Bot, label: "KI-Assistent Hufi" },
      { icon: Shield, label: "DSGVO & Datenschutz" },
      { icon: Smartphone, label: "Offline-fähige PWA" },
    ],
  },
];

const DemoSection = () => (
  <section id="demo" className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-4xl mx-auto text-center">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Erleben statt lesen</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">1 Klick. 4 Perspektiven.</h2>
        <p className="text-white/60 text-lg mb-12 max-w-2xl mx-auto">
          Wenn du jetzt mehr wissen willst, schau dich mit den 1-Click-Optionen um. Kein Registrieren, kein Warten – sofort drin.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Hammer className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Hufbearbeiter-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Dein Cockpit: Termine, Rechnungen, Kunden, Routen – alles im Blick.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Heart className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Kunden-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Die Sicht deiner Pferdebesitzer: Pferdeakte, Termine & Rechnungen.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Stethoscope className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Partner-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Für Tierärzte, Therapeuten & Co – weil das Pferd im Zentrum steht und du nicht alleine bist.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Users className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Mitarbeiter-App</h3>
            <p className="text-white/60 text-sm leading-relaxed">Touren, Aufträge & Dokumentation – für dein Team unterwegs.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-zinc-900/80 p-6 mb-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-white">Noch mehr Kopf & Rücken frei?</h3>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            Probier einen der <span className="text-primary font-bold">3 AutoFlow-Modi</span> aus – und erlebe, wie sich Verwaltung von selbst erledigt.
          </p>
        </div>

        {(() => {
          const isLandingDomain = ["www.hufmanager.de", "hufmanager.de"].includes(window.location.hostname);
          const loginHref = isLandingDomain ? "https://app.hufmanager.de/auth" : "/auth";
          return (
            <Button size="lg" className="glow-orange text-lg font-bold bg-primary hover:bg-primary/90 text-white" asChild>
              <a href={loginHref}><Play className="mr-2 h-5 w-5" />Jetzt Demo starten</a>
            </Button>
          );
        })()}
        <p className="text-white/40 text-sm mt-6">Kein Verkaufsgespräch. Kein Druck. Einfach reinschauen und selbst entscheiden.</p>
      </div>

      {/* Feature-Übersicht */}
      <div className="max-w-5xl mx-auto mt-24">
        <div className="text-center mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Noch unsicher?</span>
          <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mt-4">Dann schau dir deine Werkzeuge im Detail an.</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCategories.map((cat) => (
            <div key={cat.title} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">{cat.title}</h3>
              <ul className="space-y-3">
                {cat.features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-white/80 text-sm">{f.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Support-Sektion */}
      <div className="max-w-3xl mx-auto mt-24">
        <div className="text-center mb-10">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Immer noch unsicher?</span>
          <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mt-4">Du bist nicht alleine.</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">FAQ-Bereich</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Ein umfangreicher interner Hilfebereich mit Antworten auf alle wichtigen Fragen.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">1:1 Support</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Persönlicher Support – direkt, schnell und auf Augenhöhe.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Hufi – dein KI-Assistent</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              24/7 für dich da. Stellt sich deinen Fragen, gibt Antworten – rund um die Uhr.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default DemoSection;
