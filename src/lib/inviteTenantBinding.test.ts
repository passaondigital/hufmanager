import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * FINAL ACCEPTANCE P0 (Tenant): Vertragstest über den Invite-Pfad.
 *
 * Befund war: beim auth.users-INSERT läuft
 * public.auto_assign_client_to_provider() und verbindet den frisch
 * eingeladenen Kunden mit dem ÄLTESTEN Provider-Account im System
 * ("ORDER BY ur.id LIMIT 1") — aktiver Grant inklusive medizinischer Daten.
 * Der einladende Provider bekam gar nichts, und der fremde Grant blieb
 * bestehen.
 *
 * VERWORFENER ERSTER ANSATZ: ein Marker in raw_app_meta_data, gesetzt von
 * auth.admin.createUser(). Gegen echtes GoTrue v2.196.0 auf Staging gemessen
 * (2026-09-20) schreibt GoTrue custom app_metadata NICHT im selben Statement
 * wie den auth.users-INSERT, sondern danach — die Triggerkette lief vorher,
 * der Marker war zum Trigger-Zeitpunkt nicht da, der Fremd-Grant entstand
 * weiterhin. Deshalb darf dieser Pfad nie wieder auf Auth-Metadaten bauen.
 *
 * DER GÜLTIGE VERTRAG besteht aus vier Teilen:
 *   1. 20260917150000 legt public.hm_pending_client_invites an — nur über
 *      service_role/SECURITY DEFINER beschreibbar, mit TTL.
 *   2. invite-client-with-password erzeugt den Pending Invite VOR
 *      auth.admin.createUser() und bindet ihn danach an die erzeugte user_id.
 *   3. auto_assign_client_to_provider() unterdrückt den generischen
 *      "erster Provider"-Fallback, solange ein gültiger Invite auf die
 *      E-Mail existiert. auth.users.email ist eine Kernspalte und steht im
 *      selben INSERT — anders als app_metadata ist sie im Trigger garantiert
 *      sichtbar.
 *   4. create_invited_customer_with_contact() verlangt einen gebundenen
 *      Invite desselben Providers, erteilt genau einen Grant und verbraucht
 *      den Invite in derselben Transaktion.
 *
 * Driftet einer dieser vier Teile, fällt der Schutz geräuschlos aus und die
 * Fremdzuordnung ist zurück — genau das pinnt dieser Test. SQL und Deno
 * lassen sich hier nicht ausführen, die Deklarationen aber sehr wohl prüfen.
 */

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, "../..", relativePath), "utf8");
}

/** Kommentare entfernen: die Kopfkommentare beschreiben bewusst den
 *  verworfenen Ansatz, sie dürfen die Zusicherungen nicht verfälschen. */
function sqlBody(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

const inviteFunction = read("supabase/functions/invite-client-with-password/index.ts");
const contractMigration = read(
  "supabase/migrations/20260917150000_add_pending_client_invite_contract_v1.sql",
);
const autoAssignMigration = read(
  "supabase/migrations/20260917155000_fix_invite_tenant_auto_assign_v1.sql",
);
const invitedCustomerMigration = read(
  "supabase/migrations/20260917160000_add_create_invited_customer_with_contact_v1.sql",
);
const ghostMergeMigration = read(
  "supabase/migrations/20260920120000_fix_pending_invite_ghost_merge_v1.sql",
);

const contractBody = sqlBody(contractMigration);
const autoAssignBody = sqlBody(autoAssignMigration);
const invitedCustomerBody = sqlBody(invitedCustomerMigration);
const ghostMergeBody = sqlBody(ghostMergeMigration);

describe("Pending-Invite-Vertrag: Tabelle und Rechte", () => {
  it("ist für anon/authenticated vollständig dicht (RLS an, keine Policy, kein Grant)", () => {
    expect(contractBody).toContain("ENABLE ROW LEVEL SECURITY");
    expect(contractBody).toContain("FORCE ROW LEVEL SECURITY");
    expect(contractBody).toContain(
      "REVOKE ALL ON TABLE public.hm_pending_client_invites FROM PUBLIC, anon, authenticated",
    );
    // Eine Policy würde die Tabelle für Clients öffnen — es darf keine geben.
    expect(contractBody).not.toMatch(/CREATE POLICY/i);
  });

  it("hat eine TTL und erlaubt höchstens einen offenen Invite je Adresse", () => {
    expect(contractBody).toContain("expires_at timestamptz NOT NULL");
    expect(contractBody).toMatch(
      /CREATE UNIQUE INDEX[\s\S]*?hm_pending_client_invites_active_email_uniq[\s\S]*?WHERE consumed_at IS NULL AND invalidated_at IS NULL/,
    );
  });

  it("macht den Retry über request_id eindeutig", () => {
    expect(contractBody).toMatch(
      /CREATE UNIQUE INDEX[\s\S]*?hm_pending_client_invites_provider_request_uniq[\s\S]*?\(provider_id, request_id\)/,
    );
  });

  it("gibt die Schreibfunktionen ausschließlich an service_role", () => {
    for (const fn of [
      "create_pending_client_invite_v1",
      "bind_pending_client_invite_v1",
      "invalidate_pending_client_invite_v1",
    ]) {
      expect(contractBody).toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated`),
      );
      expect(contractBody).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO service_role`),
      );
    }
  });

  it("verrät dem Trigger nur ob, nicht wer — die Nachschlagefunktion liefert boolean", () => {
    expect(contractBody).toMatch(
      /CREATE OR REPLACE FUNCTION public\._hm_has_active_pending_client_invite\(p_email text\)\s*\nRETURNS boolean/,
    );
  });
});

