/**
 * Centralized Provider Access Hook
 * Eliminates duplicated access_grants checks across 20+ files.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProviderAccessResult {
  /** The connected provider's user ID */
  providerId: string | null;
  /** Whether client has an active connection to a provider */
  isConnected: boolean;
  /** Whether the query is still loading */
  isLoading: boolean;
  /** Permissions granted to the provider */
  permissions: {
    canViewBasic: boolean;
    canViewMedical: boolean;
    canCreateAppointments: boolean;
  };
}

/**
 * For Clients: finds their connected provider and permissions.
 * For Providers: returns self as provider.
 */
export function useProviderAccess(): ProviderAccessResult {
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["provider-access", user?.id, role],
    queryFn: async () => {
      if (!user?.id) return null;

      // Providers are their own provider
      if (role === "provider" || role === "admin") {
        return {
          providerId: user.id,
          isConnected: true,
          permissions: {
            canViewBasic: true,
            canViewMedical: true,
            canCreateAppointments: true,
          },
        };
      }

      // For clients: find active access grant
      const { data: grant, error } = await supabase
        .from("access_grants")
        .select("provider_id, can_view_basic, can_view_medical, can_create_appointments")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !grant) {
        // Fallback: check created_by_provider_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_by_provider_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.created_by_provider_id) {
          return {
            providerId: profile.created_by_provider_id,
            isConnected: true,
            permissions: {
              canViewBasic: true,
              canViewMedical: false,
              canCreateAppointments: false,
            },
          };
        }

        return null;
      }

      return {
        providerId: grant.provider_id,
        isConnected: true,
        permissions: {
          canViewBasic: grant.can_view_basic ?? true,
          canViewMedical: grant.can_view_medical ?? false,
          canCreateAppointments: grant.can_create_appointments ?? false,
        },
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes — access rarely changes
  });

  return {
    providerId: data?.providerId ?? null,
    isConnected: data?.isConnected ?? false,
    isLoading,
    permissions: data?.permissions ?? {
      canViewBasic: false,
      canViewMedical: false,
      canCreateAppointments: false,
    },
  };
}

/**
 * For Providers: check if they have access to a specific client.
 */
export function useHasClientAccess(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client-access", user?.id, clientId],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !clientId) return false;

      // Check direct creation
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_by_provider_id")
        .eq("id", clientId)
        .maybeSingle();

      if (profile?.created_by_provider_id === user.id) return true;

      // Check access_grant
      const { data: grant } = await supabase
        .from("access_grants")
        .select("id")
        .eq("provider_id", user.id)
        .eq("client_id", clientId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      return !!grant;
    },
    enabled: !!user?.id && !!clientId,
    staleTime: 1000 * 60 * 10,
  });
}
