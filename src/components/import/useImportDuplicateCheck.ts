import { supabase } from "@/integrations/supabase/client";
import type { ParsedContact } from "./types";
import type { DuplicateMatch } from "./ImportDuplicateCheck";

/**
 * Checks parsed contacts against existing contacts in the DB.
 * Returns { duplicates, newContacts } for the duplicate resolution step.
 */
export async function checkDuplicates(
  contacts: ParsedContact[],
  providerId: string
): Promise<{ duplicates: DuplicateMatch[]; newContacts: ParsedContact[] }> {
  // Fetch existing contacts for this provider
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, full_name, email, phone")
    .eq("provider_id", providerId)
    .limit(5000);

  if (!existing || existing.length === 0) {
    return { duplicates: [], newContacts: contacts };
  }

  const emailMap = new Map<string, typeof existing[0]>();
  const phoneMap = new Map<string, typeof existing[0]>();
  const nameMap = new Map<string, typeof existing[0]>();

  for (const e of existing) {
    if (e.email) emailMap.set(e.email.toLowerCase().trim(), e);
    if (e.phone) phoneMap.set(normalizePhone(e.phone), e);
    if (e.full_name) nameMap.set(e.full_name.toLowerCase().trim(), e);
  }

  const duplicates: DuplicateMatch[] = [];
  const newContacts: ParsedContact[] = [];

  for (const c of contacts) {
    if (c.status === "error") {
      newContacts.push(c); // Will be skipped anyway
      continue;
    }

    let matched = false;

    // Priority: email > phone > name
    if (c.email) {
      const existing = emailMap.get(c.email.toLowerCase().trim());
      if (existing) {
        duplicates.push({
          importContact: c,
          existingContact: existing,
          matchType: "email",
          action: "skip",
        });
        matched = true;
      }
    }

    if (!matched && c.phone) {
      const existing = phoneMap.get(normalizePhone(c.phone));
      if (existing) {
        duplicates.push({
          importContact: c,
          existingContact: existing,
          matchType: "phone",
          action: "skip",
        });
        matched = true;
      }
    }

    if (!matched && c.full_name) {
      const existing = nameMap.get(c.full_name.toLowerCase().trim());
      if (existing) {
        duplicates.push({
          importContact: c,
          existingContact: existing,
          matchType: "name",
          action: "skip",
        });
        matched = true;
      }
    }

    if (!matched) {
      newContacts.push(c);
    }
  }

  return { duplicates, newContacts };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\/]/g, "").replace(/^0049/, "+49").replace(/^0/, "+49");
}
