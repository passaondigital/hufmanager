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

    const { horse_id } = await req.json();
    if (!horse_id) {
      return new Response(JSON.stringify({ error: "horse_id required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch horse
    const { data: horse, error: horseError } = await supabase
      .from("horses")
      .select("id, name, readable_id, chip_number, owner_id")
      .eq("id", horse_id)
      .single();

    if (horseError || !horse) {
      return new Response(JSON.stringify({ error: "Pferd nicht gefunden" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch owner
    const { data: owner } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", horse.owner_id)
      .single();

    // Fetch vaccinations
    const { data: vaccinations } = await supabase
      .from("horse_vaccinations")
      .select("vaccine_type, vaccine_name, vaccination_date, next_due_date, batch_number, administered_by, vet_clinic, vaccine_manufacturer, application_site")
      .eq("horse_id", horse_id)
      .order("vaccination_date", { ascending: false });

    // Fetch dewormings
    const { data: dewormings } = await supabase
      .from("horse_deworming")
      .select("product_name, active_substance, deworming_date, next_due_date, dosage_ml, weight_at_time_kg, administered_by, fecal_egg_count")
      .eq("horse_id", horse_id)
      .order("deworming_date", { ascending: false });

    const today = new Date().toLocaleDateString("de-DE");

    // Generate HTML report
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #0A0700; border-bottom: 3px solid #F5970A; padding-bottom: 10px; }
  h2 { color: #0A0700; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
  th { background: #F5970A; color: white; padding: 8px 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .header-info { display: flex; gap: 30px; margin-bottom: 20px; }
  .header-info div { flex: 1; }
  .label { font-size: 12px; color: #888; }
  .value { font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
</style></head><body>
  <h1>🐴 Impf- und Entwurmungsprotokoll</h1>
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
      <p class="label">Besitzer</p>
      <p class="value">${escapeHtml(owner?.full_name) || '—'}</p>
    </div>
  </div>

  <h2>💉 Impfungen</h2>
  ${(vaccinations?.length || 0) > 0 ? `
  <table>
    <thead><tr>
      <th>Datum</th><th>Typ</th><th>Impfstoff</th><th>Charge</th><th>Tierarzt</th><th>Nächste fällig</th>
    </tr></thead>
    <tbody>
      ${vaccinations!.map(v => `<tr>
        <td>${v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString("de-DE") : '—'}</td>
        <td>${escapeHtml(v.vaccine_type)}</td>
        <td>${escapeHtml(v.vaccine_name)}</td>
        <td>${escapeHtml(v.batch_number)}</td>
        <td>${escapeHtml(v.administered_by)}${v.vet_clinic ? ` (${escapeHtml(v.vet_clinic)})` : ''}</td>
        <td>${v.next_due_date ? new Date(v.next_due_date).toLocaleDateString("de-DE") : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : '<p style="color: #888;">Keine Impfungen eingetragen.</p>'}

  <h2>🪱 Entwurmung</h2>
  ${(dewormings?.length || 0) > 0 ? `
  <table>
    <thead><tr>
      <th>Datum</th><th>Präparat</th><th>Wirkstoff</th><th>Dosis</th><th>Durchführung</th><th>Kotprobe (EPG)</th>
    </tr></thead>
    <tbody>
      ${dewormings!.map(d => `<tr>
        <td>${d.deworming_date ? new Date(d.deworming_date).toLocaleDateString("de-DE") : '—'}</td>
        <td>${escapeHtml(d.product_name)}</td>
        <td>${escapeHtml(d.active_substance)}</td>
        <td>${d.dosage_ml ? `${d.dosage_ml} ml` : '—'}${d.weight_at_time_kg ? ` (${d.weight_at_time_kg} kg)` : ''}</td>
        <td>${escapeHtml(d.administered_by)}</td>
        <td>${d.fecal_egg_count != null ? d.fecal_egg_count : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : '<p style="color: #888;">Keine Entwurmungen eingetragen.</p>'}

  <div class="footer">
    Erstellt am ${today} via HufManager · #ZukunftHuf2030
  </div>
</body></html>`;

    // Store HTML as file in storage
    const fileName = `vaccination-reports/${horse_id}/${Date.now()}.html`;
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