import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { z } from "zod";
import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(100),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

const ConnectForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | "register" | "success">("welcome");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [dsgvoConsent, setDsgvoConsent] = useState(false);

  // Validate magic link and get provider + client info
  const { data: linkData, isLoading, error } = useQuery({
    queryKey: ["connect-form", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug");

      const { data, error } = await supabase.rpc("validate_magic_link", {
        slug_input: slug,
      });

      if (error) throw error;

      const result = data as {
        valid: boolean;
        id?: string;
        provider_id?: string;
        provider_name?: string;
        provider_avatar?: string | null;
      } | null;

      if (!result || !result.valid) {
        throw new Error("Invalid magic link");
      }

      // Try to get client info from magic_links.client_id
      let clientName: string | null = null;
      let horseName: string | null = null;
      let horsePhoto: string | null = null;
      let clientEmail: string | null = null;

      // Get client_id from magic_links
      const { data: mlData } = await supabase
        .from("magic_links")
        .select("client_id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (mlData?.client_id) {
        // Get client profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", mlData.client_id)
          .maybeSingle();

        if (profile) {
          clientName = profile.full_name?.split(" ")[0] || null;
          clientEmail = profile.email;
        }

        // Get first horse
        const { data: horse } = await supabase
          .from("horses")
          .select("name, photo_url")
          .eq("owner_id", mlData.client_id)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();

        if (horse) {
          horseName = horse.name;
          horsePhoto = horse.photo_url;
        }
      }

      return {
        id: result.id,
        providerId: result.provider_id,
        providerName: result.provider_name || "Dein Hufbearbeiter",
        providerAvatar: result.provider_avatar,
        clientName,
        clientEmail,
        horseName,
        horsePhoto,
        clientId: mlData?.client_id,
      };
    },
    enabled: !!slug,
  });

  // Pre-fill form when data loads
  const prefillDone = useState(false);
  if (linkData && !prefillDone[0]) {
    if (linkData.clientName && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: linkData.clientName || "",
        email: linkData.clientEmail || "",
      }));
    }
    prefillDone[1](true);
  }

  const handleRegister = async () => {
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      toast({
        title: "Ungültige Eingabe",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Store invite code for post-login processing
      if (slug) {
        sessionStorage.setItem("huf_invite_code", slug);
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          data: {
            full_name: result.data.name,
            role: "client",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          // Try to sign in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: result.data.email,
            password: result.data.password,
          });

          if (signInError) {
            toast({
              title: "Bereits registriert",
              description: "Bitte melde dich mit deinem bestehenden Passwort an.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        } else {
          throw signUpError;
        }
      }

      // Increment usage
      if (linkData?.id) {
        await supabase.rpc("increment_magic_link_uses", { link_id: linkData.id });
      }

      setStep("success");

      // Redirect after short delay
      setTimeout(() => {
        navigate("/client-home");
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      toast({
        title: "Fehler",
        description: err.message || "Registrierung fehlgeschlagen. Bitte versuche es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !linkData) {
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

  // Step 3: Success
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">Willkommen bei HufManager! 🐴</h2>
            <p className="text-muted-foreground">
              Du wirst gleich weitergeleitet...
            </p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Welcome
  if (step === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full overflow-hidden">
          {/* Horse photo banner */}
          {linkData.horsePhoto && (
            <div className="h-40 overflow-hidden">
              <img
                src={linkData.horsePhoto}
                alt={linkData.horseName || "Pferd"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <CardContent className="py-8 text-center space-y-6">
            <div className="space-y-2">
              <span className="text-4xl">🐴</span>
              <h1 className="text-2xl font-bold text-foreground">
                Willkommen bei HufManager
              </h1>
              <p className="text-muted-foreground">
                <strong>{linkData.providerName}</strong> hat dich eingeladen.
              </p>
            </div>

            {linkData.horseName && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Dein Pferd</p>
                <p className="text-lg font-semibold text-foreground">{linkData.horseName}</p>
                <p className="text-xs text-muted-foreground mt-1">ist bereits angelegt ✅</p>
              </div>
            )}

            <div className="space-y-2 text-left">
              <p className="text-sm font-medium text-foreground">Das bekommst du:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  Kommende Termine im Blick
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  Behandlungsberichte einsehen
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  Direkt mit {linkData.providerName.split(" ")[0]} chatten
                </li>
              </ul>
            </div>

            <Button
              className="w-full min-h-[48px] text-base gap-2"
              onClick={() => setStep("register")}
            >
              Jetzt einrichten
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="text-xs text-muted-foreground">
              Kostenlos • Keine App-Installation nötig
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Register
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Zugangsdaten erstellen</CardTitle>
          <CardDescription>
            Nur das Nötigste – in 30 Sekunden fertig
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRegister();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Dein Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Max Mustermann"
                required
                maxLength={100}
                autoComplete="name"
                className="min-h-[44px] text-base"
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
                required
                maxLength={255}
                autoComplete="email"
                className="min-h-[44px] text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="min-h-[44px] text-base pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-[48px] text-base"
              disabled={isSubmitting || !dsgvoConsent}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                "Zugangsdaten erstellen"
              )}
            </Button>

            <div className="flex items-start gap-3">
              <Checkbox
                id="connect-dsgvo"
                checked={dsgvoConsent}
                onCheckedChange={(v) => setDsgvoConsent(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="connect-dsgvo" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                Ich stimme zu, dass meine Daten von{" "}
                <strong>{linkData?.providerName}</strong>{" "}
                über HufManager verarbeitet werden.{" "}
                <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Datenschutzerklärung
                </a> *
              </Label>
            </div>
          </form>
        </CardContent>
      </Card>
      <CookieConsentBanner />
    </div>
  );
};

export default ConnectForm;
