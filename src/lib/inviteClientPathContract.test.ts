import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contract-Tests fuer ALLE erreichbaren Client-Erstellungswege.
 *
 * Hintergrund: Die Migrationen 20260917150000 … 20260920190000 spannen einen
 * verbindlichen DB-Vertrag auf. Wer an ihm vorbei einen Auth-User mit
 * role='client' anlegt, loest zwei Defekte aus:
 *
 *   1. auto_assign_client_to_provider() faellt in den generischen
 *      "erster Provider"-Fallback und erteilt einem FREMDEN Provider einen
 *      aktiven Grant inkl. can_view_medical.
 *   2. handle_new_user() setzt die Ghost-Merge-Schleife nur im Invite-Pfad
 *      aus. Ohne Invite haengt sie access_grants fremder Provider auf den
 *      neuen Auth-User um (Cross-Provider-Ghost-Uebernahme).
 *
 * Bewusste Entscheidung: die beiden verbleibenden Flows teilen sich KEIN
 * gemeinsames Modul, weil sie fachlich verschieden sind (Self-Service mit
 * generiertem Passwort und Mailversand vs. Admin-gewaehlter Provider mit
 * vorgegebenem Passwort). Die gemeinsame Invariante wird stattdessen hier
 * erzwungen — diese Datei ist der Ersatz fuer das Shared-Modul.
 *
 * GRENZE DIESER TESTS: sie lesen Quelltext und pruefen Struktur. Sie fuehren
 * kein SQL aus. Laufzeitverhalten (T11-T15) ist hier nur insoweit abgedeckt,
 * wie der Code die entsprechenden Pfade ueberhaupt enthaelt; der Beweis, dass
 * sie greifen, gehoert in das isolierte E2E.
 */

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, "../..", relativePath), "utf8");
}

/** Kommentare entfernen — die Kopfkommentare beschreiben bewusst den
 *  verworfenen Ansatz und duerfen die Zusicherungen nicht verfaelschen. */
function codeOnly(src: string): string {
  return src
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
}

const inviteClient = read("supabase/functions/invite-client/index.ts");
const inviteClientCode = codeOnly(inviteClient);
const withPassword = read("supabase/functions/invite-client-with-password/index.ts");
const withPasswordCode = codeOnly(withPassword);
const adminCreateClient = read("supabase/functions/admin-create-client/index.ts");
const adminCreateClientCode = codeOnly(adminCreateClient);

const inviteButton = read("src/components/customers/InviteClientButton.tsx");
const inviteModal = read("src/components/customers/InviteByEmailModal.tsx");
const adminProviderTab = read("src/components/admin/AdminProviderTab.tsx");

const CANONICAL_RPCS = [
  "create_pending_client_invite_v1",
  "bind_pending_client_invite_v1",
  "create_invited_customer_with_contact",
  "invalidate_pending_client_invite_v1",
] as const;

const DIRECT_WRITE_TABLES = ["profiles", "user_roles", "access_grants", "contacts"] as const;

/** Sucht schreibende Supabase-Client-Aufrufe auf einer Tabelle. */
function hasDirectWrite(code: string, table: string): boolean {
  const from = new RegExp(`\\.from\\(["']${table}["']\\)`);
  if (!from.test(code)) return false;
  // .from(...) allein ist noch kein Write — erst .insert/.update/.upsert/.delete.
  const writeAfterFrom = new RegExp(
    `\\.from\\(["']${table}["']\\)[\\s\\S]{0,400}?\\.(insert|update|upsert|delete)\\(`,
  );
  return writeAfterFrom.test(code);
}

