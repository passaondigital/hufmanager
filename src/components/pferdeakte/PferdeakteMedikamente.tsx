import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Plus, Trash2, Bell, CheckCircle, AlertTriangle, X, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import type { PferdeakteUserRole } from "./types";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
}

const MED_TYPES = ["Entwurmung", "Impfung", "Medikament", "Supplement", "Zahnarzt", "Osteo", "Sonstiges"] as const;
const FREQUENCIES = [
  { value: "einmalig", label: "Einmalig" },
  { value: "täglich", label: "Täglich" },
  { value: "wöchentlich", label: "Wöchentlich" },
  { value: "monatlich", label: "Monatlich" },
  { value: "quartalsweise", label: "Alle 3 Monate" },
  { value: "halbjährlich", label: "Alle 6 Monate" },
  { value: "jährlich", label: "Jährlich" },
] as const;

interface MedReminder {
  id: string;
  medication_type: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  next_due_date: string | null;
  last_given_date: string | null;
  notes: string | null;
  is_active: boolean;
  reminder_days_before: number;
}

export function PferdeakteMedikamente({ horseId, userRole }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    medication_type: "Entwurmung", medication_name: "", dosage: "", frequency: "quartalsweise",
    start_date: new Date().toISOString().split("T")[0], next_due_date: "", notes: "",
  });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["horse-medication-reminders", horseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("horse_medication_reminders")
        .select("*")
        .eq("horse_id", horseId)
        .is("deleted_at", null)
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as MedReminder[];
    },
    staleTime: 5 * 60_000,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("horse_medication_reminders").insert({
        horse_id: horseId,
        created_by: user!.id,
        medication_type: form.medication_type,
        medication_name: form.medication_name,
        dosage: form.dosage || null,
        frequency: form.frequency,
        start_date: form.start_date,
        next_due_date: form.next_due_date || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-medication-reminders", horseId] });
      setShowForm(false);
      setForm({ medication_type: "Entwurmung", medication_name: "", dosage: "", frequency: "quartalsweise", start_date: new Date().toISOString().split("T")[0], next_due_date: "", notes: "" });
      toast.success("Erinnerung erstellt");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const markGiven = useMutation({
    mutationFn: async (id: string) => {
      const today = new Date().toISOString().split("T")[0];
      const item = reminders.find(r => r.id === id);
      const updates: Record<string, unknown> = { last_given_date: today };

      // Advance next_due_date based on frequency
      if (item?.frequency && item.frequency !== "einmalig") {
        const nextDate = new Date();
        switch (item.frequency) {
          case "täglich": nextDate.setDate(nextDate.getDate() + 1); break;
          case "wöchentlich": nextDate.setDate(nextDate.getDate() + 7); break;
          case "monatlich": nextDate.setMonth(nextDate.getMonth() + 1); break;
          case "quartalsweise": nextDate.setMonth(nextDate.getMonth() + 3); break;
          case "halbjährlich": nextDate.setMonth(nextDate.getMonth() + 6); break;
          case "jährlich": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }
        updates.next_due_date = nextDate.toISOString().split("T")[0];
      }

      const { error } = await (supabase as any).from("horse_medication_reminders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-medication-reminders", horseId] });
      toast.success("Als gegeben markiert ✓");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("horse_medication_reminders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-medication-reminders", horseId] });
      toast.success("Entfernt");
    },
  });

  const canEdit = userRole === "client" || userRole === "provider";

  const active = reminders.filter(r => r.is_active);
  const overdue = active.filter(r => r.next_due_date && new Date(r.next_due_date) < new Date());
  const upcoming = active.filter(r => r.next_due_date && new Date(r.next_due_date) >= new Date() && differenceInDays(new Date(r.next_due_date), new Date()) <= 14);

  const getDueStatus = (r: MedReminder) => {
    if (!r.next_due_date) return "none";
    const days = differenceInDays(new Date(r.next_due_date), new Date());
    if (days < 0) return "overdue";
    if (days <= 7) return "soon";
    if (days <= 14) return "upcoming";
    return "ok";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Medikamente & Erinnerungen</h3>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive font-medium">{overdue.length} überfällig!</span>
        </div>
      )}
      {upcoming.length > 0 && overdue.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Bell className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-medium" style={{ color: "hsl(var(--accent-foreground))" }}>{upcoming.length} demnächst fällig</span>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Typ</Label>
                <Select value={form.medication_type} onValueChange={v => setForm(f => ({ ...f, medication_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MED_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Name / Präparat</Label>
                <Input value={form.medication_name} onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))} placeholder="z.B. Equimax" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Dosierung</Label>
                <Input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <Label className="text-xs">Häufigkeit</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nächstes Datum</Label>
                <Input type="date" value={form.next_due_date} onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notizen</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={!form.medication_name || addMutation.isPending}>
              Erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {active.map(item => {
          const status = getDueStatus(item);
          return (
            <Card key={item.id} className={cn("border-border/50", status === "overdue" && "border-destructive/30 bg-destructive/5", status === "soon" && "border-amber-500/30")}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    status === "overdue" ? "bg-destructive/10" : status === "soon" ? "bg-amber-500/10" : "bg-primary/10"
                  )}>
                    {status === "overdue" ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
                     status === "soon" ? <Bell className="h-4 w-4 text-amber-600" /> :
                     <Pill className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{item.medication_name}</span>
                      <Badge variant="secondary" className="text-xs">{item.medication_type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {item.dosage && <span>{item.dosage}</span>}
                      {item.frequency && <span>· {FREQUENCIES.find(f => f.value === item.frequency)?.label}</span>}
                    </div>
                    {item.next_due_date && (
                      <p className={cn("text-xs mt-0.5", status === "overdue" ? "text-destructive font-medium" : status === "soon" ? "text-amber-600" : "text-muted-foreground")}>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Fällig: {format(new Date(item.next_due_date), "dd.MM.yyyy", { locale: de })}
                        {status === "overdue" && ` (${Math.abs(differenceInDays(new Date(item.next_due_date), new Date()))} Tage überfällig)`}
                      </p>
                    )}
                    {item.last_given_date && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Zuletzt: {format(new Date(item.last_given_date), "dd.MM.yyyy", { locale: de })}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => markGiven.mutate(item.id)} title="Als gegeben markieren">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Pill className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Keine aktiven Erinnerungen</p>
          {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Entwurmung, Impfungen und Medikamente tracken</p>}
        </div>
      )}
    </div>
  );
}
