import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserPlus, Check, Loader2 } from "lucide-react";
import { DataProcessingConsentDialog } from "./DataProcessingConsentDialog";

interface Provider {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface ProviderSelectorProps {
  onProviderConnected?: (providerId: string) => void;
}

export function ProviderSelector({ onProviderConnected }: ProviderSelectorProps) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [consentDialog, setConsentDialog] = useState<{ open: boolean; provider: Provider | null }>({
    open: false,
    provider: null,
  });
  useEffect(() => {
    if (!user) return;
    fetchProviders();
  }, [user]);

  const fetchProviders = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all providers
      const { data: providerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "provider");

      if (!providerRoles || providerRoles.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      const providerIds = providerRoles.map(r => r.user_id);

      // Fetch provider profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", providerIds)
        .is("deleted_at", null);

      setProviders(profilesData || []);

      // Fetch already connected providers - require BOTH flags
      const { data: grants } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("status", "active")
        .eq("is_active", true);

      setConnectedProviders(grants?.map(g => g.provider_id) || []);
    } catch (error) {
      console.error("Error fetching providers:", error);
    }

    setLoading(false);
  };

  const requestConnection = (provider: Provider) => {
    setConsentDialog({ open: true, provider });
  };

  const connectToProvider = async (providerId: string) => {
    if (!user) return;
    setConnecting(providerId);

    try {
      // Check if grant already exists (inactive)
      const { data: existingGrant } = await supabase
        .from("access_grants")
        .select("id, is_active")
        .eq("client_id", user.id)
        .eq("provider_id", providerId)
        .maybeSingle();

      if (existingGrant) {
        // Reactivate existing grant - set BOTH flags
        await supabase
          .from("access_grants")
          .update({ 
            status: "active",
            is_active: true, 
            revoked_at: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingGrant.id);
      } else {
        // Create new access grant - set BOTH flags
        const { error } = await supabase
          .from("access_grants")
          .insert({
            client_id: user.id,
            provider_id: providerId,
            status: "active",
            is_active: true,
            can_view_basic: true,
            can_view_medical: true,
            can_create_appointments: true,
          });

        if (error) throw error;

        // DSGVO: Log consent in client_consents
        await supabase.from("client_consents").insert({
          client_id: user.id,
          provider_id: providerId,
          consent_type: "data_processing",
          version: "1.0",
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      }

      setConnectedProviders(prev => [...prev, providerId]);
      
      toast.success("Verbunden!: Du bist jetzt mit diesem Hufbearbeiter verbunden.");

      onProviderConnected?.(providerId);
    } catch (error) {
      console.error("Error connecting to provider:", error);
      toast.error("Fehler: Verbindung konnte nicht hergestellt werden.");
    }

    setConnecting(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const availableProviders = providers.filter(p => !connectedProviders.includes(p.id));

  if (availableProviders.length === 0 && connectedProviders.length > 0) {
    return null; // Already connected to all available providers
  }

  if (providers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Keine Hufbearbeiter verfügbar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Hufbearbeiter auswählen
        </CardTitle>
        <CardDescription>
          Verbinde dich mit einem Hufbearbeiter, um Termine zu buchen und zu chatten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => {
          const isConnected = connectedProviders.includes(provider.id);
          const isConnecting = connecting === provider.id;
          
          return (
            <div 
              key={provider.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={provider.avatar_url || undefined} />
                <AvatarFallback>
                  {provider.full_name?.charAt(0) || "H"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {provider.full_name || "Hufbearbeiter"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {provider.email}
                </p>
              </div>
              {isConnected ? (
                <Button variant="outline" size="sm" disabled>
                  <Check className="h-4 w-4 mr-1" />
                  Verbunden
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => requestConnection(provider)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verbinden"
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>

      {/* DSGVO Consent Dialog */}
      <DataProcessingConsentDialog
        open={consentDialog.open}
        onOpenChange={(open) => setConsentDialog({ ...consentDialog, open })}
        providerName={consentDialog.provider?.full_name || "Hufbearbeiter"}
        onConsent={() => {
          if (consentDialog.provider) {
            connectToProvider(consentDialog.provider.id);
          }
          setConsentDialog({ open: false, provider: null });
        }}
      />
    </Card>
  );
}
