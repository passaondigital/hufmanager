import { useState, useEffect, useRef } from "react";
import { isDemoEmail } from "@/lib/demo-accounts";
import { isPortalBusinessEmail, getPostLoginPath } from "@/lib/portal-user-detect";
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
import { MultiStepSignup } from "@/components/auth/MultiStepSignup";
import { clear } from "idb-keyval";

// NOTE: Admin access is controlled server-side via user_roles table and RLS policies
// Do NOT add client-side email whitelists - they can be bypassed

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string()
    .min(8, "Mindestens 8 Zeichen")
    .regex(/[A-Z]/, "Mindestens ein Großbuchstabe")
    .regex(/[0-9]/, "Mindestens eine Zahl"),
});

type RoleOption = "provider" | "client";
type LoginMode = "provider" | "client" | "team";

const SWITCH_ACCOUNT_STORAGE_KEY = "hm_switch_account_target";
const AUTH_STORAGE_PRESERVE_KEYS = ["theme", "vite-ui-theme"];

function clearStoredAuthState() {
  const storageKeysToRemove = Object.keys(localStorage).filter((key) =>
    key.startsWith("sb-") && key.endsWith("-auth-token")
  );

  storageKeysToRemove.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(SWITCH_ACCOUNT_STORAGE_KEY);
}

