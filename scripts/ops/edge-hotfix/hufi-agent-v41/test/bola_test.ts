// Integrationstest hufi-agent BOLA-Hotfix: echter executeTool-Code gegen
// PostgREST + Wegwerf-Postgres mit PROD-RLS (test/setup.sql).
// Aufruf: deno run -A bola_test.ts <pfad/zu/index.ts> <postgrest-url> <jwt-secret>
// Negativkontrolle: denselben Test mit der Live-Fassung v40 laufen lassen.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const [target, postgrestUrl, secret] = Deno.args;
const A = "00000000-0000-4000-8000-00000000a0a0";
const B = "00000000-0000-4000-8000-00000000b0b0";
const E = "00000000-0000-4000-8000-00000000e0e0";
const F = "00000000-0000-4000-8000-00000000f1f1";
const C = "00000000-0000-4000-8000-00000000c0c0";
const K = "00000000-0000-4000-8000-0000000000cc";
const HC = "00000000-0000-4000-8000-0000000004c1";
const HK = "00000000-0000-4000-8000-0000000004cc";
const AAA1 = "00000000-0000-4000-8000-00000000aaa1";
const AAA2 = "00000000-0000-4000-8000-00000000aaa2";
const BBB1 = "00000000-0000-4000-8000-00000000bbb1";
const BBB2 = "00000000-0000-4000-8000-00000000bbb2";

