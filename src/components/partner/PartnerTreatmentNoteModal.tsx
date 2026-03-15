import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

interface Recommendation {
  target_role: string;
  message: string;
  due_date: string | null;
}

const RECOMMENDATION_TARGETS = [
  { value: "hufpfleger", label: "Hufpfleger" },
  { value: "tierarzt", label: "Tierarzt" },
  { value: "besitzer", label: "Besitzer" },
  { value: "trainer", label: "Trainer" },
  { value: "sattler", label: "Sattler" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  partnerType?: string | null;
  onSaved: () => void;
}

export function PartnerTreatmentNoteModal({ open, onClose, horseId, partnerType, onSaved }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [treatmentDate, setTreatmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [findings, setFindings] = useState("");
  const [notes, setNotes] = useState("");
  const [nextTreatment, setNextTreatment] = useState("");
  const [visibleToPid, setVisibleToPid] = useState(true);
  const [visibleToKid, setVisibleToKid] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showRecForm, setShowRecForm] = useState(false);

  const addRecommendation = () => {
    setRecommendations([...recommendations, { target_role: "hufpfleger", message: "", due_date: null }]);
    setShowRecForm(true);
  };

  const removeRecommendation = (idx: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== idx));
  };

  const updateRecommendation = (idx: number, field: keyof Recommendation, value: string | null) => {
    setRecommendations(recommendations.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !treatmentDate) {
      toast.error("Bitte Pflichtfelder ausfüllen");
      return;
    }

    const validRecs = recommendations.filter((r) => r.message.trim());

    setLoading(true);
    const { error } = await supabase.from("partner_treatment_notes").insert({
      horse_id: horseId,
      partner_id: user.id,
      partner_type: partnerType as any,
      treatment_date: treatmentDate,
      title,
      findings: findings || null,
      notes: notes || null,
      next_treatment: nextTreatment || null,
      visible_to_pid: visibleToPid,
      visible_to_kid: visibleToKid,
      recommendation_for: validRecs.length > 0 ? validRecs : null,
    } as any);

    setLoading(false);

    if (error) {
      console.error("Error creating note:", error);
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Notiz gespeichert");
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Behandlungsnotiz</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titel *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Kontrolluntersuchung" required />
            </div>
            <div>
              <Label>Behandlungsdatum *</Label>
              <Input type="date" value={treatmentDate} onChange={(e) => setTreatmentDate(e.target.value)} required />
            </div>
            <div>
              <Label>Nächster Termin</Label>
              <Input type="date" value={nextTreatment} onChange={(e) => setNextTreatment(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Befund</Label>
            <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Befund dokumentieren..." rows={3} />
          </div>

          <div>
            <Label>Behandlung / Notizen</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Durchgeführte Maßnahmen..." rows={3} />
          </div>

          {/* Recommendations */}
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Empfehlung an andere Dienstleister</p>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRecommendation}>
                <Plus className="h-3 w-3" />
                Hinzufügen
              </Button>
            </div>
            {recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2 border border-border">
                <div className="flex items-center gap-2">
                  <Select value={rec.target_role} onValueChange={(v) => updateRecommendation(idx, "target_role", v)}>
                    <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECOMMENDATION_TARGETS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={rec.due_date || ""}
                    onChange={(e) => updateRecommendation(idx, "due_date", e.target.value || null)}
                    className="h-8 w-36"
                    placeholder="Bis wann?"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeRecommendation(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  value={rec.message}
                  onChange={(e) => updateRecommendation(idx, "message", e.target.value)}
                  placeholder="Was soll geprüft/beachtet werden?"
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Sichtbarkeit</p>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Für Hufbearbeiter (#PID) sichtbar</Label>
              <Switch checked={visibleToPid} onCheckedChange={setVisibleToPid} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Für Pferdebesitzer (#KID) sichtbar</Label>
              <Switch checked={visibleToKid} onCheckedChange={setVisibleToKid} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
