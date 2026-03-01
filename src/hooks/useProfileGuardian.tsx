import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface ProfileGuardianState {
  isRepairing: boolean;
  repairError: string | null;
  isProfileReady: boolean;
  retry: () => void;
}

/**
 * Profile Guardian Hook
 * 
 * Automatically detects and recovers "ghost users" - authenticated users
 * who are missing their profile in public.profiles.
 * 
 * CRITICAL: This hook must NEVER permanently block a user from using the app.
 * If repair fails, it sets isProfileReady = true after a timeout so the user
 * can still proceed (some features may be degraded).
 */
export function useProfileGuardian(user: User | null): ProfileGuardianState {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [isProfileReady, setIsProfileReady] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const checkAndRepairProfile = useCallback(async (currentUser: User) => {
    setIsRepairing(true);
    setRepairError(null);

    try {
      // Step 1: Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (checkError) {
        console.warn("Profile check failed (may be RLS), attempting repair:", checkError.message);
      }

      // Step 2: If profile missing, create it
      if (!existingProfile) {
        console.log("🔧 Profile Guardian: Repairing missing profile for user:", currentUser.id);

        const fullName = currentUser.user_metadata?.full_name || 
                        currentUser.user_metadata?.name ||
                        currentUser.email?.split('@')[0] || 
                        'Unbekannt';

        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: fullName,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            console.log("✅ Profile Guardian: Profile was created by trigger, continuing...");
          } else {
            console.error("❌ Profile Guardian: Failed to repair profile:", insertError);
            setRepairError(insertError.message);
            // CRITICAL: Still mark as ready so user isn't permanently blocked
            // Features may be degraded but user can still use the app
            setIsProfileReady(true);
            setIsRepairing(false);
            return;
          }
        } else {
          console.log("✅ Profile Guardian: Successfully created profile for user:", currentUser.id);
        }
      } else {
        console.log("✅ Profile Guardian: Profile exists for user:", currentUser.id);
      }

      // Step 3: Verify role exists (non-blocking)
      try {
        const { data: roleData } = await supabase
          .rpc("get_user_role", { _user_id: currentUser.id });

        if (!roleData) {
          console.warn("⚠️ Profile Guardian: User has profile but no role.");
        }
      } catch (roleErr) {
        // Role check is non-blocking
        console.warn("⚠️ Profile Guardian: Role check failed (non-blocking):", roleErr);
      }

      setIsProfileReady(true);
    } catch (err: any) {
      console.error("❌ Profile Guardian: Unexpected error:", err);
      setRepairError(err.message || "Unbekannter Fehler");
      // CRITICAL: Always mark as ready to prevent permanent blocking
      setIsProfileReady(true);
    } finally {
      setIsRepairing(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (user) {
      setAttemptCount(prev => prev + 1);
    }
  }, [user]);

  useEffect(() => {
    // No user = no profile needed, mark as ready
    if (!user) {
      setIsProfileReady(true);
      setIsRepairing(false);
      setRepairError(null);
      return;
    }

    checkAndRepairProfile(user);

    // Safety timeout: if profile check takes too long (>8s), let user through
    const safetyTimeout = setTimeout(() => {
      setIsProfileReady(prev => {
        if (!prev) {
          console.warn("⚠️ Profile Guardian: Safety timeout reached, allowing access");
          setIsRepairing(false);
          return true;
        }
        return prev;
      });
    }, 8000);

    return () => clearTimeout(safetyTimeout);
  }, [user?.id, attemptCount, checkAndRepairProfile]);

  return {
    isRepairing,
    repairError,
    isProfileReady,
    retry,
  };
}
