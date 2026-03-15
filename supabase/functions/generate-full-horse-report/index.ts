import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString("de-DE"); } catch { return '—'; }
}

function vacStatus(nextDue: string | null): { label: string; color: string } {
  if (!nextDue) return { label: "Unbekannt", color: "#6b7280" };
  const diff = new Date(nextDue).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return { label: "ÜBERFÄLLIG", color: "#ef4444" };
  if (days < 30) return { label: "Bald fällig", color: "#F5970A" };
  return { label: "Aktuell", color: "#22c55e" };
}

serve(async (req) => {
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

    const { horse_id, mode } = await req.json();
    const isAku = mode === "aku";
    if (!horse_id) {
      return new Response(JSON.stringify({ error: "horse_id required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parallel data fetching
    const [horseRes, appointmentsRes, hoofRes, vaccRes, dewormRes, partnerRes, healthRes] = await Promise.all([
      supabase.from("horses").select("*").eq("id", horse_id).single(),
      supabase.from("appointments").select("id, date, service_type, completion_notes, notes, edid, status").eq("horse_id", horse_id).order("date", { ascending: false }),
      supabase.from("hoof_analyses").select("*").eq("horse_id", horse_id).order("created_at", { ascending: false }),
      supabase.from("horse_vaccinations").select("*").eq("horse_id", horse_id).order("vaccination_date", { ascending: false }),
      supabase.from("horse_deworming").select("*").eq("horse_id", horse_id).order("deworming_date", { ascending: false }),
      supabase.from("partner_treatment_notes").select("*").eq("horse_id", horse_id).order("treatment_date", { ascending: false }),
      supabase.from("horse_health_logs").select("*").eq("horse_id", horse_id).order("date", { ascending: false }).limit(isAku ? 1000 : 10),
    ]);

    if (horseRes.error || !horseRes.data) {
      return new Response(JSON.stringify({ error: "Pferd nicht gefunden" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const horse = horseRes.data;
    const appointments = appointmentsRes.data || [];
    const hoofAnalyses = hoofRes.data || [];
    const vaccinations = vaccRes.data || [];
    const dewormings = dewormRes.data || [];
    const partnerNotes = partnerRes.data || [];
    const healthLogs = healthRes.data || [];

    // Owner name
    let ownerName = '—';
    if (horse.owner_id) {
      const { data: owner } = await supabase.from("profiles").select("full_name").eq("id", horse.owner_id).single();
      if (owner?.full_name) ownerName = owner.full_name;
    }

    const today = new Date().toLocaleDateString("de-DE");
    const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
    const completedAppts = appointments.filter((a: any) => a.status === 'completed');
    const lastHoof = hoofAnalyses[0];

    // Partner type labels
    const ptLabels: Record<string, string> = {
      tierarzt: "Tierarzt", physiotherapeut: "Physiotherapie", osteopath: "Osteopathie",
      chiropraktiker: "Chiropraktik", zahnarzt: "Pferdezahnarzt", sattler: "Sattler",
      reitlehrer: "Reitlehrer", trainer: "Trainer", huforthopaedie: "Huforthopädie",
      ernaehrungsberater: "Ernährungsberater", other: "Sonstige",
    };

    const reportTitle = isAku ? 'AKU-MAPPE' : '📋 Gesamtbericht';
    const reportFooterLabel = isAku ? 'AKU-Mappe' : 'Gesamtbericht';
    const apptSlice = isAku ? completedAppts : completedAppts.slice(0, 6);
    const apptSectionTitle = isAku ? 'Alle Termine' : 'Letzte 6 Termine';

    const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${reportTitle} – ${esc(horse.name)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
  h1 { color: #0A0700; border-bottom: 3px solid #F5970A; padding-bottom: 10px; font-size: 22px; margin-bottom: 8px; }
  h2 { color: #0A0700; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 6px; font-size: 16px; }
  h3 { font-size: 14px; margin-top: 20px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { background: #F5970A; color: white; padding: 7px 10px; text-align: left; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0; }
  .kv dt { color: #888; font-size: 11px; }
  .kv dd { margin: 0; font-weight: 600; font-size: 13px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; color: white; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
  .subtitle { color: #888; font-size: 13px; margin-top: 0; }
  .info-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #9a3412; }
  @media print { body { padding: 12px; } h1 { font-size: 18px; } }
</style></head><body>

<h1>${reportTitle} – ${esc(horse.name)}</h1>
<p class="subtitle">${esc(horse.readable_id ? '#' + horse.readable_id : '')} · Erstellt am ${today}</p>

<h2>1. Stammdaten</h2>
<dl class="kv">
  <dt>Name</dt><dd>${esc(horse.name)}</dd>
  <dt>Rasse</dt><dd>${esc(horse.breed) || '—'}</dd>
  <dt>Geschlecht</dt><dd>${esc(horse.gender) || '—'}</dd>
  <dt>Alter</dt><dd>${age ? age + ' Jahre (geb. ' + horse.birth_year + ')' : '—'}</dd>
  <dt>Größe</dt><dd>${horse.height_cm ? horse.height_cm + ' cm' : '—'}</dd>
  <dt>Gewicht</dt><dd>${horse.weight_kg ? horse.weight_kg + ' kg' : '—'}</dd>
  <dt>Chip-Nr.</dt><dd>${esc(horse.chip_number) || '—'}</dd>
  <dt>UELN</dt><dd>${esc(horse.ueln) || '—'}</dd>
  <dt>Pass-Nr.</dt><dd>${esc(horse.passport_number) || '—'}</dd>
  <dt>Zuchtbuch</dt><dd>${esc(horse.studbook) || '—'}</dd>
  <dt>Besitzer</dt><dd>${esc(ownerName)}</dd>
  <dt>Versicherung</dt><dd>${esc(horse.insurance_company) || '—'} ${Array.isArray(horse.insurance_type) ? '(' + horse.insurance_type.join(', ') + ')' : ''}</dd>
</dl>

<h2>2. Hufverlauf</h2>
<p>${completedAppts.length} abgeschlossene Bearbeitungen${completedAppts.length > 0 ? ' · ' + fmtDate(completedAppts[completedAppts.length - 1]?.date) + ' bis ' + fmtDate(completedAppts[0]?.date) : ''}</p>

<h3>${apptSectionTitle}</h3>
${apptSlice.length > 0 ? `<table>
  <thead><tr><th>Datum</th><th>Typ</th><th>Zusammenfassung</th><th>#EDID</th></tr></thead>
  <tbody>${apptSlice.map((a: any) => `<tr>
    <td>${fmtDate(a.date)}</td>
    <td>${esc(a.service_type) || 'Bearbeitung'}</td>
    <td>${esc((a.completion_notes || a.notes || '').substring(0, isAku ? 500 : 120))}${!isAku && (a.completion_notes || a.notes || '').length > 120 ? '…' : ''}</td>
    <td style="font-family:monospace;font-size:10px">${esc(a.edid) || '—'}</td>
  </tr>`).join('')}</tbody>
</table>` : '<p style="color:#888">Keine Termine vorhanden.</p>'}

${lastHoof ? `<h3>Aktuelle Hufwerte (letzter Befund)</h3>
<table>
  <thead><tr><th>Huf</th><th>Zehenl. (mm)</th><th>Trachtenh. (mm)</th><th>Hufwinkel (°)</th><th>Strahl</th><th>Wand</th></tr></thead>
  <tbody>
    ${['vl', 'vr', 'hl', 'hr'].map(pos => {
      const d = (lastHoof as any)[`hoof_data_${pos}`];
      if (!d) return '';
      return `<tr><td>${pos.toUpperCase()}</td><td>${d.toe_length_mm ?? '—'}</td><td>${d.heel_height_mm ?? '—'}</td><td>${d.hoof_angle_degrees ?? '—'}</td><td>${esc(d.frog_quality)}</td><td>${esc(d.wall_quality)}</td></tr>`;
    }).join('')}
  </tbody>
</table>` : ''}

<h2>3. Impf- & Entwurmungsstatus</h2>

<h3>Impfungen</h3>
${vaccinations.length > 0 ? `<table>
  <thead><tr><th>Typ</th><th>Impfstoff</th><th>Letzte</th><th>Nächste fällig</th><th>Status</th><th>Tierarzt</th></tr></thead>
  <tbody>${vaccinations.map((v: any) => {
    const st = vacStatus(v.next_due_date);
    return `<tr>
      <td>${esc(v.vaccine_type)}</td>
      <td>${esc(v.vaccine_name)}</td>
      <td>${fmtDate(v.vaccination_date)}</td>
      <td>${fmtDate(v.next_due_date)}</td>
      <td><span class="badge" style="background:${st.color}">${st.label}</span></td>
      <td>${esc(v.administered_by)}</td>
    </tr>`;
  }).join('')}</tbody>
</table>` : '<p style="color:#888">Keine Impfungen eingetragen.</p>'}

<h3>Entwurmungen</h3>
${dewormings.length > 0 ? `<table>
  <thead><tr><th>Datum</th><th>Präparat</th><th>Wirkstoff</th><th>Durchführung</th><th>Kotprobe (EPG)</th></tr></thead>
  <tbody>${dewormings.map((d: any) => `<tr>
    <td>${fmtDate(d.deworming_date)}</td>
    <td>${esc(d.product_name)}</td>
    <td>${esc(d.active_substance)}</td>
    <td>${esc(d.administered_by)}</td>
    <td>${d.fecal_egg_count != null ? d.fecal_egg_count : '—'}</td>
  </tr>`).join('')}</tbody>
</table>` : '<p style="color:#888">Keine Entwurmungen eingetragen.</p>'}

<h2>4. Therapie-Übersicht</h2>
${partnerNotes.length > 0 ? (() => {
    const grouped: Record<string, any[]> = {};
    partnerNotes.forEach((n: any) => {
      const key = n.partner_type || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(n);
    });
    return Object.entries(grouped).map(([type, notes]) => `
      <h3>${ptLabels[type] || type} (${notes.length})</h3>
      <table>
        <thead><tr><th>Datum</th><th>Titel</th><th>Befund</th><th>Empfehlung</th></tr></thead>
        <tbody>${notes.map((n: any) => `<tr>
          <td>${fmtDate(n.treatment_date)}</td>
          <td>${esc(n.title)}</td>
          <td>${esc((n.findings || '').substring(0, isAku ? 1000 : 100))}${!isAku && (n.findings || '').length > 100 ? '…' : ''}</td>
          <td>${esc((n.recommendations || n.next_treatment || '').substring(0, isAku ? 1000 : 100))}</td>
        </tr>`).join('')}</tbody>
      </table>`).join('');
  })() : '<p style="color:#888">Keine Therapie-Notizen vorhanden.</p>'}

<h2>5. Gesundheits-Log</h2>
${healthLogs.length > 0 ? `<table>
  <thead><tr><th>Datum</th><th>Wohlbefinden</th><th>Gewicht (kg)</th><th>Notizen</th></tr></thead>
  <tbody>${healthLogs.map((h: any) => `<tr>
    <td>${fmtDate(h.date)}</td>
    <td>${'⭐'.repeat(h.wellbeing || 0)}${'☆'.repeat(5 - (h.wellbeing || 0))} (${h.wellbeing}/5)</td>
    <td>${h.weight ?? '—'}</td>
    <td>${esc(h.notes)}</td>
  </tr>`).join('')}</tbody>
</table>` : '<p style="color:#888">Keine Gesundheits-Logs vorhanden.</p>'}

${isAku ? `<div class="info-box">
  <strong>Hinweis:</strong> Tresor-Dokumente (Röntgenbilder, Befunde) sind über den gesicherten Tresor-Zugang verfügbar und nicht in diesem Bericht enthalten.
</div>` : ''}

<div class="footer">
  <p>${reportFooterLabel} erstellt am ${today} via HufManager · #ZukunftHuf2030</p>
  <p style="font-size:9px;margin-top:4px">Tresor-Dokumente sind in diesem Bericht nicht enthalten.</p>
</div>

</body></html>`;

    // Upload to storage
    const fileName = `full-reports/${horse_id}/${Date.now()}.html`;
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
      pdf_url: signedUrl?.signedUrl,
      html,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Berichterstellung fehlgeschlagen: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