describe("Pending-Invite-Vertrag: Edge Function", () => {
  it("legt den Invite an, BEVOR der Auth-User existiert", () => {
    const pendingInvite = inviteFunction.indexOf('rpc(\n      "create_pending_client_invite_v1"');
    const createUser = inviteFunction.indexOf("auth.admin.createUser({");
    expect(pendingInvite).toBeGreaterThan(-1);
    expect(createUser).toBeGreaterThan(-1);
    expect(pendingInvite).toBeLessThan(createUser);
  });

  it("baut NICHT mehr auf Auth-Metadaten als Sicherheitsanker", () => {
    // GoTrue schreibt custom app_metadata erst nach dem auth.users-INSERT.
    expect(inviteFunction).not.toMatch(/app_metadata:\s*\{/);
    // raw_user_meta_data ist beim normalen Signup client-setzbar.
    expect(inviteFunction).not.toMatch(/user_metadata:\s*\{[^}]*invited_by_provider_id/);
  });

  it("bindet den Invite direkt nach createUser an die erzeugte user_id", () => {
    const createUser = inviteFunction.indexOf("auth.admin.createUser({");
    const bind = inviteFunction.indexOf('rpc("bind_pending_client_invite_v1"');
    const canonical = inviteFunction.indexOf('rpc("create_invited_customer_with_contact"');
    expect(bind).toBeGreaterThan(createUser);
    expect(bind).toBeLessThan(canonical);
    expect(inviteFunction).toContain("p_user_id: newUserId");
  });

  it("entwertet den Invite auf jedem Fehlerpfad (kein stale pending state)", () => {
    expect(inviteFunction).toContain('rpc("invalidate_pending_client_invite_v1"');
    expect(inviteFunction).toContain('await invalidateInvite("createUser failed")');
    expect(inviteFunction).toContain('await invalidateInvite("bind failed", true)');
    expect(inviteFunction).toContain('await invalidateInvite("customer persistence failed", true)');
  });

  it("nimmt die Provider-ID aus dem verifizierten Aufrufer, nie aus dem Request", () => {
    expect(inviteFunction).toContain("p_provider_id: callerUser.id");
    expect(inviteFunction).toContain("await req.json() as { email?: string; fullName?: string; action?: string; userId?: string }");
    expect(inviteFunction).not.toMatch(/body\.(providerId|provider_id)/);
    for (const arg of inviteFunction.match(/p_provider_id:\s*[\w.]+/g) ?? []) {
      expect(arg).toMatch(/callerUser\.id$/);
    }
  });

  it("verifiziert den Aufrufer weiterhin als Provider mit Pro-Abo, bevor irgendetwas entsteht", () => {
    const roleCheck = inviteFunction.indexOf('callerRole?.role !== "provider"');
    const proCheck = inviteFunction.indexOf("providerHasPro(callerProfile)");
    const pendingInvite = inviteFunction.indexOf('rpc(\n      "create_pending_client_invite_v1"');
    expect(roleCheck).toBeGreaterThan(-1);
    expect(proCheck).toBeGreaterThan(-1);
    expect(roleCheck).toBeLessThan(pendingInvite);
    expect(proCheck).toBeLessThan(pendingInvite);
  });

  it("persistiert Kunde und Kontakt ausschließlich über den atomaren RPC", () => {
    expect(inviteFunction).toContain('rpc("create_invited_customer_with_contact"');
    expect(inviteFunction).not.toMatch(/from\("profiles"\)\s*\.insert/);
    expect(inviteFunction).not.toMatch(/from\("contacts"\)\s*\.insert/);
    expect(inviteFunction).not.toMatch(/from\("user_roles"\)\s*\.insert/);
  });
});

describe("Pending-Invite-Vertrag: auto_assign_client_to_provider", () => {
  it("entscheidet über die E-Mail, nicht über Auth-Metadaten", () => {
    expect(autoAssignBody).toContain("_hm_has_active_pending_client_invite(invited_email)");
    expect(autoAssignBody).toContain("SELECT au.email INTO invited_email");
    expect(autoAssignBody).not.toContain("raw_app_meta_data");
    expect(autoAssignBody).not.toContain("raw_user_meta_data");
  });

  it("steigt beim Invite aus, BEVOR der 'erster Provider'-Fallback greift", () => {
    const inviteCheck = autoAssignBody.indexOf("_hm_has_active_pending_client_invite(invited_email)");
    const firstProviderPick = autoAssignBody.indexOf("INTO first_provider_id");
    const grantInsert = autoAssignBody.indexOf("INSERT INTO public.access_grants");
    expect(inviteCheck).toBeGreaterThan(-1);
    expect(inviteCheck).toBeLessThan(firstProviderPick);
    expect(inviteCheck).toBeLessThan(grantInsert);
  });

  it("erteilt aus dem Invite selbst keinen Zugriff", () => {
    // Zwischen der Invite-Prüfung und dem RETURN NEW darf kein Grant stehen.
    const inviteCheck = autoAssignBody.indexOf("_hm_has_active_pending_client_invite(invited_email)");
    const afterCheck = autoAssignBody.slice(inviteCheck, inviteCheck + 200);
    expect(afterCheck).toContain("RETURN NEW;");
    expect(afterCheck).not.toMatch(/INSERT INTO public\.access_grants/);
  });

  it("entfernt keine der bestehenden Schutzbedingungen (normale Signups unverändert)", () => {
    expect(autoAssignBody).toContain("IF NEW.role != 'client' THEN");
    expect(autoAssignBody).toContain("AND created_by_provider_id IS NOT NULL");
    expect(autoAssignBody).toContain("ORDER BY ur.id");
    expect(autoAssignBody).toContain("COALESCE(p.email, '') <> ALL(demo_emails)");
    expect(autoAssignBody).toContain("SECURITY DEFINER");
  });
});

describe("Pending-Invite-Vertrag: create_invited_customer_with_contact", () => {
  it("verlangt einen gebundenen Invite, der zum übergebenen Provider passt", () => {
    expect(invitedCustomerBody).toContain("FROM public.hm_pending_client_invites");
    expect(invitedCustomerBody).toContain("WHERE user_id = p_user_id");
    expect(invitedCustomerBody).toContain("v_invite.provider_id <> p_provider_id");
    expect(invitedCustomerBody).toContain("Invited user is not marked for this provider");
  });

  it("prüft zusätzlich, dass die Identität zur eingeladenen Adresse gehört", () => {
    expect(invitedCustomerBody).toContain("v_invite.normalized_email <> v_user_email");
    expect(invitedCustomerBody).toContain("Invited user does not match the pending invite");
  });

  it("akzeptiert keinen abgelaufenen oder entwerteten Invite", () => {
    expect(invitedCustomerBody).toContain("invalidated_at IS NULL");
    expect(invitedCustomerBody).toContain("expires_at > now()");
    expect(invitedCustomerBody).toContain("No valid pending invite for this user");
  });

  it("serialisiert konkurrierende Aufrufe auf der Invite-Zeile", () => {
    expect(invitedCustomerBody).toMatch(/FOR UPDATE/);
  });

  it("erteilt den Zugriff genau dem vorgesehenen Provider", () => {
    expect(invitedCustomerBody).toMatch(
      /INSERT INTO public\.access_grants[\s\S]*?VALUES \(p_provider_id, p_user_id, true, true, true, true\)/,
    );
  });

  it("lässt keinen Fremd-Grant diesen Durchlauf überleben", () => {
    expect(invitedCustomerBody).toContain("ag.provider_id <> p_provider_id");
    expect(invitedCustomerBody).toContain(
      "Invited customer already has access granted to another provider",
    );
  });

  it("verbraucht den Invite in derselben Transaktion wie den Grant", () => {
    expect(invitedCustomerBody).toMatch(
      /UPDATE public\.hm_pending_client_invites\s*\n\s*SET consumed_at = now\(\),\s*\n\s*consumed_user_id = p_user_id/,
    );
    expect(invitedCustomerBody).toContain("AND consumed_at IS NULL");
  });

  it("ist beim Retry idempotent (kein zweiter, kein doppelter Grant)", () => {
    expect(invitedCustomerBody).toContain("ON CONFLICT (client_id, provider_id) DO NOTHING");
    expect(invitedCustomerBody).toContain("ON CONFLICT (user_id, role) DO NOTHING");
    expect(invitedCustomerBody).toContain("ON CONFLICT (id) DO UPDATE SET");
    expect(invitedCustomerBody).toContain("already_completed");
  });

  it("übernimmt kein Profil, das bereits einem anderen Provider gehört", () => {
    expect(invitedCustomerBody).toContain(
      "created_by_provider_id = coalesce(p.created_by_provider_id, EXCLUDED.created_by_provider_id)",
    );
    expect(invitedCustomerBody).toContain("Customer profile already belongs to another provider");
  });

  it("endet nie mit Kunde ohne vorgesehenen Zugriff", () => {
    expect(invitedCustomerBody).toContain(
      "Access for the inviting provider could not be established",
    );
  });

  it("bleibt service_role-only (kein anon/authenticated-Zugriff auf den Adapter)", () => {
    expect(invitedCustomerBody).toMatch(
      /REVOKE ALL ON FUNCTION[\s\S]*?FROM PUBLIC, anon, authenticated/,
    );
    expect(invitedCustomerBody).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO service_role/);
  });

  it("löscht oder deaktiviert keine fremden Grants (legitime Mehrfach-Provider bleiben)", () => {
    expect(invitedCustomerBody).not.toMatch(/DELETE FROM public\.access_grants/i);
    expect(invitedCustomerBody).not.toMatch(/UPDATE public\.access_grants/i);
  });
});

