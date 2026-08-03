import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildObservationInput } from "./build-input";
import { createObservationProposal } from "./build-proposal";
import { buildConfirmation } from "./confirmation";
import { simulateObservationExecution } from "./simulate-execution";
import type { HufiObservationProposal } from "../contracts/hufi-observation-proposal";
import type { HufiObservationResult } from "../contracts/hufi-observation-result";
import type { ObservationDraft, HoofPosition, ObservationUrgency } from "../contracts/hufi-observation-structure";

type Phase = "input" | "loading" | "proposal" | "done" | "error";

const HOOF_POSITIONS: { value: HoofPosition; label: string }[] = [
  { value: "vl", label: "vorne links" },
  { value: "vr", label: "vorne rechts" },
  { value: "hl", label: "hinten links" },
  { value: "hr", label: "hinten rechts" },
];

const URGENCIES: { value: ObservationUrgency; label: string }[] = [
  { value: "routine", label: "Routine" },
  { value: "vet_recommended", label: "Tierarzt empfohlen" },
  { value: "osteo_recommended", label: "Osteopath empfohlen" },
];

const RESOLUTION_LABELS: Record<HufiObservationProposal["horseResolution"], string> = {
  exact: "Eindeutig gefunden",
  contextual: "Aus Seitenkontext übernommen",
  ambiguous: "Mehrdeutig — Auswahl nötig",
  not_found: "Nicht gefunden",
  unauthorized: "Kein Zugriff",
  archived: "Nicht aktiv (archiviert/verkauft/verstorben)",
};

