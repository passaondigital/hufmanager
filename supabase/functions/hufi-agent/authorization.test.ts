import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transform } from "esbuild";
import { describe, expect, it } from "vitest";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const ids = {
  owner: "owner-0000-0000-0000-000000000001",
  provider: "provider-0000-0000-0000-000000000002",
  partner: "partner-0000-0000-0000-000000000003",
  employee: "employee-0000-0000-0000-000000000004",
  stall: "stall-0000-0000-0000-000000000005",
  outsider: "outsider-0000-0000-0000-000000000006",
  horse: "horse-0000-0000-0000-000000000007",
  foreignHorse: "horse-0000-0000-0000-000000000008",
  appointment: "appointment-0000-0000-0000-000000000009",
} as const;

class Query {
  private readonly predicates: Array<(row: Row) => boolean> = [];
  private max: number | undefined;

  constructor(private readonly rows: Row[]) {}

  select() { return this; }
  eq(key: string, value: unknown) { this.predicates.push((row) => row[key] === value); return this; }
  in(key: string, values: unknown[]) { this.predicates.push((row) => values.includes(row[key])); return this; }
  is(key: string, value: unknown) { this.predicates.push((row) => row[key] === value); return this; }
  gte(key: string, value: string) { this.predicates.push((row) => String(row[key] ?? "") >= value); return this; }
  lte(key: string, value: string) { this.predicates.push((row) => String(row[key] ?? "") <= value); return this; }
  ilike(key: string, pattern: string) {
    const needle = pattern.replaceAll("%", "").toLowerCase();
    this.predicates.push((row) => String(row[key] ?? "").toLowerCase().includes(needle));
    return this;
  }
  not(key: string, operator: string, value: unknown) {
    if (operator === "is" && value === null) this.predicates.push((row) => row[key] !== null && row[key] !== undefined);
    return this;
  }
  or(expression: string) {
    const alternatives = expression.split(",").map((part) => part.split("."));
    this.predicates.push((row) => alternatives.some(([key, operator, value]) => {
      if (operator === "is" && value === "null") return row[key] === null || row[key] === undefined;
      if (operator === "gt") return String(row[key] ?? "") > value;
      if (operator === "gte") return String(row[key] ?? "") >= value;
      return false;
    }));
    return this;
  }
  order() { return this; }
  limit(value: number) { this.max = value; return this; }

  private data() {
    const filtered = this.rows.filter((row) => this.predicates.every((predicate) => predicate(row)));
    return this.max === undefined ? filtered : filtered.slice(0, this.max);
  }
  maybeSingle() { return Promise.resolve({ data: this.data()[0] ?? null, error: null }); }
  single() { return Promise.resolve({ data: this.data()[0] ?? null, error: null }); }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.data(), error: null }).then(onfulfilled, onrejected);
  }
}

function fakeSupabase(tables: Tables) {
  return { from: (table: string) => new Query(tables[table] ?? []) };
}

async function loadAuthorizationUnderTest() {
  const source = await readFile(resolve(process.cwd(), "supabase/functions/hufi-agent/index.ts"), "utf8");
  const start = source.indexOf("type HorseAccess =");
  const end = source.indexOf("// ── Wetter-Fetch");
  if (start < 0 || end < 0) throw new Error("Authorization source markers not found");
  const extracted = `${source.slice(start, end)}\nreturn { getHorseAccess, canAccessClient, lookupHorseName, lookupClientName, lookupAppointmentInfo, updateFocusFromToolCall, describeToolCall };`;
  const compiled = await transform(extracted, { loader: "ts", format: "cjs", target: "es2022" });
  return new Function(compiled.code)() as {
    getHorseAccess: (client: ReturnType<typeof fakeSupabase>, userId: string, horseId: string) => Promise<{ canViewMedical: boolean; canViewInvoices: boolean; via: string } | null>;
    canAccessClient: (client: ReturnType<typeof fakeSupabase>, userId: string, clientId: string) => Promise<boolean>;
    lookupHorseName: (client: ReturnType<typeof fakeSupabase>, userId: string, horseId: string) => Promise<string | null>;
    lookupClientName: (client: ReturnType<typeof fakeSupabase>, userId: string, clientId: string) => Promise<string | null>;
    lookupAppointmentInfo: (client: ReturnType<typeof fakeSupabase>, userId: string, appointmentId: string) => Promise<unknown>;
    updateFocusFromToolCall: (focus: Row, tool: string, input: Row, client: ReturnType<typeof fakeSupabase>, userId: string) => Promise<void>;
    describeToolCall: (tool: string, input: Row, client: ReturnType<typeof fakeSupabase>, userId: string) => Promise<string>;
  };
}

