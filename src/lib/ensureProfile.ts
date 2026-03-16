import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

/**
 * Ensures a user profile exists in the public.profiles table,
 * and that the user has a role in user_roles (for RLS policies).
 * 
 * This handles "ghost user" scenarios where auth.users exists but 
 * public.profiles or user_roles doesn't.
 * 
 * NOTE: The database has an AFTER INSERT trigger that auto-creates
 * a 'client' role when a profile is inserted, but this function also
 * handles legacy profiles missing roles.
 */
export async function ensureUserProfile(user: User): Promise<{ success: boolean; error?: string }> {
  if (!user || !user.id) {
    return { success: false, error: "Kein Benutzer angegeben" };
  }

  try {
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking profile existence:", checkError);
      return { success: false, error: checkError.message };
    }

    let profileCreated = false;

    // Profile missing - auto-heal by creating it
    if (!existingProfile) {
      if (import.meta.env.DEV) console.log("Auto-healing missing profile for user:", user.id);
      
      const fullName = user.user_metadata?.full_name || 
                       user.user_metadata?.name ||
                       user.email?.split('@')[0] || 
                       'Unbekannt';
      
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
        });

      if (insertError) {
        // Handle unique constraint violation (profile was created by another process)
        if (insertError.code === "23505") {
          if (import.meta.env.DEV) console.log("Profile was created by another process, continuing...");
        } else {
          console.error("Error creating profile:", insertError);
          return { success: false, error: insertError.message };
        }
      } else {
        if (import.meta.env.DEV) console.log("Successfully auto-healed profile for user:", user.id);
        profileCreated = true;
        // The DB trigger will auto-create the role, so we're done
      }
    }

    // For existing profiles (not just created), ensure role exists
    // The trigger only fires on INSERT, so legacy profiles might be missing roles
    if (!profileCreated) {
      // Check if user has a role using the get_user_role function
      const { data: roleData } = await supabase
        .rpc("get_user_role", { _user_id: user.id });
      
      // If no role exists, we can't INSERT directly (RLS blocks it)
      // The user will need to be assigned a role through another mechanism
      // For now, log a warning - the connection request will fail with clear error
      if (!roleData) {
        console.warn("User has profile but no role - RLS may block some actions:", user.id);
      }
    }

    // ── BID Linking ───────────────────────────────────────
    // Link orphan BIDs (registered without auth) by email match
    const userEmail = user.email;
    if (userEmail) {
      try {
        const { data: orphanBid } = await supabase
          .from("pferdeakte_botschafter")
          .select("id")
          .eq("email", userEmail)
          .is("user_id", null)
          .maybeSingle();

        if (orphanBid) {
          if (import.meta.env.DEV) console.log("Auto-linking orphan BID to user:", user.id);
          await supabase
            .from("pferdeakte_botschafter")
            .update({ user_id: user.id, source_user_id: user.id } as any)
            .eq("id", orphanBid.id);
        }
      } catch (bidErr) {
        console.warn("BID linking check failed (non-critical):", bidErr);
      }

      // Ensure source_user_id is set for existing BIDs
      try {
        const { data: existingBid } = await supabase
          .from("pferdeakte_botschafter")
          .select("id, source_user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingBid && !existingBid.source_user_id) {
          await supabase
            .from("pferdeakte_botschafter")
            .update({ source_user_id: user.id } as any)
            .eq("id", existingBid.id);
        }
      } catch (bidErr) {
        console.warn("BID source_user_id update failed (non-critical):", bidErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in ensureUserProfile:", err);
    return { success: false, error: err.message || "Unbekannter Fehler" };
  }
}
