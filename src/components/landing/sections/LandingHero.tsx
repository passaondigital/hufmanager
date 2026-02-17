import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

export const LandingHero = ({ settings, primaryColor, intakeStatus, onScrollToContact }: LandingHeroProps) => {
  const hasHeroImage = !!settings.hero_image_url;

  return (
    <header className="relative overflow-hidden">
      {/* Background */}
      {hasHeroImage ? (
        <div className="absolute inset-0">
          <img
            src={settings.hero_image_url!}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}
        />
      )}

      {/* Content */}
      <div className={`relative py-20 px-4 ${hasHeroImage ? 'py-28 md:py-36' : ''}`}>
        <div className="max-w-4xl mx-auto text-center">
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt={settings.business_name || 'Logo'}
              className="h-28 w-28 rounded-full mx-auto mb-6 object-cover border-4 border-background shadow-xl"
            />
          )}
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${hasHeroImage ? 'text-white' : 'text-foreground'}`}>
            {settings.business_name || settings.owner_name || 'Hufbearbeitung'}
          </h1>
          <p className={`text-xl max-w-2xl mx-auto mb-8 ${hasHeroImage ? 'text-white/90' : 'text-muted-foreground'}`}>
            {settings.hero_headline || 'Professionelle Hufpflege für Ihr Pferd'}
          </p>

          {intakeStatus !== 'closed' && (
            <Button
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: primaryColor, color: '#fff' }}
              onClick={onScrollToContact}
            >
              <Calendar className="h-5 w-5" />
              {intakeStatus === 'waitlist' ? 'Auf Warteliste setzen' : 'Termin anfragen'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
