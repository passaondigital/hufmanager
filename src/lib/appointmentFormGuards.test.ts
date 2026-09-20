import { describe, expect, it } from "vitest";
import {
  computeHorseIdsForOwnerChange,
  computeSelectionAfterClose,
  emptyAppointmentSelection,
  isAppointmentSaveBlockedByLoad,
  isAppointmentSelectionEmpty,
  resolveHorseOwnerId,
  resolveOwnerDisplayName,
  shouldDiscardOnClose,
} from "./appointmentFormGuards";
import type { AppointmentSelectionState } from "./appointmentFormGuards";

describe("resolveOwnerDisplayName", () => {
  it("returns undefined when no owner is selected", () => {
    expect(resolveOwnerDisplayName(null, {}, new Map())).toBeUndefined();
    expect(resolveOwnerDisplayName(undefined, {}, new Map())).toBeUndefined();
  });

  it("prefers a freshly-created customer name (not yet in the owners map, has no horse yet)", () => {
    const name = resolveOwnerDisplayName("customer-a", { "customer-a": "Anna Müller" }, new Map());
    expect(name).toBe("Anna Müller");
  });

  it("falls back to the owners map (existing customer with horses) when not in knownOwnerNames", () => {
    const owners = new Map([["customer-b", { full_name: "Bernd Schmidt" }]]);
    expect(resolveOwnerDisplayName("customer-b", {}, owners)).toBe("Bernd Schmidt");
  });

  it("never returns a stale name for a different owner id (P1-3 regression)", () => {
    // Kunde A wurde zuerst angelegt/ausgewählt, dann wechselt der Nutzer zu
    // Kunde B. Die Anzeige muss sofort B zeigen, nie A.
    const knownOwnerNames = { "customer-a": "Anna Müller" };
    const owners = new Map([["customer-b", { full_name: "Bernd Schmidt" }]]);
    expect(resolveOwnerDisplayName("customer-a", knownOwnerNames, owners)).toBe("Anna Müller");
    expect(resolveOwnerDisplayName("customer-b", knownOwnerNames, owners)).toBe("Bernd Schmidt");
    // Wichtig: das Ergebnis für B enthält nie "Anna Müller" — es gibt keinen
    // unabhängigen State, der das könnte.
  });

  it("returns undefined when the owner is known nowhere (defensive, no crash)", () => {
    expect(resolveOwnerDisplayName("unknown-id", {}, new Map())).toBeUndefined();
  });
});

describe("isAppointmentSaveBlockedByLoad", () => {
  it("blocks save while appointments are still loading", () => {
    expect(isAppointmentSaveBlockedByLoad(true, false)).toBe(true);
  });

  it("blocks save when the load failed (never pretend there is no conflict)", () => {
    expect(isAppointmentSaveBlockedByLoad(false, true)).toBe(true);
  });

  it("allows save once loading finished successfully", () => {
    expect(isAppointmentSaveBlockedByLoad(false, false)).toBe(false);
  });

  it("stays blocked if both loading and error are somehow true", () => {
    expect(isAppointmentSaveBlockedByLoad(true, true)).toBe(true);
  });
});

describe("computeHorseIdsForOwnerChange (P1-A regression)", () => {
  const horses = [
    { id: "horse-a1", owner_id: "owner-a" },
    { id: "horse-a2", owner_id: "owner-a" },
    { id: "horse-b1", owner_id: "owner-b" },
  ];

  it("replaces the previous owner's horseIds entirely, never merges them", () => {
    const result = computeHorseIdsForOwnerChange(horses, "owner-b");
    expect(result).toEqual(["horse-b1"]);
    expect(result).not.toContain("horse-a1");
    expect(result).not.toContain("horse-a2");
  });

  it("selects all horses of the newly chosen owner", () => {
    expect(computeHorseIdsForOwnerChange(horses, "owner-a")).toEqual(["horse-a1", "horse-a2"]);
  });

  it("returns an empty selection when the owner has no horses yet", () => {
    expect(computeHorseIdsForOwnerChange(horses, "owner-c")).toEqual([]);
  });
});

describe("resolveHorseOwnerId (P1-A regression)", () => {
  const horses = [{ id: "horse-1", owner_id: "owner-1" }];

  it("prefers the owner_id from the loaded horses list", () => {
    expect(resolveHorseOwnerId("horse-1", horses, {})).toBe("owner-1");
  });

  it("falls back to knownHorseOwners for a horse not yet in the query cache (race with refetch)", () => {
    expect(resolveHorseOwnerId("just-created-horse", horses, { "just-created-horse": "owner-2" })).toBe("owner-2");
  });

  it("never returns null for a horse with a known owner, even before refetch", () => {
    const result = resolveHorseOwnerId("just-created-horse", [], { "just-created-horse": "owner-2" });
    expect(result).not.toBeNull();
    expect(result).toBe("owner-2");
  });

  it("returns null only when the horse is genuinely unknown everywhere", () => {
    expect(resolveHorseOwnerId("ghost-horse", horses, {})).toBeNull();
  });

  it("query cache takes precedence over a stale knownHorseOwners entry", () => {
    expect(resolveHorseOwnerId("horse-1", horses, { "horse-1": "stale-owner" })).toBe("owner-1");
  });
});