/**
 * FINAL ACCEPTANCE P0 (Codex narrow review): der Ghost-Merge in
 * handle_new_user() umging den Pending-Invite-Vertrag.
 *
 * Die Schleife hängt JEDEN aktiven Grant eines Ghost-Profils mit derselben
 * E-Mail per "UPDATE access_grants SET client_id = NEW.id" auf den neuen
 * Auth-User um — in der Transaktion des auth.users-INSERT, also lange bevor
 * create_invited_customer_with_contact() läuft. Provider A besitzt Ghost X,
 * Provider B lädt dieselbe Adresse ein => A's Grant landet auf B's frisch
 * eingeladenem Kunden. Die Unterdrückung aus 20260917155000 hilft dagegen
 * nicht: sie verhindert nur einen NEUEN Fallback-Grant, nicht das Umhängen
 * eines BESTEHENDEN.
 *
 * Fix in 20260920120000: die Schleife wird im Invite-Fall komplett
 * übersprungen; die Ghost-Übernahme wandert in den kanonischen Vertrag, wo
 * der einladende Provider bekannt ist und CASE A von CASE B getrennt werden
 * kann.
 */
describe("Ghost-Merge: handle_new_user setzt im Invite-Fall aus", () => {
  it("T-GHOST-1/2: fragt den Pending-Invite-Vertrag, bevor die Schleife läuft", () => {
    const probe = ghostMergeBody.indexOf(
      "invite_pending := public._hm_has_active_pending_client_invite(NEW.email)",
    );
    const guard = ghostMergeBody.indexOf("IF NOT invite_pending THEN");
    const loop = ghostMergeBody.indexOf("FOR ghost_profile IN");
    expect(probe).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(probe);
    expect(loop).toBeGreaterThan(guard);
  });

  it("T-GHOST-3: der Grant-Transfer steht vollständig INNERHALB des Guards", () => {
    const guard = ghostMergeBody.indexOf("IF NOT invite_pending THEN");
    // Genau der Transfer, der den P0 verursacht hat: access_grants -> NEW.id.
    const grantTransfers = [
      ...ghostMergeBody.matchAll(/UPDATE public\.access_grants ag\s*\n\s*SET client_id = NEW\.id/g),
    ].map((m) => m.index!);
    expect(grantTransfers).toHaveLength(1);
    expect(grantTransfers[0]).toBeGreaterThan(guard);

    // Und kein einziges Umhängen auf NEW.id darf vor dem Guard stehen.
    for (const m of ghostMergeBody.matchAll(/SET (?:client_id|owner_id|profile_id) = NEW\.id/g)) {
      expect(m.index!).toBeGreaterThan(guard);
    }
  });

  it("hängt im Invite-Fall auch Pferde/Termine/Kontakte NICHT um", () => {
    const guard = ghostMergeBody.indexOf("IF NOT invite_pending THEN");
    for (const stmt of [
      "UPDATE public.horses SET owner_id = NEW.id",
      "UPDATE public.appointments SET client_id = NEW.id",
      "UPDATE public.contacts SET profile_id = NEW.id",
      "UPDATE public.profiles SET deleted_at = now() WHERE id = ghost_profile.id",
    ]) {
      const at = ghostMergeBody.indexOf(stmt);
      expect(at, stmt).toBeGreaterThan(guard);
    }
  });

  it("löscht keine Grants nachträglich — sie entstehen im Invite-Pfad gar nicht erst", () => {
    expect(ghostMergeBody).not.toMatch(/DELETE FROM public\.access_grants/i);
  });

  it("lässt den normalen Signup-Pfad unverändert (Schleife bleibt erhalten)", () => {
    expect(ghostMergeBody).toContain("FOR ghost_profile IN");
    expect(ghostMergeBody).toContain("AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)");
  });
});

