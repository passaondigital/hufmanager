import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// LTZ Label mappings
const TOE_AXIS_LABELS: Record<string, string> = {
  straight: 'Gerade',
  broken_back: 'Gebrochen nach hinten',
  broken_forward: 'Gebrochen nach vorne',
};

const LANDING_LABELS: Record<string, string> = {
  toe: 'Zehe',
  heel: 'Trachte',
  flat: 'Plan',
  unphysiological: 'Unphysiologisch',
};

const HORN_QUALITY_LABELS: Record<string, string> = {
  normal: 'Normal',
  poor: 'Schlecht',
  cracked: 'Rissig',
};

const STANCE_LABELS: Record<string, string> = {
  regular: 'Regulär',
  zeheneng: 'Zeheneng',
  zehenweit: 'Zehenweit',
  bodeneng: 'Bodeneng',
  bodenweit: 'Bodenweit',
};

const CORONET_LABELS: Record<string, string> = {
  inner: 'Innen höher',
  outer: 'Außen höher',
  equal: 'Gleich',
};

const PASTERN_LABELS: Record<string, string> = {
  correct: 'Ja (1/3 zu 2/3)',
  incorrect: 'Nein',
};

interface HoofData {
  toeAxis?: string;
  landingTheory?: string;
  hornQuality?: string;
  coronetTheory?: string;
  pasternAngle?: string;
  soleFrogPlane?: string;
  photoUrl?: string;
}

function getLabel(labels: Record<string, string>, value?: string): string {
  return value ? (labels[value] || value) : '—';
}

