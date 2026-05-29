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
  loading: boolean;
  isPasswordRecovery: boolean;
  forcePasswordChange: boolean;
  clearPasswordRecovery: () => void;
  clearForcePasswordChange: () => void;
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
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

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

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);
  const clearForcePasswordChange = () => setForcePasswordChange(false);

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

  // Process HM Connect invite token after successful login
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
        console.log("HM Connect invite accepted, connected to:", data.invited_by);
      }
    } catch (error) {
      console.error("Error processing HM Connect invite:", error);
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
            if (isMounted) {
              if (fetchedRole !== null) setRole(fetchedRole);
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
              // Process pending profession_type from registration (providers only)
              const pendingProfessionType = sessionStorage.getItem("hm_pending_profession_type");
              if (pendingProfessionType) {
                try {
                  await supabase.from("profiles").update({
                    profession_type: pendingProfessionType,
                  } as any).eq("id", session.user.id);
                  const { data: bsExisting } = await supabase
                    .from("business_settings")
                    .select("id")
                    .eq("user_id", session.user.id)
                    .maybeSingle();
                  if (bsExisting) {
                    await supabase.from("business_settings").update({
                      profession_type: pendingProfessionType,
                    } as any).eq("user_id", session.user.id);
                  }
                  await supabase.rpc("create_default_service_presets", {
                    _provider_id: session.user.id,
                    _profession_type: pendingProfessionType,
                  });
                } catch (err) {
                  console.error("Error setting profession_type:", err);
                } finally {
                  sessionStorage.removeItem("hm_pending_profession_type");
                }
              }
              const pendingSalutation = sessionStorage.getItem("hm_pending_salutation");
              if (pendingSalutation) {
                const { error: salErr } = await supabase
                  .from("profiles")
                  .update({ salutation: pendingSalutation } as any)
                  .eq("id", session.user.id);
                if (salErr) {
                  console.warn("salutation not written (column may not exist yet):", salErr.message);
                }
                sessionStorage.removeItem("hm_pending_salutation");
              }
            }
          }, 0);
        } else {
          setRole(null);
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
        fetchRoleGuarded(session.user.id).then((r) => {
          if (isMounted) {
            if (r !== null) setRole(r);
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


      // Fetch profile + role in parallel
      const profilePromise = (async () => {
        try {
          return await supabase
            .from("profiles")
            .select("is_suspended, suspended_reason, force_password_reset, created_by_provider_id")
            .eq("id", data.user.id)
            .maybeSingle();
        } catch {
          return { data: null, error: null };
        }
      })();

      if (metaRole) {
        setRole(metaRole);
        setLoading(false);
      }

      const [profileResult, dbRole] = await Promise.all([
        profilePromise,
        fetchUserRole(data.user.id),
      ]);

      const profile = profileResult?.data as {
        is_suspended?: boolean;
        suspended_reason?: string;
        force_password_reset?: boolean;
        created_by_provider_id?: string;
      } | null;

      // 1. Suspension check
      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        const reason = profile.suspended_reason || "Ihr Konto wurde gesperrt.";
        return { error: new Error(`Konto gesperrt: ${reason}`) };
      }

      // 2. Client Pro check — block login if provider doesn't have Pro
      if (dbRole === "client" && profile?.created_by_provider_id) {
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("subscription_plan, subscription_status, plan_override, access_valid_until, email")
          .eq("id", profile.created_by_provider_id)
          .maybeSingle();

        if (providerProfile) {
          const providerHasPro = _checkProviderHasPro(providerProfile);
          if (!providerHasPro) {
            // Notify provider (fire-and-forget, session still valid)
            supabase.functions.invoke("notify-provider-client-blocked", {
              body: { providerEmail: providerProfile.email, clientEmail: data.user.email },
            }).catch(() => {});

            await supabase.auth.signOut();
            return {
              error: new Error(`PROVIDER_NO_PRO:${providerProfile.email || ""}`),
            };
          }
        }
      }

      // 3. Force password change
      if (profile?.force_password_reset) {
        if (dbRole !== null) setRole(dbRole);
        setLoading(false);
        setForcePasswordChange(true);
        return { error: null };
      }

      if (dbRole !== null) setRole(dbRole);
      setLoading(false);

      // Redirect to password change if first login with temporary password
      if (profile?.force_password_reset) {
        navigate("/update-password", { replace: true });
      }
    }

    return { error: null };
  };

// Pure helper — not a hook method, no state side-effects
function _checkProviderHasPro(provider: {
  subscription_plan: string | null;
  subscription_status: string | null;
  plan_override: string | null;
  access_valid_until: string | null;
}): boolean {
  const { subscription_plan, subscription_status, plan_override, access_valid_until } = provider;
  if (plan_override && plan_override !== "standard") {
    const validUntil = access_valid_until ? new Date(access_valid_until) : null;
    return validUntil ? validUntil > new Date() : true;
  }
  return (
    ["pro", "advanced", "duo", "team"].includes(subscription_plan || "") ||
    subscription_status === "lifetime"
  );
}

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
    loading,
    isPasswordRecovery,
    forcePasswordChange,
    clearPasswordRecovery,
    clearForcePasswordChange,
    signIn,
    signUp,
    signOut,
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