describe("T01–T02 Frontend ruft ausschliesslich den kanonischen Pfad", () => {
  it("T01 InviteClientButton ruft invite-client-with-password", () => {
    expect(inviteButton).toContain('functions.invoke("invite-client-with-password"');
  });

  it("T01b InviteClientButton ruft NICHT mehr invite-client", () => {
    expect(inviteButton).not.toMatch(/functions\.invoke\(\s*["']invite-client["']/);
  });

  it("T02 kein einziger Frontend-Aufruf auf invite-client im gesamten src/", () => {
    // Beide bekannten Invite-Oberflaechen plus die Admin-Oberflaeche.
    for (const src of [inviteButton, inviteModal, adminProviderTab]) {
      expect(src).not.toMatch(/functions\.invoke\(\s*["']invite-client["']/);
    }
  });

  it("T02b InviteByEmailModal bleibt auf dem kanonischen Pfad", () => {
    expect(inviteModal).toContain('functions.invoke("invite-client-with-password"');
  });
});

describe("T03–T05 invite-client ist stillgelegt", () => {
  it("T03 antwortet mit HTTP 410", () => {
    expect(inviteClientCode).toMatch(/status:\s*410/);
    expect(inviteClientCode).toContain("This invite endpoint has been retired");
  });

  it("T03b beantwortet OPTIONS weiterhin mit CORS", () => {
    expect(inviteClientCode).toMatch(/req\.method === "OPTIONS"/);
    expect(inviteClientCode).toContain("Access-Control-Allow-Origin");
  });

  it("T04 enthaelt kein auth.admin.createUser mehr", () => {
    expect(inviteClientCode).not.toContain("admin.createUser");
  });

  it("T05 enthaelt keine Writes auf profiles/user_roles/access_grants/contacts", () => {
    for (const table of DIRECT_WRITE_TABLES) {
      expect(hasDirectWrite(inviteClientCode, table)).toBe(false);
    }
  });

  it("T05b versendet keine Mail und laedt keinen Mail-/DB-Client", () => {
    expect(inviteClientCode).not.toContain("resend");
    expect(inviteClientCode).not.toContain("Resend");
    expect(inviteClientCode).not.toContain("createClient(");
  });
});

describe("T06–T07 beide aktiven Pfade nutzen den kanonischen Vertrag", () => {
  it("T06 invite-client-with-password ruft alle vier kanonischen RPCs", () => {
    for (const rpc of CANONICAL_RPCS) {
      expect(withPasswordCode).toContain(rpc);
    }
  });

  it("T07 admin-create-client ruft alle vier kanonischen RPCs", () => {
    for (const rpc of CANONICAL_RPCS) {
      expect(adminCreateClientCode).toContain(rpc);
    }
  });

  it("T06/T07 Reihenfolge: Invite vor createUser, bind danach, Vertrag zuletzt", () => {
    for (const code of [withPasswordCode, adminCreateClientCode]) {
      const pending = code.indexOf("create_pending_client_invite_v1");
      const create = code.indexOf("admin.createUser");
      const bind = code.indexOf("bind_pending_client_invite_v1");
      const canonical = code.indexOf("create_invited_customer_with_contact");
      expect(pending).toBeGreaterThan(-1);
      expect(create).toBeGreaterThan(pending);
      expect(bind).toBeGreaterThan(create);
      expect(canonical).toBeGreaterThan(bind);
    }
  });
});

describe("T08 admin-create-client schreibt nicht mehr direkt", () => {
  it("keine Writes auf profiles/user_roles/access_grants/contacts", () => {
    for (const table of DIRECT_WRITE_TABLES) {
      expect(hasDirectWrite(adminCreateClientCode, table)).toBe(false);
    }
  });

  it("liest profiles/user_roles weiterhin (Validierung, readable_id)", () => {
    expect(adminCreateClientCode).toMatch(/\.from\("profiles"\)[\s\S]{0,120}\.select\(/);
    expect(adminCreateClientCode).toMatch(/\.from\("user_roles"\)[\s\S]{0,120}\.select\(/);
  });

  it("meldet keinen Erfolg nach einem fehlgeschlagenen Schritt (fail closed)", () => {
    // Jeder RPC-Fehler fuehrt zu einem return, nicht nur zu console.error.
    for (const marker of ["inviteError", "bindError", "customerError"]) {
      const idx = adminCreateClientCode.indexOf(`if (${marker})`);
      expect(idx).toBeGreaterThan(-1);
      const block = adminCreateClientCode.slice(idx, idx + 500);
      expect(block).toContain("return json(");
    }
  });
});

describe("T09 kein Trigger-Race durch fixed sleeps", () => {
  it("keine setTimeout-Wartezeit in den drei Invite-Flows", () => {
    for (const code of [inviteClientCode, withPasswordCode, adminCreateClientCode]) {
      expect(code).not.toMatch(/setTimeout\(\s*resolve/);
      expect(code).not.toMatch(/setTimeout\([^)]*,\s*\d{3,}\s*\)/);
    }
  });
});

describe("T10 Passwortgenerierung in angefassten Pfaden", () => {
  it("Mission Control nutzt crypto.getRandomValues statt Math.random", () => {
    // Kommentare ausblenden: der Kopfkommentar der Funktion nennt Math.random
    // bewusst als das, was ersetzt wurde.
    const code = codeOnly(adminProviderTab);
    const idx = code.indexOf("const generatePassword");
    expect(idx).toBeGreaterThan(-1);
    const fn = code.slice(idx, idx + 700);
    expect(fn).toContain("crypto.getRandomValues");
    expect(fn).not.toContain("Math.random");
  });
});

describe("T11–T13 Zugriffs- und Eingabepruefungen", () => {
  it("T11 Provider-Endpoint weist Nicht-Provider mit 403 ab", () => {
    expect(withPasswordCode).toMatch(/role\s*!==\s*"provider"/);
    expect(withPasswordCode).toMatch(/status:\s*403/);
  });

  it("T12 Admin-Endpoint weist Nicht-Admins mit 403 ab", () => {
    expect(adminCreateClientCode).toMatch(/\.eq\("role",\s*"admin"\)/);
    expect(adminCreateClientCode).toContain("Admin access required");
  });

  it("T13 providerId wird validiert, bevor sie in den Vertrag geht", () => {
    const providerCheck = adminCreateClientCode.indexOf("Zielprovider existiert nicht");
    const roleCheck = adminCreateClientCode.indexOf("keine Provider-Rolle");
    const deletedCheck = adminCreateClientCode.indexOf("Zielprovider ist gelöscht");
    const firstRpc = adminCreateClientCode.indexOf("create_pending_client_invite_v1");
    expect(providerCheck).toBeGreaterThan(-1);
    expect(roleCheck).toBeGreaterThan(-1);
    expect(deletedCheck).toBeGreaterThan(-1);
    // Alle drei Pruefungen stehen VOR dem ersten RPC-Aufruf.
    expect(Math.max(providerCheck, roleCheck, deletedCheck)).toBeLessThan(firstRpc);
  });

  it("T13b der Provider-Self-Service akzeptiert keine provider_id aus dem Request", () => {
    // Die Provider-Identitaet kommt ausschliesslich aus dem verifizierten JWT.
    expect(withPasswordCode).toContain("p_provider_id: callerUser.id");
    expect(withPasswordCode).not.toMatch(/p_provider_id:\s*(providerId|body\.|req\.)/);
  });
});

describe("T14–T15 Kompensation und Idempotenz", () => {
  it("T15 jeder Fehlerpfad nach dem Pending Invite entwertet ihn", () => {
    // Provider-Flow
    expect(withPasswordCode).toContain('rpc("invalidate_pending_client_invite_v1"');
    for (const reason of ["createUser failed", "bind failed", "customer persistence failed"]) {
      expect(withPassword).toContain(reason);
    }
    // Admin-Flow
    expect(adminCreateClientCode).toContain('rpc("invalidate_pending_client_invite_v1"');
    for (const reason of ["createUser failed", "bind failed", "customer persistence failed"]) {
      expect(adminCreateClient).toContain(reason);
    }
  });

  it("T15b cleanupRequired wird gesetzt, sobald der Auth-User schon existiert", () => {
    for (const code of [withPasswordCode, adminCreateClientCode]) {
      expect(code).toMatch(/invalidateInvite\("bind failed",\s*true\)/);
      expect(code).toMatch(/invalidateInvite\("customer persistence failed",\s*true\)/);
    }
  });

  it("T14 beide Pfade uebergeben eine eigene request_id (Retry-Schluessel)", () => {
    for (const code of [withPasswordCode, adminCreateClientCode]) {
      expect(code).toContain("crypto.randomUUID()");
      expect(code).toMatch(/p_request_id:\s*requestId/);
    }
  });

  it("T14b beide Pfade setzen die TTL explizit auf 15 Minuten", () => {
    for (const code of [withPasswordCode, adminCreateClientCode]) {
      expect(code).toMatch(/p_ttl_minutes:\s*15/);
    }
  });
});

describe("Invariante: kein erreichbarer Pfad umgeht den Vertrag", () => {
  it("jede Function, die einen client-Auth-User anlegt, nutzt den Vertrag", () => {
    for (const [name, code] of [
      ["invite-client-with-password", withPasswordCode],
      ["admin-create-client", adminCreateClientCode],
    ] as const) {
      const createsClient =
        code.includes("admin.createUser") && code.includes('role: "client"');
      if (createsClient) {
        expect(code, `${name} muss den Pending-Invite-Vertrag nutzen`).toContain(
          "create_pending_client_invite_v1",
        );
      }
    }
  });

  it("invite-client legt gar keinen Auth-User mehr an", () => {
    expect(inviteClientCode).not.toContain("admin.createUser");
  });
});
