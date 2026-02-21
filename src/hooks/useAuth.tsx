import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "provider" | "client" | "admin" | "employee" | "partner" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: "provider" | "client" | "partner") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching role:", error);
      return null;
    }
    return data?.role as UserRole;
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  // Process invite code after successful login
  const processInviteCode = async (userId: string) => {
    const inviteCode = sessionStorage.getItem("huf_invite_code");
    if (!inviteCode) return;
    
    try {
      // Look up provider by readable_id
      const { data: result } = await supabase.rpc("search_profile_by_readable_id", {
        search_id: inviteCode
      });
      
      // Cast to expected shape
      const profileResult = result as { found: boolean; id?: string; role?: string } | null;
      
      if (profileResult && profileResult.found && profileResult.id && profileResult.role === 'provider') {
        // Check if access_grant already exists
        const { data: existingGrant } = await supabase
          .from("access_grants")
          .select("id")
          .eq("client_id", userId)
          .eq("provider_id", profileResult.id)
          .maybeSingle();
        
        if (!existingGrant) {
          // Create access_grant with active status
          await supabase.from("access_grants").insert({
            client_id: userId,
            provider_id: profileResult.id,
            status: "active",
            is_active: true,
            can_view_basic: true,
            can_view_medical: true,
            can_create_appointments: true,
          });
          console.log("Auto-connected to provider via invite link:", profileResult.id);
        }
      }
    } catch (error) {
      console.error("Error processing invite code:", error);
    } finally {
      // Clear the invite code from storage
      sessionStorage.removeItem("huf_invite_code");
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Detect PASSWORD_RECOVERY event and set flag
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Defer role fetching with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            fetchUserRole(session.user.id).then(setRole);
            // Process invite code on sign in
            if (event === "SIGNED_IN") {
              processInviteCode(session.user.id);
              // Process partner invite token if present
              const partnerToken = sessionStorage.getItem("partner_invite_token");
              if (partnerToken) {
                try {
                  await supabase.rpc("accept_partner_invitation", {
                    p_token: partnerToken,
                    p_user_id: session.user.id,
                  });
                  console.log("Partner invitation accepted via auth callback");
                } catch (err) {
                  console.error("Error accepting partner invite:", err);
                } finally {
                  sessionStorage.removeItem("partner_invite_token");
                }
              }
            }
          }, 0);
        } else {
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then((r) => {
          setRole(r);
          setLoading(false);
        });
        // Also process invite code on initial load (in case of email confirmation redirect)
        processInviteCode(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { error };
    }

    // Check if user is suspended - use maybeSingle() to avoid schema errors
    if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_suspended, suspended_reason")
          .eq("id", data.user.id)
          .maybeSingle();

        // Log profile errors but don't block login
        if (profileError) {
          console.warn("Profile check failed (non-blocking):", profileError.message);
          // Continue with login - profile will be created/repaired by ProfileGuardian
        }

        if (profile?.is_suspended) {
          // Sign out immediately
          await supabase.auth.signOut();
          const reason = profile.suspended_reason || "Ihr Konto wurde gesperrt.";
          return { 
            error: new Error(`Konto gesperrt: ${reason}`) 
          };
        }
      } catch (err) {
        // Non-blocking error - allow login to proceed
        console.warn("Unexpected error during profile check:", err);
      }
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: "provider" | "client" | "partner" = "client") => {
    const redirectUrl = `${window.location.origin}/home`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const value = { 
    user, 
    session, 
    role, 
    loading, 
    isPasswordRecovery, 
    clearPasswordRecovery, 
    signIn, 
    signUp, 
    signOut 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
