import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_CONSENT_KEY = "huf_cookie_consent";

interface CookieConsentBannerProps {
  primaryColor?: string;
}

export function CookieConsentBanner({ primaryColor }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      essential: true,
      analytics: true,
    }));
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      essential: true,
      analytics: false,
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <Cookie className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              Datenschutz & Cookies
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Diese Website verwendet technisch notwendige Cookies für die Funktion der Seite. 
              Optionale Cookies helfen uns, die Nutzung der Seite zu verstehen. 
              Weitere Informationen findest du in unserer Datenschutzerklärung im Impressum.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEssentialOnly}
            className="text-sm"
          >
            Nur notwendige
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="text-sm"
            style={primaryColor ? { backgroundColor: primaryColor } : undefined}
          >
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