describe("computeSelectionAfterClose (P1-4: Cancel/Close/Reopen)", () => {
  /**
   * Bildet exakt die Sequenz aus TourLiveEditControl nach: das Modal bleibt
   * gemountet, der Auswahl-State wird also nicht durch Unmount entsorgt.
   * "Reopen" heisst hier: derselbe State-Wert, mit dem das Formular beim
   * naechsten Oeffnen rendert.
   */
  const horses = [
    { id: "horse-a1", owner_id: "owner-a" },
    { id: "horse-a2", owner_id: "owner-a" },
    { id: "horse-b1", owner_id: "owner-b" },
  ];

  function selectOwner(current: AppointmentSelectionState, ownerId: string, ownerName: string): AppointmentSelectionState {
    return {
      ...current,
      selectionMode: "owner",
      selectedOwnerId: ownerId,
      horseIds: computeHorseIdsForOwnerChange(horses, ownerId),
      knownOwnerNames: { ...current.knownOwnerNames, [ownerId]: ownerName },
    };
  }

  it("Owner A / Pferd A -> Cancel -> Reopen ergibt frischen State", () => {
    const afterSelection = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");
    expect(afterSelection.selectedOwnerId).toBe("owner-a");
    expect(afterSelection.horseIds).toEqual(["horse-a1", "horse-a2"]);

    const afterCancel = computeSelectionAfterClose(afterSelection, true);

    expect(isAppointmentSelectionEmpty(afterCancel)).toBe(true);
    expect(afterCancel.selectedOwnerId).toBe("");
    expect(afterCancel.horseIds).toEqual([]);
    expect(afterCancel.selectionMode).toBe("horse");
    expect(afterCancel.knownOwnerNames).toEqual({});
    expect(afterCancel.knownHorseOwners).toEqual({});
    // Beim Reopen darf der Name des vorher gewaehlten Kunden nirgends mehr
    // ableitbar sein.
    expect(resolveOwnerDisplayName("owner-a", afterCancel.knownOwnerNames, new Map())).toBeUndefined();
  });

  it("Owner A -> Owner B -> Cancel -> Reopen ergibt frischen State (kein B, kein A)", () => {
    const afterA = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");
    const afterB = selectOwner(afterA, "owner-b", "Bernd Schmidt");
    expect(afterB.selectedOwnerId).toBe("owner-b");
    expect(afterB.horseIds).toEqual(["horse-b1"]);

    const afterCancel = computeSelectionAfterClose(afterB, true);

    expect(isAppointmentSelectionEmpty(afterCancel)).toBe(true);
    expect(afterCancel.selectedOwnerId).toBe("");
    expect(afterCancel.horseIds).toEqual([]);
    expect(afterCancel.knownOwnerNames).toEqual({});
    expect(resolveOwnerDisplayName("owner-b", afterCancel.knownOwnerNames, new Map())).toBeUndefined();
    expect(resolveOwnerDisplayName("owner-a", afterCancel.knownOwnerNames, new Map())).toBeUndefined();
  });

  it("frisch angelegtes Pferd (knownHorseOwners) ueberlebt Cancel ebenfalls nicht", () => {
    const withNewHorse: AppointmentSelectionState = {
      ...selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller"),
      horseIds: ["just-created-horse"],
      knownHorseOwners: { "just-created-horse": "owner-a" },
    };

    const afterCancel = computeSelectionAfterClose(withNewHorse, true);

    expect(afterCancel.knownHorseOwners).toEqual({});
    expect(resolveHorseOwnerId("just-created-horse", [], afterCancel.knownHorseOwners)).toBeNull();
  });

  it("ohne discardOnClose bleibt der bisherige Kalender-Kontrakt unveraendert", () => {
    const afterSelection = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");
    const afterCancel = computeSelectionAfterClose(afterSelection, false);

    expect(afterCancel).toBe(afterSelection);
    expect(afterCancel.selectedOwnerId).toBe("owner-a");
    expect(afterCancel.horseIds).toEqual(["horse-a1", "horse-a2"]);
  });

  it("emptyAppointmentSelection liefert bei jedem Aufruf frische Objekte (kein geteilter State)", () => {
    const first = emptyAppointmentSelection();
    first.knownOwnerNames["owner-a"] = "Anna Mueller";
    first.horseIds.push("horse-a1");

    const second = emptyAppointmentSelection();

    expect(isAppointmentSelectionEmpty(second)).toBe(true);
    expect(second.knownOwnerNames).toEqual({});
    expect(second.horseIds).toEqual([]);
  });
});

