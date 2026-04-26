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

    // Validate token via edge function (no direct DB access needed)
    const fetchEmployee = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("validate-employee-invitation", {
          body: { token },
        });

        if (fnError) throw new Error(fnError.message || "Fehler beim Laden");
        if (data?.error) {
          setError(data.error);
          return;
        }

        setEmployee({
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          provider_name: data.provider_name,
        });
      } catch (err: any) {
        console.error("Error fetching invitation:", err);
        setError(err.message || "Fehler beim Laden der Einladung");
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
      const { data, error } = await supabase.functions.invoke("accept-employee-invitation", {
        body: { token, password },
      });

      if (error) throw new Error(error.message || "Konto konnte nicht erstellt werden");
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Konto erstellt!",
        description: "Du kannst dich jetzt anmelden.",
      });

      navigate("/auth?message=account_created");
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
          <CardTitle>Willkommen bei Hufi</CardTitle>
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
