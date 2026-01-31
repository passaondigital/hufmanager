import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Shield, Eye, Heart, Calendar, UserX, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccessGrant {
  id: string;
  provider_id: string;
  can_view_basic: boolean;
  can_view_medical: boolean;
  can_create_appointments: boolean;
  is_active: boolean;
  provider_name?: string;
  provider_email?: string;
}

export default function ClientPermissions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeGrant, setRevokeGrant] = useState<AccessGrant | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchGrants();
  }, [user]);

  const fetchGrants = async () => {
    setLoading(true);
    
    // Fetch grants with provider info - require BOTH status='active' AND is_active=true
    const { data: grantsData, error } = await supabase
      .from('access_grants')
      .select('*')
      .eq('client_id', user?.id)
      .eq('status', 'active')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching grants:', error);
      setLoading(false);
      return;
    }

    // Get provider names
    if (grantsData && grantsData.length > 0) {
      const providerIds = grantsData.map(g => g.provider_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', providerIds);

      const grantsWithNames = grantsData.map(grant => {
        const profile = profiles?.find(p => p.id === grant.provider_id);
        return {
          ...grant,
          provider_name: profile?.full_name || 'Unbekannt',
          provider_email: profile?.email,
        };
      });

      setGrants(grantsWithNames);
    } else {
      setGrants([]);
    }

    setLoading(false);
  };

  const updatePermission = async (
    grantId: string, 
    field: 'can_view_basic' | 'can_view_medical' | 'can_create_appointments',
    value: boolean
  ) => {
    const { error } = await supabase
      .from('access_grants')
      .update({ [field]: value })
      .eq('id', grantId);

    if (error) {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setGrants(prev => prev.map(g => 
      g.id === grantId ? { ...g, [field]: value } : g
    ));
    
    toast({ title: "Berechtigung aktualisiert" });
  };

  const handleRevoke = async () => {
    if (!revokeGrant) return;

    const { error } = await supabase
      .from('access_grants')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', revokeGrant.id);

    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Zugriff entzogen" });
      setGrants(prev => prev.filter(g => g.id !== revokeGrant.id));
    }

    setRevokeGrant(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">Datenfreigabe & Zugriff</h1>
            <p className="text-xs text-muted-foreground">DSGVO-Kontrollzentrum</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Deine Daten, deine Kontrolle</p>
              <p className="text-muted-foreground mt-1">
                Hier siehst du, wer Zugriff auf deine Pferdedaten hat. 
                Du kannst Berechtigungen jederzeit anpassen oder komplett entziehen.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Providers List */}
        {grants.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Keine aktiven Zugriffsberechtigungen
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Wenn ein Hufbearbeiter dich als Kunde hinzufügt, erscheint er hier.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grants.map(grant => (
              <Card key={grant.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div>
                      <span className="text-foreground">{grant.provider_name}</span>
                      {grant.provider_email && (
                        <p className="text-xs font-normal text-muted-foreground">
                          {grant.provider_email}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                      Aktiv
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Data */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`basic-${grant.id}`} className="text-sm cursor-pointer">
                        Darf Stammdaten sehen
                      </Label>
                    </div>
                    <Switch
                      id={`basic-${grant.id}`}
                      checked={grant.can_view_basic}
                      onCheckedChange={(checked) => 
                        updatePermission(grant.id, 'can_view_basic', checked)
                      }
                    />
                  </div>

                  {/* Medical Data */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`medical-${grant.id}`} className="text-sm cursor-pointer">
                        Darf medizinische Akte sehen
                      </Label>
                    </div>
                    <Switch
                      id={`medical-${grant.id}`}
                      checked={grant.can_view_medical}
                      onCheckedChange={(checked) => 
                        updatePermission(grant.id, 'can_view_medical', checked)
                      }
                    />
                  </div>

                  {/* Appointments */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`appointments-${grant.id}`} className="text-sm cursor-pointer">
                        Darf Termine erstellen
                      </Label>
                    </div>
                    <Switch
                      id={`appointments-${grant.id}`}
                      checked={grant.can_create_appointments}
                      onCheckedChange={(checked) => 
                        updatePermission(grant.id, 'can_create_appointments', checked)
                      }
                    />
                  </div>

                  {/* Revoke Button */}
                  <Button 
                    variant="outline" 
                    className="w-full mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setRevokeGrant(grant)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Zugriff komplett entziehen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* DSGVO Notice */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Hinweis zur Datenverarbeitung (DSGVO)</p>
            <p>
              Gemäß Art. 7 DSGVO kannst du deine Einwilligung zur Datenverarbeitung 
              jederzeit widerrufen. Durch "Zugriff entziehen" werden alle Verbindungen 
              zum Dienstleister getrennt. Bereits erstellte Dokumente und Berichte 
              bleiben aus rechtlichen Gründen (Werkvertrag) erhalten.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeGrant} onOpenChange={() => setRevokeGrant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Zugriff entziehen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{revokeGrant?.provider_name}</strong> verliert sofort den Zugriff auf:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Alle deine Pferdedaten</li>
                <li>Die Möglichkeit, neue Termine zu erstellen</li>
                <li>Zugang zu medizinischen Akten</li>
              </ul>
              <p className="mt-3 text-sm">
                Diese Aktion kann nicht rückgängig gemacht werden. 
                Der Dienstleister müsste dich erneut als Kunde hinzufügen.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, Zugriff entziehen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
