import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { appointmentId } = await req.json();
    console.log("Generating report for appointment:", appointmentId);

    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select("*, horses!inner(name, breed, owner_id)")
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) throw new Error("Termin nicht gefunden");

    const { data: client } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", appointment.horses.owner_id)
      .single();

    const appointmentDate = new Date(appointment.date).toLocaleDateString("de-DE");

    if (client?.email) {
      await resend.emails.send({
        from: "HufManager <noreply@resend.dev>",
        to: [client.email],
        subject: `Behandlungsbericht: ${appointment.horses.name} - ${appointmentDate}`,
        html: `<p>Die Hufbearbeitung für <strong>${appointment.horses.name}</strong> am ${appointmentDate} wurde abgeschlossen.</p>`,
      });
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
