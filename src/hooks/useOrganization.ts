import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  logo_url: string | null;
  brand_color_primary: string | null;
  brand_color_secondary: string | null;
  website: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: Record<string, string> | null;
  settings: Record<string, unknown> | null;
  plan: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_at: string;
  accepted_at: string | null;
}

export function useOrganizationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["organization", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, type, logo_url, brand_color_primary, brand_color_secondary, website, description, contact_email, contact_phone, address, settings, plan, is_active, created_at, updated_at")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Organization | null;
    },
    enabled: !!slug,
  });
}

export function useOrgMembership(orgId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["org-membership", orgId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, org_id, user_id, role, is_active, invited_at, accepted_at")
        .eq("org_id", orgId!)
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as OrgMember | null;
    },
    enabled: !!orgId && !!user?.id,
  });
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, org_id, user_id, role, is_active, invited_at, accepted_at")
        .eq("org_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as OrgMember[];
    },
    enabled: !!orgId,
  });
}

export function useMyOrganizations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-organizations", user?.id],
    queryFn: async () => {
      const { data: memberships, error: mErr } = await supabase
        .from("organization_members")
        .select("org_id, role")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (mErr) throw mErr;
      if (!memberships?.length) return [];

      const orgIds = memberships.map((m) => m.org_id);
      const { data: orgs, error: oErr } = await supabase
        .from("organizations")
        .select("id, name, slug, type, logo_url, brand_color_primary, is_active, plan, created_at, updated_at")
        .in("id", orgIds);
      if (oErr) throw oErr;

      return (orgs || []).map((org) => ({
        ...org,
        memberRole: memberships.find((m) => m.org_id === org.id)?.role || "viewer",
      }));
    },
    enabled: !!user?.id,
  });
}
