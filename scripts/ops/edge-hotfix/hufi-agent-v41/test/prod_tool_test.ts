// PROD-Tooltest hufi-agent v41 ohne LLM: exakt der deployte executeTool-Code
// (sha256-identisch) mit echten QA-JWTs gegen die PROD-REST-API. Push-Aufrufe gehen an
// einen lokalen Mitschnitt, nie an echte Geräte. Nur QA-0927-Fixtures werden verändert.
// Aufruf: deno run -A prod_tool_test.ts <index.ts>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const target = Deno.args[0];
const PROD = "https://vnschgjxkzzwzefqlrji.supabase.co";
const env = Object.fromEntries((await Deno.readTextFile("/home/administrator/hufmanager/.env.hufmanager"))
  .split("\n").filter((l) => l.includes("=")).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const anon = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
const cred = Object.fromEntries((await Deno.readTextFile(`${Deno.env.get("HOME")}/.config/hufmanager-qa/credentials.env`))
  .split("\n").filter((l) => l.includes("=")).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1)]));

async function login(x: string): Promise<{ token: string; id: string }> {
  const r = await fetch(`${PROD}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: cred[`QA_${x}_EMAIL`], password: cred[`QA_${x}_PASSWORD`] }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`login ${x} failed`);
  return { token: j.access_token, id: j.user.id };
}
const A = await login("TRIAL"), B = await login("QA_TRIAL_0925"), EA = await login("A"), EB = await login("B");

// Proxy: REST -> PROD, Push -> Mitschnitt
const pushes: Array<{ user_id: string }> = [];
const server = Deno.serve({ port: 0, hostname: "127.0.0.1", onListen() {} }, async (req) => {
  const u = new URL(req.url);
  if (u.pathname === "/functions/v1/send-push-notification") { pushes.push(await req.json()); return Response.json({ sent: 1 }); }
  if (u.pathname.startsWith("/rest/v1/")) {
    const h = new Headers(req.headers); h.delete("host");
    const res = await fetch(PROD + u.pathname + u.search, { method: req.method, headers: h, body: req.body ? await req.arrayBuffer() : undefined });
    const buf = await res.arrayBuffer();
    const out = new Headers(res.headers); out.delete("content-encoding"); out.delete("content-length");
    return new Response([204, 304].includes(res.status) ? null : buf, { status: res.status, headers: out });
  }
  return new Response("no", { status: 404 });
});
const base = `http://127.0.0.1:${server.addr.port}`;

const src = await Deno.readTextFile(target);
const dir = await Deno.makeTempDir();
await Deno.copyFile(target.replace(/index\.ts$/, "horse-knowledge.ts"), `${dir}/horse-knowledge.ts`);
await Deno.writeTextFile(`${dir}/serve-stub.ts`, "export function serve(_h: unknown) {}\n");
await Deno.writeTextFile(`${dir}/index.ts`, src
  .replace('import { serve } from "https://deno.land/std@0.168.0/http/server.ts";', 'import { serve } from "./serve-stub.ts";')
  .replace("\nasync function executeTool(", "\nexport async function executeTool("));
const { executeTool } = await import(`file://${dir}/index.ts`);

const uc = (t: string) => createClient(base, anon, { global: { headers: { Authorization: `Bearer ${t}` } }, auth: { persistSession: false } });
// Kein Service-Key: auch der Admin-Platzhalter ist ein Nutzer-Client (strenger als live).
const run = (u: { token: string; id: string }, tool: string, input: Record<string, unknown>) =>
  executeTool(tool, input, u.id, uc(u.token), base, "no-service-key-in-test", uc(u.token)) as Promise<string>;
async function appt(id: string, owner: { token: string }) {
  const { data } = await uc(owner.token).from("appointments").select("notes,status").eq("id", id).maybeSingle();
  return data as { notes: string; status: string } | null;
}

const AA1 = "a0270927-0000-4000-8000-00000000aa01", AA2 = "a0270927-0000-4000-8000-00000000aa02";
const BB1 = "b0270927-0000-4000-8000-00000000bb01", BB2 = "b0270927-0000-4000-8000-00000000bb02";
const B_HORSE = "b0270927-0000-4000-8000-000000004401", B_CLIENT = "b0270927-0000-4000-8000-00000000cc01";
const SH_HORSE = "7ffae532-4c12-453d-b9d5-23c51529357e", SH_CLIENT = "bd457132-c8fb-44cb-b913-57b12955ab79";
const OWN_CLIENT = "19c087ae-6bf6-4b13-8a87-61bc96efa1bd";
const out: Array<[string, boolean, string]> = [];
const ck = (n: string, ok: boolean, i = "") => out.push([n, ok, i]);
const denied = (r: string) => /nicht gefunden oder kein Zugriff/.test(r);
let r: string;

r = await run(A, "update_appointment", { appointment_id: BB1, notes: "HACKED-0927" });
ck("P01 A update foreign appt (shared client) -> BLOCK", denied(r) && (await appt(BB1, B))?.notes === "QA-0927 B-ORIGINAL", r);
pushes.length = 0;
r = await run(A, "cancel_appointment", { appointment_id: BB2, notify_client: true, reason: "HACKED" });
ck("P02 A cancel foreign appt -> BLOCK", denied(r) && (await appt(BB2, B))?.status === "planned", r);
ck("P03 no push on rejected cancel", pushes.length === 0, JSON.stringify(pushes));
r = await run(A, "update_appointment", { appointment_id: "not-a-uuid", notes: "x" });
ck("P04 invalid UUID -> BLOCK", denied(r), r);
r = await run(A, "cancel_appointment", { appointment_id: "00000000-0000-4000-8000-00000000dead", notify_client: true });
ck("P05 non-existent appt -> BLOCK, no push", denied(r) && pushes.length === 0, r);
r = await run(A, "get_horse_record", { horse_id: B_HORSE });
ck("P06 foreign horse record -> BLOCK", !r.includes("QA-0927 B-Pferd"), r.slice(0, 90));
r = await run(A, "get_client_overview", { client_id: B_CLIENT });
ck("P07 foreign client overview -> BLOCK", !r.includes("QA-0927 B-Kunde"), r.slice(0, 90));
r = await run(A, "get_horse_record", { horse_id: SH_HORSE });
ck("P08 shared horse: own record visible", r.includes("PFERDEAKTE"), r.slice(0, 90));
ck("P09 shared horse: B appt + B invoice NOT visible", !r.includes(BB1) && !r.includes("QA-0927-B-SECRET"), "");
r = await run(A, "get_client_overview", { client_id: SH_CLIENT });
ck("P10 shared client: B appt/invoice NOT visible", !r.includes(BB1) && !r.includes("QA-0927-B-SECRET"), r.slice(0, 90));
pushes.length = 0;
r = await run(A, "send_notification", { user_id: B_CLIENT, title: "t", message: "QA-0927" });
ck("P11 push to foreign client -> BLOCK", !/gesendet/.test(r) && pushes.length === 0, r);
r = await run(A, "send_notification", { user_id: B.id, title: "t", message: "QA-0927" });
ck("P12 push to arbitrary user (provider B) -> BLOCK", !/gesendet/.test(r) && pushes.length === 0, r);
r = await run(EB, "update_appointment", { appointment_id: AA1, notes: "BY-EMP-B" });
ck("P13 foreign employee -> BLOCK", denied(r) && (await appt(AA1, A))?.notes === "QA-0927 A-ORIGINAL", r);
r = await run(EA, "update_appointment", { appointment_id: AA1, notes: "BY-EMP-A" });
ck("P14 own employee -> no write (DB rule, no widening)", denied(r) && (await appt(AA1, A))?.notes === "QA-0927 A-ORIGINAL", r);
r = await run(EB, "cancel_appointment", { appointment_id: AA2, notify_client: true });
ck("P15 foreign employee cancel -> BLOCK, no push", denied(r) && pushes.length === 0 && (await appt(AA2, A))?.status === "planned", r);
r = await run(A, "get_horse_record", { horse_id: "3ad2c166-677c-4517-b772-b7f2c1b26dd1" });
ck("P16 A read own horse record incl. own appt", r.includes("PFERDEAKTE") && (r.includes(AA1) || r.includes(AA2)), r.slice(0, 90));
r = await run(A, "update_appointment", { appointment_id: AA1, notes: "QA-0927 A-UPDATED" });
ck("P17 A update own appt -> OK", /aktualisiert/.test(r) && (await appt(AA1, A))?.notes === "QA-0927 A-UPDATED", r);
pushes.length = 0;
r = await run(A, "cancel_appointment", { appointment_id: AA2, notify_client: true, reason: "QA-0927" });
ck("P18 A cancel own appt -> OK + push only to own client", /storniert/.test(r) && (await appt(AA2, A))?.status === "cancelled"
  && pushes.length === 1 && pushes[0].user_id === OWN_CLIENT, r);
ck("P19 B data untouched", (await appt(BB1, B))?.notes === "QA-0927 B-ORIGINAL" && (await appt(BB2, B))?.status === "planned");

for (const [n, ok, i] of out) console.log(`${ok ? "PASS" : "FAIL"} | ${n}${ok ? "" : " | " + i.replace(/\n/g, " ").slice(0, 150)}`);
console.log(`${out.filter((x) => x[1]).length}/${out.length}`);
await server.shutdown();