function fixture(overrides: Partial<Tables> = {}) {
  const horse = { id: ids.horse, owner_id: ids.owner, name: "Fixture Horse", deleted_at: null };
  return fakeSupabase({
    horses: [horse, { id: ids.foreignHorse, owner_id: ids.owner, name: "Foreign Fixture Horse", deleted_at: null }],
    profiles: [{ id: ids.owner, full_name: "Fixture Owner" }],
    access_grants: [],
    horse_partner_access: [],
    employee_horse_access: [],
    employee_profiles: [],
    stall_horse_access: [],
    appointments: [{ id: ids.appointment, horse_id: ids.horse, provider_id: ids.provider, client_id: ids.owner, date: "2099-01-01", data_shared_with_partners: false, data_shared_with_employees: true, horses: { name: horse.name } }],
    ...overrides,
  });
}

const auth = await loadAuthorizationUnderTest();

describe("MH01-P0-01 authorization matrix (isolated fake data)", () => {

  it("1 Owner → eigenes Pferd: ALLOW", async () => {
    await expect(auth.getHorseAccess(fixture(), ids.owner, ids.horse)).resolves.toMatchObject({ via: "owner", canViewMedical: true });
  });

  it("2 unbeteiligter Nutzer → fremdes Pferd: DENY", async () => {
    await expect(auth.getHorseAccess(fixture(), ids.outsider, ids.horse)).resolves.toBeNull();
  });

  it("3 gültiger access_grant: ALLOW", async () => {
    const db = fixture({ access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: "2099-01-01", can_view_medical: true }] });
    await expect(auth.getHorseAccess(db, ids.provider, ids.horse)).resolves.toMatchObject({ via: "access_grant" });
  });

  it("4 abgelaufener access_grant: DENY", async () => {
    const db = fixture({ access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: "2000-01-01", can_view_medical: true }] });
    await expect(auth.getHorseAccess(db, ids.provider, ids.horse)).resolves.toBeNull();
  });

  it("5 widerrufener access_grant: DENY", async () => {
    const db = fixture({ access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: false, status: "revoked", valid_until: null, can_view_medical: true }] });
    await expect(auth.getHorseAccess(db, ids.provider, ids.horse)).resolves.toBeNull();
  });

  it("6 gültiger horse_partner_access: ALLOW", async () => {
    const db = fixture({ horse_partner_access: [{ partner_profile_id: ids.partner, horse_id: ids.horse, is_active: true, status: "active", owner_approved: true, valid_until: "2099-01-01", can_view_medical: false }] });
    await expect(auth.getHorseAccess(db, ids.partner, ids.horse)).resolves.toMatchObject({ via: "partner", canViewMedical: false });
  });

  it("7 Partner ohne medizinische Berechtigung: Medical Data DENY", async () => {
    const db = fixture({ horse_partner_access: [{ partner_profile_id: ids.partner, horse_id: ids.horse, is_active: true, status: "active", owner_approved: true, valid_until: "2099-01-01", can_view_medical: false }] });
    await expect(auth.getHorseAccess(db, ids.partner, ids.horse)).resolves.toMatchObject({ canViewMedical: false });
  });

  it("8 gültiger employee_horse_access mit active employee_profiles-Beziehung: ALLOW", async () => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.provider, status: "active" }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toMatchObject({ via: "employee" });
  });

  it("9 entfernter/nicht mehr aktiver Mitarbeiter: DENY", async () => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.provider, status: "inactive" }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toBeNull();
  });

  it.each(["sick", "vacation"])("employee status %s: ALLOW", async (status) => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.provider, status }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toMatchObject({ via: "employee" });
  });

  it.each(["suspended", "inactive", null, "unknown"])("employee status %s: DENY", async (status) => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.provider, status }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toBeNull();
  });

  it("entfernte employee_profiles-Zeile: DENY", async () => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toBeNull();
  });

  it("stale employee_horse_access ohne provider_id: DENY", async () => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.provider, status: "active" }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toBeNull();
  });

  it("widersprüchlicher provider: DENY", async () => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.owner, status: "active" }],
    });
    await expect(auth.getHorseAccess(db, ids.employee, ids.horse)).resolves.toBeNull();
  });

  // ── Fall 10: gültiger stall_horse_access ─────────────────────────────────

  it("10 gültiger stall_horse_access (can_view_basic=true): ALLOW via stall", async () => {
    const db = fixture({
      stall_horse_access: [{ stall_owner_id: ids.stall, horse_id: ids.horse, can_view_basic: true, can_view_health_status: true }],
    });
    await expect(auth.getHorseAccess(db, ids.stall, ids.horse)).resolves.toMatchObject({ via: "stall" });
  });

  it("10b stall_horse_access can_view_basic=false: DENY", async () => {
    const db = fixture({
      stall_horse_access: [{ stall_owner_id: ids.stall, horse_id: ids.horse, can_view_basic: false }],
    });
    await expect(auth.getHorseAccess(db, ids.stall, ids.horse)).resolves.toBeNull();
  });

  // ── Fall 11: manipulierte/erratene horse_id ──────────────────────────────

  it("11 manipulierte horse_id (nicht existent): DENY", async () => {
    const fakeHorseId = "horse-ffff-ffff-ffff-ffffffffffff";
    await expect(auth.getHorseAccess(fixture(), ids.outsider, fakeHorseId)).resolves.toBeNull();
  });

  it("11b manipulierte horse_id für einen Nutzer mit Grant auf anderes Pferd: DENY", async () => {
    // provider hat Grant auf ids.horse, aber nicht auf foreignHorse
    const db = fixture({
      access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: null, can_view_medical: false }],
    });
    // foreignHorse gehört auch ids.owner, aber kein expliziter Grant für dieses Pferd erteilt.
    // getHorseAccess prüft access_grants über client_id/owner_id des Pferdes, daher ist
    // foreignHorse ebenfalls durch denselben Grant zugänglich — das ist das korrekte Modell.
    // Der echte Manipulationsfall ist eine vollständig fremde, erfundene ID:
    const fakeId = "horse-dead-beef-0000-000000000000";
    await expect(auth.getHorseAccess(db, ids.provider, fakeId)).resolves.toBeNull();
  });

  // ── Fall 12: manipulierte/erratene Client-ID ─────────────────────────────

  it("12 manipulierte client_id (fremder Kunde, kein Grant): DENY", async () => {
    // outsider fragt nach einer fremden clientId, zu der kein access_grant besteht
    await expect(auth.canAccessClient(fixture(), ids.outsider, ids.owner)).resolves.toBe(false);
  });

  it("12b vollständig erfundene client_id: DENY", async () => {
    const fakeClientId = "client-ffff-ffff-ffff-ffffffffffff";
    await expect(auth.canAccessClient(fixture(), ids.outsider, fakeClientId)).resolves.toBe(false);
  });

  it("12c leere client_id: DENY", async () => {
    await expect(auth.canAccessClient(fixture(), ids.outsider, "")).resolves.toBe(false);
  });

  // ── Fall 13: manipulierte/erratene appointment_id ────────────────────────

  it("13 nicht-existente appointment_id: DENY (null)", async () => {
    const fakeApptId = "appt-ffff-ffff-ffff-ffffffffffff";
    await expect(auth.lookupAppointmentInfo(fixture(), ids.outsider, fakeApptId)).resolves.toBeNull();
  });

  it("13b leere appointment_id: DENY (null)", async () => {
    await expect(auth.lookupAppointmentInfo(fixture(), ids.outsider, "")).resolves.toBeNull();
  });

  it("13c fremder Nutzer kann Termin des Owners nicht sehen: DENY", async () => {
    // Der Termin existiert im Fixture (ids.appointment gehört provider_id=provider, client_id=owner),
    // outsider hat keinen Zugriff darauf und ist weder provider noch client noch grant-berechtigt.
    await expect(auth.lookupAppointmentInfo(fixture(), ids.outsider, ids.appointment)).resolves.toBeNull();
  });

  // ── Fall 14: lookupHorseName → keine Metadaten bei Fremdzugriff ──────────

  it("14 lookupHorseName fremdes Pferd (kein Zugriff): null", async () => {
    await expect(auth.lookupHorseName(fixture(), ids.outsider, ids.horse)).resolves.toBeNull();
  });

  it("14b lookupHorseName berechtigtes Pferd (Owner): Name zurückgegeben", async () => {
    await expect(auth.lookupHorseName(fixture(), ids.owner, ids.horse)).resolves.toBe("Fixture Horse");
  });

  it("14c lookupHorseName vollständig erfundene horse_id: null", async () => {
    const fakeId = "horse-ffff-ffff-ffff-ffffffffffff";
    await expect(auth.lookupHorseName(fixture(), ids.outsider, fakeId)).resolves.toBeNull();
  });

  // ── Fall 15: lookupClientName → keine Metadaten bei Fremdzugriff ─────────

  it("15 lookupClientName fremder Kunde (kein Zugriff): null", async () => {
    await expect(auth.lookupClientName(fixture(), ids.outsider, ids.owner)).resolves.toBeNull();
  });

  it("15b lookupClientName eigener Datensatz (self): Name zurückgegeben", async () => {
    await expect(auth.lookupClientName(fixture(), ids.owner, ids.owner)).resolves.toBe("Fixture Owner");
  });

  it("15c lookupClientName vollständig erfundene client_id: null", async () => {
    const fakeId = "client-ffff-ffff-ffff-ffffffffffff";
    await expect(auth.lookupClientName(fixture(), ids.outsider, fakeId)).resolves.toBeNull();
  });

  // ── Fall 16: lookupAppointmentInfo → keine Metadaten bei Fremdzugriff ────

  it("16 lookupAppointmentInfo fremder Termin (outsider): null", async () => {
    await expect(auth.lookupAppointmentInfo(fixture(), ids.outsider, ids.appointment)).resolves.toBeNull();
  });

  it("16b lookupAppointmentInfo berechtigter Nutzer (provider): Daten zurückgegeben", async () => {
    await expect(auth.lookupAppointmentInfo(fixture(), ids.provider, ids.appointment)).resolves.toMatchObject({ horseId: ids.horse });
  });

  it("16c lookupAppointmentInfo Termin-Client (owner): Daten zurückgegeben", async () => {
    await expect(auth.lookupAppointmentInfo(fixture(), ids.owner, ids.appointment)).resolves.toMatchObject({ horseId: ids.horse });
  });

  // ── Fall 17: updateFocusFromToolCall / describeToolCall → keine fremden Daten

  it("17a updateFocusFromToolCall mit fremder horse_id: kein horseName im focus", async () => {
    const focus: Record<string, unknown> = {};
    await auth.updateFocusFromToolCall(focus, "get_horse_record", { horse_id: ids.horse }, fixture(), ids.outsider);
    expect(focus.horseName).toBeUndefined();
    expect(focus.horseId).toBeUndefined();
  });

  it("17b updateFocusFromToolCall mit fremder client_id: kein clientName im focus", async () => {
    const focus: Record<string, unknown> = {};
    await auth.updateFocusFromToolCall(focus, "get_client_overview", { client_id: ids.owner }, fixture(), ids.outsider);
    expect(focus.clientName).toBeUndefined();
    expect(focus.clientId).toBeUndefined();
  });

  it("17c updateFocusFromToolCall Owner mit eigener horse_id: horseName wird gesetzt", async () => {
    const focus: Record<string, unknown> = {};
    await auth.updateFocusFromToolCall(focus, "get_horse_record", { horse_id: ids.horse }, fixture(), ids.owner);
    expect(focus.horseName).toBe("Fixture Horse");
    expect(focus.horseId).toBe(ids.horse);
  });

  it("17d describeToolCall create_appointment mit fremder horse_id: kein Pferdename in Beschreibung", async () => {
    const result = await auth.describeToolCall("create_appointment", { horse_id: ids.horse, date: "2099-01-01" }, fixture(), ids.outsider);
    // horseName sollte nicht erscheinen, weil outsider keinen Zugriff hat
    expect(result).not.toContain("Fixture Horse");
    expect(result).toContain("2099-01-01");
  });

  it("17e describeToolCall create_appointment mit berechtigter horse_id: Pferdename erscheint", async () => {
    const result = await auth.describeToolCall("create_appointment", { horse_id: ids.horse, date: "2099-01-01" }, fixture(), ids.owner);
    expect(result).toContain("Fixture Horse");
  });

  it("17f describeToolCall cancel_appointment mit fremder appointment_id: kein Pferdename in Beschreibung", async () => {
    const result = await auth.describeToolCall("cancel_appointment", { appointment_id: ids.appointment }, fixture(), ids.outsider);
    expect(result).not.toContain("Fixture Horse");
  });

  it("17g describeToolCall cancel_appointment mit berechtigter appointment_id: Pferdename erscheint", async () => {
    const result = await auth.describeToolCall("cancel_appointment", { appointment_id: ids.appointment }, fixture(), ids.provider);
    expect(result).toContain("Fixture Horse");
  });

  // ── Fall 18: get_client_overview → kein Zugriff auf fremde Kundendaten ───
  // getHorseAccess/canAccessClient sind die Authorization-Guards.
  // get_client_overview ruft zuerst canAccessClient auf; bei DENY gibt es
  // "Kein Zugriff auf diese Kundenübersicht." zurück – keine Rechnungs- oder
  // Profildaten werden offenbart. Wir testen canAccessClient direkt als Guard.

  it("18 canAccessClient outsider → fremder Kunde: DENY (kein Rechnungszugriff möglich)", async () => {
    await expect(auth.canAccessClient(fixture(), ids.outsider, ids.owner)).resolves.toBe(false);
  });

  it("18b canAccessClient provider mit gültigem Grant → Client: ALLOW", async () => {
    const now = new Date().toISOString();
    const db = fixture({
      access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: null }],
    });
    await expect(auth.canAccessClient(db, ids.provider, ids.owner)).resolves.toBe(true);
  });

  it("18c canAccessClient provider mit abgelaufenem Grant → Client: DENY", async () => {
    const db = fixture({
      access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: "2000-01-01" }],
    });
    await expect(auth.canAccessClient(db, ids.provider, ids.owner)).resolves.toBe(false);
  });

  it("18d canAccessClient self (owner fragt sich selbst): ALLOW", async () => {
    await expect(auth.canAccessClient(fixture(), ids.owner, ids.owner)).resolves.toBe(true);
  });

  // ── Fall 19: get_horse_record → Medical Data nur mit canViewMedical=true ──
  // getHorseAccess ist der Guard für get_horse_record.
  // Medical Data (health_status, special_notes, treatment_notes) wird nur
  // geladen wenn access.canViewMedical === true.
  // Wir testen, dass canViewMedical korrekt gesetzt ist je Zugriffsweg:

  it("19 Owner: canViewMedical=true (vollständiger Zugriff)", async () => {
    await expect(auth.getHorseAccess(fixture(), ids.owner, ids.horse)).resolves.toMatchObject({ canViewMedical: true });
  });

  it("19b Partner ohne medical-Grant: canViewMedical=false", async () => {
    const db = fixture({
      horse_partner_access: [{ partner_profile_id: ids.partner, horse_id: ids.horse, is_active: true, status: "active", owner_approved: true, valid_until: null, can_view_medical: false }],
    });
    const result = await auth.getHorseAccess(db, ids.partner, ids.horse);
    expect(result).not.toBeNull();
    expect(result!.canViewMedical).toBe(false);
  });

  it("19c Partner mit medical-Grant: canViewMedical=true", async () => {
    const db = fixture({
      horse_partner_access: [{ partner_profile_id: ids.partner, horse_id: ids.horse, is_active: true, status: "active", owner_approved: true, valid_until: null, can_view_medical: true }],
    });
    await expect(auth.getHorseAccess(db, ids.partner, ids.horse)).resolves.toMatchObject({ canViewMedical: true });
  });

  it("19d Employee (active): canViewMedical=false (Employee sieht keine Medizindaten)", async () => {
    const db = fixture({
      employee_horse_access: [{ employee_id: ids.employee, horse_id: ids.horse, provider_id: ids.provider, can_view: true }],
      employee_profiles: [{ user_id: ids.employee, provider_id: ids.provider, status: "active" }],
    });
    const result = await auth.getHorseAccess(db, ids.employee, ids.horse);
    expect(result).not.toBeNull();
    expect(result!.canViewMedical).toBe(false);
  });

  it("19e Stall (can_view_health_status=false): canViewMedical=false", async () => {
    const db = fixture({
      stall_horse_access: [{ stall_owner_id: ids.stall, horse_id: ids.horse, can_view_basic: true, can_view_health_status: false }],
    });
    const result = await auth.getHorseAccess(db, ids.stall, ids.horse);
    expect(result).not.toBeNull();
    expect(result!.canViewMedical).toBe(false);
  });

  it("19f Stall (can_view_health_status=true): canViewMedical=true", async () => {
    const db = fixture({
      stall_horse_access: [{ stall_owner_id: ids.stall, horse_id: ids.horse, can_view_basic: true, can_view_health_status: true }],
    });
    await expect(auth.getHorseAccess(db, ids.stall, ids.horse)).resolves.toMatchObject({ canViewMedical: true });
  });

  it("19g outsider: kein Zugriff → Medical Data niemals offenbart (DENY)", async () => {
    await expect(auth.getHorseAccess(fixture(), ids.outsider, ids.horse)).resolves.toBeNull();
  });

  it("19h access_grant mit can_view_medical=true: canViewMedical=true", async () => {
    const db = fixture({
      access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: null, can_view_medical: true }],
    });
    await expect(auth.getHorseAccess(db, ids.provider, ids.horse)).resolves.toMatchObject({ canViewMedical: true });
  });

  it("19i access_grant mit can_view_medical=false: canViewMedical=false", async () => {
    const db = fixture({
      access_grants: [{ provider_id: ids.provider, client_id: ids.owner, is_active: true, status: "active", valid_until: null, can_view_medical: false }],
    });
    const result = await auth.getHorseAccess(db, ids.provider, ids.horse);
    expect(result).not.toBeNull();
    expect(result!.canViewMedical).toBe(false);
  });
});
