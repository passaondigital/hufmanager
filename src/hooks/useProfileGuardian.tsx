import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface ProfileGuardianState {
  isRepairing: boolean;
  repairError: string | null;
  isProfileReady: boolean;
}

/**
 * Profile Guardian Hook
 * 
 * Automatically detects and recovers "ghost users" - authenticated users
 * who are missing their profile in public.profiles.
 * 
 * This runs on every app load and ensures the profile exists before
 * allowing any other operations that depend on it.
 */
export function useProfileGuardian(user: User | null): ProfileGuardianState {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [isProfileReady, setIsProfileReady] = useState(false);

  useEffect(() => {
    // No user = no profile needed, mark as ready
    if (!user) {
      setIsProfileReady(true);
      setIsRepairing(false);
      setRepairError(null);
      return;
    }

    const checkAndRepairProfile = async () => {
      setIsRepairing(true);
      setRepairError(null);

      try {
        // Step 1: Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (checkError) {
          // RLS might block the query if user has no profile, try to insert anyway
          console.warn("Profile check failed (may be RLS), attempting repair:", checkError.message);
        }

        // Step 2: If profile missing, create it
        if (!existingProfile) {
          console.log("🔧 Profile Guardian: Repairing missing profile for user:", user.id);

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
            // Handle race condition: profile created by another process
            if (insertError.code === "23505") {
              console.log("✅ Profile Guardian: Profile was created by trigger, continuing...");
            } else {
              console.error("❌ Profile Guardian: Failed to repair profile:", insertError);
              setRepairError(insertError.message);
              setIsRepairing(false);
              return;
            }
          } else {
            console.log("✅ Profile Guardian: Successfully created profile for user:", user.id);
            // The DB trigger (handle_new_profile_role) will auto-create the 'client' role
          }
        } else {
          console.log("✅ Profile Guardian: Profile exists for user:", user.id);
        }

        // Step 3: Verify role exists (for legacy profiles)
        const { data: roleData } = await supabase
          .rpc("get_user_role", { _user_id: user.id });

        if (!roleData) {
          console.warn("⚠️ Profile Guardian: User has profile but no role. Some RLS policies may block operations.");
          // The handle_new_profile_role trigger should have created the role
          // If it didn't, there might be an issue with the trigger
          // We can't INSERT into user_roles directly due to RLS, so we log a warning
        }

        setIsProfileReady(true);
      } catch (err: any) {
        console.error("❌ Profile Guardian: Unexpected error:", err);
        setRepairError(err.message || "Unbekannter Fehler");
      } finally {
        setIsRepairing(false);
      }
    };

    checkAndRepairProfile();
  }, [user?.id]); // Only re-run when user ID changes

  return {
    isRepairing,
    repairError,
    isProfileReady,
  };
}