async function clearClientSessionState() {
  const preservedValues = AUTH_STORAGE_PRESERVE_KEYS.reduce<Record<string, string | null>>((acc, key) => {
    acc[key] = localStorage.getItem(key);
    return acc;
  }, {});

  clearStoredAuthState();

  AUTH_STORAGE_PRESERVE_KEYS.forEach((key) => {
    const value = preservedValues[key];
    if (value !== null) {
      localStorage.setItem(key, value);
    }
  });

  try {
    await clear();
  } catch (error) {
    console.warn("IndexedDB clear error during switch-account:", error);
  }
}

  const { user, role, loading: authLoading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showMultiStepSignup, setShowMultiStepSignup] = useState(false);
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
  const currentEntryPath = window.location.pathname === "/audit" ? "/audit" : "/auth";
  const pendingSwitchTarget = sessionStorage.getItem(SWITCH_ACCOUNT_STORAGE_KEY);
  const isSwitchingAccount = forceLogin || pendingSwitchTarget === currentEntryPath;
  const switchSignOutStartedRef = useRef(false);
  
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
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Auto-sign-out while preserving the current auth entry point
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    if (!isSwitchingAccount) {
      switchSignOutStartedRef.current = false;
      setSigningOut(false);
      return;
    }

    setSigningOut(true);

    if (authLoading || switchSignOutStartedRef.current) {
      return;
    }

    switchSignOutStartedRef.current = true;

    const finishSwitch = () => {
      sessionStorage.removeItem(SWITCH_ACCOUNT_STORAGE_KEY);
      window.location.replace(currentEntryPath);
    };

    if (!user) {
      finishSwitch();
      return;
    }

    supabase.auth
      .signOut({ scope: "local" })
      .catch((error) => {
        console.warn("Switch-account sign out error:", error);
      })
      .finally(() => {
        finishSwitch();
      });
  }, [authLoading, currentEntryPath, isSwitchingAccount, user]);

  useEffect(() => {
    if (!user || !role || authLoading || isSwitchingAccount || signingOut) return;
    // Portal/business accounts skip onboarding entirely
    if (isPortalBusinessEmail(user.email)) {
      setOnboardingChecked(true);
      return;
    }
    // Skip onboarding check for demo accounts
    if (role === "provider" && !isDemoEmail(user.email)) {
      supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          // Only redirect if explicitly false (not null — null means legacy user)
          if (data?.onboarding_completed === false) {
            setNeedsOnboarding(true);
          }
          setOnboardingChecked(true);
        });
    } else {
      setOnboardingChecked(true);
    }
  }, [user, role, authLoading, isSwitchingAccount, signingOut]);

  // Show loading screen while signing out to prevent flash
  if (signingOut || isSwitchingAccount) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6">
        <img src="/hufmanager-logo.png" alt="HufManager" className="h-24 w-auto animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authLoading && user && role && !isSwitchingAccount) {
    if (role === "provider" && !onboardingChecked && !isPortalBusinessEmail(user.email)) {
      // Show loading while checking onboarding status
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6">
          <img src="/hufmanager-logo.png" alt="HufManager" className="h-24 w-auto animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (role === "provider" && needsOnboarding && !isPortalBusinessEmail(user.email)) {
      return <Navigate to="/welcome" replace />;
    }

    // User is already logged in – show intermediate screen instead of auto-redirect
    // This prevents the "stuck in redirect loop" problem when users navigate to /auth
    const targetPath = redirectTo || getPostLoginPath(role, user.email);
    const roleLabels: Record<string, string> = {
      provider: "Hufbearbeiter",
      client: "Pferdebesitzer",
      admin: "Administrator",
      employee: "Mitarbeiter",
      partner: "Partner",
    };

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6 px-4">
        <img src="/hufmanager-logo.png" alt="HufManager" className="h-16 w-auto" />
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Bereits angemeldet</CardTitle>
            <CardDescription>
              Du bist eingeloggt als <span className="font-medium text-foreground">{user.email}</span>
              {role && <span className="block text-xs mt-1">Rolle: {roleLabels[role] || role}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate(targetPath, { replace: true })}>
              Weiter zum Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                sessionStorage.setItem(SWITCH_ACCOUNT_STORAGE_KEY, currentEntryPath);
                window.location.replace(`${currentEntryPath}?force=login`);
              }}
            >
              Konto wechseln
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
        toast.error("Kein Konto mit dieser E-Mail gefunden", {
          description: "Registrieren Sie sich zuerst.",
        });
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

        // Affiliate ref tracking – store for post-confirmation processing
        const refCode = localStorage.getItem("huf_affiliate_ref");
        const refTs = localStorage.getItem("huf_affiliate_ref_ts");
        const isRefValid = refTs && Date.now() - parseInt(refTs) < 30 * 24 * 60 * 60 * 1000;
        if (refCode && isRefValid) {
          sessionStorage.setItem("huf_pending_ref", refCode);
          localStorage.removeItem("huf_affiliate_ref");
          localStorage.removeItem("huf_affiliate_ref_ts");
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
          <CardDescription className="text-sm text-muted-foreground">Für alle Rollen – du wirst automatisch weitergeleitet</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
              <TabsTrigger value="login" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Anmelden</TabsTrigger>
              <TabsTrigger value="signup" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-foreground font-medium text-sm">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
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
              <MultiStepSignup
                inviteCode={inviteCode}
                loading={loading}
                onComplete={async (data) => {
                  setLoading(true);
                  try {
                    const { error } = await signUp(data.email, data.password, data.fullName, data.role);
                    if (error) {
                      if (error.message.includes("already registered")) {
                        toast.error("Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.");
                      } else {
                        toast.error(`Registrierung fehlgeschlagen: ${error.message}`);
                      }
                    } else {
                      if (inviteCode) {
                        sessionStorage.setItem("huf_invite_code", inviteCode);
                      }
                      if (data.businessName) {
                        sessionStorage.setItem("hm_pending_business_name", data.businessName);
                      }
                      if (data.clientType) {
                        sessionStorage.setItem("hm_pending_client_type", data.clientType);
                      }
                      // Store country for profile update after email confirmation
                      sessionStorage.setItem("hm_pending_country", data.country);
                      // Store widerrufsausschluss consent for logging after email confirmation
                      sessionStorage.setItem("hm_pending_widerruf_consent", new Date().toISOString());
                      toast.success("Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.");
                    }
                  } catch (err: any) {
                    toast.error("Ein unerwarteter Fehler ist aufgetreten.");
                  } finally {
                    setLoading(false);
                  }
                }}
                onCancel={() => {
                  // Switch back to login tab
                  const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement;
                  loginTab?.click();
                }}
              />
              {/* CopeCart-Kauf Hinweis */}
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Bereits gekauft?</span>{" "}
                  Registriere dich mit derselben E-Mail-Adresse, die du bei CopeCart verwendet hast.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Demo Access Cards */}
      <DemoAccessCards
        onSelectAccount={async (email, password) => {
          setLoginEmail(email);
          setLoginPassword(password);
          setLoading(true);
          try {
            console.log('[DemoLogin] Starting login for:', email);
            const { error } = await signIn(email, password);
            if (error) {
              console.error('[DemoLogin] Auth error:', error.message, error);
              toast.error(error.message);
              setLoading(false);
            } else {
              console.log('[DemoLogin] Success, seeding demo data...');
              // Auto-seed demo data in background (fire & forget)
              supabase.functions.invoke("setup-demo-accounts", { body: {} })
                .then(res => console.log('[DemoLogin] Demo data seeded:', res.data))
                .catch(err => console.warn('[DemoLogin] Demo seed skipped:', err));
              // Demo accounts: hard redirect to avoid race conditions with React state
              const roleMap: Record<string, string> = {
                "hufbearbeiter.hufmanager@gmail.com": "/home",
                "pferdebesitzer.hufmanager@gmail.com": "/client-home",
                "partner.hufmanager@gmail.com": "/partner-home",
                "mitarbeiter.hufmanager@gmail.com": "/employee",
                "hufmanagerbusiness@gmail.com": "/portal/galerie",
              };
              const target = roleMap[email.toLowerCase()] || "/home";
              window.location.replace(target);
            }
          } catch (err: any) {
            console.error('[DemoLogin] Unexpected error:', err?.message || err, err);
            toast.error("Login fehlgeschlagen – bitte erneut versuchen");
            setLoading(false);
          }
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
                      setAdminEmail("support@hufmanager.de");
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