export function ObservationProposalLab() {
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>("input");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [rawInput, setRawInput] = useState("");
  const [horseQuery, setHorseQuery] = useState("");
  const [contextHorseId, setContextHorseId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [proposal, setProposal] = useState<HufiObservationProposal | null>(null);
  const [chosenHorseId, setChosenHorseId] = useState<string | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);
  const [editedDraft, setEditedDraft] = useState<Partial<ObservationDraft>>({});

  const [result, setResult] = useState<HufiObservationResult | null>(null);

  function resetToInput() {
    setPhase("input");
    setProposal(null);
    setChosenHorseId(undefined);
    setEditMode(false);
    setEditedDraft({});
    setResult(null);
    setErrorMessage("");
  }

  async function handleSearch() {
    if (!user?.id) {
      setErrorMessage("Nicht angemeldet — keine Suche möglich.");
      setPhase("error");
      return;
    }
    if (!rawInput.trim()) {
      setErrorMessage("Bitte zuerst einen Beobachtungstext eingeben.");
      setPhase("error");
      return;
    }
    setPhase("loading");
    try {
      const input = buildObservationInput({
        rawInput,
        source: "text",
        userId: user.id,
        currentHorseId: contextHorseId.trim() || undefined,
        currentRoute: "/hufi-observation-lab",
      });
      const nextProposal = await createObservationProposal({
        authenticatedUserId: user.id,
        input,
        horseQuery,
      });
      setProposal(nextProposal);
      setChosenHorseId(nextProposal.selectedHorseId);
      setEditedDraft({});
      setEditMode(false);
      setPhase("proposal");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler bei der Suche.");
      setPhase("error");
    }
  }

  function handleCancel() {
    if (proposal) {
      // Auch der Abbruch wird als Confirmation-Objekt gebaut (decision:
      // "cancel") — rein zu Protokollzwecken in dieser Session, keine
      // Persistierung.
      buildConfirmation({ proposal, decision: "cancel" });
    }
    resetToInput();
  }

  function handleConfirm() {
    if (!proposal) return;
    const finalHorseId = chosenHorseId ?? proposal.selectedHorseId;
    if (!finalHorseId) {
      setErrorMessage("Kein Pferd ausgewählt — Bestätigung nicht möglich.");
      return;
    }
    const candidate = proposal.horseCandidates.find((c) => c.horseId === finalHorseId);
    const decision = Object.keys(editedDraft).length > 0 ? "edit" : "confirm";

    const confirmation = buildConfirmation({
      proposal,
      decision,
      selectedHorseId: finalHorseId,
      editedFields: decision === "edit" ? editedDraft : undefined,
    });

    const simulated = simulateObservationExecution({
      proposal,
      confirmation,
      horseName: candidate?.horseName ?? "unbekanntes Pferd",
    });
    setResult(simulated);
    setPhase("done");
  }

  const canConfirm =
    !!proposal &&
    (proposal.horseResolution === "exact" ||
      proposal.horseResolution === "contextual" ||
      (proposal.horseResolution === "ambiguous" && !!chosenHorseId));

  const effectiveFinding = editedDraft.finding ?? proposal?.observation.finding ?? "";
  const effectiveHoofPosition = editedDraft.hoofPosition ?? proposal?.observation.hoofPosition;
  const effectiveUrgency = editedDraft.urgency ?? proposal?.observation.urgency ?? "routine";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Entwicklung — keine Speicherung</AlertTitle>
        <AlertDescription>
          Dieser Bereich ist ein isolierter Entwicklungs-/Testbereich für die echte
          Pferdesuche und den Observation-Proposal-Flow. Es wird nichts in
          hoof_entries, hoof_analyses, hufi_followup_suggestions oder
          hufi_task_queue geschrieben — jede Bestätigung ist simuliert.
        </AlertDescription>
      </Alert>

      {phase === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>Beobachtung eingeben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rawInput">Beobachtungstext</Label>
              <Textarea
                id="rawInput"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="z. B. „vorne links die äußere Wand ausgebrochen, Kontrolle in 4 Wochen empfohlen“"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horseQuery">Pferdename oder EQID</Label>
              <Input
                id="horseQuery"
                value={horseQuery}
                onChange={(e) => setHorseQuery(e.target.value)}
                placeholder="z. B. „Ginger“ oder „EQID-483920“"
              />
            </div>

            <div>
              <button
                type="button"
                className="text-sm text-muted-foreground underline"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "Erweitert ausblenden" : "Erweitert (Kontext-Pferd testen)"}
              </button>
              {showAdvanced && (
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="contextHorseId">
                    Kontext-Pferd-ID (UUID) — simuliert eine offene Pferdeakte-Seite,
                    testet contextual/unauthorized/archived
                  </Label>
                  <Input
                    id="contextHorseId"
                    value={contextHorseId}
                    onChange={(e) => setContextHorseId(e.target.value)}
                    placeholder="UUID, optional"
                  />
                </div>
              )}
            </div>

            <Button onClick={handleSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Vorschlag erzeugen (echte Pferdesuche)
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "loading" && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Pferdesuche läuft…
        </div>
      )}

      {phase === "error" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={resetToInput}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Neu starten
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "proposal" && proposal && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vorschau</CardTitle>
              <Badge variant={proposal.horseResolution === "exact" || proposal.horseResolution === "contextual" ? "default" : "destructive"}>
                {RESOLUTION_LABELS[proposal.horseResolution]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposal.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{proposal.warnings.join(" ")}</AlertDescription>
              </Alert>
            )}

            {/* Mehrdeutig: Auswahl aus den auswählbaren Kandidaten */}
            {proposal.horseResolution === "ambiguous" && (
              <div className="space-y-2">
                <Label>Welches Pferd ist gemeint?</Label>
                {proposal.horseCandidates
                  .filter((c) => c.selectable)
                  .map((c) => (
                    <button
                      key={c.horseId}
                      type="button"
                      onClick={() => setChosenHorseId(c.horseId)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        chosenHorseId === c.horseId
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="font-medium">{c.horseName}</div>
                      {c.owner && (
                        <div className="text-xs text-muted-foreground">
                          Besitzer: {c.owner.displayName}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{c.matchReason}</div>
                    </button>
                  ))}
              </div>
            )}

            {/* Gefunden, aber nicht auswählbar (archiviert) */}
            {proposal.horseResolution === "archived" &&
              proposal.horseCandidates.map((c) => (
                <div key={c.horseId} className="rounded-lg border border-dashed p-3">
                  <div className="font-medium">{c.horseName}</div>
                  <div className="text-xs text-muted-foreground">{c.exclusionReason}</div>
                </div>
              ))}

            {(proposal.horseResolution === "not_found" ||
              proposal.horseResolution === "unauthorized") && (
              <div className="text-sm text-muted-foreground">
                Keine weiteren Informationen verfügbar — bitte Suchbegriff prüfen.
              </div>
            )}

            {/* Exakt/kontextuell: direkt anzeigen */}
            {(proposal.horseResolution === "exact" ||
              proposal.horseResolution === "contextual") &&
              proposal.horseCandidates.map((c) => (
                <div key={c.horseId} className="rounded-lg border p-3">
                  <div className="font-medium">{c.horseName}</div>
                  {c.owner && (
                    <div className="text-xs text-muted-foreground">
                      Besitzer: {c.owner.displayName}
                    </div>
                  )}
                </div>
              ))}

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Beobachtung</Label>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline"
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? "Bearbeitung beenden" : "Bearbeiten"}
                </button>
              </div>

              {editMode ? (
                <Textarea
                  value={effectiveFinding}
                  onChange={(e) =>
                    setEditedDraft((prev) => ({ ...prev, finding: e.target.value }))
                  }
                  rows={3}
                />
              ) : (
                <p className="text-sm">{effectiveFinding || "(kein Befund erkannt)"}</p>
              )}

              {editMode ? (
                <div className="flex flex-wrap gap-2">
                  {HOOF_POSITIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() =>
                        setEditedDraft((prev) => ({ ...prev, hoofPosition: p.value }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        effectiveHoofPosition === p.value
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : (
                effectiveHoofPosition && (
                  <Badge variant="secondary">
                    {HOOF_POSITIONS.find((p) => p.value === effectiveHoofPosition)?.label}
                  </Badge>
                )
              )}

              {editMode ? (
                <div className="flex flex-wrap gap-2">
                  {URGENCIES.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setEditedDraft((prev) => ({ ...prev, urgency: u.value }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        effectiveUrgency === u.value ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              ) : (
                <Badge variant="outline">
                  {URGENCIES.find((u) => u.value === effectiveUrgency)?.label}
                </Badge>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handleConfirm} disabled={!canConfirm} className="flex-1">
                Bestätigen (simuliert)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "done" && result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Simuliert bestätigt</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertTitle>Noch nicht gespeichert</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
            {result.warnings.map((w) => (
              <p key={w} className="text-xs text-muted-foreground">
                {w}
              </p>
            ))}
            <Button variant="outline" onClick={resetToInput} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Neue Beobachtung
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
