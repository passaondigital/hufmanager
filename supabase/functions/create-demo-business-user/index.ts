// ════════════════════════════════════════════════════════════════════════════
// create-demo-business-user — STILLGELEGT (HTTP 410 Gone)
//
// Die fruehere Fassung lief mit verify_jwt=false ohne jede Caller-Pruefung und
// legte per Service-Role einen Auth-User mit fest im Quelltext hinterlegten
// Zugangsdaten an. Das Repo ist oeffentlich — diese Zugangsdaten gelten als
// kompromittiert und sind ausserhalb des Codes zu rotieren.
//
// Kein Frontend-Aufrufer. Der Endpoint bleibt deploybar und antwortet
// deterministisch mit 410, damit ein direkter Aufruf nichts mehr ausloest.
// Keine Mutation, kein Supabase-Client, keine Secrets.
// ════════════════════════════════════════════════════════════════════════════

Deno.serve((req: Request): Response => {
  console.warn(`create-demo-business-user: retired endpoint called (method=${req.method})`);
  return new Response(
    JSON.stringify({ error: "This endpoint has been retired" }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
});