describe("Ghost-Merge: kanonischer Vertrag trennt CASE A von CASE B", () => {
  it("T-GHOST-1 (CASE A): übernimmt den eigenen Ghost nur für den einladenden Provider", () => {
    expect(ghostMergeBody).toContain("UPDATE public.horses SET owner_id = p_user_id WHERE owner_id = v_ghost.id");
    expect(ghostMergeBody).toContain("AND ag.provider_id = p_provider_id");
    expect(ghostMergeBody).toContain("UPDATE public.profiles SET deleted_at = now() WHERE id = v_ghost.id");
  });

  it("T-GHOST-2 (CASE B): bricht bei fremdem aktivem Ghost-Grant ab, statt zu mergen", () => {
    expect(ghostMergeBody).toMatch(
      /SELECT 1 FROM public\.access_grants ag\s*\n\s*WHERE ag\.client_id = v_ghost\.id\s*\n\s*AND ag\.is_active = true\s*\n\s*AND ag\.provider_id <> p_provider_id/,
    );
    expect(ghostMergeBody).toContain(
      "An existing customer record for this email belongs to another provider",
    );
  });

  it("T-GHOST-2: prüft auch fremde Kontakte am Ghost", () => {
    expect(ghostMergeBody).toMatch(
      /SELECT 1 FROM public\.contacts c\s*\n\s*WHERE c\.profile_id = v_ghost\.id[\s\S]*?AND c\.provider_id <> p_provider_id/,
    );
  });

  it("prüft den Konflikt VOR jedem Schreibzugriff auf den Ghost", () => {
    const conflict = ghostMergeBody.indexOf("An existing customer record for this email belongs to another provider");
    const firstWrite = ghostMergeBody.indexOf("UPDATE public.horses SET owner_id = p_user_id");
    expect(conflict).toBeGreaterThan(-1);
    expect(conflict).toBeLessThan(firstWrite);
  });

  it("behält die letzte Verteidigungslinie gegen Fremd-Grants", () => {
    expect(ghostMergeBody).toContain("ag.provider_id <> p_provider_id");
    expect(ghostMergeBody).toContain("Invited customer already has access granted to another provider");
  });
});