describe("shouldDiscardOnClose (P1-5: jeder Schliesspfad resettet gleich)", () => {
  it("Host mit dauerhaft gemountetem Modal verwirft immer", () => {
    expect(shouldDiscardOnClose(true)).toBe(true);
    expect(shouldDiscardOnClose(true, false)).toBe(true);
  });

  it("'Entwurf verwerfen' verwirft auch dort, wo der Host nichts verlangt (Kalender)", () => {
    expect(shouldDiscardOnClose(false, true)).toBe(true);
  });

  it("normales Schliessen ohne discardOnClose laesst den Kalender-Entwurf stehen", () => {
    expect(shouldDiscardOnClose(false)).toBe(false);
    expect(shouldDiscardOnClose(false, false)).toBe(false);
  });
});

describe("Tour-Modal: alle Schliesspfade -> Reopen (P1-5)", () => {
  /**
   * Der Tour-Host laesst AppointmentFormModal dauerhaft gemountet
   * (discardOnClose=true). Geprueft wird der komplette Vertrag, den
   * handleClose fahrt: shouldDiscardOnClose entscheidet, danach liefert
   * computeSelectionAfterClose den State fuer das naechste Oeffnen.
   */
  const DISCARD_ON_CLOSE = true;
  const horses = [
    { id: "horse-a1", owner_id: "owner-a" },
    { id: "horse-a2", owner_id: "owner-a" },
    { id: "horse-b1", owner_id: "owner-b" },
  ];

  function selectOwner(current: AppointmentSelectionState, ownerId: string, ownerName: string): AppointmentSelectionState {
    return {
      ...current,
      selectionMode: "owner",
      selectedOwnerId: ownerId,
      horseIds: computeHorseIdsForOwnerChange(horses, ownerId),
      knownOwnerNames: { ...current.knownOwnerNames, [ownerId]: ownerName },
    };
  }

  /** Genau die Reihenfolge aus handleClose. */
  function closeModal(
    current: AppointmentSelectionState,
    options: { forceDiscardDraft?: boolean } = {},
  ): AppointmentSelectionState {
    const discard = shouldDiscardOnClose(DISCARD_ON_CLOSE, options.forceDiscardDraft === true);
    return computeSelectionAfterClose(current, discard);
  }

  it("1. Owner A / Pferd A -> Entwurf verwerfen -> Reopen ist frisch", () => {
    const opened = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");
    expect(opened.horseIds).toEqual(["horse-a1", "horse-a2"]);

    const reopened = closeModal(opened, { forceDiscardDraft: true });

    expect(isAppointmentSelectionEmpty(reopened)).toBe(true);
    expect(reopened.selectedOwnerId).toBe("");
    expect(reopened.horseIds).toEqual([]);
    expect(reopened.knownOwnerNames).toEqual({});
    expect(reopened.knownHorseOwners).toEqual({});
  });

  it("2. Owner A -> Owner B -> Entwurf verwerfen -> Reopen ist frisch", () => {
    const afterA = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");
    const afterB = selectOwner(afterA, "owner-b", "Bernd Schmidt");
    expect(afterB.selectedOwnerId).toBe("owner-b");

    const reopened = closeModal(afterB, { forceDiscardDraft: true });

    expect(isAppointmentSelectionEmpty(reopened)).toBe(true);
    expect(resolveOwnerDisplayName("owner-a", reopened.knownOwnerNames, new Map())).toBeUndefined();
    expect(resolveOwnerDisplayName("owner-b", reopened.knownOwnerNames, new Map())).toBeUndefined();
  });

  it("3. Cancel -> Reopen ist frisch", () => {
    const afterA = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");

    const reopened = closeModal(afterA);

    expect(isAppointmentSelectionEmpty(reopened)).toBe(true);
  });

  it("alle Schliesspfade liefern denselben Zustand (kein Pfad faellt heraus)", () => {
    const dirty: AppointmentSelectionState = {
      ...selectOwner(emptyAppointmentSelection(), "owner-b", "Bernd Schmidt"),
      knownHorseOwners: { "just-created-horse": "owner-b" },
    };

    const viaCancel = closeModal(dirty);
    const viaDiscardDraft = closeModal(dirty, { forceDiscardDraft: true });
    const viaSuccessfulSave = closeModal(dirty, { forceDiscardDraft: true });

    expect(viaCancel).toEqual(emptyAppointmentSelection());
    expect(viaDiscardDraft).toEqual(viaCancel);
    expect(viaSuccessfulSave).toEqual(viaCancel);
  });

  it("Kalender-Host (discardOnClose=false) behaelt den Entwurf beim normalen Schliessen", () => {
    const opened = selectOwner(emptyAppointmentSelection(), "owner-a", "Anna Mueller");
    const discard = shouldDiscardOnClose(false, false);
    const reopened = computeSelectionAfterClose(opened, discard);

    expect(discard).toBe(false);
    expect(reopened).toBe(opened);
    expect(reopened.selectedOwnerId).toBe("owner-a");
  });
});
