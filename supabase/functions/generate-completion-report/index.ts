import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escaping to prevent XSS attacks in emails
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create service role client for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create anon client to verify the user's JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    // ==========================================
    // SECURITY: Verify the calling user is authorized
    // ==========================================
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized - No auth header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Authenticated user:", user.id);

    const { appointmentId } = await req.json();
    console.log("Generating report for appointment:", appointmentId);

    // First, verify the user is the provider of this appointment
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select("*, horses!inner(name, breed, owner_id)")
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) {
      console.error("Appointment not found:", aptError?.message);
      return new Response(JSON.stringify({ error: "Termin nicht gefunden" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ==========================================
    // SECURITY: Verify the user is the provider of this appointment
    // ==========================================
    if (appointment.provider_id !== user.id) {
      console.error("Unauthorized: User", user.id, "is not the provider of appointment", appointmentId);
      return new Response(JSON.stringify({ error: "Nicht autorisiert - Sie sind nicht der Provider dieses Termins" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Authorization verified - user is the provider of this appointment");

    const { data: client } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", appointment.horses.owner_id)
      .single();

    const appointmentDate = new Date(appointment.date).toLocaleDateString("de-DE");

    if (client?.email) {
      // Use HTML escaping to prevent XSS attacks
      const safeHorseName = escapeHtml(appointment.horses.name);
      const safeDate = escapeHtml(appointmentDate);
      
      await resend.emails.send({
        from: "HufManager <noreply@resend.dev>",
        to: [client.email],
        subject: `Behandlungsbericht: ${safeHorseName} - ${safeDate}`,
        html: `<p>Die Hufbearbeitung für <strong>${safeHorseName}</strong> am ${safeDate} wurde abgeschlossen.</p>`,
      });
      
      console.log("Email sent successfully to:", client.email);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
