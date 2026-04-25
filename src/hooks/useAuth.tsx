import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clear } from "idb-keyval";

type UserRole = "provider" | "client" | "admin" | "employee" | "partner" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  userType: "pro" | "owner" | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: "provider" | "client" | "partner") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [userType, setUserType] = useState<"pro" | "owner" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .maybeSingle();
    return data?.user_type as 'pro' | 'owner' | null;
  };

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching role:", error);
      return null;
    }
    
    if (data?.role) {
      return data.role as UserRole;
    }

    // Auto-repair: if no role found, try to assign based on user metadata
    console.warn("No role found for user, attempting auto-repair...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const metaRole = user?.user_metadata?.role;
      const roleToAssign = metaRole === "provider" ? "provider" 
        : metaRole === "partner" ? "partner" 
        : "client";
      
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: roleToAssign })
        .select()
        .single();

      if (insertError) {
        console.error("Auto-repair role failed:", insertError);
        // Fallback: return meta role anyway so user isn't stuck
        return (metaRole as UserRole) || "client";
      }
      
      console.log("Auto-repaired role:", roleToAssign);
      return roleToAssign as UserRole;
    } catch (err) {
      console.error("Auto-repair error:", err);
      return "client"; // Ultimate fallback
    }
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

  // Process Hufi Connect invite token after successful login
  const processHmConnectInvite = async (userId: string) => {
    const token = sessionStorage.getItem("hm_connect_invite");
    if (!token) return;

    try {
      // Mark invitation as accepted
      const { data, error } = await supabase
        .from("hm_connect_invitations")
        .update({
          status: "accepted",
          accepted_by: userId,
          accepted_at: new Date().toISOString(),
        })
        .eq("token", token)
        .eq("status", "pending")
        .select("invited_by")
        .maybeSingle();

      if (!error && data?.invited_by) {
        // Auto-create connection between inviter and invitee
        const { data: existingGrant } = await supabase
          .from("access_grants")
          .select("id")
          .or(`and(client_id.eq.${userId},provider_id.eq.${data.invited_by}),and(client_id.eq.${data.invited_by},provider_id.eq.${userId})`)
          .maybeSingle();

        if (!existingGrant) {
          // Create bidirectional pending connection - will be finalized based on roles
          await supabase.from("access_grants").insert({
            client_id: userId,
            provider_id: data.invited_by,
            status: "active",
            is_active: true,
            can_view_basic: true,
            can_view_medical: false,
            can_create_appointments: false,
            requested_by: data.invited_by,
          });
        }
        console.log("Hufi Connect invite accepted, connected to:", data.invited_by);
      }
    } catch (error) {
      console.error("Error processing Hufi Connect invite:", error);
    } finally {
      sessionStorage.removeItem("hm_connect_invite");
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;
    const isRoleFetching = { current: false };

    const fetchRoleGuarded = async (userId: string): Promise<UserRole> => {
      if (isRoleFetching.current) return null;
      isRoleFetching.current = true;
      try {
        return await fetchUserRole(userId);
      } finally {
        isRoleFetching.current = false;
      }
    };

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
            if (!isMounted) return;
            const fetchedRole = await fetchRoleGuarded(session.user.id);
            const fetchedType = await fetchUserProfile(session.user.id);
            if (isMounted && fetchedRole !== null) {
              setRole(fetchedRole);
              setUserType(fetchedType);
              setLoading(false);
            }
            // Process invite code on sign in
            if (event === "SIGNED_IN") {
              // Botschafter login redirect
              if (sessionStorage.getItem("botschafter_login_source") === "true") {
                sessionStorage.removeItem("botschafter_login_source");
                try {
                  const { data: bot } = await supabase
                    .from("pferdeakte_botschafter")
                    .select("id, status")
                    .eq("user_id", session.user.id)
                    .maybeSingle();
                  if (bot?.status === "active" || bot?.status === "pending") {
                    navigate("/botschafter/dashboard", { replace: true });
                    return;
                  }
                } catch (err) {
                  console.warn("Botschafter redirect check failed:", err);
                }
              }
              processInviteCode(session.user.id);
              processHmConnectInvite(session.user.id);
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
              // Log pending widerrufsausschluss consent from registration
              const pendingWiderruf = sessionStorage.getItem("hm_pending_widerruf_consent");
              if (pendingWiderruf) {
                try {
                  await supabase.from("consent_log").insert({
                    user_id: session.user.id,
                    consent_type: "widerrufsausschluss",
                    accepted_at: pendingWiderruf,
                    ip_address: null,
                  });
                } catch (err) {
                  console.error("Error logging widerruf consent:", err);
                } finally {
                  sessionStorage.removeItem("hm_pending_widerruf_consent");
                }
              }
              // Process pending client_type from registration
              const pendingClientType = sessionStorage.getItem("hm_pending_client_type");
              if (pendingClientType) {
                try {
                  await supabase.from("profiles").update({
                    client_type: pendingClientType === "business" ? "commercial" : "private",
                  } as any).eq("id", session.user.id);
                } catch (err) {
                  console.error("Error setting client_type:", err);
                } finally {
                  sessionStorage.removeItem("hm_pending_client_type");
                }
              }
            }
          }, 0);
        } else {
          setRole(null);
    setUserType(null);
          // No session means not authenticated - stop loading
          if (isMounted) setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted || initialSessionHandled) return;
      initialSessionHandled = true;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([fetchRoleGuarded(session.user.id), fetchUserProfile(session.user.id)]).then(([r, type]) => {
          if (isMounted) {
            if (r !== null) setRole(r);
            setUserType(type);
            setLoading(false);
          }
        });
        // Also process invite code on initial load (in case of email confirmation redirect)
        processInviteCode(session.user.id);
      } else {
        if (isMounted) setLoading(false);
      }
    });

    // Safety timeout: never stay loading for more than 10 seconds
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(prev => {
          if (prev) {
            console.warn("⚠️ Auth: Safety timeout reached, forcing loading=false");
            return false;
          }
          return prev;
        });
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { error };
    }

    if (data.user) {
      // FAST PATH: Read role from user_metadata first (instant, no DB query)
      const metaRole = data.user.user_metadata?.role as UserRole;
      
      // Run suspension check in parallel with DB role fetch
      const profilePromise = (async () => {
        try {
          return await supabase
            .from("profiles")
            .select("is_suspended, suspended_reason")
            .eq("id", data.user.id)
            .maybeSingle();
        } catch {
          return { data: null, error: null };
        }
      })();

      // Optimistically set role from metadata for any intermediate UI,
      // but do NOT set loading=false yet — wait for DB to confirm the true role
      if (metaRole) {
        setRole(metaRole);
      }

      // Fetch authoritative role from DB (must complete before navigation)
      const [profileResult, dbRole] = await Promise.all([
        profilePromise,
        fetchUserRole(data.user.id),
      ]);

      // Check suspension
      const profile = profileResult?.data as { is_suspended?: boolean; suspended_reason?: string } | null;
      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        const reason = profile.suspended_reason || "Ihr Konto wurde gesperrt.";
        return { error: new Error(`Konto gesperrt: ${reason}`) };
      }

      // Update with authoritative DB role (may differ from metadata)
      setRole(dbRole);
      const type = await fetchUserProfile(data.user.id);
      setUserType(type);
      setLoading(false);
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out error (proceeding anyway):", e);
    }

    setRole(null);

    // Clear React Query cache
    queryClient.clear();

    // Clear localStorage (preserve theme)
    const keysToKeep = ["theme", "vite-ui-theme"];
    const savedValues: Record<string, string | null> = {};
    keysToKeep.forEach((key) => {
      savedValues[key] = localStorage.getItem(key);
    });
    localStorage.clear();
    keysToKeep.forEach((key) => {
      if (savedValues[key] !== null) {
        localStorage.setItem(key, savedValues[key]!);
      }
    });

    // Clear IndexedDB offline queue
    try {
      await clear();
    } catch (e) {
      console.warn("IndexedDB clear error:", e);
    }

    // Redirect to auth
    navigate("/auth", { replace: true });
  };

  const value = {
    user,
    session,
    role,
    userType,
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
