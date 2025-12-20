import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

interface Client {
  id: string;
  full_name: string | null;
  readable_id: string | null;
}

interface Horse {
  id: string;
  name: string;
  owner_id: string;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedClientId?: string | null;
  preSelectedHorseId?: string | null;
}

const invoiceSchema = z.object({
  client_id: z.string().min(1, "Bitte wählen Sie einen Kunden"),
  horse_id: z.string().optional(),
  invoice_number: z.string().max(50, "Rechnungsnummer zu lang").optional(),
  issue_date: z.string().min(1, "Bitte wählen Sie ein Datum"),
  due_date: z.string().optional(),
  total_amount: z.number().min(0.01, "Betrag muss größer als 0 sein"),
  status: z.enum(["pending", "paid", "overdue"]),
  notes: z.string().max(1000, "Notizen zu lang").optional(),
});

export function CreateInvoiceModal({ 
  open, 
  onClose, 
  onSuccess, 
  preSelectedClientId,
  preSelectedHorseId 
}: CreateInvoiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [filteredHorses, setFilteredHorses] = useState<Horse[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    client_id: preSelectedClientId || "",
    horse_id: preSelectedHorseId || "",
    invoice_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    total_amount: "",
    status: "pending" as "pending" | "paid" | "overdue",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens with new preselected values
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        client_id: preSelectedClientId || "",
        horse_id: preSelectedHorseId || "",
      }));
    }
  }, [open, preSelectedClientId, preSelectedHorseId]);

  // Load data only once when modal first opens
  useEffect(() => {
    if (!open || !user || dataLoaded) return;

    const fetchData = async () => {
      // Lade ALLE Kunden (Profile mit Rolle 'client') aus der Datenbank
      const { data: clientRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      let allClients: Client[] = [];

      if (clientRoles && clientRoles.length > 0) {
        const clientIds = clientRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, readable_id")
          .in("id", clientIds)
          .is("deleted_at", null)
          .order("full_name");

        if (profiles) {
          allClients = profiles.filter(p => p.full_name);
        }
      }

      // Fallback: Auch Profile laden, die vom Provider erstellt wurden
      const { data: createdProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null);

      if (createdProfiles) {
        const existingIds = new Set(allClients.map(c => c.id));
        createdProfiles.forEach(p => {
          if (!existingIds.has(p.id) && p.full_name) {
            allClients.push(p);
          }
        });
      }

      setClients(allClients);

      // Pferde laden
      const { data: horsesData } = await supabase
        .from("horses")
        .select("id, name, owner_id")
        .is("deleted_at", null);

      setHorses(horsesData || []);
      setDataLoaded(true);
    };

    fetchData();
  }, [open, user, dataLoaded]);

  // Reset dataLoaded when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset to avoid flash on next open
      const timer = setTimeout(() => setDataLoaded(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Filter horses when client changes
  useEffect(() => {
    if (formData.client_id && horses.length > 0) {
      setFilteredHorses(horses.filter(h => h.owner_id === formData.client_id));
    } else {
      setFilteredHorses([]);
    }
  }, [formData.client_id, horses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const amount = parseFloat(formData.total_amount);
    
    const validationData = {
      client_id: formData.client_id,
      horse_id: formData.horse_id || undefined,
      invoice_number: formData.invoice_number || undefined,
      issue_date: formData.issue_date,
      due_date: formData.due_date || undefined,
      total_amount: isNaN(amount) ? 0 : amount,
      status: formData.status,
      notes: formData.notes || undefined,
    };

    const result = invoiceSchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("invoices").insert({
      client_id: formData.client_id,
      provider_id: user?.id,
      horse_id: formData.horse_id || null,
      invoice_number: formData.invoice_number || null,
      issue_date: formData.issue_date,
      due_date: formData.due_date || null,
      total_amount: amount,
      status: formData.status,
      notes: formData.notes || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Fehler",
        description: "Rechnung konnte nicht erstellt werden. " + error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolg",
      description: "Rechnung wurde erstellt.",
    });

    setFormData({
      client_id: "",
      horse_id: "",
      invoice_number: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      total_amount: "",
      status: "pending",
      notes: "",
    });

    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Rechnung erstellen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Kunde *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Keine Kunden gefunden</div>
                ) : (
                    clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                        {client.full_name || "Unbekannt"}
                        {client.readable_id && ` (${client.readable_id})`}
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
          </div>

          {/* Pferd Auswahl nur anzeigen, wenn Kunde gewählt */}
          {formData.client_id && (
            <div className="space-y-2">
              <Label htmlFor="horse_id">Pferd (optional)</Label>
              <Select
                value={formData.horse_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, horse_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pferd auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredHorses.length === 0 ? (
                     <div className="p-2 text-sm text-muted-foreground">Keine Pferde für diesen Kunden</div>
                  ) : (
                    filteredHorses.map(horse => (
                        <SelectItem key={horse.id} value={horse.id}>
                        {horse.name}
                        </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invoice_number">Rechnungsnummer</Label>
            <Input
              id="invoice_number"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              placeholder="z.B. RE-2024-001"
              maxLength={50}
            />
            {errors.invoice_number && <p className="text-sm text-destructive">{errors.invoice_number}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Rechnungsdatum *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
              />
              {errors.issue_date && <p className="text-sm text-destructive">{errors.issue_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Fälligkeitsdatum</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Betrag (€) *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                placeholder="0.00"
              />
              {errors.total_amount && <p className="text-sm text-destructive">{errors.total_amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "pending" | "paid" | "overdue") => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Offen</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionale Notizen..."
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rechnung erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
