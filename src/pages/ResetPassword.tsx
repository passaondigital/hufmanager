import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, KeyRound } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.object({
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If there's a session, the user came from a valid reset link
      setIsValidSession(!!session);
    };
    
    checkSession();

    // Listen for auth state changes (recovery link clicks trigger SIGNED_IN with recovery type)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("Passwort erfolgreich geändert!");
      
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        const { clear } = await import("idb-keyval");
        await supabase.auth.signOut();
        localStorage.clear();
        try { await clear(); } catch (_) {}
        navigate("/auth");
      }, 2000);
    }
  };

  // Still checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No valid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <KeyRound className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Ungültiger Link</CardTitle>
            <CardDescription className="text-muted-foreground">
              Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Zurück zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Passwort geändert!</CardTitle>
            <CardDescription className="text-muted-foreground">
              Ihr Passwort wurde erfolgreich aktualisiert. Sie werden zur Anmeldung weitergeleitet...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center mb-4">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Neues Passwort festlegen</CardTitle>
          <CardDescription className="text-muted-foreground">
            Geben Sie Ihr neues Passwort ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Mindestens 6 Zeichen</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Passwort speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
