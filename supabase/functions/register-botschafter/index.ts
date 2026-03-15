import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateRef(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      user_id, type, first_name, last_name, email, phone,
      heard_from, social_handle, motivation, profession, plz,
      website, customer_count, company_name, company_role,
      industry, cooperation_types, source_role,
    } = body;

    if (!user_id || !type || !first_name || !last_name || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const refCode = generateRef();

    const { data, error } = await supabaseAdmin
      .from("pferdeakte_botschafter")
      .insert({
        user_id,
        type,
        first_name: (first_name as string).substring(0, 80),
        last_name: (last_name as string).substring(0, 80),
        email: (email as string).substring(0, 255),
        phone: phone || null,
        heard_from: heard_from || null,
        social_handle: social_handle || null,
        motivation: motivation || null,
        profession: profession || null,
        plz: plz || null,
        website: website || null,
        customer_count: customer_count || null,
        company_name: company_name || null,
        company_role: company_role || null,
        industry: industry || null,
        cooperation_types: cooperation_types || null,
        referral_code: refCode,
        status: "pending",
        source_role: source_role || "extern",
      })
      .select("id, bid, referral_code")
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return new Response(
        JSON.stringify({ error: error.code === "23505" ? "already_registered" : error.message, code: error.code }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing profile to link
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", user_id)
      .maybeSingle();

    if (existingProfile && data) {
      await supabaseAdmin
        .from("pferdeakte_botschafter")
        .update({ source_user_id: existingProfile.id })
        .eq("id", data.id);
    }

    return new Response(
      JSON.stringify({ data, referral_code: refCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
