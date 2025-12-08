import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Loader2, Footprints, User, MapPin } from "lucide-react";

const ConnectForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    horse_name: "",
    stable_location: "",
    message: "",
  });

  // Fetch magic link and provider info
  const { data: magicLink, isLoading, error } = useQuery({
    queryKey: ["magic-link-public", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug");
      
      const { data, error } = await supabase
        .from("magic_links")
        .select("*, profiles:provider_id(full_name, avatar_url)")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!magicLink?.provider_id) throw new Error("No provider");

      // Create lead entry
      const { error: leadError } = await supabase
        .from("leads")
        .insert({
          provider_id: magicLink.provider_id,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          message: `Pferd: ${formData.horse_name}\nStall: ${formData.stable_location}\n\n${formData.message}`,
          source: "magic_link",
          lead_type: "termin",
          status: "neu",
        });

      if (leadError) throw leadError;

      // Create contact entry
      const { error: contactError } = await supabase
        .from("contacts")
        .insert({
          provider_id: magicLink.provider_id,
          category: "lead",
          full_name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          notes: `Pferd: ${formData.horse_name}\nStall: ${formData.stable_location}`,
          source: "magic_link",
        });

      if (contactError) throw contactError;

      // Update usage count
      await supabase
        .from("magic_links")
        .update({ uses_count: (magicLink.uses_count || 0) + 1 })
        .eq("id", magicLink.id);

      return true;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Deine Anfrage konnte nicht gesendet werden. Bitte versuche es später erneut.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.horse_name) {
      toast({
        title: "Bitte ausfüllen",
        description: "Name und Pferdename sind erforderlich.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !magicLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Link ungültig</h2>
            <p className="text-muted-foreground">
              Dieser Einladungslink ist nicht mehr aktiv oder existiert nicht.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">Anfrage gesendet!</h2>
            <p className="text-muted-foreground">
              {(magicLink.profiles as any)?.full_name || "Der Hufbearbeiter"} wird sich in Kürze bei dir melden.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Trag dich bei {(magicLink.profiles as any)?.full_name || "mir"} ein
          </CardTitle>
          <CardDescription>
            Fülle das Formular aus und du wirst als Interessent hinzugefügt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dein Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Max Mustermann"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="max@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horse_name" className="flex items-center gap-2">
                <Footprints className="h-4 w-4" />
                Name deines Pferdes *
              </Label>
              <Input
                id="horse_name"
                value={formData.horse_name}
                onChange={(e) => setFormData({ ...formData, horse_name: e.target.value })}
                placeholder="Blitz"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stable" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Stallname / Ort
              </Label>
              <Input
                id="stable"
                value={formData.stable_location}
                onChange={(e) => setFormData({ ...formData, stable_location: e.target.value })}
                placeholder="Reiterhof Sonnenschein, Musterstadt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Nachricht (optional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="z.B. Wann ist der beste Zeitraum für einen Termin?"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                "Anfrage absenden"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectForm;
