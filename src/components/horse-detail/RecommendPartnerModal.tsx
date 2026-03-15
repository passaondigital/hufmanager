import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { PARTNER_TYPE_OPTIONS } from "@/lib/partnerTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  ownerId: string;
  onSent: () => void;
}

export function RecommendPartnerModal({ open, onClose, horseId, horseName, ownerId, onSent }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !partnerType || !user) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("partner_recommendations").insert({
        horse_id: horseId,
        recommended_by: user.id,
        recommended_partner_name: name,
        recommended_partner_email: email || null,
        recommended_partner_type: partnerType,
        reason: reason || null,
        owner_id: ownerId,
        status: "pending",
      });

      if (error) throw error;

      // Notification to owner
      await supabase.from("notifications").insert({
        user_id: ownerId,
        title: "💡 Partner-Empfehlung",
        message: `Ein Dienstleister empfiehlt ${name} (${partnerType}) für ${horseName}.`,
        type: "partner_recommendation_request",
        link: `/client/horse/${horseId}?tab=team`,
      });

      toast.success("Empfehlung an den Besitzer gesendet");
      setName(""); setEmail(""); setPartnerType(""); setReason("");
      onSent();
    } catch (err: any) {
      console.error("Recommend error:", err);
      toast.error(err.message || "Fehler beim Senden der Empfehlung");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fachpartner empfehlen — {horseName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border mb-2">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Du empfiehlst dem Besitzer einen Fachpartner. Der Besitzer entscheidet ob der Partner Zugriff erhält.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Miriam Fischer" required />
          </div>
          <div>
            <Label>E-Mail (optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="miriam@beispiel.de" />
          </div>
          <div>
            <Label>Begründung (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ISG war blockiert, Kontrolle empfohlen..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Empfehlung senden
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
