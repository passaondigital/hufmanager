import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

export default function Auth() {
  const { user, role, loading: authLoading, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Redirect if already logged in
  if (!authLoading && user && role) {
    if (role === "provider") {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/client-home" replace />;
  }

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
      if (error.message.includes("Invalid login credentials")) {
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
    const { error } = await signUp(signupEmail, signupPassword, signupName, "client");
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">HM</span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">HufManager</CardTitle>
          <CardDescription className="text-muted-foreground">Melden Sie sich an oder erstellen Sie ein Konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
              <TabsTrigger value="login" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Anmelden</TabsTrigger>
              <TabsTrigger value="signup" className="h-10 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
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
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-5">
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
                  Registrieren
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
