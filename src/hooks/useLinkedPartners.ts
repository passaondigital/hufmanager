import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HorseContacts } from "@/components/horse-detail/types";

export interface LinkedPartner {
  accessId: string;
  partnerProfileId: string | null;
  partnerName: string;
  partnerEmail: string | null;
  partnerType: string;
  contactKey: string | null; // e.g. "vet", "trainer" - maps to HorseContacts key
  isLinkedInContacts: boolean;
}

const PARTNER_TYPE_TO_CONTACT_KEY: Record<string, string> = {
  tierarzt: "vet",
  osteopath: "trainer",
  physiotherapeut: "trainer",
  chiropraktiker: "trainer",
  reitlehrer: "trainer",
  trainer: "trainer",
  sattler: "stable",
  huforthopaedie: "stable",
  zahnarzt: "vet",
  ernaehrungsberater: "caretaker",
};

export function useLinkedPartners(horseId: string, contacts: HorseContacts | null) {
  return useQuery({
    queryKey: ["linked-partners", horseId],
    queryFn: async () => {
      const { data: accessEntries, error } = await supabase
        .from("horse_partner_access")
        .select("id, partner_profile_id, partner_name, partner_email, partner_type, status, is_active")
        .eq("horse_id", horseId)
        .eq("status", "active")
        .eq("is_active", true);

      if (error) throw error;
      if (!accessEntries?.length) return [];

      // Fetch profile names for entries with partner_profile_id
      const profileIds = accessEntries
        .filter((e: any) => e.partner_profile_id)
        .map((e: any) => e.partner_profile_id);

      let profileMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);
        profiles?.forEach((p: any) => {
          profileMap[p.id] = p.full_name || "Unbekannt";
        });
      }

      const c = contacts || {};
      return accessEntries.map((entry: any): LinkedPartner => {
        const contactKey = PARTNER_TYPE_TO_CONTACT_KEY[entry.partner_type] || null;
        const profileIdField = contactKey ? `${contactKey}_partner_profile_id` : null;
        const isLinkedInContacts = profileIdField ? c[profileIdField] === entry.partner_profile_id : false;

        return {
          accessId: entry.id,
          partnerProfileId: entry.partner_profile_id,
          partnerName: entry.partner_profile_id
            ? profileMap[entry.partner_profile_id] || entry.partner_name || "Unbekannt"
            : entry.partner_name || "Unbekannt",
          partnerEmail: entry.partner_email,
          partnerType: entry.partner_type || "other",
          contactKey,
          isLinkedInContacts,
        };
      });
    },
    enabled: !!horseId,
  });
}
