import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star, Camera, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadChatBot } from "@/components/landing/LeadChatBot";
import { LandingContactForm } from "@/components/landing/LandingContactForm";
import { ServiceCard } from "@/components/landing/ServiceCard";
import { BeforeAfterGallery } from "@/components/landing/BeforeAfterGallery";
import { LegalFooter } from "@/components/landing/LegalFooter";
import { toast } from "@/hooks/use-toast";

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
  impressum_text: string | null;
  terms_text: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration: number | null;
  booking_action: 'direct_book' | 'request_only';
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

interface GalleryImage {
  id: string;
  before_url: string;
  after_url: string;
  title?: string;
  description?: string;
}

const ProviderLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!slug) return;

      try {
        // Find provider by subdomain - include legal texts for gatekeeper check
        const { data: businessData, error: businessError } = await supabase
          .from('business_settings')
          .select('id, user_id, business_name, owner_name, hero_headline, about_text, logo_url, phone, email, address, primary_color, accept_new_customers, subdomain, impressum_text, terms_text')
          .eq('subdomain', slug)
          .maybeSingle();

        if (businessError) throw businessError;
        if (!businessData) {
          setError('Provider nicht gefunden');
          setLoading(false);
          return;
        }

        // GATEKEEPER: Check if impressum is filled
        if (!businessData.impressum_text || businessData.impressum_text.trim() === '') {
          setProfileIncomplete(true);
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

        // Fetch active services with booking_action
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, description, base_price, duration, booking_action')
          .eq('provider_id', businessData.user_id)
          .eq('is_active', true)
          .order('name')
          .limit(6);

        if (servicesData) setServices(servicesData as Service[]);

        // Fetch featured feedbacks - only from THIS provider
        const { data: feedbackData } = await supabase
          .from('feedbacks')
          .select('id, customer_name, rating, text, is_featured')
          .eq('provider_id', businessData.user_id)
          .eq('is_featured', true)
          .limit(5);

        if (feedbackData) setFeedbacks(feedbackData);

        // Fetch hoof photos for gallery
        const { data: hoofPhotos } = await supabase
          .from('hoof_photos')
          .select(`
            id, 
            photo_url, 
            hoof_position, 
            notes,
            horse_id,
            horses!inner(name, owner_id)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (hoofPhotos && hoofPhotos.length >= 2) {
          const pairs: GalleryImage[] = [];
          for (let i = 0; i < hoofPhotos.length - 1; i += 2) {
            const horse = hoofPhotos[i].horses as any;
            pairs.push({
              id: hoofPhotos[i].id,
              before_url: hoofPhotos[i + 1].photo_url,
              after_url: hoofPhotos[i].photo_url,
              title: horse?.name || "Hufbearbeitung",
              description: hoofPhotos[i].hoof_position || undefined,
            });
          }
          setGalleryImages(pairs.slice(0, 6));
        }

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

  // GATEKEEPER: Profile incomplete - show friendly message
  if (profileIncomplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Profil wird eingerichtet
          </h1>
          <p className="text-muted-foreground">
            Dieses Profil ist noch nicht vollständig eingerichtet. 
            Bitte schauen Sie später noch einmal vorbei.
          </p>
        </div>
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

  const handleServiceRequest = (serviceName: string) => {
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
    toast({
      title: `Anfrage für: ${serviceName}`,
      description: "Bitte füllen Sie das Kontaktformular aus.",
    });
  };

  const handleServiceBook = (serviceName: string) => {
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
    toast({
      title: `Buchung für: ${serviceName}`,
      description: "Bitte füllen Sie das Kontaktformular aus um einen Termin zu vereinbaren.",
    });
  };

  const scrollToContact = () => {
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Hero Section - Only Logo, Name, Slogan, CTA */}
      <header 
        className="relative py-20 px-4"
        style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {settings.logo_url && (
            <img 
              src={settings.logo_url} 
              alt={settings.business_name || 'Logo'} 
              className="h-28 w-28 rounded-full mx-auto mb-6 object-cover border-4 border-background shadow-xl"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {settings.business_name || settings.owner_name || 'Hufbearbeitung'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {settings.hero_headline || 'Professionelle Hufpflege für Ihr Pferd'}
          </p>
          
          {settings.accept_new_customers !== false && (
            <Button
              size="lg"
              className="gap-2 text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: primaryColor }}
              onClick={scrollToContact}
            >
              <Calendar className="h-5 w-5" />
              Termin anfragen
            </Button>
          )}
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
      {services.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Services</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Wählen Sie einen Service und buchen Sie direkt oder stellen Sie eine Anfrage
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  title={service.name}
                  description={service.description}
                  price={service.base_price}
                  priceType={service.duration ? `${service.duration} Min.` : null}
                  features={null}
                  primaryColor={primaryColor}
                  bookingAction={service.booking_action}
                  onBook={() => handleServiceBook(service.name)}
                  onRequest={() => handleServiceRequest(service.name)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Offers/Packages Section */}
      {offers.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Leistungen & Pakete</h2>
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

      {/* Before/After Gallery Section */}
      {galleryImages.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Camera className="h-4 w-4" />
                Bildergalerie
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Vorher & Nachher</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Überzeugen Sie sich selbst von den Ergebnissen meiner Arbeit
              </p>
            </div>
            <BeforeAfterGallery images={galleryImages} primaryColor={primaryColor} />
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

      {/* Legal Footer with Impressum & AGB Modals */}
      <LegalFooter
        businessName={settings.business_name || settings.owner_name || 'Hufbearbeiter'}
        impressumText={settings.impressum_text}
        termsText={settings.terms_text}
        primaryColor={primaryColor}
        phone={settings.phone}
        email={settings.email}
        address={settings.address}
      />

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
