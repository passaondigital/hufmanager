import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, Mail, MapPin } from "lucide-react";

interface ProviderInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
}

interface BusinessSettings {
  business_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export function ConnectedProviderCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProvider();
  }, [user]);

  const fetchProvider = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get the connected provider via access_grants
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!grant) {
        setProvider(null);
        setLoading(false);
        return;
      }

      // Fetch provider profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, phone")
        .eq("id", grant.provider_id)
        .maybeSingle();

      if (profileData) {
        setProvider(profileData);
      }

      // Fetch business settings for additional info
      const { data: settingsData } = await supabase
        .from("business_settings")
        .select("business_name, address, phone, email")
        .eq("user_id", grant.provider_id)
        .maybeSingle();

      if (settingsData) {
        setBusinessSettings(settingsData);
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!provider) {
    return null;
  }

  const displayName = businessSettings?.business_name || provider.full_name || "Dein Hufbearbeiter";
  const contactPhone = businessSettings?.phone || provider.phone;
  const contactEmail = businessSettings?.email || provider.email;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={provider.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Dein Hufbearbeiter
            </p>
            <h3 className="font-semibold text-foreground truncate">
              {displayName}
            </h3>
            
            {businessSettings?.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{businessSettings.address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-2 mt-4">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate("/client-chat")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          
          {contactPhone && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`tel:${contactPhone}`, "_self")}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          
          {contactEmail && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`mailto:${contactEmail}`, "_blank")}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
