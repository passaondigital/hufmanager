import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientRequest {
  email: string;
  password: string;
  fullName: string;
  providerId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callerUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("Caller is not an admin:", callerUser.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, fullName, providerId }: CreateClientRequest = await req.json();
    
    // Validate input
    if (!email || !password || !fullName || !providerId) {
      return new Response(
        JSON.stringify({ error: "email, password, fullName, and providerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${callerUser.email} creating client: ${email} for provider: ${providerId}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      console.log("User already exists:", existingUser.id);
      return new Response(
        JSON.stringify({ error: "User with this email already exists", userId: existingUser.id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with password (no email confirmation needed)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
        role: "client",
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created:", newUser.user?.id);

    // The handle_new_user trigger should create the profile and role automatically
    // But we need to update it with the provider link
    if (newUser.user) {
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update the profile with provider link
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: fullName,
          email: email,
          created_by_provider_id: providerId,
          has_logged_in: false,
        })
        .eq("id", newUser.user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
      }

      // Create access grant to link client with provider
      const { error: grantError } = await supabaseAdmin
        .from("access_grants")
        .insert({
          provider_id: providerId,
          client_id: newUser.user.id,
          is_active: true,
          can_view_basic: true,
          can_view_medical: true,
          can_create_appointments: true,
        });

      if (grantError) {
        console.error("Error creating access grant:", grantError);
      } else {
        console.log("Access grant created between client and provider");
      }

      // Fetch the created profile to get the readable_id
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("readable_id")
        .eq("id", newUser.user.id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: { 
            id: newUser.user.id, 
            email: newUser.user.email,
            full_name: fullName,
            readable_id: profile?.readable_id,
          },
          message: `Client ${fullName} created and linked to provider ${providerId}`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "User creation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
