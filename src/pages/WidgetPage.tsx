import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { LandingContactForm } from "@/components/landing/LandingContactForm";
import { BookingSheet } from "@/components/landing/BookingSheet";
import { ReviewsSection } from "@/components/landing/ReviewsSection";
import { GallerySection } from "@/components/landing/GallerySection";
import { LeadChatBot } from "@/components/landing/LeadChatBot";
import { LandingServices } from "@/components/landing/sections/LandingServices";
import { PoweredByBadge } from "@/components/widget/PoweredByBadge";
import { toast } from "@/hooks/use-toast";

type WidgetType = "contact" | "booking" | "reviews" | "services" | "chat" | "gallery" | "full";

const RADIUS_MAP: Record<string, string> = {
  sharp: "0px",
  soft: "8px",
  round: "16px",
};

export default function WidgetPage() {
  const { slug, type } = useParams<{ slug: string; type: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Read URL params safely
  const colorParam = searchParams.get("color");
  const radiusParam = searchParams.get("radius") || "soft";
  const modeParam = searchParams.get("mode") || "light";
  const hideBranding = searchParams.get("hide_branding") === "true";

  const widgetType = (type || "contact") as WidgetType;

  // Apply styling via CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const safeColor = colorParam ? `#${encodeURIComponent(colorParam).replace(/%/g, '')}` : null;
    
    if (safeColor && /^#[0-9A-Fa-f]{3,8}$/.test(safeColor)) {
      root.style.setProperty("--widget-primary", safeColor);
    }
    root.style.setProperty("--widget-radius", RADIUS_MAP[radiusParam] || "8px");

    if (modeParam === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Transparent background for embedding
    document.body.style.background = "transparent";
  }, [colorParam, radiusParam, modeParam]);

  // Auto-resize for parent iframe
  const sendResize = useCallback(() => {
    try {
      window.parent.postMessage(
        { type: "huf-widget-resize", height: document.body.scrollHeight },
        "*"
      );
    } catch {}
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => sendResize());
    observer.observe(document.body);
    // Initial resize after render
    const timer = setTimeout(sendResize, 500);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [sendResize]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) { setError("Kein Anbieter angegeben"); setLoading(false); return; }
      try {
        const { data: businessData, error: bizErr } = await supabase
          .rpc("get_public_business_landing", { subdomain_input: slug });
        if (bizErr) throw bizErr;
        if (!businessData) { setError("Anbieter nicht gefunden"); setLoading(false); return; }

        const typed = businessData as any;
        setSettings(typed);

        // Fetch widget-specific data in parallel
        const needsServices = ["services", "booking", "full"].includes(widgetType);
        const needsReviews = ["reviews", "full"].includes(widgetType);

        const svcPromise = needsServices
          ? supabase.from("services").select("id, name, description, base_price, duration, booking_action")
              .eq("provider_id", typed.user_id).eq("is_active", true).order("name").limit(10).then(r => r)
          : Promise.resolve({ data: [] as any[], error: null });
        const revPromise = needsReviews
          ? supabase.rpc("get_public_reviews", { provider_id_input: typed.user_id }).then(r => r)
          : Promise.resolve({ data: [] as any[], error: null });

        const [svcRes, revRes] = await Promise.all([svcPromise, revPromise]);
        if (svcRes.data) setServices(svcRes.data.filter((s: any) => !s.name.toUpperCase().includes("BALANCE")).slice(0, 6));
        if (revRes.data) setReviews(revRes.data);
      } catch (err: any) {
        setError("Widget konnte nicht geladen werden");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, widgetType]);

  const primaryColor = settings?.primary_color || (colorParam ? `#${colorParam}` : "#F5970A");
  const providerName = settings?.owner_name || settings?.business_name || "Anbieter";
  const galleryImages = settings?.gallery_images || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-6">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">{error || "Widget konnte nicht geladen werden"}</p>
          <a href="https://hufiapp.de" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            hufiapp.de
          </a>
        </div>
      </div>
    );
  }

  const handleServiceRequest = (serviceName: string) => {
    document.getElementById("kontakt")?.scrollIntoView({ behavior: "smooth" });
    toast({ title: `Anfrage für: ${serviceName}` });
  };

  return (
    <div className="widget-container p-4" style={{ minHeight: "100px" }}>
      {/* CONTACT */}
      {widgetType === "contact" && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Kontakt an {providerName}</h3>
          <LandingContactForm
            providerId={settings.user_id}
            providerName={providerName}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {/* BOOKING */}
      {widgetType === "booking" && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Termin anfragen bei {providerName}</h3>
          {services.length > 0 ? (
            <div className="space-y-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setBookingOpen(true); }}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-foreground">{s.name}</span>
                    {s.base_price > 0 && (
                      <span className="text-sm font-semibold" style={{ color: primaryColor }}>{s.base_price}€</span>
                    )}
                  </div>
                  {s.duration && <span className="text-xs text-muted-foreground">{s.duration} Min.</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Services verfügbar.</p>
          )}
          <BookingSheet
            open={bookingOpen}
            onOpenChange={setBookingOpen}
            services={services}
            providerId={settings.user_id}
            providerName={providerName}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {/* REVIEWS */}
      {widgetType === "reviews" && (
        <div className="space-y-3">
          {reviews.length > 0 ? (
            <ReviewsSection reviews={reviews.slice(0, 6)} primaryColor={primaryColor} layout="grid" />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Noch keine Bewertungen vorhanden.</p>
          )}
        </div>
      )}

      {/* SERVICES */}
      {widgetType === "services" && (
        <LandingServices
          services={services}
          primaryColor={primaryColor}
          onBook={handleServiceRequest}
          onRequest={handleServiceRequest}
        />
      )}

      {/* CHAT */}
      {widgetType === "chat" && (
        <div className="min-h-[80px]">
          <LeadChatBot
            providerId={settings.user_id}
            providerName={providerName}
            providerLogo={settings.logo_url}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {/* GALLERY */}
      {widgetType === "gallery" && (
        <GallerySection images={galleryImages} primaryColor={primaryColor} />
      )}

      {/* FULL - Complete landing without navbar/footer */}
      {widgetType === "full" && (
        <div className="space-y-8">
          <LandingServices services={services} primaryColor={primaryColor} onBook={handleServiceRequest} onRequest={handleServiceRequest} />
          {galleryImages.length > 0 && <GallerySection images={galleryImages} primaryColor={primaryColor} />}
          {reviews.length > 0 && <ReviewsSection reviews={reviews} primaryColor={primaryColor} layout="grid" />}
          <LandingContactForm providerId={settings.user_id} providerName={providerName} primaryColor={primaryColor} />
        </div>
      )}

      {/* Powered By Badge */}
      <PoweredByBadge show={!hideBranding} />
    </div>
  );
}
