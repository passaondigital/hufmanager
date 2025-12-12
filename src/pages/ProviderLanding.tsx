import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Phone, Mail, Star, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LeadChatBot } from "@/components/landing/LeadChatBot";
import { LandingContactForm } from "@/components/landing/LandingContactForm";
import { ServiceCard } from "@/components/landing/ServiceCard";

interface BusinessSettings {
  id: string;
  user_id: string;
  business_name: string | null;
  owner_name: string | null;
  hero_headline: string | null;
  about_text: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  primary_color: string | null;
  accept_new_customers: boolean | null;
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  features: string[] | null;
  is_active: boolean;
  image_url: string | null;
}

interface Feedback {
  id: string;
  customer_name: string;
  rating: number;
  text: string | null;
  is_featured: boolean;
}

const ProviderLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!slug) return;

      try {
        // Find provider by subdomain
        const { data: businessData, error: businessError } = await supabase
          .from('business_settings')
          .select('*')
          .eq('subdomain', slug)
          .maybeSingle();

        if (businessError) throw businessError;
        if (!businessData) {
          setError('Provider nicht gefunden');
          setLoading(false);
          return;
        }

        setSettings(businessData);

        // Fetch active offers
        const { data: offersData } = await supabase
          .from('offers')
          .select('*')
          .eq('provider_id', businessData.user_id)
          .eq('is_active', true)
          .order('sort_order')
          .limit(3);

        if (offersData) setOffers(offersData);

        // Fetch featured feedbacks
        const { data: feedbackData } = await supabase
          .from('feedbacks')
          .select('*')
          .eq('provider_id', businessData.user_id)
          .eq('is_featured', true)
          .limit(5);

        if (feedbackData) setFeedbacks(feedbackData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Seite nicht gefunden</h1>
          <p className="text-muted-foreground">{error || 'Der angeforderte Provider existiert nicht.'}</p>
        </div>
      </div>
    );
  }

  const primaryColor = settings.primary_color || '#d97706';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header 
        className="relative py-20 px-4"
        style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}05 100%)` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {settings.logo_url && (
            <img 
              src={settings.logo_url} 
              alt={settings.business_name || 'Logo'} 
              className="h-24 w-24 rounded-full mx-auto mb-6 object-cover border-4 border-background shadow-lg"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {settings.business_name || settings.owner_name || 'Hufbearbeitung'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {settings.hero_headline || 'Professionelle Hufpflege für Ihr Pferd'}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            {settings.phone && (
              <a 
                href={`tel:${settings.phone}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                {settings.phone}
              </a>
            )}
            {settings.email && (
              <a 
                href={`mailto:${settings.email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                {settings.email}
              </a>
            )}
            {settings.address && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {settings.address}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* About Section */}
      {settings.about_text && (
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Über mich</h2>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              {settings.about_text}
            </p>
          </div>
        </section>
      )}

      {/* Services Section */}
      {offers.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Leistungen</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Professionelle Hufbearbeitung für jede Anforderung
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <ServiceCard
                  key={offer.id}
                  title={offer.title}
                  description={offer.description}
                  price={offer.price}
                  priceType={offer.price_type}
                  features={offer.features}
                  primaryColor={primaryColor}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {feedbacks.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Kundenstimmen</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {feedbacks.map((feedback) => (
                <Card key={feedback.id} className="bg-muted/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className="h-4 w-4" 
                          fill={i < feedback.rating ? primaryColor : 'transparent'}
                          stroke={i < feedback.rating ? primaryColor : 'currentColor'}
                        />
                      ))}
                    </div>
                    {feedback.text && (
                      <p className="text-muted-foreground italic mb-4">"{feedback.text}"</p>
                    )}
                    <p className="font-medium text-foreground">{feedback.customer_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Form Section */}
      {settings.accept_new_customers !== false && (
        <section id="kontakt" className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <LandingContactForm
              providerId={settings.user_id}
              providerName={settings.owner_name || settings.business_name || 'Hufbearbeiter'}
              primaryColor={primaryColor}
            />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.business_name || settings.owner_name}. Alle Rechte vorbehalten.</p>
        </div>
      </footer>

      {/* Lead Chat Bot */}
      <LeadChatBot 
        providerId={settings.user_id}
        providerName={settings.owner_name || settings.business_name || 'Hufbearbeiter'}
        providerLogo={settings.logo_url}
        primaryColor={primaryColor}
      />
    </div>
  );
};

export default ProviderLanding;