describe("E-Mail-Vertrag: Invite == Auth == p_profile", () => {
  it("T-EMAIL-1: Invite-Adresse muss zur Auth-Adresse passen", () => {
    expect(ghostMergeBody).toContain("v_invite.normalized_email <> v_user_email");
    expect(ghostMergeBody).toContain("Invited user does not match the pending invite");
  });

  it("T-EMAIL-2: p_profile.email muss zur Auth-Adresse passen", () => {
    expect(ghostMergeBody).toContain("v_profile_email := public._hm_normalize_email(p_profile->>'email')");
    expect(ghostMergeBody).toContain("v_profile_email <> v_user_email");
    expect(ghostMergeBody).toContain("Customer email does not match the invited user");
  });

  it("normalisiert alle drei Seiten über denselben kanonischen Normalizer", () => {
    expect(ghostMergeBody).toContain("public._hm_normalize_email(u.email)");
    expect(ghostMergeBody).toContain("public._hm_normalize_email(p_profile->>'email')");
    // normalized_email wird beim Anlegen bereits normalisiert gespeichert.
    expect(contractBody).toContain("v_email := public._hm_normalize_email(p_email)");
  });

  it("prüft die Adressen, bevor irgendetwas geschrieben wird", () => {
    const emailCheck = ghostMergeBody.indexOf("Customer email does not match the invited user");
    const firstWrite = ghostMergeBody.indexOf("INSERT INTO public.profiles AS p (");
    expect(emailCheck).toBeGreaterThan(-1);
    expect(emailCheck).toBeLessThan(firstWrite);
  });
});