// ── JWT (HS256) ──────────────────────────────────────────────────────────────
const b64u = (b: Uint8Array | string) =>
  btoa(typeof b === "string" ? b : String.fromCharCode(...b)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
async function jwt(claims: Record<string, unknown>) {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}
const anonKey = await jwt({ role: "anon" });
const serviceKey = await jwt({ role: "service_role" });

// ── Proxy: /rest/v1 -> PostgREST, Push-Function wird nur protokolliert ─────────
const pushes: Array<{ user_id: string }> = [];
const server = Deno.serve({ port: 0, hostname: "127.0.0.1", onListen() {} }, async (req) => {
  const u = new URL(req.url);
  if (u.pathname === "/functions/v1/send-push-notification") {
    pushes.push(await req.json());
    return Response.json({ sent: 1 });
  }
  if (u.pathname.startsWith("/rest/v1/")) {
    const headers = new Headers(req.headers);
    headers.delete("host");
    const res = await fetch(postgrestUrl + u.pathname.slice("/rest/v1".length) + u.search, {
      method: req.method, headers, body: req.body ? await req.arrayBuffer() : undefined,
    });
    const buf = await res.arrayBuffer();
    return new Response([204, 304].includes(res.status) ? null : buf, { status: res.status, headers: res.headers });
  }
  return new Response("not found", { status: 404 });
});
const base = `http://127.0.0.1:${server.addr.port}`;

// ── Code unter Test laden (nur executeTool exportieren, serve stummschalten) ──
const src = await Deno.readTextFile(target);
const dir = await Deno.makeTempDir();
await Deno.copyFile(target.replace(/index\.ts$/, "horse-knowledge.ts"), `${dir}/horse-knowledge.ts`);
await Deno.writeTextFile(`${dir}/serve-stub.ts`, "export function serve(_h: unknown) {}\n");
const patched = src
  .replace('import { serve } from "https://deno.land/std@0.168.0/http/server.ts";', 'import { serve } from "./serve-stub.ts";')
  .replace("\nasync function executeTool(", "\nexport async function executeTool(");
if (!patched.includes("export async function executeTool(")) throw new Error("executeTool nicht gefunden");
await Deno.writeTextFile(`${dir}/index.ts`, patched);
const { executeTool } = await import(`file://${dir}/index.ts`);

const admin = createClient(base, serviceKey, { auth: { persistSession: false } });
async function run(user: string, tool: string, input: Record<string, unknown>): Promise<string> {
  const token = await jwt({ sub: user, role: "authenticated" });
  const userClient = createClient(base, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  // Identische Argumentreihenfolge wie der Aufruf in callClaudeWithTools
  return await executeTool(tool, input, user, admin, base, serviceKey, userClient);
}
async function appt(id: string) {
  const { data } = await admin.from("appointments").select("status,notes,date").eq("id", id).single();
  return data as { status: string; notes: string; date: string };
}

const results: Array<[string, boolean, string]> = [];
function check(name: string, ok: boolean, info = "") { results.push([name, ok, info]); }
const denied = (r: string) => /nicht gefunden oder kein Zugriff/.test(r);

// Update
let r = await run(A, "update_appointment", { appointment_id: AAA1, notes: "A-geaendert" });
check("U1 provider A updates own appointment", /aktualisiert/.test(r) && (await appt(AAA1)).notes === "A-geaendert", r);
r = await run(A, "update_appointment", { appointment_id: BBB1, notes: "HACKED", date: "2030-01-01" });
check("U2 provider A updates B appointment (known UUID) -> blocked", denied(r) && (await appt(BBB1)).notes === "B-original", r);
r = await run(A, "update_appointment", { appointment_id: "not-a-uuid", notes: "x" });
check("U3 invalid UUID -> blocked", denied(r), r);
r = await run(A, "update_appointment", { appointment_id: "00000000-0000-4000-8000-00000000dead", notes: "x" });
check("U4 non-existent/deleted appointment -> blocked", denied(r), r);
r = await run(E, "update_appointment", { appointment_id: AAA1, notes: "by-E" });
check("U5 employee of A -> blocked (DB: employees cannot write appointments)", denied(r) && (await appt(AAA1)).notes === "A-geaendert", r);
r = await run(F, "update_appointment", { appointment_id: AAA1, notes: "by-F" });
check("U6 employee of B on A appointment -> blocked", denied(r) && (await appt(AAA1)).notes === "A-geaendert", r);
r = await run(C, "update_appointment", { appointment_id: AAA1, notes: "by-client" });
check("U7 client (horse owner) -> blocked", denied(r) && (await appt(AAA1)).notes === "A-geaendert", r);

// Cancel
pushes.length = 0;
r = await run(A, "cancel_appointment", { appointment_id: BBB1, notify_client: true, reason: "HACKED" });
check("C1 provider A cancels B appointment (known UUID) -> blocked", denied(r) && (await appt(BBB1)).status === "planned", r);
check("C2 no customer notification on rejected cancel", pushes.length === 0, JSON.stringify(pushes));
r = await run(F, "cancel_appointment", { appointment_id: AAA2, notify_client: true });
check("C3 employee of B cancels A appointment -> blocked, no push", denied(r) && (await appt(AAA2)).status === "planned" && pushes.length === 0, r);
r = await run(A, "cancel_appointment", { appointment_id: "x'; drop table appointments;--", notify_client: true });
check("C4 invalid UUID -> blocked, no push", denied(r) && pushes.length === 0, r);
r = await run(A, "cancel_appointment", { appointment_id: "00000000-0000-4000-8000-00000000dead", notify_client: true });
check("C5 non-existent/deleted appointment -> blocked, no push", denied(r) && pushes.length === 0, r);
r = await run(A, "cancel_appointment", { appointment_id: AAA2, notify_client: true, reason: "Krank" });
check("C6 provider A cancels own appointment + notifies own client",
  /storniert/.test(r) && (await appt(AAA2)).status === "cancelled" && pushes.length === 1 && pushes[0].user_id === C, r);

// Notification
pushes.length = 0;
r = await run(A, "send_notification", { user_id: K, message: "Phishing" });
check("N1 notify foreign client K -> blocked, no push", !/gesendet/.test(r) && pushes.length === 0, r);
r = await run(A, "send_notification", { user_id: C, message: "Hallo" });
check("N2 notify own connected client C -> sent", /gesendet/.test(r) && pushes.length === 1 && pushes[0].user_id === C, r);

// Lesen
r = await run(A, "get_horse_record", { horse_id: HC });
check("R1 shared horse: own data visible", r.includes("Geteilt-HC") && r.includes("A-RE-1"), r.slice(0, 80));
check("R2 shared horse: B's appointments/invoices NOT visible", !r.includes("B-RE-SECRET") && !r.includes(BBB1), "");
r = await run(A, "get_horse_record", { horse_id: HK });
check("R3 foreign horse record -> blocked", !r.includes("Nur-B-HK"), r.slice(0, 80));
r = await run(A, "get_client_overview", { client_id: K });
check("R4 foreign client overview -> blocked", !r.includes("Kunde K") && !r.includes("k@example.invalid"), r.slice(0, 80));
r = await run(A, "get_client_overview", { client_id: C });
check("R5 shared client overview: no B appointments/invoices", r.includes("Kunde C") && !r.includes("B-RE-SECRET") && !r.includes(BBB2), r.slice(0, 80));
check("B-data untouched at the end", (await appt(BBB1)).notes === "B-original" && (await appt(BBB2)).status === "planned", "");

for (const [n, ok, info] of results) console.log(`${ok ? "PASS" : "FAIL"} | ${n}${ok ? "" : " | " + info.replace(/\n/g, " ").slice(0, 140)}`);
console.log(`${results.filter((x) => x[1]).length}/${results.length}`);
await server.shutdown();
