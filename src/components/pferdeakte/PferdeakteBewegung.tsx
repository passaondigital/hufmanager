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
import { Bike, Plus, Trash2, Share2, X, Smile, Meh, Frown, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { PferdeakteUserRole } from "./types";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
}

const ACTIVITIES = ["Reiten", "Longieren", "Freilauf", "Spaziergang", "Paddock", "Weide", "Schwimmen", "Bodenarbeit"] as const;
const INTENSITIES = [
  { value: "leicht", label: "Leicht", color: "text-green-600" },
  { value: "mittel", label: "Mittel", color: "text-amber-600" },
  { value: "intensiv", label: "Intensiv", color: "text-red-600" },
] as const;
const MOODS = [
  { value: "super", label: "Super 🤩", icon: Smile },
  { value: "gut", label: "Gut 😊", icon: Smile },
  { value: "ok", label: "OK 😐", icon: Meh },
  { value: "unwillig", label: "Unwillig 😤", icon: Frown },
  { value: "lahm", label: "Lahm ⚠️", icon: Frown },
] as const;

interface ExerciseEntry {
  id: string;
  date: string;
  activity_type: string;
  duration_minutes: number | null;
  intensity: string | null;
  notes: string | null;
  mood: string | null;
  performed_by: string | null;
  shared_with_stall: boolean;
  created_at: string;
}

export function PferdeakteBewegung({ horseId, userRole }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    activity_type: "Reiten", duration_minutes: "", intensity: "mittel", mood: "", notes: "", performed_by: "",
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["horse-exercise-log", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_exercise_log")
        .select("*")
        .eq("horse_id", horseId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as ExerciseEntry[];
    },
    staleTime: 5 * 60_000,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("horse_exercise_log").insert({
        horse_id: horseId,
        created_by: user!.id,
        activity_type: form.activity_type,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        intensity: form.intensity || null,
        mood: form.mood || null,
        notes: form.notes || null,
        performed_by: form.performed_by || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-exercise-log", horseId] });
      setShowForm(false);
      setForm({ activity_type: "Reiten", duration_minutes: "", intensity: "mittel", mood: "", notes: "", performed_by: "" });
      toast.success("Bewegung eingetragen");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("horse_exercise_log").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-exercise-log", horseId] });
      toast.success("Entfernt");
    },
  });

  const canEdit = userRole === "owner" || userRole === "client";

  // Group by date
  const grouped = entries.reduce((acc, e) => {
    const key = e.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, ExerciseEntry[]>);

  const moodInfo = (m: string | null) => MOODS.find(x => x.value === m);
  const intensityInfo = (i: string | null) => INTENSITIES.find(x => x.value === i);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-foreground">Bewegungstagebuch</h3>
          <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Aktivität</Label>
                <Select value={form.activity_type} onValueChange={v => setForm(f => ({ ...f, activity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Dauer (Min.)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Intensität</Label>
                <Select value={form.intensity} onValueChange={v => setForm(f => ({ ...f, intensity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTENSITIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Stimmung</Label>
                <Select value={form.mood} onValueChange={v => setForm(f => ({ ...f, mood: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{MOODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ausgeführt von</Label>
                <Input value={form.performed_by} onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))} placeholder="Name" />
              </div>
              <div>
                <Label className="text-xs">Notizen</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              Eintragen
            </Button>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {format(new Date(date), "EEEE, dd. MMMM", { locale: de })}
          </p>
          <div className="space-y-2">
            {items.map(item => {
              const mi = moodInfo(item.mood);
              const ii = intensityInfo(item.intensity);
              return (
                <Card key={item.id} className="border-border/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{item.activity_type}</span>
                          {item.duration_minutes && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />{item.duration_minutes} Min
                            </Badge>
                          )}
                          {ii && <Badge variant="secondary" className={cn("text-xs", ii.color)}>{ii.label}</Badge>}
                          {mi && <span className="text-xs">{mi.label}</span>}
                        </div>
                        {item.performed_by && <p className="text-xs text-muted-foreground mt-0.5">von {item.performed_by}</p>}
                        {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{item.notes}</p>}
                      </div>
                      {canEdit && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {entries.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Bike className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Noch keine Einträge</p>
          {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Dokumentiere Bewegung und Aktivitäten</p>}
        </div>
      )}
    </div>
  );
}
