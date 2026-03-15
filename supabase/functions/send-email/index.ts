import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  type: string;
}

const TEMPLATES: Record<string, { subject: (vars: Record<string, string>) => string; html: (vars: Record<string, string>) => string }> = {
  partner_recommendation_request: {
    subject: (v) => `Empfehlung: ${v.partnerName} für ${v.horseName}`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#F5970A;">Neue Fachpartner-Empfehlung</h2>
        <p>${v.recommenderName} empfiehlt dir <strong>${v.partnerName}</strong> (${v.partnerType}) für ${v.horseName}.</p>
        ${v.reason ? `<p><em>"${v.reason}"</em></p>` : ''}
        <a href="${v.link}" style="display:inline-block;background:#F5970A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px;">Im HufManager ansehen</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">HufManager – Die Nr. 1 Software für Hufbearbeiter</p>
      </div>`,
  },
  new_treatment_note: {
    subject: (v) => `Neuer Befund für ${v.horseName}`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#F5970A;">Neuer Befund dokumentiert</h2>
        <p>${v.authorName} (${v.authorType}) hat einen neuen Befund für <strong>${v.horseName}</strong> dokumentiert.</p>
        <a href="${v.link}" style="display:inline-block;background:#F5970A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px;">Befund ansehen</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">HufManager – Die Nr. 1 Software für Hufbearbeiter</p>
      </div>`,
  },
  vaccination_overdue: {
    subject: (v) => `Impfalarm: ${v.horseName}`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#dc2626;">⚠️ Überfällige Impfung</h2>
        <p><strong>${v.horseName}</strong> hat überfällige Impfungen: ${v.vaccinations}.</p>
        <a href="${v.link}" style="display:inline-block;background:#F5970A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px;">Impfstatus prüfen</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">HufManager – Die Nr. 1 Software für Hufbearbeiter</p>
      </div>`,
  },
  insurance_claim_update: {
    subject: (v) => `Schadensfall-Update: ${v.horseName}`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#F5970A;">Schadensfall aktualisiert</h2>
        <p>Dein Schadensfall für <strong>${v.horseName}</strong> wurde aktualisiert.</p>
        <p>Neuer Status: <strong>${v.status}</strong></p>
        <a href="${v.link}" style="display:inline-block;background:#F5970A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px;">Details ansehen</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">HufManager – Die Nr. 1 Software für Hufbearbeiter</p>
      </div>`,
  },
  appointment_reminder: {
    subject: (v) => `Erinnerung: Termin morgen um ${v.time}`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#F5970A;">Termin-Erinnerung</h2>
        <p>Morgen um <strong>${v.time}</strong>: Hufbearbeitung bei <strong>${v.horseName}</strong> (${v.location}).</p>
        <a href="${v.link}" style="display:inline-block;background:#F5970A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px;">Termin ansehen</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">HufManager – Die Nr. 1 Software für Hufbearbeiter</p>
      </div>`,
  },
  welcome_email: {
    subject: () => `Willkommen bei HufManager! 🐴`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#F5970A;">Willkommen bei HufManager!</h2>
        <p>Hallo ${v.name || 'dort'}! Schön dass du dabei bist.</p>
        <p>Dein nächster Schritt: ${v.nextStep || 'Profil vervollständigen'}</p>
        <a href="${v.link}" style="display:inline-block;background:#F5970A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px;">Jetzt loslegen</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">HufManager – Die Nr. 1 Software für Hufbearbeiter</p>
      </div>`,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const body = await req.json();
    const { to, subject, html, type, template, variables } = body;

    let finalSubject = subject;
    let finalHtml = html;

    // If using a template
    if (template && TEMPLATES[template]) {
      const tmpl = TEMPLATES[template];
      const vars = variables || {};
      finalSubject = tmpl.subject(vars);
      finalHtml = tmpl.html(vars);
    }

    if (!to || !finalSubject || !finalHtml) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html (or template + variables)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HufManager <noreply@hufmanager.de>',
        to: [to],
        subject: finalSubject,
        html: finalHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return new Response(JSON.stringify({ error: 'Email send failed', details: result }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-email error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
