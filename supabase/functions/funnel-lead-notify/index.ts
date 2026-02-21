import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAILS = [
  'barhufserviceschmid@gmail.com',
  'passaondigital@gmail.com',
];

// Admin user IDs to send push notifications to
const ADMIN_PUSH_LOOKUP_EMAILS = ADMIN_EMAILS;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead } = await req.json();
    if (!lead || !lead.full_name) {
      return new Response(JSON.stringify({ error: 'Invalid lead data' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, serviceKey);

    // Format preferred slots for email
    const slotsHtml = (lead.preferred_slots || []).map((slot: any, i: number) => 
      `<li><strong>Wunschtermin ${i + 1}:</strong> ${slot.day || ''}, ${slot.date || ''} um ${slot.time || ''} Uhr</li>`
    ).join('');

    const topicLabels: Record<string, string> = {
      frage: 'Allgemeine Frage',
      demo_1zu1: '1:1 Demo / Vorführung',
      beratung: 'Beratungsgespräch',
      sonstiges: 'Sonstiges',
    };

    const contactLabels: Record<string, string> = {
      phone: 'Telefonisch',
      video: 'Videocall / Zoom',
    };

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px;">
          🎯 Neue Funnel-Anfrage eingegangen
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Name:</td><td style="padding: 8px;">${lead.full_name}</td></tr>
          ${lead.email ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">E-Mail:</td><td style="padding: 8px;"><a href="mailto:${lead.email}">${lead.email}</a></td></tr>` : ''}
          ${lead.phone ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">Telefon:</td><td style="padding: 8px;"><a href="tel:${lead.phone}">${lead.phone}</a></td></tr>` : ''}
          ${lead.company_name ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">Betrieb:</td><td style="padding: 8px;">${lead.company_name}</td></tr>` : ''}
          ${lead.postal_code ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">PLZ:</td><td style="padding: 8px;">${lead.postal_code}</td></tr>` : ''}
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Thema:</td><td style="padding: 8px;">${topicLabels[lead.topic] || lead.topic}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Kontakt via:</td><td style="padding: 8px;">${contactLabels[lead.contact_preference] || lead.contact_preference}</td></tr>
        </table>
        ${slotsHtml ? `<h3 style="color: #1a1a2e;">📅 Wunschtermine</h3><ul>${slotsHtml}</ul>` : ''}
        ${lead.message ? `<h3 style="color: #1a1a2e;">💬 Nachricht</h3><p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${lead.message}</p>` : ''}
        <p style="margin-top: 30px; color: #888; font-size: 12px;">
          Quelle: ${lead.source || 'Website'} | Eingegangen: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
        </p>
        <a href="https://app.hufmanager.de/admin/mission-control" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #1a1a2e; color: white; text-decoration: none; border-radius: 6px;">
          → Im Mission Control öffnen
        </a>
      </div>
    `;

    // Send emails via Resend
    if (resendKey) {
      for (const email of ADMIN_EMAILS) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'HufManager <noreply@hufmanager.de>',
              to: [email],
              subject: `🎯 Neue Anfrage: ${lead.full_name} – ${topicLabels[lead.topic] || lead.topic}`,
              html: emailHtml,
            }),
          });
        } catch (e) {
          console.error(`Failed to send email to ${email}:`, e);
        }
      }
    }

    // Send push notifications to admin accounts
    for (const adminEmail of ADMIN_PUSH_LOOKUP_EMAILS) {
      try {
        // Find user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const adminUser = users?.users?.find((u: any) => u.email === adminEmail);
        
        if (adminUser) {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: adminUser.id,
              title: '🎯 Neue Funnel-Anfrage',
              body: `${lead.full_name} – ${topicLabels[lead.topic] || lead.topic}`,
              url: '/admin/mission-control',
            }),
          });

          // Also create in-app notification
          await supabase.from('notifications').insert({
            user_id: adminUser.id,
            title: 'Neue Funnel-Anfrage',
            message: `${lead.full_name} möchte ${topicLabels[lead.topic] || 'Kontakt aufnehmen'} – ${contactLabels[lead.contact_preference] || 'Kontakt'}`,
            type: 'funnel_lead',
            link: '/admin/mission-control',
          });
        }
      } catch (e) {
        console.error(`Failed push for ${adminEmail}:`, e);
      }
    }

    // Mark notification as sent
    if (lead.id) {
      await supabase.from('funnel_leads').update({ 
        notification_sent_at: new Date().toISOString() 
      }).eq('id', lead.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in funnel-lead-notify:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
