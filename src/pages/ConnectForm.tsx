import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Loader2, Footprints, User, MapPin } from "lucide-react";
import { z } from "zod";

// Input validation schema
const formSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(100, "Name darf maximal 100 Zeichen haben"),
  phone: z.string().trim().max(30, "Telefonnummer darf maximal 30 Zeichen haben").optional().or(z.literal("")),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255, "E-Mail darf maximal 255 Zeichen haben").optional().or(z.literal("")),
  horse_name: z.string().trim().min(2, "Pferdename muss mindestens 2 Zeichen haben").max(100, "Pferdename darf maximal 100 Zeichen haben"),
  stable_location: z.string().trim().max(200, "Stallname darf maximal 200 Zeichen haben").optional().or(z.literal("")),
  message: z.string().trim().max(1000, "Nachricht darf maximal 1000 Zeichen haben").optional().or(z.literal("")),
});

const ConnectForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    horse_name: "",
    stable_location: "",
    message: "",
  });

  // Fetch magic link via secure RPC function (prevents enumeration)
  const { data: magicLink, isLoading, error } = useQuery({
    queryKey: ["magic-link-public", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug");
      
      // Use SECURITY DEFINER function instead of direct table access
      const { data, error } = await supabase.rpc("validate_magic_link", {
        slug_input: slug,
      });
      
      if (error) throw error;
      
      // Cast to expected type - function returns JSONB
      const result = data as { valid: boolean; id?: string; provider_id?: string; provider_name?: string; provider_avatar?: string | null } | null;
      
      // Function returns { valid: false } if not found
      if (!result || !result.valid) {
        throw new Error("Invalid magic link");
      }
      
      // Transform to match expected structure
      return {
        id: result.id,
        provider_id: result.provider_id,
        profiles: {
          full_name: result.provider_name,
          avatar_url: result.provider_avatar,
        },
      };
    },
    enabled: !!slug,
  });

  const submitMutation = useMutation({
    mutationFn: async (validatedData: z.infer<typeof formSchema>) => {
      if (!magicLink?.provider_id) throw new Error("No provider");

      // Build message with validated and trimmed data
      const messageContent = [
        `Pferd: ${validatedData.horse_name}`,
        validatedData.stable_location ? `Stall: ${validatedData.stable_location}` : null,
        validatedData.message || null,
      ].filter(Boolean).join("\n\n");

      // Create lead entry with validated data
      const { error: leadError } = await supabase
        .from("leads")
        .insert({
          provider_id: magicLink.provider_id,
          name: validatedData.name,
          phone: validatedData.phone || null,
          email: validatedData.email || null,
          message: messageContent,
          source: "magic_link",
          lead_type: "termin",
          status: "neu",
        });

      if (leadError) throw leadError;

      // Create contact entry with validated data
      const { error: contactError } = await supabase
        .from("contacts")
        .insert({
          provider_id: magicLink.provider_id,
          category: "lead",
          full_name: validatedData.name,
          phone: validatedData.phone || null,
          email: validatedData.email || null,
          notes: `Pferd: ${validatedData.horse_name}${validatedData.stable_location ? `\nStall: ${validatedData.stable_location}` : ""}`,
          source: "magic_link",
        });

      if (contactError) throw contactError;

      // Update usage count atomically
      await supabase.rpc("increment_magic_link_uses", { link_id: magicLink.id });

      return true;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      console.error("Form submission error:", error);
      toast({
        title: "Fehler",
        description: "Deine Anfrage konnte nicht gesendet werden. Bitte versuche es später erneut.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data with zod schema
    const result = formSchema.safeParse(formData);
    
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Ungültige Eingabe",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }
    
    submitMutation.mutate(result.data);
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
                maxLength={100}
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
                  maxLength={30}
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
                  maxLength={255}
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
                maxLength={100}
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
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Nachricht (optional, max. 1000 Zeichen)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="z.B. Wann ist der beste Zeitraum für einen Termin?"
                rows={3}
                maxLength={1000}
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
