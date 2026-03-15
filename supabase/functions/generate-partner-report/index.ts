import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  other: "Sonstige",
};

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { horse_id, partner_id } = await req.json();
    if (!horse_id) {
      return new Response(JSON.stringify({ error: "horse_id required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch horse
    const { data: horse } = await supabase
      .from("horses")
      .select("id, name, readable_id, chip_number")
      .eq("id", horse_id)
      .single();

    if (!horse) {
      return new Response(JSON.stringify({ error: "Pferd nicht gefunden" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch treatment notes
    let query = supabase
      .from("partner_treatment_notes")
      .select("*, profiles:partner_id (full_name)")
      .eq("horse_id", horse_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (partner_id) {
      query = query.eq("partner_id", partner_id);
    }

    const { data: notes } = await query;

    // Group by partner_type
    const grouped: Record<string, any[]> = {};
    (notes || []).forEach((note: any) => {
      const type = note.partner_type || "other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(note);
    });

    const today = new Date().toLocaleDateString("de-DE");

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #0A0700; border-bottom: 3px solid #F5970A; padding-bottom: 10px; }
  h2 { color: #0A0700; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .entry { margin: 15px 0; padding: 15px; background: #fafafa; border-radius: 8px; border-left: 3px solid #F5970A; }
  .entry-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .entry-date { font-weight: 600; }
  .entry-therapist { color: #666; font-size: 13px; }
  .entry-label { font-size: 12px; color: #888; margin-top: 8px; }
  .entry-text { margin: 3px 0 0; }
  .header-info { display: flex; gap: 30px; margin-bottom: 20px; }
  .header-info div { flex: 1; }
  .label { font-size: 12px; color: #888; }
  .value { font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
</style></head><body>
  <h1>🩺 Therapie-Übersicht</h1>
  <div class="header-info">
    <div>
      <p class="label">Pferd</p>
      <p class="value">${escapeHtml(horse.name)} ${horse.readable_id ? `(#${escapeHtml(horse.readable_id)})` : ''}</p>
    </div>
    <div>
      <p class="label">Chipnummer</p>
      <p class="value">${escapeHtml(horse.chip_number) || '—'}</p>
    </div>
    <div>
      <p class="label">Erstellt am</p>
      <p class="value">${today}</p>
    </div>
  </div>

  ${Object.entries(grouped).map(([type, entries]) => `
    <h2>${PARTNER_TYPE_LABELS[type] || type}</h2>
    ${entries.map((n: any) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-date">${n.treatment_date ? new Date(n.treatment_date).toLocaleDateString("de-DE") : n.created_at ? new Date(n.created_at).toLocaleDateString("de-DE") : '—'}</span>
          <span class="entry-therapist">${escapeHtml(n.profiles?.full_name || 'Unbekannt')}</span>
        </div>
        ${n.title ? `<p style="font-weight: 600; margin: 0;">${escapeHtml(n.title)}</p>` : ''}
        ${n.findings ? `<p class="entry-label">Befund</p><p class="entry-text">${escapeHtml(n.findings)}</p>` : ''}
        ${n.treatment ? `<p class="entry-label">Maßnahme</p><p class="entry-text">${escapeHtml(n.treatment)}</p>` : ''}
        ${n.recommendations ? `<p class="entry-label">Empfehlung</p><p class="entry-text">${escapeHtml(n.recommendations)}</p>` : ''}
        ${n.body_map_zones ? `<p class="entry-label">Zonen</p><p class="entry-text">${escapeHtml(JSON.stringify(n.body_map_zones))}</p>` : ''}
      </div>
    `).join('')}
  `).join('')}

  ${Object.keys(grouped).length === 0 ? '<p style="color: #888; text-align: center; padding: 30px;">Keine Therapie-Einträge vorhanden.</p>' : ''}

  <div class="footer">
    Erstellt am ${today} via HufManager
  </div>
</body></html>`;

    // Store
    const fileName = `partner-reports/${horse_id}/${Date.now()}.html`;
    const { error: uploadError } = await supabase.storage
      .from("horse-documents")
      .upload(fileName, new Blob([html], { type: "text/html" }), { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Upload fehlgeschlagen" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: signedUrl } = await supabase.storage
      .from("horse-documents")
      .createSignedUrl(fileName, 3600);

    return new Response(JSON.stringify({ 
      success: true, 
      url: signedUrl?.signedUrl,
      html 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Report generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);