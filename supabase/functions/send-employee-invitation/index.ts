import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  employeeId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { employeeId }: InvitationRequest = await req.json();

    if (!employeeId) {
      throw new Error("Employee ID is required");
    }

    // Fetch employee profile (RLS will ensure provider owns this employee)
    const { data: employee, error: empError } = await supabaseUser
      .from("employee_profiles")
      .select("*, provider:profiles!employee_profiles_provider_id_fkey(full_name, email)")
      .eq("id", employeeId)
      .single();

    if (empError || !employee) {
      throw new Error("Employee not found or access denied");
    }

    // Generate new invitation token if needed
    const invitationToken = employee.invitation_token || crypto.randomUUID();
    
    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Update employee with invitation details
    const { error: updateError } = await supabaseAdmin
      .from("employee_profiles")
      .update({
        invitation_token: invitationToken,
        invitation_sent_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    if (updateError) {
      throw new Error("Failed to update invitation: " + updateError.message);
    }

    // Get the app URL from environment or use default
    const appUrl = Deno.env.get("APP_URL") || "https://app.hufmanager.de";
    const invitationLink = `${appUrl}/employee-invite?token=${invitationToken}`;

    // For now, we'll log the invitation link (email sending can be added later)
    console.log(`Invitation for ${employee.email}:`, invitationLink);

    // In production, send email via Resend or similar
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HufManager <noreply@hufmanager.de>",
          to: [employee.email],
          subject: `Einladung ins Team von ${employee.provider?.full_name || "deinem Arbeitgeber"}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #F47B20;">Du wurdest eingeladen!</h1>
              <p>Hallo ${employee.full_name},</p>
              <p><strong>${employee.provider?.full_name}</strong> hat dich als Mitarbeiter zu HufManager eingeladen.</p>
              <p>Klicke auf den folgenden Link, um dein Konto zu aktivieren:</p>
              <p style="margin: 30px 0;">
                <a href="${invitationLink}" 
                   style="background-color: #F47B20; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Einladung annehmen
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                Dieser Link ist 7 Tage gültig. Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">HufManager - Professionelle Hufbearbeitung digital verwalten</p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send email:", await emailResponse.text());
        // Don't throw - invitation was created, email just failed
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation sent successfully",
        invitationLink: resendApiKey ? undefined : invitationLink, // Only return link if no email was sent
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-employee-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
