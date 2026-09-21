import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// ════════════════════════════════════════════════════════════════════════════
// STILLGELEGT — dieser Endpoint ist zurueckgezogen (HTTP 410 Gone).
//
// ── Warum ──────────────────────────────────────────────────────────────────
// Die frühere Implementierung legte einen Client-Auth-User an, OHNE vorher
// einen Pending Invite zu erzeugen. Damit lief sie am kanonischen
// Invite-Vertrag vorbei, den die Migrationen
//
//   20260917150000  hm_pending_client_invites (der Vertrag)
//   20260917155000  auto_assign_client_to_provider (die Unterdrückung)
//   20260917160000  create_invited_customer_with_contact (der Grant)
//   20260920120000  handle_new_user + Ghost-Gate
//   20260920190000  created_by_provider_id als Ghost-Besitzmarker
//
// aufspannen. Konkret entstanden dadurch zwei Defekte:
//
//   1. Ohne Pending Invite greift in auto_assign_client_to_provider() der
//      generische "erster Provider"-Fallback. Der eingeladene Kunde bekam
//      einen AKTIVEN Grant inkl. can_view_medical für einen FREMDEN Provider,
//      bevor diese Function created_by_provider_id setzen konnte.
//
//   2. handle_new_user() setzt die Ghost-Merge-Schleife nur im Invite-Pfad
//      aus (IF NOT invite_pending). Ohne Invite lief sie weiter und hängte
//      access_grants jedes Nicht-Demo-Providers auf den neuen Auth-User um —
//      die Cross-Provider-Ghost-Übernahme.
//
// Dazu kamen: ein setTimeout(600) als Race gegen die Triggerkette, zwei
// ungeprüfte DB-Writes (profiles, access_grants), kein Cleanup nach
// createUser, kein E-Mail-Dreiecksabgleich, keine Idempotenz.
//
// ── Ersatz ─────────────────────────────────────────────────────────────────
// supabase/functions/invite-client-with-password/index.ts
// Gleicher Request-Vertrag { email, fullName }, Response ist ein Superset
// ({ success, tempPassword, emailSent }).
//
// ── Warum 410 statt Löschen ────────────────────────────────────────────────
// Der Endpoint bleibt deploybar und antwortet deterministisch, damit auch ein
// direkter Aufruf mit gültigem Provider-JWT den alten Pfad nicht mehr
// ausführen kann. Ein gelöschter Endpoint würde 404 liefern und wäre von
// einem Konfigurationsfehler nicht zu unterscheiden.
//
// Diese Datei führt bewusst KEINE Mutation mehr aus: kein
// auth.admin.createUser, keine Writes auf profiles/user_roles/access_grants/
// contacts, kein Mailversand, keine Seiteneffekte. Sie importiert deshalb
// weder den Supabase-Client noch Resend.
// ════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.warn(
    `invite-client: retired endpoint called (method=${req.method}) — ` +
      `use invite-client-with-password (canonical invite contract)`,
  );

  return new Response(
    JSON.stringify({
      error: "This invite endpoint has been retired",
      replacement: "invite-client-with-password",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
