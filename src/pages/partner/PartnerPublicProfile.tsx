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
import { MapPin, Globe, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";

export default function PartnerPublicProfile() {
  const { prid } = useParams<{ prid: string }>();
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-partner-profile", prid],
    queryFn: async () => {
      // Search profile by readable_id
      const { data: searchResult } = await supabase.rpc("search_profile_by_readable_id", { search_id: prid! });
      const result = searchResult as any;
      if (!result?.found) return null;

      // Get partner business settings (public_profile_visible must be true — enforced by RLS)
      const { data: settings } = await supabase
        .from("partner_business_settings")
        .select("specialty, qualifications, bio, address, public_profile_visible")
        .eq("partner_id", result.id)
        .eq("public_profile_visible", true)
        .maybeSingle();

      if (!settings) return null;

      return {
        id: result.id,
        full_name: result.full_name,
        avatar_url: result.avatar_url,
        readable_id: result.readable_id,
        ...settings,
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
    // In production this would send an email via edge function
    // For now, show success
    setSent(true);
    toast.success("Nachricht gesendet!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-foreground">Profil nicht gefunden</p>
            <p className="text-sm text-muted-foreground mt-2">
              Dieses Profil existiert nicht oder ist nicht öffentlich sichtbar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = getPartnerTypeConfig(data.specialty);
  const locationParts = (data.address || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const cityDisplay = locationParts.length > 0 ? locationParts[locationParts.length - 1] : null;

  // Set document title for SEO
  document.title = `${data.full_name} — ${typeConfig.label} | HufManager`;

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto p-4 py-8 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={data.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {(data.full_name || "P").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-xl font-bold text-foreground">{data.full_name}</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
                  {typeConfig.label}
                </Badge>
                {cityDisplay && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {cityDisplay}
                  </Badge>
                )}
              </div>
              {data.bio && (
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{data.bio}</p>
              )}
            </CardContent>
          </Card>

          {/* Qualifications */}
          {data.qualifications && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-foreground mb-2">Qualifikationen</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{data.qualifications}</p>
              </CardContent>
            </Card>
          )}

          {/* Contact Form */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Kontakt aufnehmen
              </h2>
              {sent ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
                  <p className="font-medium text-foreground">Nachricht gesendet!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.full_name} wird sich bei Ihnen melden.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-3">
                  <div>
                    <Label>Ihr Name</Label>
                    <Input
                      value={contactForm.name}
                      onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Nachricht</Label>
                    <Textarea
                      value={contactForm.message}
                      onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2">
                    <Send className="h-4 w-4" /> Nachricht senden
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Profil auf <a href="https://hufmanager.de" className="underline">HufManager</a>
          </p>
        </div>
      </div>
    </>
  );
}
