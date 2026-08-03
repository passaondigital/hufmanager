// ── Zugriffsschicht: nur RLS-gebundene, echte Datenmodelle ─────────────
//
// Bewusst KEINE Nutzung von search_horse_by_readable_id()/
// search_profile_by_readable_id() — beide RPCs sind laut
// docs/hufi-id-system-analysis.md Abschnitt 14 Punkt 3 nicht gegen den
// tatsächlichen Pferdezugriff des aufrufenden Nutzers geprüft und würden
// fremde Pferdedaten (Name/Foto/Rasse/owner_id) für JEDE geratene/bekannte
// readable_id zurückgeben. Stattdessen: dieselben zwei RLS-Policies aus
// horses (Abschnitt 16 des ID-Dokuments) werden hier 1:1 als Query
// nachgebildet — Owner-Pfad und access_grants-Pfad — sodass ein normaler
// Nutzer strukturell nie ein fremdes Pferd zu sehen bekommt, selbst wenn
// diese Query-Logik einen Fehler hätte: RLS greift zusätzlich als zweite,
// unabhängige Schranke auf DB-Ebene.

import { supabase } from "@/integrations/supabase/client";

export interface AccessibleHorse {
  id: string;
  name: string;
  /** = horses.readable_id (Format "EQID-123456"), NICHT horses.eqid —
   * siehe docs/hufi-id-system-analysis.md Abschnitt 8: die alte eqid-Spalte
   * wird von keinem Trigger befüllt und ist faktisch immer leer. */
  readableId: string | null;
  ownerId: string;
  ownerDisplayName: string | null;
  horseStatus: string;
}

const HORSE_SELECT = "id, name, readable_id, owner_id, horse_status, deleted_at";

interface HorseRow {
  id: string;
  name: string;
  readable_id: string | null;
  owner_id: string;
  horse_status: string;
  deleted_at: string | null;
}

async function fetchOwnedHorses(authenticatedUserId: string): Promise<HorseRow[]> {
  const { data, error } = await supabase
    .from("horses")
    .select(HORSE_SELECT)
    .eq("owner_id", authenticatedUserId)
    .is("deleted_at", null);

  if (error) throw error;
  return (data || []) as HorseRow[];
}

async function fetchGrantedHorses(authenticatedUserId: string): Promise<HorseRow[]> {
  // Spiegelt exakt die WHERE-Klausel der RLS-Policy "Provider can view
  // client horses timed" (siehe docs/hufi-id-system-analysis.md
  // Abschnitt 16) — ag.is_active, ag.status='active', valid_until-Check.
  const { data: grants, error: grantError } = await supabase
    .from("access_grants")
    .select("client_id, valid_until")
    .eq("provider_id", authenticatedUserId)
    .eq("is_active", true)
    .eq("status", "active");

  if (grantError) throw grantError;

  const now = Date.now();
  const activeClientIds = (grants || [])
    .filter((g) => !g.valid_until || new Date(g.valid_until).getTime() > now)
    .map((g) => g.client_id);

  if (activeClientIds.length === 0) return [];

  const { data, error } = await supabase
    .from("horses")
    .select(HORSE_SELECT)
    .in("owner_id", activeClientIds)
    .is("deleted_at", null);

  if (error) throw error;
  return (data || []) as HorseRow[];
}

async function fetchOwnerDisplayNames(ownerIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ownerIds));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data || []) {
    if (row.full_name) map.set(row.id, row.full_name);
  }
  return map;
}

/** Alle Pferde, auf die der authentifizierte Nutzer aktuell Zugriff hat —
 * eigene Pferde (Owner) UND über access_grants freigegebene Kundenpferde
 * (Provider). Enthält bewusst auch nicht-'active'-Pferde (verkauft/
 * verstorben/archiviert/gestohlen), damit die Resolution-Schicht den
 * "archived"-Zustand erkennen kann (Ausschluss von der Auswahl passiert
 * dort, nicht hier). Enthält NIEMALS soft-gelöschte Pferde
 * (deleted_at IS NOT NULL). */
export async function fetchAccessibleHorses(
  authenticatedUserId: string,
): Promise<AccessibleHorse[]> {
  const [owned, granted] = await Promise.all([
    fetchOwnedHorses(authenticatedUserId),
    fetchGrantedHorses(authenticatedUserId),
  ]);

  const byId = new Map<string, HorseRow>();
  for (const h of [...owned, ...granted]) {
    byId.set(h.id, h);
  }
  const rows = Array.from(byId.values());

  const ownerNames = await fetchOwnerDisplayNames(rows.map((r) => r.owner_id));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    readableId: r.readable_id,
    ownerId: r.owner_id,
    ownerDisplayName: ownerNames.get(r.owner_id) ?? null,
    horseStatus: r.horse_status,
  }));
}

/** Gezielter Zugriffs-Check für ein EINZELNES, bereits bekanntes Pferd
 * (z. B. currentHorseId aus dem Seitenkontext) — nutzt zusätzlich zur
 * RLS-Query die bestehende RPC is_provider_for_horse(), die auch den
 * profiles.created_by_provider_id-Pfad abdeckt (siehe
 * docs/hufi-id-system-analysis.md Abschnitt 16/17).
 *
 * WICHTIG (Sicherheitsregel, siehe docs/hufi-id-system-analysis.md
 * Abschnitt 14 Punkt 4): is_provider_for_horse() bindet _provider_id NICHT
 * intern an auth.uid(). Diese Funktion darf deshalb NUR mit der ID des
 * gerade authentifizierten Nutzers aufgerufen werden — niemals mit einer
 * anderen, vom Aufrufer übergebenen ID. */
export async function checkSingleHorseAccess(
  authenticatedUserId: string,
  horseId: string,
): Promise<AccessibleHorse | null> {
  // Zuerst: direkte, RLS-gebundene Query (sicherste Quelle).
  const { data, error } = await supabase
    .from("horses")
    .select(HORSE_SELECT)
    .eq("id", horseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    const ownerNames = await fetchOwnerDisplayNames([data.owner_id]);
    return {
      id: data.id,
      name: data.name,
      readableId: data.readable_id,
      ownerId: data.owner_id,
      ownerDisplayName: ownerNames.get(data.owner_id) ?? null,
      horseStatus: data.horse_status,
    };
  }

  // RLS lieferte nichts zurück — zusätzlicher, expliziter Check über
  // is_provider_for_horse() für den in docs/hufi-id-system-analysis.md
  // Abschnitt 17 dokumentierten created_by_provider_id-Pfad, den die
  // reine RLS-Query nicht abdeckt. Liefert im Erfolgsfall trotzdem keine
  // Pferdedetails preis, sondern nur einen Boolean — Details würden bei
  // Erfolg über eine erneute, jetzt RLS-erlaubte Query geholt.
  const { data: hasAccess, error: rpcError } = await supabase.rpc(
    "is_provider_for_horse",
    { _provider_id: authenticatedUserId, _horse_id: horseId },
  );
  if (rpcError) throw rpcError;
  if (!hasAccess) return null;

  // Zugriff laut RPC vorhanden, aber RLS-Query lieferte nichts (der in
  // Abschnitt 17 dokumentierte Lückenfall) — keine Detaildaten ohne echte
  // RLS-Freigabe zurückgeben, nur den Zugriff bestätigen. Aufrufer
  // behandelt diesen Fall konservativ (siehe resolve.ts).
  return null;
}
