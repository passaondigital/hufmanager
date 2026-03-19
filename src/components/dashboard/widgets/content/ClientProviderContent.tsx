import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { User, MessageSquare, Phone } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function ClientProviderContent({ settings }: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: providers = [] } = useQuery({
    queryKey: ["client-providers-widget", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("access_grants")
        .select("provider_id, profiles!access_grants_provider_id_fkey(full_name, avatar_url, phone, city, specialty)")
        .eq("client_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true)
        .limit(5);
      return (data || []).map((g: any) => ({
        id: g.provider_id,
        name: g.profiles?.full_name || "Experte",
        avatar_url: g.profiles?.avatar_url,
        phone: g.profiles?.phone,
        city: g.profiles?.city,
        specialty: g.profiles?.specialty,
      }));
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
  });

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <User className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Kein Experte verbunden</p>
        <button
          onClick={() => navigate("/client/search-providers")}
          className="text-xs font-medium text-primary mt-2 hover:underline"
        >
          Experte finden →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {providers.map((provider: any) => {
        const initials = provider.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
        return (
          <div key={provider.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary overflow-hidden">
              {provider.avatar_url ? (
                <img src={provider.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{provider.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {provider.specialty || provider.city || "Hufbearbeiter"}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => navigate("/client-chat")}
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </button>
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
