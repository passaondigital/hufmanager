// ════════════════════════════════════════════════════════════════════════════
// create-demo-stallbetreiber-user — STILLGELEGT (HTTP 410 Gone)
//
// Wegwerf-Debugskript (AUDIT_REPORT F-17): ohne Auth erreichbar, legte per
// Service-Role Auth-User mit fest hinterlegten Zugangsdaten an und loeschte
// sie wieder. Das Repo ist oeffentlich — die Zugangsdaten gelten als
// kompromittiert und sind ausserhalb des Codes zu rotieren.
//
// Kein Aufrufer. Keine Mutation, kein Supabase-Client, keine Secrets.
// ════════════════════════════════════════════════════════════════════════════

Deno.serve((req: Request): Response => {
  console.warn(`create-demo-stallbetreiber-user: retired endpoint called (method=${req.method})`);
  return new Response(
    JSON.stringify({ error: "This endpoint has been retired" }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
});