describe("TTL: serverseitig exakt 15 Minuten", () => {
  it("T-TTL: die Lebensdauer ist eine Konstante, keine Eingabe", () => {
    expect(ghostMergeBody).toContain("v_ttl constant interval := interval '15 minutes'");
    expect(ghostMergeBody).toContain("expires_at = now() + v_ttl");
    expect(ghostMergeBody).toContain("now() + v_ttl");
  });

  it("T-TTL: p_ttl_minutes wird nicht mehr in die Ablaufzeit gerechnet", () => {
    const fn = ghostMergeBody.slice(
      ghostMergeBody.indexOf("FUNCTION public.create_pending_client_invite_v1"),
      ghostMergeBody.indexOf("FUNCTION public.create_invited_customer_with_contact"),
    );
    expect(fn).toContain("p_ttl_minutes integer DEFAULT 15");
    // Der alte, vom Aufrufer steuerbare Pfad darf nicht zurückkommen.
    expect(fn).not.toContain("make_interval(mins => v_ttl)");
    expect(fn).not.toMatch(/least\(coalesce\(p_ttl_minutes/);
  });
});

describe("Retry bleibt idempotent (nach dem Ghost-Fix)", () => {
  it("T-RETRY: kein zweiter Grant, kein zweiter Kunde, kein zweiter Kontakt", () => {
    expect(ghostMergeBody).toContain("ON CONFLICT (client_id, provider_id) DO NOTHING");
    expect(ghostMergeBody).toContain("ON CONFLICT (user_id, role) DO NOTHING");
    expect(ghostMergeBody).toContain("ON CONFLICT (id) DO UPDATE SET");
    expect(ghostMergeBody).toContain("already_completed");
  });

  it("T-RETRY: der Invite wird weiterhin in derselben Transaktion verbraucht", () => {
    expect(ghostMergeBody).toMatch(
      /UPDATE public\.hm_pending_client_invites\s*\n\s*SET consumed_at = now\(\),\s*\n\s*consumed_user_id = p_user_id/,
    );
  });

  it("bleibt service_role-only", () => {
    expect(ghostMergeBody).toMatch(
      /REVOKE ALL ON FUNCTION public\.create_invited_customer_with_contact[\s\S]*?FROM PUBLIC, anon, authenticated/,
    );
    expect(ghostMergeBody).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_invited_customer_with_contact[\s\S]*?TO service_role/,
    );
  });
});
