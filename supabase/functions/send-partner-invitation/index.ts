import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  tierarzt: "Tierarzt",
  physiotherapeut: "Physiotherapeut",
  osteopath: "Osteopath",
  chiropraktiker: "Chiropraktiker",
  reitlehrer: "Reitlehrer",
  trainer: "Trainer",
  sattler: "Sattler",
  huforthopaedie: "Huforthopädie",
  zahnarzt: "Zahnarzt",
  ernaehrungsberater: "Ernährungsberater",
  other: "Fachpartner",
};

interface InvitationPayload {
  horse_id: string;
  partner_email: string;
  partner_name: string;
  partner_type: string;
  permissions: {
    can_view_basic: boolean;
    can_view_hoof_history: boolean;
    can_view_medical: boolean;
    can_add_treatment_notes: boolean;
    can_create_appointments: boolean;
  };
  access_note?: string;
  valid_until?: string;
  invited_by_role: "provider" | "client";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: InvitationPayload = await req.json();
    const {
      horse_id, partner_email, partner_name, partner_type,
      permissions, access_note, valid_until, invited_by_role,
    } = payload;

    if (!horse_id || !partner_email || !partner_name || !partner_type) {
      return new Response(
        JSON.stringify({ error: "Pflichtfelder fehlen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller has access to this horse
    const { data: horse, error: horseError } = await supabase
      .from("horses")
      .select("id, name, owner_id")
      .eq("id", horse_id)
      .is("deleted_at", null)
      .single();

    if (horseError || !horse) {
      return new Response(JSON.stringify({ error: "Pferd nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check access: owner or provider with access_grant
    const isOwner = horse.owner_id === user.id;
    let isProvider = false;

    if (!isOwner) {
      const { data: providerCheck } = await supabase
        .from("access_grants")
        .select("id")
        .eq("provider_id", user.id)
        .eq("client_id", horse.owner_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!providerCheck) {
        // Also check created_by
        const { data: profileCheck } = await supabase
          .from("profiles")
          .select("created_by_provider_id")
          .eq("id", horse.owner_id)
          .single();

        if (profileCheck?.created_by_provider_id !== user.id) {
          return new Response(JSON.stringify({ error: "Keine Berechtigung" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      isProvider = true;
    }

    // Insert the horse_partner_access record
    const insertData: Record<string, unknown> = {
      horse_id,
      partner_email: partner_email.toLowerCase().trim(),
      partner_name: partner_name.trim(),
      partner_type,
      can_view_basic: permissions.can_view_basic,
      can_view_hoof_history: permissions.can_view_hoof_history,
      can_view_medical: permissions.can_view_medical,
      can_add_treatment_notes: permissions.can_add_treatment_notes,
      can_create_appointments: permissions.can_create_appointments,
      access_note: access_note || null,
      valid_until: valid_until || null,
      status: "pending",
      is_active: false,
    };

    if (invited_by_role === "provider" || isProvider) {
      insertData.invited_by_provider_id = user.id;
    } else {
      insertData.invited_by_client_id = user.id;
    }

    // Check if partner already has a profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", partner_email.toLowerCase().trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (existingProfile) {
      insertData.partner_profile_id = existingProfile.id;
    }

    const { data: grant, error: insertError } = await supabase
      .from("horse_partner_access")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Einladung konnte nicht erstellt werden" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const inviterName = escapeHtml(inviterProfile?.full_name || "Ein Nutzer");
    const horseName = escapeHtml(horse.name);
    const partnerTypeLabel = PARTNER_TYPE_LABELS[partner_type] || "Fachpartner";
    const inviteUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/partner-invite/${grant.invite_token}`;
    // Use the proper app URL
    const appUrl = Deno.env.get("APP_URL") || "https://hufmanager.lovable.app";
    const finalInviteUrl = `${appUrl}/partner-invite/${grant.invite_token}`;

    // Build permission list
    const permList: string[] = [];
    if (permissions.can_view_basic) permList.push("Basisdaten einsehen");
    if (permissions.can_view_hoof_history) permList.push("Huf-Historie einsehen");
    if (permissions.can_view_medical) permList.push("Medizinische Daten einsehen");
    if (permissions.can_add_treatment_notes) permList.push("Behandlungsnotizen anlegen");
    if (permissions.can_create_appointments) permList.push("Termine erstellen");

    const permListHtml = permList.map((p) => `<li>✅ ${p}</li>`).join("");

    // Send email via Resend
    try {
      await resend.emails.send({
        from: "HufManager <noreply@hufmanager.de>",
        to: [partner_email],
        subject: `Einladung: Zugriff auf ${horseName} im HufManager`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Einladung als ${escapeHtml(partnerTypeLabel)}</h2>
            <p>Hallo ${escapeHtml(partner_name)},</p>
            <p><strong>${inviterName}</strong> hat Ihnen Zugriff auf die Pferdeakte von 
               <strong>${horseName}</strong> im HufManager gewährt.</p>
            
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px; font-size: 14px; color: #666;">Ihre Berechtigungen:</h3>
              <ul style="margin: 0; padding: 0 0 0 8px; list-style: none;">
                ${permListHtml}
              </ul>
            </div>

            ${access_note ? `<p style="color: #666; font-style: italic;">Nachricht: "${escapeHtml(access_note)}"</p>` : ""}

            <a href="${finalInviteUrl}" 
               style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; 
                      border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
              Einladung annehmen
            </a>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Falls Sie kein HufManager-Konto haben, können Sie sich kostenlos registrieren.
            </p>
          </div>
        `,
      });
      console.log("Partner invitation email sent to:", partner_email);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the whole request if email fails - grant is created
    }

    return new Response(JSON.stringify({ success: true, grant }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-partner-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
