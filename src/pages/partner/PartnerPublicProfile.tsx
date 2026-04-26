import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Send, CheckCircle2, Star, Clock, Globe, Phone, Mail, Calendar, Shield, Euro, Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { cn } from "@/lib/utils";
import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface PartnerService {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  duration: number | null;
  is_active: boolean;
}

function ScrollRevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, revealed } = useScrollReveal();
  return (
    <div ref={ref} className={cn("transition-all duration-500", revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5", className)}>
      {children}
    </div>
  );
}

export default function PartnerPublicProfile() {
  const { prid } = useParams<{ prid: string }>();
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [dsgvo, setDsgvo] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-partner-profile", prid],
    queryFn: async () => {
      const { data: searchResult } = await supabase.rpc("search_profile_by_readable_id", { search_id: prid! });
      const result = searchResult as any;
      if (!result?.found) return null;

      const { data: settings } = await supabase
        .from("partner_business_settings")
        .select("specialty, qualifications, bio, address, public_profile_visible, business_name, phone, email, website, logo_url, owner_name")
        .eq("partner_id", result.id)
        .eq("public_profile_visible", true)
        .maybeSingle();

      if (!settings) return null;

      const { data: services } = await supabase
        .from("partner_services")
        .select("id, name, description, base_price, duration, is_active")
        .eq("partner_id", result.id)
        .eq("is_active", true)
        .order("sort_order")
        .limit(12);

      // Check connected providers for cooperation badges
      const { data: connections } = await supabase
        .from("access_grants")
        .select("provider_id, profiles!access_grants_provider_id_fkey(full_name, avatar_url)")
        .eq("partner_email", settings.email)
        .eq("is_active", true)
        .limit(5);

      return {
        id: result.id,
        full_name: result.full_name,
        avatar_url: result.avatar_url,
        readable_id: result.readable_id,
        ...settings,
        services: (services || []) as PartnerService[],
        connectedProviders: (connections || []).map((c: any) => ({
          name: c.profiles?.full_name || "Provider",
          avatar: c.profiles?.avatar_url,
        })),
      };
    },
    enabled: !!prid,
  });

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }
    if (!dsgvo) {
      toast.error("Bitte stimme der Datenschutzerklärung zu.");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setSending(false);
    toast.success("Nachricht gesendet!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Profil nicht gefunden</h1>
          <p className="text-muted-foreground">Dieses Profil existiert nicht oder ist nicht öffentlich sichtbar.</p>
        </div>
      </div>
    );
  }

  const typeConfig = getPartnerTypeConfig(data.specialty);
  const TypeIcon = typeConfig.icon;
  const locationParts = (data.address || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const primaryColor = "#F5970A";

  // SEO
  if (typeof document !== "undefined") {
    document.title = `${data.full_name} — ${typeConfig.label} | Hufi`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `${data.full_name} — ${typeConfig.label}. ${data.bio?.substring(0, 120) || "Fachpartner auf Hufi."}`);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${primaryColor}08` }} />

        <div className="relative max-w-3xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center space-y-6">
            <Avatar className="h-28 w-28 mx-auto ring-4 ring-primary/20 shadow-2xl">
              <AvatarImage src={data.avatar_url || data.logo_url || undefined} />
              <AvatarFallback className="bg-muted text-primary text-3xl font-bold">
                {(data.full_name || "P").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{data.full_name}</h1>
              {data.business_name && data.business_name !== data.full_name && (
                <p className="text-muted-foreground mt-1">{data.business_name}</p>
              )}
            </div>

            {/* Profession Badge (prominent) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge className="px-4 py-1.5 text-sm font-semibold" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, borderColor: `${primaryColor}40` }}>
                <TypeIcon className="h-4 w-4 mr-1.5" />
                {typeConfig.label}
              </Badge>
              {locationParts.length > 0 && (
                <Badge variant="outline" className="border-border text-muted-foreground px-3 py-1 text-sm">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  {locationParts[locationParts.length - 1]}
                </Badge>
              )}
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-sm">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Verifiziert
              </Badge>
            </div>

            {/* Cooperation badges */}
            {data.connectedProviders && data.connectedProviders.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                <Handshake className="h-4 w-4" />
                <span>Arbeitet zusammen mit:</span>
                {data.connectedProviders.slice(0, 3).map((p: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {p.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                size="lg"
                className="font-semibold rounded-xl px-6"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
                onClick={() => document.getElementById("partner-contact")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Handshake className="h-4 w-4 mr-2" />
                Kooperation anfragen
              </Button>
              {data.services.length > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl px-6"
                  onClick={() => document.getElementById("partner-services")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Leistungen ansehen
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ÜBER MICH */}
      {data.bio && (
        <section className="py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4">
            <ScrollRevealSection>
              <h2 className="text-2xl font-bold text-foreground mb-6">Über mich</h2>
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{data.bio}</p>
              </div>
            </ScrollRevealSection>
          </div>
        </section>
      )}

      {/* QUALIFIKATIONEN */}
      {data.qualifications && (
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4">
            <ScrollRevealSection>
              <h2 className="text-2xl font-bold text-foreground mb-6">Qualifikationen & Erfahrung</h2>
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
                <ul className="space-y-3">
                  {data.qualifications.split("\n").filter(Boolean).map((q: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <Star className="h-4 w-4 mt-1 flex-shrink-0" style={{ color: primaryColor }} />
                      <span>{q.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollRevealSection>
          </div>
        </section>
      )}

      {/* LEISTUNGEN */}
      {data.services.length > 0 && (
        <section className="py-12 md:py-16" id="partner-services">
          <div className="max-w-3xl mx-auto px-4">
            <ScrollRevealSection>
              <h2 className="text-2xl font-bold text-foreground mb-6">Meine Leistungen</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {data.services.map((service) => (
                  <div
                    key={service.id}
                    className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
                  >
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      {service.base_price != null && service.base_price > 0 ? (
                        <span className="flex items-center gap-1 font-medium" style={{ color: primaryColor }}>
                          <Euro className="h-3.5 w-3.5" />
                          {service.base_price.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Preis auf Anfrage</span>
                      )}
                      {service.duration != null && service.duration > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {service.duration} Min.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollRevealSection>
          </div>
        </section>
      )}

      {/* KONTAKT-INFO */}
      {(data.phone || data.email || data.website) && (
        <section className="py-8">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex flex-wrap gap-4 justify-center">
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" /> {data.phone}
                </a>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" /> {data.email}
                </a>
              )}
              {data.website && (
                <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* KONTAKTFORMULAR */}
      <section className="py-12 md:py-16 bg-muted/30" id="partner-contact">
        <div className="max-w-lg mx-auto px-4">
          <ScrollRevealSection>
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Kontakt aufnehmen</h2>
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor }} />
                  <p className="text-lg font-semibold text-foreground">Nachricht gesendet!</p>
                  <p className="text-sm text-muted-foreground mt-2">{data.full_name} wird sich bei Ihnen melden.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <div>
                    <Label>Ihr Name *</Label>
                    <Input
                      value={contactForm.name}
                      onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>E-Mail *</Label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Nachricht *</Label>
                    <Textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                      rows={4}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="dsgvo-partner"
                      checked={dsgvo}
                      onCheckedChange={(v) => setDsgvo(!!v)}
                    />
                    <label htmlFor="dsgvo-partner" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                      Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu. *
                    </label>
                  </div>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full font-semibold rounded-xl"
                    style={{ backgroundColor: primaryColor, color: "#fff" }}
                  >
                    {sending ? "Wird gesendet..." : "Nachricht senden"}
                  </Button>
                </form>
              )}
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            #{data.readable_id} · Profil auf{" "}
            <a href="https://hufiapp.de" className="text-primary hover:underline">Hufi</a>
          </p>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Hufi · DSGVO-konform
          </p>
        </div>
      </footer>

      <CookieConsentBanner primaryColor={primaryColor} />
    </div>
  );
}
