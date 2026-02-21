import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Loader2, Trash2, Calendar, CheckCircle2, Phone, Video,
  Mail, ExternalLink, Clock, MessageSquare
} from "lucide-react";
import { STATUS_CONFIG, type FunnelLeadData } from "./FunnelLeadCard";

type LeadStatus = "neu" | "kontaktiert" | "demo_gebucht" | "demo_durchgeführt" | "angebot" | "gewonnen" | "verloren";

const SOURCES = ["website", "empfehlung", "social_media", "messe", "direkt", "partner", "sonstige"];
const TOPIC_OPTIONS = [
  { value: "frage", label: "Allgemeine Frage" },
  { value: "demo_1zu1", label: "1:1 Demo / Vorführung" },
  { value: "beratung", label: "Beratungsgespräch" },
  { value: "sonstiges", label: "Sonstiges" },
];

interface FunnelLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: FunnelLeadData | null;
  onSaved: () => void;
}

export function FunnelLeadDialog({ open, onOpenChange, lead, onSaved }: FunnelLeadDialogProps) {
  const isEditing = !!lead;

  const [form, setForm] = useState({
    full_name: lead?.full_name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    company_name: lead?.company_name || "",
    source: lead?.source || "website",
    status: (lead?.status || "neu") as LeadStatus,
    notes: lead?.notes || "",
    postal_code: lead?.postal_code || "",
    topic: lead?.topic || "frage",
    contact_preference: lead?.contact_preference || "phone",
    message: lead?.message || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    setSaving(true);

    const payload: any = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      company_name: form.company_name || null,
      source: form.source,
      status: form.status,
      notes: form.notes || null,
      postal_code: form.postal_code || null,
      topic: form.topic,
      contact_preference: form.contact_preference,
      message: form.message || null,
      demo_booked_at: form.status === "demo_gebucht" && !lead?.demo_booked_at ? new Date().toISOString() : lead?.demo_booked_at || null,
      demo_completed_at: form.status === "demo_durchgeführt" && !lead?.demo_completed_at ? new Date().toISOString() : lead?.demo_completed_at || null,
      converted_at: form.status === "gewonnen" && !lead?.converted_at ? new Date().toISOString() : lead?.converted_at || null,
    };

    let error;
    if (lead) {
      ({ error } = await supabase.from("funnel_leads").update(payload).eq("id", lead.id));
    } else {
      ({ error } = await supabase.from("funnel_leads").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success(lead ? "Lead aktualisiert" : "Lead erstellt");
      onOpenChange(false);
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    const { error } = await supabase.from("funnel_leads").delete().eq("id", lead.id);
    if (error) toast.error("Fehler: " + error.message);
    else {
      toast.success("Lead gelöscht");
      onOpenChange(false);
      onSaved();
    }
  };

  const slots = Array.isArray(lead?.preferred_slots) ? lead.preferred_slots : [];
  const contactHistory = Array.isArray(lead?.contact_history) ? lead.contact_history : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <DialogTitle>{isEditing ? "Lead bearbeiten" : "Neuer Lead"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="p-4 sm:p-6 pt-3 space-y-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">E-Mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Betrieb</Label>
                <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">PLZ</Label>
                <Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} />
              </div>
            </div>

            {/* Topic, Contact, Source, Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Thema</Label>
                <Select value={form.topic} onValueChange={v => setForm(f => ({ ...f, topic: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOPIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kontakt via</Label>
                <Select value={form.contact_preference} onValueChange={v => setForm(f => ({ ...f, contact_preference: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone"><span className="flex items-center gap-2"><Phone className="h-3 w-3" /> Telefon</span></SelectItem>
                    <SelectItem value="video"><span className="flex items-center gap-2"><Video className="h-3 w-3" /> Video / Zoom</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quelle</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2"><cfg.icon className="h-3 w-3" />{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes & Message */}
            <div>
              <Label className="text-xs">Interne Notizen</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            {/* Preferred Slots (read-only for existing leads) */}
            {slots.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-2"><Clock className="h-3 w-3" /> Wunschtermine</Label>
                  <div className="space-y-1">
                    {slots.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
                        <Calendar className="h-3.5 w-3.5 text-purple-500" />
                        <span>{s.day}, {s.date}</span>
                        <span className="text-muted-foreground">um {s.time} Uhr</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Original Message */}
            {lead?.message && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-1"><MessageSquare className="h-3 w-3" /> Nachricht des Interessenten</Label>
                  <p className="text-sm bg-muted/50 rounded p-3">{lead.message}</p>
                </div>
              </>
            )}

            {/* Quick Actions */}
            {isEditing && (lead?.email || lead?.phone) && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs mb-2 block">Schnellaktionen</Label>
                  <div className="flex flex-wrap gap-2">
                    {lead?.email && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${lead.email}`}><Mail className="h-3.5 w-3.5 mr-1" /> E-Mail</a>
                      </Button>
                    )}
                    {lead?.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${lead.phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Anrufen</a>
                      </Button>
                    )}
                    {lead?.contact_preference === "video" && (
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://zoom.us" target="_blank" rel="noopener noreferrer">
                          <Video className="h-3.5 w-3.5 mr-1" /> Zoom starten
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Timeline */}
            {isEditing && (
              <div className="flex flex-wrap gap-2 text-xs">
                {lead?.demo_booked_at && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    Demo: {format(new Date(lead.demo_booked_at), "dd.MM.yy")}
                  </Badge>
                )}
                {lead?.converted_at && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Konvertiert: {format(new Date(lead.converted_at), "dd.MM.yy")}
                  </Badge>
                )}
                {lead?.notification_sent_at && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                    Benachrichtigt: {format(new Date(lead.notification_sent_at), "dd.MM.yy HH:mm")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 sm:p-6 pt-0 flex gap-2">
          {isEditing && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
