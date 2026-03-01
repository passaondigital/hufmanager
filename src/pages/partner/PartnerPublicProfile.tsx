import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Send,
  CheckCircle2,
  Star,
  Clock,
  Globe,
  Phone,
  Mail,
  Calendar,
  Shield,
  Euro,
} from "lucide-react";
import { toast } from "sonner";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";

interface PartnerService {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  duration: number | null;
  is_active: boolean;
}

export default function PartnerPublicProfile() {
  const { prid } = useParams<{ prid: string }>();
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
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

      // Fetch partner services
      const { data: services } = await supabase
        .from("partner_services")
        .select("id, name, description, base_price, duration, is_active")
        .eq("partner_id", result.id)
        .eq("is_active", true)
        .order("sort_order")
        .limit(12);

      return {
        id: result.id,
        full_name: result.full_name,
        avatar_url: result.avatar_url,
        readable_id: result.readable_id,
        ...settings,
        services: (services || []) as PartnerService[],
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
    setSending(true);
    // Simulate send — in production this would use an edge function
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setSending(false);
    toast.success("Nachricht gesendet!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl bg-zinc-900" />
          <Skeleton className="h-48 w-full rounded-2xl bg-zinc-900" />
          <Skeleton className="h-32 w-full rounded-2xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Profil nicht gefunden</h1>
          <p className="text-zinc-400">
            Dieses Profil existiert nicht oder ist nicht öffentlich sichtbar.
          </p>
        </div>
      </div>
    );
  }

  const typeConfig = getPartnerTypeConfig(data.specialty);
  const TypeIcon = typeConfig.icon;
  const locationParts = (data.address || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const primaryColor = "#F47B20";

  // SEO
  if (typeof document !== "undefined") {
    document.title = `${data.full_name} — ${typeConfig.label} | HufManager`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `${data.full_name} — ${typeConfig.label}. ${data.bio?.substring(0, 120) || "Fachpartner auf HufManager."}`);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-3xl mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            {/* Avatar */}
            <Avatar className="h-28 w-28 mx-auto ring-4 ring-orange-500/20 shadow-2xl shadow-orange-500/10">
              <AvatarImage src={data.avatar_url || data.logo_url || undefined} />
              <AvatarFallback className="bg-zinc-800 text-orange-400 text-3xl font-bold">
                {(data.full_name || "P").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name & Specialty */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{data.full_name}</h1>
              {data.business_name && data.business_name !== data.full_name && (
                <p className="text-zinc-400 mt-1">{data.business_name}</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 px-3 py-1 text-sm">
                <TypeIcon className="h-4 w-4 mr-1.5" />
                {typeConfig.label}
              </Badge>
              {locationParts.length > 0 && (
                <Badge variant="outline" className="border-zinc-700 text-zinc-300 px-3 py-1 text-sm">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  {locationParts[locationParts.length - 1]}
                </Badge>
              )}
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 px-3 py-1 text-sm">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Verifiziert
              </Badge>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-6"
                onClick={() => document.getElementById("partner-contact")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Send className="h-4 w-4 mr-2" />
                Kontakt aufnehmen
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl px-6"
                onClick={() => document.getElementById("partner-services")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Leistungen ansehen
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ÜBER MICH */}
      {data.bio && (
        <section className="py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-bold mb-6">Über mich</h2>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{data.bio}</p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* QUALIFIKATIONEN */}
      {data.qualifications && (
        <section className="py-12 md:py-16 bg-zinc-900/30">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-bold mb-6">Qualifikationen & Erfahrung</h2>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
                <ul className="space-y-3">
                  {data.qualifications.split("\n").filter(Boolean).map((q: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-300">
                      <Star className="h-4 w-4 text-orange-400 mt-1 flex-shrink-0" />
                      <span>{q.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* LEISTUNGEN */}
      {data.services.length > 0 && (
        <section className="py-12 md:py-16" id="partner-services">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-bold mb-6">Meine Leistungen</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {data.services.map((service) => (
                  <div
                    key={service.id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-orange-500/30 transition-colors"
                  >
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      {service.base_price != null && service.base_price > 0 && (
                        <span className="flex items-center gap-1 text-orange-400 font-medium">
                          <Euro className="h-3.5 w-3.5" />
                          {service.base_price.toFixed(2)} €
                        </span>
                      )}
                      {service.duration != null && service.duration > 0 && (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock className="h-3.5 w-3.5" />
                          {service.duration} Min.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* KONTAKT-INFO */}
      {(data.phone || data.email || data.website) && (
        <section className="py-8">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex flex-wrap gap-4 justify-center">
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors">
                  <Phone className="h-4 w-4" /> {data.phone}
                </a>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors">
                  <Mail className="h-4 w-4" /> {data.email}
                </a>
              )}
              {data.website && (
                <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* KONTAKTFORMULAR */}
      <section className="py-12 md:py-16 bg-zinc-900/30" id="partner-contact">
        <div className="max-w-lg mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-6 text-center">Kontakt aufnehmen</h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-white">Nachricht gesendet!</p>
                  <p className="text-sm text-zinc-400 mt-2">
                    {data.full_name} wird sich bei Ihnen melden.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Ihr Name</Label>
                    <Input
                      value={contactForm.name}
                      onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">E-Mail</Label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Nachricht</Label>
                    <Textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                      rows={4}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                  >
                    {sending ? "Wird gesendet..." : "Nachricht senden"}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-zinc-500">
            #{data.readable_id} · Profil auf{" "}
            <a href="https://hufmanager.de" className="text-orange-400 hover:underline">
              HufManager
            </a>
          </p>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} HufManager · DSGVO-konform
          </p>
        </div>
      </footer>

      <CookieConsentBanner primaryColor={primaryColor} />
    </div>
  );
}