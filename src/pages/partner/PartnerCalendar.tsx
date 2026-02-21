import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, Clock, MapPin, ChevronLeft, ChevronRight, Loader2, Check, X as XIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  planned: { label: "Geplant", variant: "secondary" },
  requested: { label: "Angefragt", variant: "outline" },
  confirmed: { label: "Bestätigt", variant: "default" },
  completed: { label: "Erledigt", variant: "secondary" },
  cancelled: { label: "Storniert", variant: "destructive" },
  no_show: { label: "Nicht erschienen", variant: "destructive" },
};

export default function PartnerCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newApt, setNewApt] = useState({ title: "", horse_id: "", appointment_date: "", appointment_time: "", duration: "60", notes: "", location: "", price: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["partner-calendar", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_appointments")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .gte("appointment_date", format(calStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(calEnd, "yyyy-MM-dd"))
        .order("appointment_date")
        .order("appointment_time");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: horses = [] } = useQuery({
    queryKey: ["partner-horses-for-calendar", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses:horse_id (id, name)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((d: any) => d.horses).filter(Boolean);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_appointments").insert({
        partner_id: user!.id,
        horse_id: newApt.horse_id,
        title: newApt.title,
        appointment_date: newApt.appointment_date,
        appointment_time: newApt.appointment_time || null,
        duration: newApt.duration ? parseInt(newApt.duration) : null,
        notes: newApt.notes || null,
        location: newApt.location || null,
        price: newApt.price ? parseFloat(newApt.price) : null,
        status: "planned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Termin erstellt");
      queryClient.invalidateQueries({ queryKey: ["partner-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["partner-upcoming-appointments"] });
      setCreateOpen(false);
      setNewApt({ title: "", horse_id: "", appointment_date: "", appointment_time: "", duration: "60", notes: "", location: "", price: "" });
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
      const { error } = await supabase.from("partner_appointments").update(updates).eq("id", id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["partner-calendar"] });
    },
  });

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a: any) => isSameDay(new Date(a.appointment_date), day));

  const selectedDayAppts = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const handleCreateClick = () => {
    setNewApt(prev => ({
      ...prev,
      appointment_date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    }));
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="h-4 w-4" /> Neuer Termin
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                {format(currentMonth, "MMMM yyyy", { locale: de })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {days.map(day => {
                const dayAppts = getAppointmentsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative p-2 h-16 md:h-20 text-sm rounded-lg transition-colors text-left
                      ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/40" : "text-foreground"}
                      ${isToday(day) ? "bg-primary/10 font-bold" : ""}
                      ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}
                    `}
                  >
                    <span className="text-xs">{format(day, "d")}</span>
                    {dayAppts.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap">
                        {dayAppts.slice(0, 3).map((a: any) => (
                          <div key={a.id} className={`h-1.5 w-1.5 rounded-full ${a.status === "completed" ? "bg-muted-foreground" : a.status === "confirmed" ? "bg-primary" : "bg-primary/50"}`} />
                        ))}
                        {dayAppts.length > 3 && <span className="text-[8px] text-muted-foreground">+{dayAppts.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate ? format(selectedDate, "EEEE, dd. MMMM", { locale: de }) : "Tag auswählen"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">Klicke auf einen Tag im Kalender</p>
            ) : selectedDayAppts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleCreateClick}>
                  <Plus className="h-3 w-3 mr-1" /> Termin erstellen
                </Button>
              </div>
            ) : (
              selectedDayAppts.map((apt: any) => {
                const statusInfo = STATUS_LABELS[apt.status] || STATUS_LABELS.planned;
                return (
                  <div key={apt.id} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{apt.title}</p>
                        <p className="text-xs text-muted-foreground">🐴 {apt.horses?.name}</p>
                      </div>
                      <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                    </div>
                    {apt.appointment_time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {apt.appointment_time.substring(0, 5)}
                        {apt.duration && ` · ${apt.duration} Min.`}
                      </div>
                    )}
                    {apt.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {apt.location}
                      </div>
                    )}
                    {apt.status === "planned" && (
                      <div className="flex gap-1.5 pt-1">
                        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: apt.id, status: "confirmed" })}>
                          <Check className="h-3 w-3 mr-1" /> Bestätigen
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: apt.id, status: "completed" })}>
                          Erledigt
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateStatus.mutate({ id: apt.id, status: "cancelled" })}>
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {apt.status === "confirmed" && (
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: apt.id, status: "completed" })}>
                        Als erledigt markieren
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Termin</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input value={newApt.title} onChange={e => setNewApt(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Osteopathie-Sitzung" required />
            </div>
            <div>
              <Label>Pferd *</Label>
              <Select value={newApt.horse_id} onValueChange={v => setNewApt(p => ({ ...p, horse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pferd auswählen" /></SelectTrigger>
                <SelectContent>
                  {horses.map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>🐴 {h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Datum *</Label>
                <Input type="date" value={newApt.appointment_date} onChange={e => setNewApt(p => ({ ...p, appointment_date: e.target.value }))} required />
              </div>
              <div>
                <Label>Uhrzeit</Label>
                <Input type="time" value={newApt.appointment_time} onChange={e => setNewApt(p => ({ ...p, appointment_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dauer (Min.)</Label>
                <Input type="number" value={newApt.duration} onChange={e => setNewApt(p => ({ ...p, duration: e.target.value }))} />
              </div>
              <div>
                <Label>Preis (€)</Label>
                <Input type="number" step="0.01" value={newApt.price} onChange={e => setNewApt(p => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Ort</Label>
              <Input value={newApt.location} onChange={e => setNewApt(p => ({ ...p, location: e.target.value }))} placeholder="z.B. Stall Müller" />
            </div>
            <div>
              <Label>Notizen</Label>
              <Textarea value={newApt.notes} onChange={e => setNewApt(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={createMutation.isPending || !newApt.title || !newApt.horse_id || !newApt.appointment_date}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
