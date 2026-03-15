import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { PortalMode } from "@/hooks/usePortalDetection";

interface PortalLoginProps {
  mode: PortalMode;
}

const MODE_CONFIG: Record<string, { title: string; subtitle: string; icon: typeof Shield }> = {
  portal: {
    title: "Portal-Login",
    subtitle: "Melde dich an um dein Organisations-Dashboard zu öffnen.",
    icon: Building2,
  },
  insurance: {
    title: "Versicherungs-Portal",
    subtitle: "Zugang zum Versicherungs-Dashboard für Schadensfälle, Policen und Analytics.",
    icon: Shield,
  },
};

export default function PortalLogin({ mode }: PortalLoginProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to portal detection
  if (user) {
    // Find user's org and redirect
    return <PortalRedirect mode={mode} />;
  }

  const config = MODE_CONFIG[mode] || MODE_CONFIG.portal;
  const Icon = config.icon;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Auth state change will trigger re-render → PortalRedirect
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
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{config.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}

/** After login, find the user's org and redirect to its portal dashboard */
function PortalRedirect({ mode }: { mode: PortalMode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  if (!checked && user) {
    setChecked(true);
    // Find user's organization membership
    (supabase as any)
      .from("organization_members")
      .select("org_id, organizations(slug, type)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.organizations?.slug) {
          navigate(`/portal/${data.organizations.slug}`, { replace: true });
        } else {
          toast.error("Keine Organisation zugeordnet. Kontaktiere den Administrator.");
        }
      });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
