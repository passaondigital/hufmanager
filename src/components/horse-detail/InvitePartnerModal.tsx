import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PARTNER_TYPE_OPTIONS } from "@/lib/partnerTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  inviterRole: "provider" | "client";
  onSent: () => void;
}

export function InvitePartnerModal({ open, onClose, horseId, horseName, inviterRole, onSent }: Props) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [accessNote, setAccessNote] = useState("");
  const [validUntil, setValidUntil] = useState("");

  // Permissions
  const [canViewHoofHistory, setCanViewHoofHistory] = useState(true);
  const [canViewMedical, setCanViewMedical] = useState(false);
  const [canAddNotes, setCanAddNotes] = useState(false);
  const [canCreateAppointments, setCanCreateAppointments] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !partnerType) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-partner-invitation", {
        body: {
          horse_id: horseId,
          partner_email: email,
          partner_name: name,
          partner_type: partnerType,
          permissions: {
            can_view_basic: true,
            can_view_hoof_history: canViewHoofHistory,
            can_view_medical: canViewMedical,
            can_add_treatment_notes: canAddNotes,
            can_create_appointments: canCreateAppointments,
          },
          access_note: accessNote || undefined,
          valid_until: validUntil || undefined,
          invited_by_role: inviterRole,
        },
      });

      if (error) throw error;

      toast.success(`Einladung an ${name} gesendet`);
      onSent();
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message || "Fehler beim Senden der Einladung");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partner einladen — {horseName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>E-Mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@email.de" required />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Max Mustermann" required />
          </div>
          <div>
            <Label>Fachrichtung *</Label>
            <Select value={partnerType} onValueChange={setPartnerType}>
              <SelectTrigger>
                <SelectValue placeholder="Fachrichtung wählen..." />
              </SelectTrigger>
              <SelectContent>
                {PARTNER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className={`h-4 w-4 ${opt.color}`} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Berechtigungen</p>
            <div className="flex items-center gap-2 opacity-50">
              <Checkbox checked={true} disabled />
              <Label className="text-sm">Basisdaten einsehen (immer aktiv)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={canViewHoofHistory} onCheckedChange={(v) => setCanViewHoofHistory(!!v)} />
              <Label className="text-sm">Huf-Historie einsehen</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={canViewMedical} onCheckedChange={(v) => setCanViewMedical(!!v)} />
              <Label className="text-sm">Medizinische Daten einsehen</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={canAddNotes} onCheckedChange={(v) => setCanAddNotes(!!v)} />
              <Label className="text-sm">Behandlungsnotizen anlegen</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={canCreateAppointments} onCheckedChange={(v) => setCanCreateAppointments(!!v)} />
              <Label className="text-sm">Termine erstellen</Label>
            </div>
          </div>

          <div>
            <Label>Nachricht (optional)</Label>
            <Textarea value={accessNote} onChange={(e) => setAccessNote(e.target.value)} placeholder="Hinweis für den Partner..." rows={2} />
          </div>

          <div>
            <Label>Gültig bis (optional)</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Einladung senden
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