function generateLTZTableHtml(analysis: any): string {
  const hoofData: Record<string, HoofData> = {
    vl: analysis.hoof_data_vl || {},
    vr: analysis.hoof_data_vr || {},
    hl: analysis.hoof_data_hl || {},
    hr: analysis.hoof_data_hr || {},
  };

  const hoofLabels = { vl: 'VL', vr: 'VR', hl: 'HL', hr: 'HR' };
  
  const getCellStyle = (value: string | undefined, goodValue: string) => {
    if (!value) return 'background-color: #f5f5f5;';
    return value === goodValue 
      ? 'background-color: #dcfce7; color: #166534;' 
      : 'background-color: #fef3c7; color: #92400e;';
  };

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
      <thead>
        <tr style="background-color: #f97316; color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Parameter</th>
          ${Object.values(hoofLabels).map(l => `<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">${l}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">Zehenachse</td>
          ${Object.keys(hoofLabels).map(k => `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${getCellStyle(hoofData[k].toeAxis, 'straight')}">
              ${getLabel(TOE_AXIS_LABELS, hoofData[k].toeAxis)}
            </td>
          `).join('')}
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">Fesselstand</td>
          ${Object.keys(hoofLabels).map(k => `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${getCellStyle(hoofData[k].pasternAngle, 'correct')}">
              ${getLabel(PASTERN_LABELS, hoofData[k].pasternAngle)}
            </td>
          `).join('')}
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">Kronrandtheorie</td>
          ${Object.keys(hoofLabels).map(k => `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${getCellStyle(hoofData[k].coronetTheory, 'equal')}">
              ${getLabel(CORONET_LABELS, hoofData[k].coronetTheory)}
            </td>
          `).join('')}
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">Sohle-Strahl-Ebene</td>
          ${Object.keys(hoofLabels).map(k => `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${getCellStyle(hoofData[k].soleFrogPlane, 'equal')}">
              ${getLabel(CORONET_LABELS, hoofData[k].soleFrogPlane)}
            </td>
          `).join('')}
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">Fußung auf</td>
          ${Object.keys(hoofLabels).map(k => `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${getCellStyle(hoofData[k].landingTheory, 'flat')}">
              ${getLabel(LANDING_LABELS, hoofData[k].landingTheory)}
            </td>
          `).join('')}
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">Hornqualität</td>
          ${Object.keys(hoofLabels).map(k => `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${getCellStyle(hoofData[k].hornQuality, 'normal')}">
              ${getLabel(HORN_QUALITY_LABELS, hoofData[k].hornQuality)}
            </td>
          `).join('')}
        </tr>
      </tbody>
    </table>
  `;
}

function generateHoofPhotosHtml(analysis: any): string {
  const hoofData: Record<string, HoofData> = {
    vl: analysis.hoof_data_vl || {},
    vr: analysis.hoof_data_vr || {},
    hl: analysis.hoof_data_hl || {},
    hr: analysis.hoof_data_hr || {},
  };

  const hoofLabels: Record<string, string> = { vl: 'Vorne Links', vr: 'Vorne Rechts', hl: 'Hinten Links', hr: 'Hinten Rechts' };
  
  const photosWithUrls = Object.entries(hoofData).filter(([_, d]) => d.photoUrl);
  
  if (photosWithUrls.length === 0) return '';

  return `
    <h3 style="color: #333; margin-top: 30px;">Huf-Fotos</h3>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
      ${photosWithUrls.map(([key, data]) => `
        <div style="text-align: center;">
          <img src="${escapeHtml(data.photoUrl)}" alt="${hoofLabels[key]}" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid #ddd;" />
          <p style="margin-top: 5px; font-size: 12px; color: #666;">${hoofLabels[key]}</p>
        </div>
      `).join('')}
    </div>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - No auth header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { appointmentId } = await req.json();
    console.log("[completion-report] Generating report");

    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select("*, horses!inner(id, name, breed, owner_id)")
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) {
      return new Response(JSON.stringify({ error: "Termin nicht gefunden" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (appointment.provider_id !== user.id) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: client } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", appointment.horses.owner_id)
      .single();

    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("logo_url, business_name, owner_name")
      .eq("user_id", user.id)
      .single();

    // Fetch the latest LTZ analysis for this horse (if linked to appointment or recent)
    const { data: ltzAnalysis } = await supabase
      .from("hoof_analyses")
      .select("*")
      .eq("horse_id", appointment.horses.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const appointmentDate = new Date(appointment.date).toLocaleDateString("de-DE");
    const safeHorseName = escapeHtml(appointment.horses.name);
    const safeDate = escapeHtml(appointmentDate);
    const safeBusinessName = escapeHtml(businessSettings?.business_name || businessSettings?.owner_name || "Ihr Hufbearbeiter");
    
    const logoHtml = businessSettings?.logo_url 
      ? `<img src="${escapeHtml(businessSettings.logo_url)}" alt="${safeBusinessName}" style="max-height: 80px; max-width: 200px; margin-bottom: 20px;" />`
      : '';

    // Generate LTZ table if analysis exists
    let ltzTableHtml = '';
    let ltzPhotosHtml = '';
    let recommendationsHtml = '';
    
    if (ltzAnalysis) {
      ltzTableHtml = `
        <h3 style="color: #333; margin-top: 30px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
          LTZ-Hufanalyse (Leipziger Bearbeitungsbogen)
        </h3>
        <div style="margin-top: 10px;">
          <p style="font-size: 12px; color: #666;">
            <strong>Stellung Vorne:</strong> ${getLabel(STANCE_LABELS, ltzAnalysis.stance_front)} | 
            <strong>Hinten:</strong> ${getLabel(STANCE_LABELS, ltzAnalysis.stance_rear)}
          </p>
        </div>
        ${generateLTZTableHtml(ltzAnalysis)}
      `;
      
      ltzPhotosHtml = generateHoofPhotosHtml(ltzAnalysis);
      
      if (ltzAnalysis.recommendations && ltzAnalysis.recommendations.length > 0) {
        recommendationsHtml = `
          <div style="background-color: #fef3c7; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">Bearbeitungsempfehlungen</h4>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              ${ltzAnalysis.recommendations.map((r: string) => `<li style="margin: 5px 0;">${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    if (client?.email) {
      await resend.emails.send({
        from: "HufManager <info@hufmanager.de>",
        to: [client.email],
        subject: `Behandlungsbericht: ${safeHorseName} - ${safeDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
            ${logoHtml}
            <h2 style="color: #333;">Behandlungsbericht</h2>
            <p>Sehr geehrte/r Pferdebesitzer/in,</p>
            <p>Die Hufbearbeitung für <strong>${safeHorseName}</strong> am <strong>${safeDate}</strong> wurde erfolgreich abgeschlossen.</p>
            ${appointment.completion_notes ? `<p><strong>Notizen:</strong> ${escapeHtml(appointment.completion_notes)}</p>` : ''}
            
            ${ltzTableHtml}
            ${recommendationsHtml}
            ${ltzPhotosHtml}
            
            <br/>
            <p>Mit freundlichen Grüßen,<br/>${safeBusinessName}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Diese E-Mail wurde automatisch über HufManager versendet.</p>
          </div>
        `,
      });
      
      console.log("[completion-report] Email sent successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[completion-report] Error:", error instanceof Error ? error.name : "Unknown");
    return new Response(JSON.stringify({ error: "Report generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
