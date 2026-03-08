import { Calendar, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

type IntakeStatus = 'open' | 'waitlist' | 'closed';

interface LandingHeroProps {
  settings: {
    logo_url: string | null;
    business_name: string | null;
    owner_name: string | null;
    hero_headline: string | null;
    hero_image_url: string | null;
  };
  primaryColor: string;
  intakeStatus: IntakeStatus;
  onScrollToContact: () => void;
  onBooking?: () => void;
}

export const LandingHero = ({ settings, primaryColor, intakeStatus, onScrollToContact, onBooking }: LandingHeroProps) => {
  const hasHeroImage = !!settings.hero_image_url;
  const isMobile = useIsMobile();
  const [imgLoaded, setImgLoaded] = useState(false);

  const ctaConfig = {
    open: { icon: Calendar, label: "Jetzt Termin anfragen", badge: "● Nimmt neue Kunden an", badgeColor: "text-emerald-400" },
    waitlist: { icon: Clock, label: "Auf Warteliste setzen", badge: "⏳ Aktuell ausgebucht", badgeColor: "text-amber-400" },
    closed: { icon: Phone, label: "Trotzdem Kontakt aufnehmen", badge: "Nimmt keine neuen Kunden an", badgeColor: "text-red-400" },
  };
  const cta = ctaConfig[intakeStatus];
  const CtaIcon = cta.icon;

  // On mobile: gradient bg instead of hero image for speed
  const showHeroImg = hasHeroImage && !isMobile;

  return (
    <header className="relative overflow-hidden">
      {/* Background */}
      {showHeroImg ? (
        <div className="absolute inset-0">
          {/* Blur placeholder */}
          {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
          <img
            src={settings.hero_image_url!}
            alt=""
            className="w-full h-full object-cover"
            style={{ maxWidth: "1200px", margin: "0 auto" }}
            loading="eager"
            onLoad={() => setImgLoaded(true)}
          />
          <div className={`absolute inset-0 ${intakeStatus === 'closed' ? 'bg-black/60' : intakeStatus === 'waitlist' ? 'bg-black/55' : 'bg-black/50'}`} />
        </div>
      ) : hasHeroImage && isMobile ? (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(var(--foreground) / 0.95) 0%, hsl(var(--foreground) / 0.85) 100%)" }} />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}
        />
      )}

      {/* Content */}
      <div className={`relative py-20 px-4 ${(showHeroImg || (hasHeroImage && isMobile)) ? 'py-28 md:py-36' : ''}`}>
        <div className="max-w-4xl mx-auto text-center">
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt={settings.business_name || 'Logo'}
              className="h-28 w-28 rounded-full mx-auto mb-6 object-cover border-4 border-background shadow-xl"
            />
          )}
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${(showHeroImg || (hasHeroImage && isMobile)) ? 'text-white' : 'text-foreground'}`}>
            {settings.business_name || settings.owner_name || 'Hufbearbeitung'}
          </h1>
          <p className={`text-xl max-w-2xl mx-auto mb-4 ${(showHeroImg || (hasHeroImage && isMobile)) ? 'text-white/90' : 'text-muted-foreground'}`}>
            {settings.hero_headline || 'Professionelle Hufpflege für Ihr Pferd'}
          </p>

          {/* Intake status badge */}
          <p className={`text-sm mb-6 ${cta.badgeColor}`}>
            {cta.badge}
          </p>

          <Button
            size="lg"
            className="gap-2 shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: primaryColor, color: '#fff' }}
            onClick={onBooking && intakeStatus !== 'closed' ? onBooking : onScrollToContact}
          >
            <CtaIcon className="h-5 w-5" />
            {cta.label}
          </Button>
        </div>
      </div>
    </header>
  );
};
