import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link } from "react-router-dom";
import { initGA4 } from "@/lib/analytics";

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Cookie className="w-5 h-5 text-primary" /></div>
            <div>
              <h4 className="font-semibold text-white mb-1">Wir nutzen Cookies 🍪</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Wir verwenden technisch notwendige Cookies, um dir die bestmögliche Nutzererfahrung zu bieten. Mehr Informationen findest du in unserer{" "}
                <Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link>.
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={() => { localStorage.setItem("cookie-consent", "essential-only"); setIsVisible(false); }} className="flex-1 md:flex-none border-white/20 text-white hover:bg-white/10">Nur notwendige</Button>
            <Button onClick={() => { localStorage.setItem("cookie-consent", "accepted"); setIsVisible(false); initGA4(""); }} className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white">Alle akzeptieren</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
