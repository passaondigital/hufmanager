import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Heart, Plus, TrendingUp, Star } from "lucide-react";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";

interface HealthLog {
  id: string;
  date: string;
  wellbeing: number;
  weight: number | null;
  hoof_rating: number | null;
  temperament: string | null;
  ate_normally: boolean | null;
  notes: string | null;
  shared_with_provider: boolean;
  created_at: string;
}

interface HorseHealthTrackerProps {
  horseId: string;
}

const WELLBEING_OPTIONS = [
  { value: 1, emoji: "🟢", label: "Alles gut" },
  { value: 2, emoji: "🟡", label: "Etwas auffällig" },
  { value: 3, emoji: "🔴", label: "Braucht Aufmerksamkeit" },
];

const TEMPERAMENT_OPTIONS = [
  { value: "ruhig", label: "Ruhig 😌" },
  { value: "normal", label: "Normal 🙂" },
  { value: "unruhig", label: "Unruhig 😬" },
];

export function HorseHealthTracker({ horseId }: HorseHealthTrackerProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareWithProvider, setShareWithProvider] = useState(false);

  // Form state
  const [wellbeing, setWellbeing] = useState(1);
  const [weight, setWeight] = useState("");
  const [hoofRating, setHoofRating] = useState(0);
  const [temperament, setTemperament] = useState("");
  const [ateNormally, setAteNormally] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("horse_health_logs")
      .select("*")
      .eq("horse_id", horseId)
      .order("date", { ascending: false })
      .limit(30);

    setLogs((data as HealthLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [horseId]);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("horse_health_logs").insert({
      horse_id: horseId,
      owner_id: user.id,
      wellbeing,
      weight: weight ? parseFloat(weight) : null,
      hoof_rating: hoofRating || null,
      temperament: temperament || null,
      ate_normally: ateNormally,
      notes: notes || null,
      shared_with_provider: shareWithProvider,
    });

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Check-in gespeichert! 🌟");
      resetForm();
      fetchLogs();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setWellbeing(1);
    setWeight("");
    setHoofRating(0);
    setTemperament("");
    setAteNormally(null);
    setNotes("");
  };

  // Stats
  const last30 = logs.filter((l) => new Date(l.date) >= subDays(new Date(), 30));
  const goodDays = last30.filter((l) => l.wellbeing === 1).length;
  const todayLog = logs.find((l) => l.date === format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-semibold">Wohlbefinden</span>
            </div>
            {todayLog ? (
              <Badge variant="secondary" className="text-xs">
                Heute: {WELLBEING_OPTIONS.find((o) => o.value === todayLog.wellbeing)?.emoji}
              </Badge>
            ) : (
              <Button size="sm" variant="default" className="gap-1" onClick={() => setShowForm(true)}>
                <Plus className="h-3.5 w-3.5" />
                Check-in
              </Button>
            )}
          </div>

          {/* 30-day visualization */}
          {last30.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-[2px] flex-wrap">
                {Array.from({ length: 30 }, (_, i) => {
                  const date = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
                  const log = last30.find((l) => l.date === date);
                  const color = !log
                    ? "bg-muted"
                    : log.wellbeing === 1
                    ? "bg-green-500"
                    : log.wellbeing === 2
                    ? "bg-amber-500"
                    : "bg-red-500";
                  return (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-sm ${color}`}
                      title={`${format(subDays(new Date(), 29 - i), "dd.MM.", { locale: de })}${log ? ` — ${WELLBEING_OPTIONS.find((o) => o.value === log.wellbeing)?.label}` : ""}`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Dein Pferd hatte in den letzten 30 Tagen an {goodDays} Tagen einen guten Tag 🌟
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tägliches Check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wellbeing - 5 second check */}
            <div>
              <Label className="text-sm mb-2 block">Wie geht es deinem Pferd?</Label>
              <div className="grid grid-cols-3 gap-2">
                {WELLBEING_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={wellbeing === opt.value ? "default" : "outline"}
                    className="h-16 flex-col gap-1"
                    onClick={() => setWellbeing(opt.value)}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-[10px]">{opt.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Temperament */}
            <div>
              <Label className="text-sm mb-2 block">Temperament heute</Label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPERAMENT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={temperament === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTemperament(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ate normally */}
            <div>
              <Label className="text-sm mb-2 block">Futter normal gefressen?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={ateNormally === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAteNormally(true)}
                >
                  ✅ Ja
                </Button>
                <Button
                  variant={ateNormally === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAteNormally(false)}
                >
                  ❌ Nein
                </Button>
              </div>
            </div>

            {/* Hoof rating */}
            <div>
              <Label className="text-sm mb-2 block">Hufzustand (deine Einschätzung)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <Button
                    key={val}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setHoofRating(val)}
                  >
                    <Star
                      className={`h-5 w-5 ${val <= hoofRating ? "text-primary fill-primary" : "text-muted-foreground"}`}
                    />
                  </Button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div>
              <Label className="text-sm mb-1">Gewicht (kg, optional)</Label>
              <Input
                type="number"
                placeholder="z.B. 520"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="text-base"
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm mb-1">Besonderheiten (optional)</Label>
              <Textarea
                placeholder="Was fällt dir auf?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-base"
              />
            </div>

            {/* Share toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Mit Hufpfleger teilen</p>
                <p className="text-xs text-muted-foreground">Dein Hufpfleger sieht den Eintrag</p>
              </div>
              <Switch checked={shareWithProvider} onCheckedChange={setShareWithProvider} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>
                Abbrechen
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? "Speichern..." : "Speichern ✨"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent logs */}
      {logs.length > 0 && !showForm && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Letzte Einträge</h3>
          {logs.slice(0, 7).map((log) => (
            <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <span className="text-lg">
                {WELLBEING_OPTIONS.find((o) => o.value === log.wellbeing)?.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {format(new Date(log.date), "EEEE, dd. MMM", { locale: de })}
                </p>
                {log.notes && (
                  <p className="text-xs text-muted-foreground truncate">{log.notes}</p>
                )}
              </div>
              {log.shared_with_provider && (
                <Badge variant="secondary" className="text-[9px]">geteilt</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
