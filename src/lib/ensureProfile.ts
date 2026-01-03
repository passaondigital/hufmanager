import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

/**
 * Ensures a user profile exists in the public.profiles table.
 * If missing, creates one using data from the auth user object.
 * This handles "ghost user" scenarios where auth.users exists but public.profiles doesn't.
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

    // Profile exists, nothing to do
    if (existingProfile) {
      return { success: true };
    }

    // Profile missing - auto-heal by creating it
    console.log("Auto-healing missing profile for user:", user.id);
    
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
        console.log("Profile was created by another process, continuing...");
        return { success: true };
      }
      console.error("Error creating profile:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("Successfully auto-healed profile for user:", user.id);
    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in ensureUserProfile:", err);
    return { success: false, error: err.message || "Unbekannter Fehler" };
  }
}
