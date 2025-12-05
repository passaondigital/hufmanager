import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const passwordSchema = z.object({
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { user, role, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not in password recovery mode and not authenticated
  useEffect(() => {
    if (!isPasswordRecovery && !user) {
      navigate("/auth");
    }
  }, [isPasswordRecovery, user, navigate]);

  const sendPasswordChangedEmail = async () => {
    if (!user?.email) return;

    try {
      // Fetch user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      await supabase.functions.invoke("send-password-changed-email", {
        body: {
          email: user.email,
          userName: profile?.full_name || undefined,
        },
      });
      console.log("Password changed confirmation email sent");
    } catch (error) {
      console.error("Failed to send password changed email:", error);
      // Don't show error to user - email is just a confirmation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      toast.error(error.message);
    } else {
      // Send confirmation email in background
      sendPasswordChangedEmail();
      
      setLoading(false);
      toast.success("Passwort erfolgreich geändert!");
      clearPasswordRecovery();
      
      // Redirect based on role
      if (role === "client") {
        navigate("/client-home");
      } else {
        navigate("/");
      }
    }
  };

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
