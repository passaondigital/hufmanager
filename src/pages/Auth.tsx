import { useState, useEffect } from "react";
import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Hammer, Heart, Package, Rocket, KeyRound, Users, Stethoscope, Link2 } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PricingModal } from "@/components/subscription/PricingModal";
import { DemoAccessCards } from "@/components/auth/DemoAccessCards";

// NOTE: Admin access is controlled server-side via user_roles table and RLS policies
// Do NOT add client-side email whitelists - they can be bypassed

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

type RoleOption = "provider" | "client";
type LoginMode = "provider" | "client" | "team";

export default function Auth() {
  const { user, role, loading: authLoading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Invite code from URL (provider's readable_id) or HM Connect invite token
  const inviteCode = searchParams.get("invite_code");
  const hmInviteToken = searchParams.get("invite");
  
  // Login mode (provider vs client)
  const [loginMode, setLoginMode] = useState<LoginMode>("provider");
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  // Default to client if invite_code is present
  const [selectedRole, setSelectedRole] = useState<RoleOption>(inviteCode ? "client" : "provider");

  // Password reset
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Pricing modal
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalTitle, setPricingModalTitle] = useState("");
  const [pricingModalDescription, setPricingModalDescription] = useState("");

  // Admin login modal
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMode, setAdminMode] = useState<"login" | "set-password">("login");

  // Check for admin redirect parameter
  const redirectTo = searchParams.get("redirect");
  const forceLogin = searchParams.get("force") === "login";
  
  // Check for partner invite mode from URL
  const urlMode = searchParams.get("mode");
  const urlEmail = searchParams.get("email");
  const urlRole = searchParams.get("role");

  // Store invite_code in sessionStorage for use after auth callback
  useEffect(() => {
    if (inviteCode) {
      sessionStorage.setItem("huf_invite_code", inviteCode);
    }
    if (hmInviteToken) {
      sessionStorage.setItem("hm_connect_invite", hmInviteToken);
    }
    // Pre-fill partner signup from invite link
    if (urlRole === "partner") {
      setSelectedRole("provider");
    }
    if (urlEmail) {
      setSignupEmail(decodeURIComponent(urlEmail));
    }
  }, [inviteCode, hmInviteToken, urlRole, urlEmail]);

  // Redirect if already logged in
  if (!authLoading && user && role) {
    if (forceLogin) {
      // Allow staying on auth page for admin/testing
    } else {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      const roleToPath: Record<string, string> = {
        admin: "/admin/mission-control",
        provider: "/home",
        employee: "/employee",
        partner: "/partner-home",
        client: "/client-home",
      };
      return <Navigate to={roleToPath[role] || "/home"} replace />;
    }
  }

  const openPricingModal = (title: string, description: string) => {
    setPricingModalTitle(title);
    setPricingModalDescription(description);
    setPricingModalOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (!error) {
      // After successful login, process partner invite token
      const partnerToken = sessionStorage.getItem("partner_invite_token");
      if (partnerToken) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
          if (userId) {
            const { error: acceptError } = await supabase.rpc("accept_partner_invitation", {
              p_token: partnerToken,
              p_user_id: userId,
            });
            if (acceptError) {
              console.error("Error accepting partner invite:", acceptError);
            } else {
              toast.success("Partner-Einladung angenommen!");
            }
          }
        } catch (err) {
          console.error("Error processing partner token:", err);
        } finally {
          sessionStorage.removeItem("partner_invite_token");
        }
      }
    }

    if (error) {
      // Check if account is suspended
      if (error.message.includes("Konto gesperrt")) {
        toast.error(error.message, {
          duration: 8000,
          description: "Bitte kontaktieren Sie den Support.",
        });
      } else if (error.message.includes("Invalid login credentials")) {
        // Just show invalid credentials - don't show pricing modal
        // The user might have a typo in their password, not a missing account
        toast.error("Ungültige Anmeldedaten", {
          description: "Überprüfen Sie E-Mail und Passwort.",
        });
      } else if (error.message.includes("User not found")) {
        // User actually doesn't exist - show pricing modal for providers
        if (loginMode === "provider") {
          openPricingModal(
            "Noch kein Account?",
            "Wähle jetzt dein Paket und starte mit HufManager."
          );
        } else {
          toast.error("Kein Konto mit dieser E-Mail gefunden");
        }
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({ 
      fullName: signupName, 
      email: signupEmail, 
      password: signupPassword 
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    try {
      // If coming from partner invite, use 'partner' role
      const signupRole = urlRole === "partner" ? "partner" : selectedRole;
      const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole as "provider" | "client" | "partner");
      
      if (error) {
        console.error("Signup error:", error);
        
        // Handle specific error cases
        if (error.message.includes("already registered") || 
            error.message.includes("User already registered")) {
          toast.error("Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.");
        } else if (error.message.includes("Edge Function")) {
          // Edge function errors - user is likely created, just ignore
          console.warn("Edge function warning during signup, but user may be created:", error.message);
          toast.success("Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.");
        } else if (error.message.includes("Invalid email")) {
          toast.error("Ungültige E-Mail-Adresse");
        } else if (error.message.includes("Password")) {
          toast.error("Passwort muss mindestens 6 Zeichen lang sein");
        } else {
          toast.error(`Registrierung fehlgeschlagen: ${error.message}`);
        }
      } else {
        // If invite code was provided, store it so useAuth hook can process it
        if (inviteCode) {
          sessionStorage.setItem("huf_invite_code", inviteCode);
        }
        // Process partner invite token after signup completes
        const partnerToken = sessionStorage.getItem("partner_invite_token");
        if (partnerToken) {
          // Token will be processed after email confirmation + login
          // Keep it in sessionStorage
        }
        toast.success("Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.");
      }
    } catch (err: any) {
      console.error("Unexpected signup error:", err);
      toast.error("Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Bitte geben Sie Ihre E-Mail-Adresse ein");
      return;
    }

    const emailValidation = z.string().email().safeParse(resetEmail);
    if (!emailValidation.success) {
      toast.error("Ungültige E-Mail-Adresse");
      return;
    }

    setResetLoading(true);
    
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: redirectUrl,
    });
    setResetLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Falls ein Konto existiert, erhalten Sie eine E-Mail mit einem Link zum Zurücksetzen.");
      setResetDialogOpen(false);
      setResetEmail("");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6">
        <img 
          src="/hufmanager-logo.png" 
          alt="HufManager" 
          className="h-24 w-auto animate-pulse"
        />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Scrollable content area that fills viewport */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-6 sm:justify-center overflow-auto">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        {/* HM Connect Invite Banner */}
        {hmInviteToken && (
          <div className="bg-primary/10 border-b border-primary/20 p-4 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Du wurdest eingeladen! 🎉</p>
                <p className="text-xs text-muted-foreground">
                  Erstelle ein Konto oder melde dich an, um dich zu vernetzen.
                </p>
              </div>
            </div>
          </div>
        )}
        <CardHeader className="text-center pb-2 pt-4">
          <img 
            src="/hufmanager-logo.png" 
            alt="HufManager Logo" 
            className="mx-auto h-16 sm:h-20 w-auto mb-2"
          />
          <CardTitle className="text-2xl font-bold text-foreground sr-only">HufManager</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">Melden Sie sich an oder erstellen Sie ein Konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
              <TabsTrigger value="login" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Anmelden</TabsTrigger>
              <TabsTrigger value="signup" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              {/* Login Mode Toggle - Profi vs Kunde vs Team */}
              <div className="mb-5">
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-muted rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setLoginMode("provider")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 min-h-[52px]",
                      loginMode === "provider"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Hammer className="h-5 w-5" />
                    Hufbearbeiter
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("client")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 min-h-[52px]",
                      loginMode === "client"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Heart className="h-5 w-5" />
                    Pferdebesitzer
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("team")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 min-h-[52px]",
                      loginMode === "team"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Users className="h-5 w-5" />
                    Team & Partner
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {loginMode === "provider" 
                    ? "Für Hufschmiede, Hufpfleger & Betriebsinhaber" 
                    : loginMode === "client"
                    ? "Für Pferdebesitzer – kostenloser Zugang"
                    : "Für Mitarbeiter & Fachpartner (Tierärzte, Therapeuten etc.)"}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-foreground font-medium text-sm">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="ihre@email.de"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-[52px] text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-foreground font-medium text-sm">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-[52px] text-base"
                  />
                </div>
                <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Anmelden
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(loginEmail);
                      setResetDialogOpen(true);
                    }}
                    className="text-sm text-primary hover:underline min-h-[44px] inline-flex items-center px-4"
                  >
                    Passwort vergessen?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              {/* Package Selection Prompt for Providers */}
              {selectedRole === "provider" && (
                <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          Schon ein Paket gewählt?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Du brauchst zuerst ein Abo.
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => openPricingModal(
                        "Wähle dein Paket",
                        "Starte jetzt mit HufManager und digitalisiere dein Business."
                      )}
                    >
                      Pakete anzeigen
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-5">
                {/* Role Selection */}
                <div className="space-y-3">
                  <Label className="text-foreground font-medium">Ich bin...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("provider")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                        selectedRole === "provider"
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                        selectedRole === "provider"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Hammer className="h-6 w-6" />
                      </div>
                      <span className={cn(
                        "font-semibold text-sm",
                        selectedRole === "provider" ? "text-primary" : "text-foreground"
                      )}>
                        Hufbearbeiter
                      </span>
                      <span className="text-xs text-muted-foreground text-center">
                        Verwalte Termine & Kunden
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("client")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 relative",
                        selectedRole === "client"
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      {/* Free badge */}
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        GRATIS
                      </div>
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                        selectedRole === "client"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Heart className="h-6 w-6" />
                      </div>
                      <span className={cn(
                        "font-semibold text-sm",
                        selectedRole === "client" ? "text-primary" : "text-foreground"
                      )}>
                        Pferdebesitzer
                      </span>
                      <span className="text-xs text-muted-foreground text-center">
                        Kostenlos für Besitzer
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground font-medium">Vollständiger Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Max Mustermann"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground font-medium">E-Mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground font-medium">Passwort</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {selectedRole === "provider" ? "Als Hufbearbeiter registrieren" : "Als Pferdebesitzer registrieren"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Demo Access Cards */}
      <DemoAccessCards
        onSelectAccount={(email, password) => {
          setLoginEmail(email);
          setLoginPassword(password);
          // Auto-submit login
          signIn(email, password).then(({ error }) => {
            if (error) {
              toast.error(error.message);
            }
          });
        }}
      />

      {/* Info Footer */}
      <div className="mt-4 max-w-md w-full">
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-foreground">Wer nutzt was?</p>
          <div className="grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-start gap-2">
              <Hammer className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span><strong className="text-foreground">HufbearbeiterInnen</strong> – Betrieb, Termine, Kunden & Rechnungen verwalten</span>
            </div>
            <div className="flex items-start gap-2">
              <Heart className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span><strong className="text-foreground">PferdebesitzerInnen</strong> – Pferde-Akte, Termine einsehen & Profis kontaktieren</span>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span><strong className="text-foreground">MitarbeiterInnen</strong> – Vom Betrieb eingeladen, Aufträge & Tour ausführen</span>
            </div>
            <div className="flex items-start gap-2">
              <Stethoscope className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span><strong className="text-foreground">TherapeutInnen & TierärztInnen</strong> – Per Einladung freigeschaltet, Befunde & Behandlungen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Links */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pb-4">
        <a 
          href="https://hufmanager.de/impressum" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors min-h-[44px] inline-flex items-center"
        >
          Impressum
        </a>
        <span className="text-border">•</span>
        <a 
          href="https://hufmanager.de/datenschutz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors min-h-[44px] inline-flex items-center"
        >
          Datenschutz
        </a>
        <span className="text-border">•</span>
        <a 
          href="https://hufmanager.de/agb" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors min-h-[44px] inline-flex items-center"
        >
          AGB
        </a>
      </div>

      {/* Hidden Admin Shortcut */}
      <button
        type="button"
        onClick={() => setAdminDialogOpen(true)}
        className="mb-4 text-xs text-muted-foreground/40 hover:text-muted-foreground/80 transition-opacity min-h-[44px]"
      >
        🚀
      </button>
      </div> {/* end scrollable wrapper */}

      {/* Admin Login Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Mission Control
            </DialogTitle>
            <DialogDescription>
              {adminMode === "login" 
                ? "Admin-Zugang für autorisierte Benutzer."
                : "Setze dein Admin-Passwort für den ersten Login."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            
            // Admin access is validated server-side via user_roles table and RLS policies
            // Any user can attempt login, but only those with admin role in DB can access admin routes
            
            setAdminLoading(true);

            if (adminMode === "set-password") {
              // Magic link login - admin role must be assigned in database
              // Note: New users get 'client' role by default, admin must be set manually
              const { error } = await supabase.auth.signInWithOtp({
                email: adminEmail,
                options: {
                  emailRedirectTo: `${window.location.origin}/admin/mission-control`,
                },
              });
              
              setAdminLoading(false);
              
              if (error) {
                toast.error(error.message);
              } else {
                toast.success("Ein Magic Link wurde an deine E-Mail gesendet! Klicke darauf um dich einzuloggen.");
                setAdminDialogOpen(false);
                setAdminEmail("");
              }
            } else {
              // Normal login - backend will verify admin role via ProtectedRoute
              const { error } = await signIn(adminEmail, adminPassword);
              setAdminLoading(false);

              if (error) {
                if (error.message.includes("Invalid login credentials")) {
                  toast.error("Ungültige Anmeldedaten. Falls du noch kein Passwort hast, nutze 'Erstes Login'.");
                } else {
                  toast.error(error.message);
                }
              } else {
                // Navigation to admin page will be blocked by ProtectedRoute if user lacks admin role
                setAdminDialogOpen(false);
                navigate("/admin/mission-control");
              }
            }
          }} className="space-y-4">
            
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setAdminMode("login")}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  adminMode === "login"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAdminMode("set-password")}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  adminMode === "set-password"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <KeyRound className="h-4 w-4" />
                Erstes Login
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">E-Mail</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@email.de"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Admin-Zugang erfordert entsprechende Berechtigung in der Datenbank.
              </p>
            </div>
            
            {adminMode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="admin-password">Passwort</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    // HOPE codeword: emergency access for second master admin
                    if (e.target.value === "HOPE") {
                      setAdminEmail("barhufserviceschmid@gmail.com");
                      setAdminMode("set-password");
                      toast.info("Notfall-Zugang aktiviert. Magic Link wird gesendet.");
                    }
                  }}
                  required
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={adminLoading}>
              {adminLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adminMode === "login" ? "Admin Login" : "Passwort-Link senden"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen</DialogTitle>
            <DialogDescription>
              Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen Ihres Passworts zu erhalten.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-Mail</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="ihre@email.de"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link senden
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      {/* Pricing Modal */}
      <PricingModal 
        open={pricingModalOpen} 
        onOpenChange={setPricingModalOpen}
        title={pricingModalTitle}
        description={pricingModalDescription}
      />
    </div>
  );
}