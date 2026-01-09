import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitialService {
  name: string;
  price: number;
}

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  planOverride?: string | null;
  accessValidUntil?: string | null;
  zipCode?: string | null;
  city?: string | null;
  phone?: string | null;
  businessName?: string | null;
  featureFlags?: {
    module_invoicing?: boolean;
    module_chat?: boolean;
    module_maps?: boolean;
    beta_features?: boolean;
  } | null;
  initialServices?: InitialService[] | null;
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

    const { 
      email, 
      firstName, 
      lastName,
      planOverride,
      accessValidUntil,
      zipCode,
      city,
      phone,
      businessName,
      featureFlags,
      initialServices
    }: CreateUserRequest = await req.json();
    
    // Validate input
    if (!email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Email, firstName, and lastName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${callerUser.email} creating provider: ${email} with plan: ${planOverride || 'standard'}`);

    // Create user with invite (sends magic link email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: `${firstName} ${lastName}`,
          role: "provider",
        },
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
      }
    );

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: "User creation failed - no user returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;
    const userEmail = newUser.user.email;

    console.log("User created:", userId);

    // Update the profile with all fields
    const profileUpdate: Record<string, unknown> = {
      full_name: `${firstName} ${lastName}`,
      is_manually_managed: planOverride ? true : false,
      email: email,
    };

    // Add optional fields
    if (planOverride) {
      profileUpdate.plan_override = planOverride;
      profileUpdate.subscription_plan = "pro"; // Give pro features for manual plans
    }
    if (accessValidUntil) {
      profileUpdate.access_valid_until = new Date(accessValidUntil).toISOString();
    }
    if (zipCode) {
      profileUpdate.zip_code = zipCode;
    }
    if (city) {
      profileUpdate.city = city;
    }
    if (phone) {
      profileUpdate.phone = phone;
    }
    if (featureFlags) {
      profileUpdate.feature_flags = featureFlags;
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
    }

    // Create business_settings if business name is provided
    if (businessName) {
      const { error: bsError } = await supabaseAdmin
        .from("business_settings")
        .upsert({
          user_id: userId,
          business_name: businessName,
          phone: phone,
        }, { onConflict: "user_id" });

      if (bsError) {
        console.error("Error creating business_settings:", bsError);
      }
    }

    // Create initial services if provided
    if (initialServices && initialServices.length > 0) {
      const servicesToInsert = initialServices.map(service => ({
        provider_id: userId,
        name: service.name,
        base_price: service.price,
        category: "Hufbearbeitung",
        billing_type: "standard",
        is_active: true,
        booking_action: "request_only",
      }));

      const { error: servicesError } = await supabaseAdmin
        .from("services")
        .insert(servicesToInsert);

      if (servicesError) {
        console.error("Error creating services:", servicesError);
      } else {
        console.log(`Created ${servicesToInsert.length} services for provider ${userId}`);
      }
    }

    // Fetch readable_id for response
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("readable_id")
      .eq("id", userId)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userId, 
          email: userEmail,
          full_name: `${firstName} ${lastName}`,
          readable_id: profile?.readable_id,
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});