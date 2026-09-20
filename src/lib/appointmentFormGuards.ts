/**
 * Reine Guard-/Ableitungslogik für AppointmentFormModal, ausgelagert damit sie
 * ohne React/Supabase testbar ist.
 */

export interface OwnerLike {
  full_name: string | null;
}

/**
 * P1-3: Der angezeigte Kundenname für den "Neues Pferd"-Dialog darf niemals
 * unabhängig von der aktuell ausgewählten owner_id gepflegt werden (das führte
 * dazu, dass beim Kundenwechsel kurzzeitig noch der alte Name angezeigt
 * wurde). Der Name wird deshalb IMMER aus der aktuellen ownerId abgeleitet:
 * zuerst aus gerade erst angelegten Kunden (die noch kein Pferd haben und
 * daher nicht in `owners` auftauchen), sonst aus der Pferde-/Owners-Map.
 * Es gibt keinen separaten "aktiver Name"-State mehr, der aus dem Takt
 * geraten könnte.
 */
export function resolveOwnerDisplayName(
  ownerId: string | null | undefined,
  knownOwnerNames: Record<string, string>,
  ownersById: Map<string, OwnerLike>,
): string | undefined {
  if (!ownerId) return undefined;
  if (knownOwnerNames[ownerId]) return knownOwnerNames[ownerId];
  return ownersById.get(ownerId)?.full_name ?? undefined;
}

/**
 * P1-2: Solange die bestehenden Termine (für die Kollisionsprüfung) noch
 * laden oder das Laden fehlgeschlagen ist, darf NICHT gespeichert werden —
 * sonst läuft die Kollisionsprüfung gegen eine leere/unvollständige Liste
 * und meldet fälschlich "kein Konflikt".
 */
export function isAppointmentSaveBlockedByLoad(
  appointmentsLoading: boolean,
  appointmentsLoadError: boolean,
): boolean {
  return appointmentsLoading || appointmentsLoadError;
}

export interface HorseLike {
  id: string;
  owner_id: string | null;
}

/**
 * P1-A (Correction Pass 3): beim Kundenwechsel im "Kunde"-Auswahlmodus
 * müssen die horseIds des VORHER gewählten Kunden vollständig ersetzt werden,
 * nicht mit den Pferden des neuen Kunden zusammengeführt werden — sonst
 * akkumulieren sich horseIds verschiedener Besitzer und ein nachfolgendes
 * `horses.find(...).owner_id` liefert einen der beiden, beliebig welchen.
 * Innerhalb desselben Kunden bleibt Multi-Horse-Auswahl (Checkboxen) davon
 * unberührt, weil diese Funktion nur beim Kundenwechsel selbst aufgerufen
 * wird und immer alle Pferde des NEUEN Kunden zurückgibt.
 */
export function computeHorseIdsForOwnerChange(
  allHorses: HorseLike[],
  newOwnerId: string,
): string[] {
  return allHorses.filter((horse) => horse.owner_id === newOwnerId).map((horse) => horse.id);
}

/**
 * P1-A (Correction Pass 3): der owner_id für ein ausgewähltes Pferd darf nie
 * allein aus dem `horses`-Query-Cache gelesen werden — ein gerade erst
 * angelegtes Pferd kann ausgewählt und der Termin gespeichert werden, BEVOR
 * die `horses-with-price-group`-Query neu geladen hat. In diesem Fenster
 * liefert `horses.find(...)` `undefined`, und `?? null` würde stillschweigend
 * client_id=null erzeugen. `knownHorseOwners` hält die owner_id für frisch
 * angelegte Pferde lokal vor (befüllt in AddHorseModal.onCreated) und dient
 * ausschließlich als Fallback bis der Refetch durch ist — der Query-Cache hat
 * immer Vorrang, sobald er das Pferd kennt.
 */
