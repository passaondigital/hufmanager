import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";
import {
  CalendarIcon, Phone, Video, MessageSquare, HelpCircle,
  Presentation, Loader2, CheckCircle2, Clock, Plus, Trash2, Send
} from "lucide-react";

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TIMES = Array.from({ length: 20 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

const formSchema = z.object({
  full_name: z.string().trim().min(2, "Name ist zu kurz").max(100),
  email: z.string().trim().email("Ungültige E-Mail").max(255),
  phone: z.string().trim().optional(),
  company_name: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  topic: z.enum(["frage", "demo_1zu1", "beratung", "sonstiges"]),
  contact_preference: z.enum(["phone", "video"]),
  message: z.string().trim().max(2000).optional(),
});

interface TimeSlot {
  date: string;
  time: string;
  day: string;
}

export function PublicDemoRequestForm() {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", company_name: "",
    postal_code: "", topic: "demo_1zu1", contact_preference: "phone", message: "",
  });
  const [slots, setSlots] = useState<TimeSlot[]>([
    { date: "", time: "", day: "" },
    { date: "", time: "", day: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSlot = () => {
    if (slots.length < 4) setSlots(prev => [...prev, { date: "", time: "", day: "" }]);
  };

  const removeSlot = (index: number) => {
    if (slots.length > 2) setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleDateSelect = (index: number, date: Date | undefined) => {
    if (!date) return;
    const dayName = format(date, "EEEE", { locale: de });
    updateSlot(index, "date", format(date, "dd.MM.yyyy"));
    updateSlot(index, "day", dayName);
  };

  const handleSubmit = async () => {
    setErrors({});
    const validation = formSchema.safeParse(form);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }

    const validSlots = slots.filter(s => s.date && s.time);
    if (validSlots.length < 2) {
      toast.error("Bitte mindestens 2 Terminwünsche angeben");
      return;
    }

    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone || null,
      company_name: form.company_name || null,
      postal_code: form.postal_code || null,
      topic: form.topic,
      contact_preference: form.contact_preference,
      message: form.message || null,
      preferred_slots: JSON.parse(JSON.stringify(validSlots)),
      source: "website",
      status: "neu",
    };

    const { data, error } = await supabase.from("funnel_leads").insert([payload] as any).select().single();

    if (error) {
      toast.error(error.message.includes("Zu viele")
        ? "Zu viele Anfragen. Bitte versuchen Sie es später."
        : "Fehler beim Absenden. Bitte versuchen Sie es erneut.");
      setSaving(false);
      return;
    }

    // Trigger notification edge function
    try {
      await supabase.functions.invoke("funnel-lead-notify", {
        body: { lead: { ...payload, id: data?.id } },
      });
    } catch (e) {
      console.error("Notification failed:", e);
    }

    setSaving(false);
    setSubmitted(true);
    toast.success("Anfrage erfolgreich gesendet!");
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto border-green-500/30">
        <CardContent className="py-16 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          <h3 className="text-2xl font-bold">Vielen Dank für Ihre Anfrage!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Wir melden uns schnellstmöglich bei Ihnen – in der Regel innerhalb von 24 Stunden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          Demo & Kontakt
        </CardTitle>
        <CardDescription>
          Fordern Sie eine persönliche Vorführung an oder stellen Sie uns Ihre Fragen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Name *</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Max Mustermann" />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
          </div>
          <div>
            <Label>E-Mail *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="max@example.com" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+49 ..." />
          </div>
          <div>
            <Label>Betrieb / Stallname</Label>
            <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
          </div>
          <div>
            <Label>PLZ</Label>
            <Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="12345" />
          </div>
        </div>

        {/* Topic & Contact Preference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Thema *</Label>
            <Select value={form.topic} onValueChange={v => setForm(f => ({ ...f, topic: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo_1zu1">
                  <span className="flex items-center gap-2"><Presentation className="h-3.5 w-3.5" /> 1:1 Demo / Vorführung</span>
                </SelectItem>
                <SelectItem value="frage">
                  <span className="flex items-center gap-2"><HelpCircle className="h-3.5 w-3.5" /> Allgemeine Frage</span>
                </SelectItem>
                <SelectItem value="beratung">
                  <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> Beratungsgespräch</span>
                </SelectItem>
                <SelectItem value="sonstiges">
                  <span className="flex items-center gap-2"><HelpCircle className="h-3.5 w-3.5" /> Sonstiges</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kontakt via *</Label>
            <Select value={form.contact_preference} onValueChange={v => setForm(f => ({ ...f, contact_preference: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">
                  <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Telefonisch</span>
                </SelectItem>
                <SelectItem value="video">
                  <span className="flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Videocall / Zoom</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" />
            Wunschtermine (mind. 2) *
          </Label>
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap p-3 rounded-lg bg-muted/50 border">
                <span className="text-xs font-medium text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("min-w-[140px] justify-start text-left font-normal", !slot.date && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {slot.date || "Datum wählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={slot.date ? new Date(slot.date.split('.').reverse().join('-')) : undefined}
                      onSelect={(date) => handleDateSelect(i, date)}
                      disabled={(date) => date < new Date()}
                      locale={de}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Select value={slot.time} onValueChange={v => updateSlot(i, "time", v)}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Uhrzeit" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMES.map(t => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
                  </SelectContent>
                </Select>
                {slot.day && <span className="text-xs text-muted-foreground hidden sm:inline">{slot.day}</span>}
                {slots.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeSlot(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {slots.length < 4 && (
            <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={addSlot}>
              <Plus className="h-3.5 w-3.5" /> Weiteren Termin hinzufügen
            </Button>
          )}
        </div>

        {/* Message */}
        <div>
          <Label>Nachricht (optional)</Label>
          <Textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Haben Sie spezielle Wünsche oder Fragen?"
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={saving} className="w-full gap-2" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Anfrage absenden
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Mit dem Absenden stimmen Sie unserer Datenschutzerklärung zu.
        </p>
      </CardContent>
    </Card>
  );
}
