import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmployeeInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<{
    id: string;
    full_name: string;
    email: string;
    provider_name: string;
  } | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Ungültiger Einladungslink");
      setLoading(false);
      return;
    }

    // Fetch employee by invitation token
    const fetchEmployee = async () => {
      try {
        const { data, error } = await supabase
          .from("employee_profiles")
          .select("id, full_name, email, provider:profiles!employee_profiles_provider_id_fkey(full_name)")
          .eq("invitation_token", token)
          .is("invitation_accepted_at", null)
          .single();

        if (error || !data) {
          setError("Einladung ungültig oder bereits verwendet");
          return;
        }

        // Check if invitation is expired (7 days)
        const profile = await supabase
          .from("employee_profiles")
          .select("invitation_sent_at")
          .eq("id", data.id)
          .single();

        if (profile.data?.invitation_sent_at) {
          const sentAt = new Date(profile.data.invitation_sent_at);
          const expiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (new Date() > expiresAt) {
            setError("Diese Einladung ist abgelaufen. Bitte fordere eine neue an.");
            return;
          }
        }

        setEmployee({
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          provider_name: (data.provider as { full_name: string })?.full_name || "Unbekannt",
        });
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError("Fehler beim Laden der Einladung");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [token]);

  const handleAccept = async () => {
    if (!employee) return;
    
    if (password.length < 8) {
      toast({ title: "Passwort zu kurz", description: "Mindestens 8 Zeichen", variant: "destructive" });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({ title: "Passwörter stimmen nicht überein", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employee.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/employee`,
          data: {
            full_name: employee.full_name,
            role: "employee",
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update employee profile with user_id and mark invitation as accepted
        const { error: updateError } = await supabase
          .from("employee_profiles")
          .update({
            user_id: authData.user.id,
            invitation_accepted_at: new Date().toISOString(),
            invitation_token: null, // Clear token after use
            status: "active",
          })
          .eq("id", employee.id);

        if (updateError) throw updateError;

        // Add employee role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "employee",
          });

        if (roleError) {
          console.error("Role assignment error:", roleError);
          // Don't throw - profile is created, role can be fixed later
        }

        toast({
          title: "Konto erstellt!",
          description: "Du kannst dich jetzt anmelden.",
        });

        // Redirect to login
        navigate("/auth?message=account_created");
      }
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Fehler",
        description: err.message || "Konto konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Einladung ungültig</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Willkommen bei HufManager</CardTitle>
          <CardDescription>
            {employee?.provider_name} hat dich als Mitarbeiter eingeladen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="font-semibold">{employee?.full_name}</p>
            <p className="text-sm text-muted-foreground">{employee?.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort erstellen</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Passwort wiederholen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={submitting || !password || !confirmPassword}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Einladung annehmen
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Mit der Annahme stimmst du den Nutzungsbedingungen und der Datenschutzerklärung zu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeInvite;
