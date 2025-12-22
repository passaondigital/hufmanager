import { useState } from "react";
import { Navigate } from "react-router-dom";
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
import { Loader2, Hammer, Heart, Package } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PricingModal } from "@/components/subscription/PricingModal";

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
type LoginMode = "provider" | "client";

export default function Auth() {
  const { user, role, loading: authLoading, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Login mode (provider vs client)
  const [loginMode, setLoginMode] = useState<LoginMode>("provider");
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleOption>("provider");

  // Password reset
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Pricing modal
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalTitle, setPricingModalTitle] = useState("");
  const [pricingModalDescription, setPricingModalDescription] = useState("");

  // Redirect if already logged in
  if (!authLoading && user && role) {
    if (role === "provider") {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/client-home" replace />;
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

    if (error) {
      // Check if account is suspended
      if (error.message.includes("Konto gesperrt")) {
        toast.error(error.message, {
          duration: 8000,
          description: "Bitte kontaktieren Sie den Support.",
        });
      } else if (loginMode === "provider" && 
          (error.message.includes("Invalid login credentials") || 
           error.message.includes("User not found"))) {
        openPricingModal(
          "Noch kein Account?",
          "Wähle jetzt dein Paket und starte mit HufManager."
        );
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Ungültige Anmeldedaten");
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
    const { error } = await signUp(signupEmail, signupPassword, signupName, selectedRole);
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Diese E-Mail ist bereits registriert");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.");
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <img 
            src="/hufmanager-logo.png" 
            alt="HufManager Logo" 
            className="mx-auto h-24 w-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold text-foreground sr-only">HufManager</CardTitle>
          <CardDescription className="text-muted-foreground">Melden Sie sich an oder erstellen Sie ein Konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
              <TabsTrigger value="login" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Anmelden</TabsTrigger>
              <TabsTrigger value="signup" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              {/* Login Mode Toggle */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLoginMode("provider")}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                      loginMode === "provider"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Hammer className="h-4 w-4" />
                    Als Profi
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("client")}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                      loginMode === "client"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Heart className="h-4 w-4" />
                    Als Kunde
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground font-medium">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-foreground font-medium">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
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
                    className="text-sm text-primary hover:underline"
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
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                        selectedRole === "client"
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
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
                        Behalte Termine im Blick
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
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {selectedRole === "provider" ? "Als Hufbearbeiter registrieren" : "Als Pferdebesitzer registrieren"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legal Links */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <a 
          href="https://hufmanager.de/impressum" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          Impressum
        </a>
        <span className="text-border">•</span>
        <a 
          href="https://hufmanager.de/datenschutz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          Datenschutz
        </a>
        <span className="text-border">•</span>
        <a 
          href="https://hufmanager.de/agb" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          AGB
        </a>
      </div>

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
      <PricingModal 
        open={pricingModalOpen} 
        onOpenChange={setPricingModalOpen}
        title={pricingModalTitle}
        description={pricingModalDescription}
      />
    </div>
  );
}