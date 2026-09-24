// Laufzeit-Check fuer copecart-webhook (kein Unit-Mock der Logik):
// Die ECHTE Function laeuft unveraendert unter Deno, Supabase wird durch einen
// lokalen Mock-Server ersetzt, der jeden REST-/Auth-Aufruf protokolliert.
//
// Aufruf (Port 8000 und 54999 muessen frei sein):
//   deno run --allow-net --allow-env --allow-read \
//     supabase/functions/copecart-webhook/allowlist.runtime-check.ts
//
// Beweist:
//   A  unbekannte product_id + payment.made       → "OK", keine Mutation
//   B  unbekannte product_id + payment.refunded   → "OK", keine Mutation
//   C  unbekannte product_id + payment.failed     → "OK", keine Mutation
//   D  falsche Signatur                            → 401, kein DB-Zugriff
//   E  bekannte product_id (Legacy pro) + payment.failed → PATCH profiles findet statt
//      (Positivkontrolle: der Mock sieht Mutationen wirklich)
//   F  kein Log enthaelt Kaeufer-E-Mail oder Secret

import { hmacSha256Base64 } from "../_shared/copecart-contract.mjs";

const SECRET = "runtime-check-secret";
const MOCK_PORT = 54999;
const BUYER_EMAIL = "qa-allowlist-buyer@example.invalid";

type Call = { method: string; path: string };
let calls: Call[] = [];

Deno.serve({ port: MOCK_PORT, onListen: () => {} }, (req) => {
  const url = new URL(req.url);
  calls.push({ method: req.method, path: url.pathname });
  if (req.method === "GET" && url.pathname === "/rest/v1/profiles") {
    return Response.json([{ id: "00000000-0000-0000-0000-0000000000aa", email: BUYER_EMAIL, subscription_status: "active", subscription_plan: "pro" }]);
  }
  if (req.method === "GET") return Response.json([]);
  return new Response(null, { status: 204 });
});

const logs: string[] = [];
for (const k of ["log", "info", "warn", "error"] as const) {
  const orig = console[k];
  console[k] = (...a: unknown[]) => {
    logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    void orig;
  };
}

Deno.env.set("SUPABASE_URL", `http://127.0.0.1:${MOCK_PORT}`);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "runtime-check-service-key");
Deno.env.set("COPECART_IPN_PASSWORD", SECRET);
Deno.env.delete("RESEND_API_KEY");

await import("./index.ts");
await new Promise((r) => setTimeout(r, 300));

async function send(body: Record<string, unknown>, sign = true) {
  const raw = JSON.stringify(body);
  const sig = sign ? await hmacSha256Base64(SECRET, raw) : "invalid";
  const res = await fetch("http://127.0.0.1:8000/", {
    method: "POST",
    headers: { "content-type": "application/json", "x-copecart-signature": sig },
    body: raw,
  });
  return { status: res.status, text: await res.text() };
}

const base = { buyer_email: BUYER_EMAIL, buyer_firstname: "QA", buyer_lastname: "Check", order_id: "ord-1", transaction_id: "tx-1" };
const mutations = () => calls.filter((c) => c.method !== "GET" && c.method !== "HEAD");
const results: Array<[string, boolean, string]> = [];

for (const [name, ev] of [["A", "payment.made"], ["B", "payment.refunded"], ["C", "payment.failed"]] as const) {
  calls = [];
  const r = await send({ ...base, event_type: ev, product_id: "UNKNOWN999" });
  const m = mutations();
  results.push([`${name} unknown+${ev}`, r.status === 200 && r.text === "OK" && m.length === 0, `status=${r.status} body=${r.text} mutations=${JSON.stringify(m)}`]);
}

calls = [];
const d = await send({ ...base, event_type: "payment.made", product_id: "1996da6f" }, false);
results.push(["D bad signature", d.status === 401 && calls.length === 0, `status=${d.status} calls=${calls.length}`]);

calls = [];
const e = await send({ ...base, event_type: "payment.failed", product_id: "1996da6f", transaction_id: "tx-e" });
const em = mutations();
results.push(["E known+failed (positive control)", e.status === 200 && em.some((c) => c.method === "PATCH" && c.path === "/rest/v1/profiles"), `status=${e.status} mutations=${JSON.stringify(em)}`]);

const leak = logs.filter((l) => l.includes(BUYER_EMAIL) || l.includes(SECRET));
results.push(["F no PII/secret in logs", leak.length === 0, `leaks=${leak.length}`]);

let ok = true;
for (const [n, pass, info] of results) {
  ok &&= pass;
  Deno.stdout.writeSync(new TextEncoder().encode(`${pass ? "PASS" : "FAIL"}  ${n}  (${info})\n`));
}
Deno.stdout.writeSync(new TextEncoder().encode(`COPECART_ALLOWLIST_RUNTIME_CHECK=${ok ? "PASS" : "FAIL"}\n`));
Deno.exit(ok ? 0 : 1);