export function resolveHorseOwnerId(
  horseId: string,
  horses: HorseLike[],
  knownHorseOwners: Record<string, string>,
): string | null {
  const horse = horses.find((item) => item.id === horseId);
  if (horse?.owner_id) return horse.owner_id;
  return knownHorseOwners[horseId] ?? horse?.owner_id ?? null;
}

/**
 * P1-4 (Correction Pass 4): Auswahl-State des Terminformulars, der beim
 * Schließen des Dialogs verworfen werden muss.
 *
 * Hintergrund: TourLiveEditControl hält AppointmentFormModal dauerhaft
 * gemountet (anders als Kalender.tsx, das es per `{isFormOpen && …}`
 * unmountet). Ohne Unmount überlebt der React-State Cancel/Reopen — beim
 * zweiten Öffnen stand noch der zuvor gewählte Kunde samt seiner Pferde da.
 *
 * Unmounten allein wäre hier KEINE Lösung: useFormDraft schreibt beim
 * Unmount den zuletzt gerenderten Wert nach localStorage zurück (Flush im
 * Effect-Cleanup), der Entwurf würde also beim nächsten Mount wieder
 * hergestellt. Deshalb ist der kanonische Weg: derselbe vollständige Reset,
 * der nach erfolgreichem Speichern läuft, plus clearDraft() — hier als reine,
 * testbare Datentransformation.
 */
export interface AppointmentSelectionState {
  selectionMode: "horse" | "owner";
  selectedOwnerId: string;
  horseIds: string[];
  knownOwnerNames: Record<string, string>;
  knownHorseOwners: Record<string, string>;
}

export function emptyAppointmentSelection(): AppointmentSelectionState {
  return {
    selectionMode: "horse",
    selectedOwnerId: "",
    horseIds: [],
    knownOwnerNames: {},
    knownHorseOwners: {},
  };
}

export function isAppointmentSelectionEmpty(state: AppointmentSelectionState): boolean {
  return (
    state.selectionMode === "horse" &&
    state.selectedOwnerId === "" &&
    state.horseIds.length === 0 &&
    Object.keys(state.knownOwnerNames).length === 0 &&
    Object.keys(state.knownHorseOwners).length === 0
  );
}

/**
 * Was beim Schließen (Abbrechen, Escape, Overlay-Klick) aus dem aktuellen
 * Auswahl-State wird. `discardOnClose` ist genau das Prop, das Hosts ohne
 * Unmount setzen; ohne das Flag bleibt der bisherige Kalender-Kontrakt
 * (Entwurf überlebt bewusst) unverändert.
 */
export function computeSelectionAfterClose(
  current: AppointmentSelectionState,
  discardOnClose: boolean,
): AppointmentSelectionState {
  return discardOnClose ? emptyAppointmentSelection() : current;
}

/**
 * P1-5 (Correction Pass 5): Welche Schließ-Pfade den vollständigen Reset
 * auslösen.
 *
 * Befund: "Entwurf verwerfen" rief direkt discardDraft()+onClose() und ging
 * damit an handleClose vorbei. Beim dauerhaft gemounteten Tour-Modal blieben
 * dadurch selectedOwnerId, knownOwnerNames, knownHorseOwners und die
 * Pferdeauswahl über den Reopen hinweg stehen — genau der Zustand, den P1-4
 * eigentlich beseitigt hatte, nur über einen zweiten Button.
 *
 * Es gibt deshalb nur noch EINEN Entscheider: discardOnClose kommt vom Host
 * (Tour-Modal: dauerhaft gemountet), forceDiscardDraft kommt von einer
 * ausdrücklichen Verwerfen-Geste des Nutzers (Button "Entwurf verwerfen",
 * erfolgreicher Save). Beides führt zum identischen Reset — kein zweiter
 * Reset-Pfad, der auseinanderlaufen kann.
 */
export function shouldDiscardOnClose(
  discardOnClose: boolean,
  forceDiscardDraft = false,
): boolean {
  return discardOnClose || forceDiscardDraft;
}
