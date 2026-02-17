import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { LandingHero } from "@/components/landing/sections/LandingHero";
import { LandingAbout } from "@/components/landing/sections/LandingAbout";
import { LandingServices } from "@/components/landing/sections/LandingServices";
import { LandingHighlights } from "@/components/landing/sections/LandingHighlights";
import { LandingListItems } from "@/components/landing/sections/LandingListItems";
import { LandingShopGrid } from "@/components/landing/sections/LandingShopGrid";
import { LandingBeforeAfter } from "@/components/landing/sections/LandingBeforeAfter";
import { LandingContact } from "@/components/landing/sections/LandingContact";
import { GallerySection } from "@/components/landing/GallerySection";
import { ReviewsSection } from "@/components/landing/ReviewsSection";
import { LegalFooter } from "@/components/landing/LegalFooter";
import { LeadChatBot } from "@/components/landing/LeadChatBot";
import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";
import { IntakeStatusBadge } from "@/components/landing/IntakeStatusBadge";
import { ServiceInquiryModal } from "@/components/landing/ServiceInquiryModal";
import { LandingSEOHead } from "@/components/landing/LandingSEOHead";
import { toast } from "@/hooks/use-toast";

type IntakeStatus = 'open' | 'waitlist' | 'closed';

interface BusinessSettings {
  id: string;
  user_id: string;
  business_name: string | null;
  owner_name: string | null;
  hero_headline: string | null;
  hero_image_url: string | null;
  about_text: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accept_new_customers: boolean | null;
  impressum_text: string | null;
  terms_text: string | null;
  client_intake_status: IntakeStatus | null;
  gallery_images: { url: string; caption?: string }[] | null;
  subdomain: string | null;
  reviews_layout: 'grid' | 'carousel' | 'marquee' | null;
  section_order: string[] | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  social_website: string | null;
  meta_description: string | null;
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
  offer_type: string | null;
  display_mode: string | null;
  media_url: string | null;
  external_link: string | null;
  billing_type: string | null;
}

interface Feedback {
  id: string;
  customer_name: string;
  rating: number;
  text: string | null;
  is_featured: boolean;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string | null;
  created_at: string;
  source?: string;
  proof_image_url?: string;
  is_visible?: boolean;
  reactions?: { green: number; yellow: number; red: number };
  category?: string;
}

interface GalleryImage {
  id: string;
  before_url: string;
  after_url: string;
  title?: string;
  description?: string;
}

const DEFAULT_SECTION_ORDER = ["hero", "about", "services", "highlights", "list_items", "shop_grid", "before_after", "gallery", "reviews", "contact"];

const ProviderLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [inquiryModal, setInquiryModal] = useState<{ open: boolean; serviceName: string }>({
    open: false,
    serviceName: ""
  });

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!slug) return;

      try {
        const { data: businessData, error: businessError } = await supabase
          .rpc('get_public_business_landing', { subdomain_input: slug });

        if (businessError) throw businessError;
        if (!businessData) {
          setError('Provider nicht gefunden');
          setLoading(false);
          return;
        }

        const typedBusinessData = businessData as unknown as BusinessSettings;

        if (!typedBusinessData.impressum_text || typedBusinessData.impressum_text.trim() === '') {
          setProfileIncomplete(true);
          setLoading(false);
          return;
        }

        setSettings(typedBusinessData);

        const { data: offersData } = await supabase
          .from('offers')
          .select('id, title, description, price, price_type, features, is_active, image_url, offer_type, display_mode, media_url, external_link, billing_type')
          .eq('provider_id', typedBusinessData.user_id)
          .eq('is_active', true)
          .neq('display_mode', 'hidden')
          .order('sort_order')
          .limit(20);

        if (offersData) setOffers(offersData);

        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, description, base_price, duration, booking_action')
          .eq('provider_id', typedBusinessData.user_id)
          .eq('is_active', true)
          .order('name')
          .limit(10);

        if (servicesData) {
          const publicServices = servicesData.filter(
            (service) => !service.name.toUpperCase().includes('BALANCE')
          );
          setServices(publicServices.slice(0, 6) as Service[]);
        }

        const { data: feedbackData } = await supabase
          .rpc('get_public_feedbacks', { provider_id_input: typedBusinessData.user_id });
        if (feedbackData) setFeedbacks(feedbackData);

        const { data: reviewsData } = await supabase
          .rpc('get_public_reviews', { provider_id_input: typedBusinessData.user_id });
        if (reviewsData) setReviews(reviewsData as Review[]);

        const { data: hoofPhotos } = await supabase
          .from('hoof_photos')
          .select(`id, photo_url, hoof_position, notes, horse_id, horses!inner(name, owner_id)`)
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

  // Derive primary color - use provider's color or fallback
  const primaryColor = settings?.primary_color || '#F47B20';
  const intakeStatus: IntakeStatus = (settings?.client_intake_status as IntakeStatus) || 'open';
  const sectionOrder = useMemo(() => {
    const order = settings?.section_order;
    if (Array.isArray(order) && order.length > 0) return order;
    return DEFAULT_SECTION_ORDER;
  }, [settings?.section_order]);

  const handleServiceRequest = (serviceName: string) => {
    setInquiryModal({ open: true, serviceName });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileIncomplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Profil wird eingerichtet</h1>
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

  // Build section map for dynamic rendering
  const sectionMap: Record<string, React.ReactNode> = {
    hero: (
      <LandingHero
        key="hero"
        settings={settings}
        primaryColor={primaryColor}
        intakeStatus={intakeStatus}
        onScrollToContact={scrollToContact}
      />
    ),
    about: settings.about_text ? (
      <LandingAbout key="about" aboutText={settings.about_text} />
    ) : null,
    services: services.length > 0 ? (
      <LandingServices
        key="services"
        services={services}
        primaryColor={primaryColor}
        onBook={handleServiceBook}
        onRequest={handleServiceRequest}
      />
    ) : null,
    highlights: offers.filter(o => o.display_mode === 'highlight_card' || !o.display_mode).length > 0 ? (
      <LandingHighlights
        key="highlights"
        offers={offers.filter(o => (o.display_mode === 'highlight_card' || !o.display_mode) && !o.title.toUpperCase().includes('BALANCE'))}
        primaryColor={primaryColor}
      />
    ) : null,
    list_items: offers.filter(o => o.display_mode === 'list_item').length > 0 ? (
      <LandingListItems
        key="list_items"
        offers={offers.filter(o => o.display_mode === 'list_item')}
        primaryColor={primaryColor}
      />
    ) : null,
    shop_grid: offers.filter(o => o.display_mode === 'shop_grid').length > 0 ? (
      <LandingShopGrid
        key="shop_grid"
        offers={offers.filter(o => o.display_mode === 'shop_grid')}
        primaryColor={primaryColor}
      />
    ) : null,
    before_after: galleryImages.length > 0 ? (
      <LandingBeforeAfter key="before_after" galleryImages={galleryImages} primaryColor={primaryColor} />
    ) : null,
    gallery: settings.gallery_images && settings.gallery_images.length > 0 ? (
      <GallerySection key="gallery" images={settings.gallery_images} primaryColor={primaryColor} />
    ) : null,
    reviews: reviews.length > 0 ? (
      <ReviewsSection
        key="reviews"
        reviews={reviews}
        primaryColor={primaryColor}
        layout={settings.reviews_layout || 'grid'}
      />
    ) : feedbacks.length > 0 ? (
      <ReviewsSection
        key="reviews-legacy"
        reviews={feedbacks.map(f => ({
          id: f.id,
          reviewer_name: f.customer_name,
          rating: f.rating,
          text: f.text,
          created_at: '',
        }))}
        primaryColor={primaryColor}
        layout="grid"
      />
    ) : null,
    contact: intakeStatus !== 'closed' ? (
      <LandingContact
        key="contact"
        providerId={settings.user_id}
        providerName={settings.owner_name || settings.business_name || 'Hufbearbeiter'}
        primaryColor={primaryColor}
      />
    ) : null,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Head */}
      <LandingSEOHead settings={settings} />

      {/* Intake Status Badge */}
      <div className="fixed top-4 right-4 z-50">
        <IntakeStatusBadge status={intakeStatus} />
      </div>

      {/* Dynamic Section Rendering */}
      {sectionOrder.map((sectionKey) => sectionMap[sectionKey] || null)}

      {/* Footer (always last) */}
      <LegalFooter
        businessName={settings.business_name || settings.owner_name || 'Hufbearbeiter'}
        impressumText={settings.impressum_text}
        termsText={settings.terms_text}
        primaryColor={primaryColor}
        socialInstagram={settings.social_instagram}
        socialFacebook={settings.social_facebook}
        socialTiktok={settings.social_tiktok}
        socialWebsite={settings.social_website}
      />

      {/* Lead Chat Bot */}
      <LeadChatBot 
        providerId={settings.user_id}
        providerName={settings.owner_name || settings.business_name || 'Hufbearbeiter'}
        providerLogo={settings.logo_url}
        primaryColor={primaryColor}
      />

      {/* Service Inquiry Modal */}
      <ServiceInquiryModal
        open={inquiryModal.open}
        onOpenChange={(open) => setInquiryModal({ ...inquiryModal, open })}
        serviceName={inquiryModal.serviceName}
        providerId={settings.user_id}
        primaryColor={primaryColor}
      />

      {/* DSGVO Cookie Consent Banner */}
      <CookieConsentBanner primaryColor={primaryColor} />
    </div>
  );
};

export default ProviderLanding;
