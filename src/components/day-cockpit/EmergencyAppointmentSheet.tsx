import { useState, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle, Plus } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { TourAppointment } from "@/components/tour-manager/TourCard";

interface EmergencyAppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: EmergencyFormData) => void;
  isSending: boolean;
  appointments: TourAppointment[];
  activeIndex: number;
}

export interface EmergencyFormData {
  contactId: string | null;
  oneTimeName: string;
  horseId: string;
  serviceType: string;
  notes: string;
  insertAfterIndex: number; // -1 = after current
}

export function EmergencyAppointmentSheet({
  open, onOpenChange, onConfirm, isSending, appointments, activeIndex,
}: EmergencyAppointmentSheetProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState<EmergencyFormData>({
    contactId: null,
    oneTimeName: "",
    horseId: "",
    serviceType: "Notfall",
    notes: "",
    insertAfterIndex: -1,
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["emergency-contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, profile_id, full_name, street, zip_code, city")
        .eq("provider_id", user!.id)
        .is("deleted_at", null)
        .order("full_name")
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  // Fetch horses for selected contact
  const selectedContact = contacts.find(c => c.id === form.contactId);
  const { data: horses = [] } = useQuery({
    queryKey: ["emergency-horses", selectedContact?.profile_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("id, name, breed")
        .eq("owner_id", selectedContact!.profile_id!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedContact?.profile_id,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["emergency-services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("name")
        .eq("provider_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts.slice(0, 20);
    const s = searchTerm.toLowerCase();
    return contacts.filter(c =>
      c.full_name.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s)
    ).slice(0, 20);
  }, [contacts, searchTerm]);

  const canSubmit = (form.contactId || form.oneTimeName.trim()) && form.horseId;

  const handleSubmit = () => {
    onConfirm({
      ...form,
      insertAfterIndex: form.insertAfterIndex === -1 ? activeIndex : form.insertAfterIndex,
    });
  };

  const resetForm = () => {
    setForm({ contactId: null, oneTimeName: "", horseId: "", serviceType: "Notfall", notes: "", insertAfterIndex: -1 });
    setSearchTerm("");
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DrawerContent className="bg-[#1a1a1a] border-t border-white/10 max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Notfall einplanen
            <HelpTip id="cockpit.emergency_add" />
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 space-y-4 overflow-y-auto max-h-[55vh] pb-2">
          {/* Contact search */}
          <div className="space-y-2">
            <Label className="text-white/80 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" /> Kunde suchen
            </Label>
            <Input
              placeholder="Name oder Ort..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10">
              {filteredContacts.length === 0 ? (
                <p className="p-3 text-sm text-white/40 text-center">Keine Kontakte gefunden</p>
              ) : (
                filteredContacts.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setForm(prev => ({ ...prev, contactId: c.id, horseId: "" }))}
                    className={cn(
                      "p-2.5 cursor-pointer border-b border-white/5 last:border-0 transition-colors",
                      form.contactId === c.id ? "bg-white/10" : "hover:bg-white/5"
                    )}
                  >
                    <p className="text-sm font-medium text-white">{c.full_name}</p>
                    {c.city && <p className="text-xs text-white/40">{[c.street, c.zip_code, c.city].filter(Boolean).join(", ")}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* One-time name (if no contact selected) */}
          {!form.contactId && (
            <div className="space-y-1">
              <Label className="text-white/80">Oder Einmal-Kunde</Label>
              <Input
                placeholder="Name eingeben..."
                value={form.oneTimeName}
                onChange={(e) => setForm(prev => ({ ...prev, oneTimeName: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          )}

          {/* Horse selection */}
          {form.contactId && horses.length > 0 && (
            <div className="space-y-1">
              <Label className="text-white/80">Pferd</Label>
              <Select value={form.horseId} onValueChange={v => setForm(prev => ({ ...prev, horseId: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Pferd auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {horses.map(h => (
                    <SelectItem key={h.id} value={h.id}>🐴 {h.name}{h.breed ? ` (${h.breed})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service type */}
          <div className="space-y-1">
            <Label className="text-white/80">Auftragstyp</Label>
            <Select value={form.serviceType} onValueChange={v => setForm(prev => ({ ...prev, serviceType: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Notfall">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" /> Notfall
                  </span>
                </SelectItem>
                {services.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Insert position */}
          <div className="space-y-1">
            <Label className="text-white/80">Einplanen nach</Label>
            <Select
              value={String(form.insertAfterIndex)}
              onValueChange={v => setForm(prev => ({ ...prev, insertAfterIndex: parseInt(v) }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Nach aktuellem Termin</SelectItem>
                {appointments.map((apt, i) => (
                  <SelectItem key={apt.id} value={String(i)}>
                    Nach {apt.client?.full_name || `Termin ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-white/80">Notizen (optional)</Label>
            <Textarea
              placeholder="Beschreibung des Notfalls..."
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[60px]"
              maxLength={500}
            />
          </div>
        </div>

        <DrawerFooter className="gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSending}
            className="w-full h-12 font-bold text-base"
            style={{ background: "#dc2626", color: "#fff" }}
          >
            {isSending ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Wird eingeschoben...</>
            ) : (
              <><Plus className="h-5 w-5 mr-2" />Notfall einplanen</>
            )}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60">
            Abbrechen
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
