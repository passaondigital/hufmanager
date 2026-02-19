import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, Play } from "lucide-react";

const DemoSection = () => (
  <section id="demo" className="py-20 md:py-28 bg-black">
    <div className="container">
      <div className="max-w-3xl mx-auto text-center">
        <span className="text-primary font-bold text-sm uppercase tracking-widest">Demo</span>
        <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-4">1 Demo. 2 Apps.</h2>
        <p className="text-white/60 text-lg mb-12 max-w-xl mx-auto">Wir zeigen dir beide Seiten: das Cockpit für dich und die App für deine Kunden. Persönlich, kein Sales-Blabla.</p>
        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><Play className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Option 1: Reel-Kommentar</h3>
            <p className="text-white/60 text-sm leading-relaxed">Kommentiere <span className="text-primary font-bold">"DEMO"</span> unter einem unserer Instagram-Reels. Du bekommst automatisch eine Nachricht mit dem Zugang.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4"><MessageCircle className="w-5 h-5 text-primary" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Option 2: Direktnachricht</h3>
            <p className="text-white/60 text-sm leading-relaxed">Schreib uns eine DM auf Instagram mit <span className="text-primary font-bold">"DEMO"</span> – wir melden uns persönlich bei dir.</p>
          </div>
        </div>
        <Button size="lg" className="glow-orange text-lg font-bold bg-primary hover:bg-primary/90 text-white" asChild>
          <a href="https://www.instagram.com/hufmanager/" target="_blank" rel="noopener noreferrer"><Instagram className="mr-2 h-5 w-5" />Direkt zu Instagram</a>
        </Button>
        <p className="text-white/40 text-sm mt-6">Kein Verkaufsgespräch. Kein Druck. Einfach Demo anschauen und selbst entscheiden.</p>
      </div>
    </div>
  </section>
);

export default DemoSection;
