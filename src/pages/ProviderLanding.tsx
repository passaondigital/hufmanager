import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { LandingHero } from "@/components/landing/sections/LandingHero";
import { LandingAbout } from "@/components/landing/sections/LandingAbout";
import { LandingServices } from "@/components/landing/sections/LandingServices";
import { LandingHighlights } from "@/components/landing/sections/LandingHighlights";
import { LandingListItems } from "@/components/landing/sections/LandingListItems";
import { LandingShopGrid } from "@/components/landing/sections/LandingShopGrid";
import { LandingBeforeAfter } from "@/components/landing/sections/LandingBeforeAfter";
import { LandingContact } from "@/components/landing/sections/LandingContact";
import { LandingFAQ } from "@/components/landing/sections/LandingFAQ";
import { LandingServiceArea } from "@/components/landing/sections/LandingServiceArea";
import { LandingQualifications } from "@/components/landing/sections/LandingQualifications";
import { LandingTrustCounters } from "@/components/landing/sections/LandingTrustCounters";
import { LandingInstagramFeed } from "@/components/landing/sections/LandingInstagramFeed";
import { GallerySection } from "@/components/landing/GallerySection";
import { ReviewsSection } from "@/components/landing/ReviewsSection";
import { LegalFooter } from "@/components/landing/LegalFooter";
import { LeadChatBot } from "@/components/landing/LeadChatBot";
import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";
import { IntakeStatusBadge } from "@/components/landing/IntakeStatusBadge";
import { ServiceInquiryModal } from "@/components/landing/ServiceInquiryModal";
import { LandingSEOHead } from "@/components/landing/LandingSEOHead";
import { WebsiteNavbar } from "@/components/landing/WebsiteNavbar";
import { WebsiteLeadForm } from "@/components/landing/WebsiteLeadForm";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";
import { ExitIntentPopup } from "@/components/landing/ExitIntentPopup";
import { WebsiteTrustBadges } from "@/components/landing/WebsiteTrustBadges";
import { BookingSheet } from "@/components/landing/BookingSheet";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";
import { toast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type IntakeStatus = 'open' | 'waitlist' | 'closed';
type LandingTemplate = 'classic' | 'modern' | 'minimal';

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
  phone: string | null;
  address: string | null;
  whatsapp_enabled: boolean | null;
  whatsapp_number: string | null;
  exit_intent_enabled: boolean | null;
  website_active_pages: string[] | null;
  landing_template: LandingTemplate | null;
  service_area_text: string | null;
  qualifications: { title: string; year: string; institution?: string }[] | null;
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  horses_treated: number | null;
  years_experience: number | null;
  service_area_km: number | null;
  instagram_posts: { image_url: string; caption?: string; post_url?: string }[] | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration: number | null;
  booking_action: 'direct_book' | 'request_only';
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string | null;
  created_at: string;
  source?: string;
  proof_image_url?: string;
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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  featured_image_url: string | null;
  published_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const DEFAULT_SECTION_ORDER = ["hero", "trust_counters", "about", "services", "highlights", "list_items", "shop_grid", "before_after", "gallery", "instagram", "faq", "service_area", "qualifications", "reviews", "contact"];

const ProviderLanding = () => {
  const { slug, page } = useParams<{ slug: string; page?: string }>();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [inquiryModal, setInquiryModal] = useState<{ open: boolean; serviceName: string }>({ open: false, serviceName: "" });
  const [bookingOpen, setBookingOpen] = useState(false);

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

        // Fetch all data in parallel
        const [offersRes, servicesRes, feedbackRes, reviewsRes, blogRes, hoofRes, faqsRes] = await Promise.all([
          supabase.from('offers').select('id, title, description, price, price_type, features, is_active, image_url, offer_type, display_mode, media_url, external_link, billing_type').eq('provider_id', typedBusinessData.user_id).eq('is_active', true).neq('display_mode', 'hidden').order('sort_order').limit(20),
          supabase.from('services').select('id, name, description, base_price, duration, booking_action').eq('provider_id', typedBusinessData.user_id).eq('is_active', true).order('name').limit(10),
          supabase.rpc('get_public_feedbacks', { provider_id_input: typedBusinessData.user_id }),
          supabase.rpc('get_public_reviews', { provider_id_input: typedBusinessData.user_id }),
          supabase.from('provider_blog_posts').select('id, title, slug, excerpt, content, category, featured_image_url, published_at').eq('owner_id', typedBusinessData.user_id).eq('is_published', true).order('published_at', { ascending: false }).limit(20),
          supabase.from('hoof_photos').select('id, photo_url, hoof_position, notes, horse_id, horses!inner(name, owner_id)').order('created_at', { ascending: false }).limit(20),
          supabase.rpc('get_public_faqs', { provider_id_input: typedBusinessData.user_id }),
        ]);

        if (offersRes.data) setOffers(offersRes.data);
        if (servicesRes.data) {
          setServices(servicesRes.data.slice(0, 6) as Service[]);
        }
        if (feedbackRes.data) setFeedbacks(feedbackRes.data);
        if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);
        if (blogRes.data) setBlogPosts(blogRes.data as BlogPost[]);
        if (faqsRes.data) setFaqs(faqsRes.data as FAQ[]);

        if (hoofRes.data && hoofRes.data.length >= 2) {
          const pairs: GalleryImage[] = [];
          for (let i = 0; i < hoofRes.data.length - 1; i += 2) {
            const horse = hoofRes.data[i].horses as any;
            pairs.push({
              id: hoofRes.data[i].id,
              before_url: hoofRes.data[i + 1].photo_url,
              after_url: hoofRes.data[i].photo_url,
              title: horse?.name || "Hufbearbeitung",
              description: hoofRes.data[i].hoof_position || undefined,
            });
          }
          setGalleryImages(pairs.slice(0, 6));
        }

        // Track page view (anonymous, fire-and-forget)
        supabase.from('provider_page_views').insert({
          provider_id: typedBusinessData.user_id,
          page: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        }).then(() => {});

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProviderData();
  }, [slug]);

  const primaryColor = settings?.primary_color || '#F5970A';
  const intakeStatus: IntakeStatus = (settings?.client_intake_status as IntakeStatus) || 'open';
  const activePages: string[] = (settings?.website_active_pages as string[]) || ["home", "contact", "impressum", "datenschutz"];
  const template: LandingTemplate = (settings?.landing_template as LandingTemplate) || 'classic';
  const sectionOrder = useMemo(() => {
    const order = settings?.section_order;
    if (Array.isArray(order) && order.length > 0) return order;
    return DEFAULT_SECTION_ORDER;
  }, [settings?.section_order]);
  const providerName = settings?.owner_name || settings?.business_name || 'Hufbearbeiter';
  const isMultiPage = activePages.length > 4;

  const handleServiceRequest = (serviceName: string) => setInquiryModal({ open: true, serviceName });
  const handleServiceBook = (serviceName: string) => {
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
    toast({ title: `Buchung für: ${serviceName}`, description: "Bitte füllen Sie das Kontaktformular aus." });
  };
  const scrollToContact = () => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });

  // Template-specific CSS classes
  const templateClasses = useMemo(() => {
    switch (template) {
      case 'modern':
        return {
          heroExtra: 'min-h-screen',
          sectionSpacing: 'py-20',
          reviewsLayout: 'marquee' as const,
        };
      case 'minimal':
        return {
          heroExtra: '',
          sectionSpacing: 'py-12',
          reviewsLayout: 'grid' as const,
        };
      default: // classic
        return {
          heroExtra: '',
          sectionSpacing: 'py-16',
          reviewsLayout: (settings?.reviews_layout || 'grid') as any,
        };
    }
  }, [template, settings?.reviews_layout]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (profileIncomplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl">🔧</span></div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Profil wird eingerichtet</h1>
          <p className="text-muted-foreground">Dieses Profil ist noch nicht vollständig eingerichtet. Bitte schauen Sie später noch einmal vorbei.</p>
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

  // SEO title based on current page
  const getSeoTitle = () => {
    const city = settings.address?.split(",").pop()?.trim() || "";
    const name = settings.business_name || settings.owner_name || "Hufpfleger";
    switch (page) {
      case "ueber-mich": return `Über ${name} — Ihr Hufpfleger${city ? ` in ${city}` : ""}`;
      case "leistungen": return `Hufpflege Leistungen | ${name}${city ? ` in ${city}` : ""}`;
      case "galerie": return `Galerie | ${name} Hufpflege`;
      case "kontakt": return `Kontakt & Termin | ${name}${city ? ` ${city}` : ""}`;
      case "blog": return `Blog | ${name} — Fachwissen rund ums Pferd`;
      case "referenzen": return `Bewertungen | ${name} Hufpflege`;
      default: return undefined;
    }
  };

  const seoTitle = getSeoTitle();
  if (seoTitle) document.title = seoTitle;

  // Render sub-pages
  const renderSubPage = () => {
    switch (page) {
      case "ueber-mich":
        return (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-6">Über {providerName}</h1>
            {settings.about_text ? (
              <div className="prose prose-lg text-foreground/80 max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(settings.about_text) }} />
            ) : (
              <p className="text-muted-foreground">Noch keine Beschreibung hinterlegt.</p>
            )}
            <WebsiteTrustBadges primaryColor={primaryColor} />
          </div>
        );
      case "leistungen":
        return (
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-8">Leistungen & Preise</h1>
            {services.length > 0 ? (
              <LandingServices services={services} primaryColor={primaryColor} onBook={handleServiceBook} onRequest={handleServiceRequest} />
            ) : (
              <p className="text-muted-foreground">Keine Leistungen hinterlegt.</p>
            )}
          </div>
        );
      case "galerie":
        return (
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-8">Galerie</h1>
            {settings.gallery_images && settings.gallery_images.length > 0 ? (
              <GallerySection images={settings.gallery_images} primaryColor={primaryColor} />
            ) : galleryImages.length > 0 ? (
              <LandingBeforeAfter galleryImages={galleryImages} primaryColor={primaryColor} />
            ) : (
              <p className="text-muted-foreground">Noch keine Bilder vorhanden.</p>
            )}
          </div>
        );
      case "kontakt":
        return (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-8">Kontakt</h1>
            <WebsiteLeadForm
              providerId={settings.user_id}
              providerName={providerName}
              primaryColor={primaryColor}
              services={services.map((s) => ({ id: s.id, name: s.name }))}
            />
          </div>
        );
      case "referenzen":
        return (
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-8">Bewertungen & Referenzen</h1>
            {reviews.length > 0 ? (
              <ReviewsSection reviews={reviews} primaryColor={primaryColor} layout={settings.reviews_layout || 'grid'} />
            ) : (
              <p className="text-muted-foreground">Noch keine Bewertungen.</p>
            )}
          </div>
        );
      case "blog":
        return <BlogPage blogPosts={blogPosts} slug={slug!} primaryColor={primaryColor} />;
      case "impressum":
        return (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-6">Impressum</h1>
            {settings.impressum_text ? (
              <div className="prose text-foreground/80 max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(settings.impressum_text) }} />
            ) : (
              <p className="text-muted-foreground">Kein Impressum hinterlegt.</p>
            )}
          </div>
        );
      case "datenschutz":
        return (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-6">Datenschutzerklärung</h1>
            {settings.terms_text ? (
              <div className="prose text-foreground/80 max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(settings.terms_text) }} />
            ) : (
              <p className="text-muted-foreground">Keine Datenschutzerklärung hinterlegt.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Build home page sections
  const qualifications = settings.qualifications as any;
  const sectionMap: Record<string, React.ReactNode> = {
    hero: <LandingHero key="hero" settings={settings} primaryColor={primaryColor} intakeStatus={intakeStatus} onScrollToContact={scrollToContact} onBooking={services.length > 0 ? () => setBookingOpen(true) : undefined} />,
    trust_counters: (settings.horses_treated || settings.years_experience || settings.service_area_km) ? <LandingTrustCounters key="trust_counters" horsesTreated={settings.horses_treated || 0} yearsExperience={settings.years_experience || 0} serviceAreaKm={settings.service_area_km || 0} primaryColor={primaryColor} /> : null,
    about: settings.about_text ? <LandingAbout key="about" aboutText={settings.about_text} /> : null,
    services: services.length > 0 ? <LandingServices key="services" services={services} primaryColor={primaryColor} onBook={handleServiceBook} onRequest={handleServiceRequest} /> : null,
    highlights: offers.filter(o => o.display_mode === 'highlight_card' || !o.display_mode).length > 0 ? <LandingHighlights key="highlights" offers={offers.filter(o => (o.display_mode === 'highlight_card' || !o.display_mode))} primaryColor={primaryColor} /> : null,
    list_items: offers.filter(o => o.display_mode === 'list_item').length > 0 ? <LandingListItems key="list_items" offers={offers.filter(o => o.display_mode === 'list_item')} primaryColor={primaryColor} /> : null,
    shop_grid: offers.filter(o => o.display_mode === 'shop_grid').length > 0 ? <LandingShopGrid key="shop_grid" offers={offers.filter(o => o.display_mode === 'shop_grid')} primaryColor={primaryColor} /> : null,
    before_after: galleryImages.length > 0 ? <LandingBeforeAfter key="before_after" galleryImages={galleryImages} primaryColor={primaryColor} /> : null,
    gallery: settings.gallery_images && settings.gallery_images.length > 0 ? <GallerySection key="gallery" images={settings.gallery_images} primaryColor={primaryColor} /> : null,
    instagram: Array.isArray(settings.instagram_posts) && settings.instagram_posts.length > 0 ? <LandingInstagramFeed key="instagram" posts={settings.instagram_posts} instagramHandle={settings.social_instagram} primaryColor={primaryColor} /> : null,
    faq: faqs.length > 0 ? <LandingFAQ key="faq" faqs={faqs} primaryColor={primaryColor} /> : null,
    service_area: settings.service_area_text ? <LandingServiceArea key="service_area" serviceAreaText={settings.service_area_text} primaryColor={primaryColor} /> : null,
    qualifications: Array.isArray(qualifications) && qualifications.length > 0 ? <LandingQualifications key="qualifications" qualifications={qualifications} primaryColor={primaryColor} /> : null,
    reviews: reviews.length > 0 ? <ReviewsSection key="reviews" reviews={reviews} primaryColor={primaryColor} layout={templateClasses.reviewsLayout} /> : feedbacks.length > 0 ? <ReviewsSection key="reviews-legacy" reviews={feedbacks.map(f => ({ id: f.id, reviewer_name: f.customer_name, rating: f.rating, text: f.text, created_at: '' }))} primaryColor={primaryColor} layout="grid" /> : null,
    contact: intakeStatus !== 'closed' ? <LandingContact key="contact" providerId={settings.user_id} providerName={providerName} primaryColor={primaryColor} /> : null,
  };

  const isSubPage = page && page !== "";

  return (
    <div className={cn("min-h-screen bg-background", template === 'minimal' && "bg-white")}>
      <LandingSEOHead settings={settings} currentPage={page} />

      {isMultiPage && (
        <WebsiteNavbar
          slug={slug!}
          businessName={settings.business_name || providerName}
          logoUrl={settings.logo_url}
          primaryColor={primaryColor}
          activePages={activePages}
          phone={settings.phone}
        />
      )}

      {!isSubPage && (
        <div className="fixed top-4 right-4 z-50">
          <IntakeStatusBadge status={intakeStatus} />
        </div>
      )}

      {isSubPage ? (
        <main className="min-h-[60vh]">
          {renderSubPage()}
        </main>
      ) : (
        <>
          {sectionOrder.map((sectionKey) => sectionMap[sectionKey] || null)}

          {activePages.includes("blog") && blogPosts.length > 0 && (
            <section className="py-16 px-4 bg-muted/30">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground mb-8">Neueste Artikel</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {blogPosts.slice(0, 3).map((post) => (
                    <Link key={post.id} to={`/p/${slug}/blog?post=${post.slug}`} className="group border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
                      {post.featured_image_url && (
                        <img src={post.featured_image_url} alt={post.title} className="w-full aspect-video object-cover" loading="lazy" />
                      )}
                      <div className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          {post.published_at && format(new Date(post.published_at), "dd. MMMM yyyy", { locale: de })}
                        </p>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                        {post.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <LegalFooter
        businessName={settings.business_name || providerName}
        impressumText={settings.impressum_text}
        termsText={settings.terms_text}
        primaryColor={primaryColor}
        socialInstagram={settings.social_instagram}
        socialFacebook={settings.social_facebook}
        socialTiktok={settings.social_tiktok}
        socialWebsite={settings.social_website}
      />

      <LeadChatBot providerId={settings.user_id} providerName={providerName} providerLogo={settings.logo_url} primaryColor={primaryColor} />

      {settings.whatsapp_enabled && settings.whatsapp_number && (
        <WhatsAppButton phoneNumber={settings.whatsapp_number} providerName={providerName} />
      )}

      {settings.exit_intent_enabled && (
        <ExitIntentPopup providerId={settings.user_id} providerName={providerName} primaryColor={primaryColor} />
      )}

      <ServiceInquiryModal open={inquiryModal.open} onOpenChange={(open) => setInquiryModal({ ...inquiryModal, open })} serviceName={inquiryModal.serviceName} providerId={settings.user_id} primaryColor={primaryColor} />

      {services.length > 0 && (
        <BookingSheet
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          services={services}
          providerId={settings.user_id}
          providerName={providerName}
          primaryColor={primaryColor}
        />
      )}

      <StickyMobileCTA
        primaryColor={primaryColor}
        onBooking={services.length > 0 ? () => setBookingOpen(true) : scrollToContact}
        whatsappNumber={settings.whatsapp_enabled ? settings.whatsapp_number : null}
        providerName={providerName}
      />

      <CookieConsentBanner primaryColor={primaryColor} />
    </div>
  );
};

// Blog sub-page component
function BlogPage({ blogPosts, slug, primaryColor }: { blogPosts: BlogPost[]; slug: string; primaryColor: string }) {
  const urlParams = new URLSearchParams(window.location.search);
  const postSlug = urlParams.get("post");

  if (postSlug) {
    const post = blogPosts.find((p) => p.slug === postSlug);
    if (!post) return <div className="max-w-3xl mx-auto px-4 py-16"><p className="text-muted-foreground">Artikel nicht gefunden.</p></div>;
    document.title = post.title;

    return (
      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link to={`/p/${slug}/blog`} className="inline-flex items-center gap-1 text-sm text-primary mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Alle Artikel
        </Link>
        {post.featured_image_url && (
          <img src={post.featured_image_url} alt={post.title} className="w-full aspect-video object-cover rounded-lg mb-6" loading="lazy" />
        )}
        <p className="text-sm text-muted-foreground mb-2">
          {post.published_at && format(new Date(post.published_at), "dd. MMMM yyyy", { locale: de })}
        </p>
        <h1 className="text-3xl font-bold text-foreground mb-6">{post.title}</h1>
        <div className="prose prose-lg max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
      </article>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-foreground mb-8">Blog</h1>
      {blogPosts.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Artikel veröffentlicht.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} to={`/p/${slug}/blog?post=${post.slug}`} className="group border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
              {post.featured_image_url && (
                <img src={post.featured_image_url} alt={post.title} className="w-full aspect-video object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {post.published_at && format(new Date(post.published_at), "dd. MMMM yyyy", { locale: de })}
                </p>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                {post.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProviderLanding;
