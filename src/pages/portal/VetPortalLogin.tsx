import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export default function VetPortalLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    return <VetPortalRedirect />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Stethoscope className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Tierarzt-Portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Zugang zu Pferdeakten, Befunden und PMS-Synchronisation.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>E-Mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <Label>Passwort</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Anmelden
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Noch kein Zugang?{" "}
              <a href="/tierarzt-finder" className="text-primary hover:underline">
                Registrierung über den Tierarzt-Finder
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VetPortalRedirect() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  if (!checked) {
    setChecked(true);
    // Navigate to vet dashboard
    navigate("/vet/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
