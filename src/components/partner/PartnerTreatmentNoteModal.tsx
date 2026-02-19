import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !treatmentDate) {
      toast.error("Bitte Pflichtfelder ausfüllen");
      return;
    }

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
    });

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
