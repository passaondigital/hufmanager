import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Bell, Footprints, Stethoscope, Activity, FileText, Camera, Clock, CheckCircle } from "lucide-react";
import type { PferdeakteUserRole } from "./types";
import type { Horse } from "@/components/horse-detail/types";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
  horse?: any;
  onTabChange?: (tab: string) => void;
}

export function PferdeakteStart({ horseId, userRole, horse, onTabChange }: Props) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Fetch news since last visit
  const { data: newsSinceLastVisit } = useQuery({
    queryKey: ["pferdeakte-news", horseId, currentUserId, userRole],
    queryFn: async () => {
      if (!currentUserId) return { items: [], lastVisitDate: null };

      // Get last own entry date based on role
      let lastVisitDate: string | null = null;

      if (userRole === "provider") {
        const { data } = await supabase
          .from("appointments")
          .select("date")
          .eq("horse_id", horseId)
          .eq("provider_id", currentUserId)
          .order("date", { ascending: false })
          .limit(1);
        lastVisitDate = data?.[0]?.date || null;
      } else if (userRole === "partner") {
        const { data } = await supabase
          .from("partner_treatment_notes")
          .select("created_at")
          .eq("horse_id", horseId)
          .eq("partner_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1);
        lastVisitDate = data?.[0]?.created_at || null;
      } else if (userRole === "client") {
        const { data } = await supabase
          .from("horse_diary_entries")
          .select("created_at")
          .eq("horse_id", horseId)
          .eq("created_by", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1);
        lastVisitDate = data?.[0]?.created_at || null;
      }

      if (!lastVisitDate) return { items: [], lastVisitDate: null };

      // Fetch entries after that date
      const [appts, notes, health, diary] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, date, service_type, notes, provider_id")
          .eq("horse_id", horseId)
          .gt("date", lastVisitDate)
          .neq("provider_id", currentUserId)
          .order("date", { ascending: false })
          .limit(10),
        supabase
          .from("partner_treatment_notes")
          .select("id, title, partner_type, treatment_date, visible_to_pid, created_at")
          .eq("horse_id", horseId)
          .gt("created_at", lastVisitDate)
          .neq("partner_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("horse_health_logs")
          .select("id, date, wellbeing_score, notes, created_by")
          .eq("horse_id", horseId)
          .gt("date", lastVisitDate)
          .order("date", { ascending: false })
          .limit(10),
        supabase
          .from("horse_diary_entries")
          .select("id, title, category, created_at, shared_with_provider")
          .eq("horse_id", horseId)
          .gt("created_at", lastVisitDate)
          .neq("created_by", currentUserId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const items: { type: string; title: string; date: string; color: string; highlight?: boolean }[] = [];

      appts.data?.forEach((a: any) => {
        items.push({ type: "huf", title: a.service_type || "Hufbearbeitung", date: a.date, color: "text-primary" });
      });
      notes.data?.forEach((n: any) => {
        items.push({
          type: "therapy",
          title: n.title || "Behandlung",
          date: n.treatment_date || n.created_at,
          color: "text-purple-500",
          highlight: n.visible_to_pid,
        });
      });
      health.data?.forEach((h: any) => {
        items.push({ type: "health", title: `Wohlbefinden: ${h.wellbeing_score}/5`, date: h.date, color: "text-green-500" });
      });
      diary.data?.forEach((d: any) => {
        if (d.shared_with_provider || userRole === "client") {
          items.push({ type: "diary", title: d.title || d.category, date: d.created_at, color: "text-green-500" });
        }
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { items: items.slice(0, 8), lastVisitDate };
    },
    enabled: !!horseId && !!currentUserId,
  });

  // Fetch reminders
  const { data: reminders } = useQuery({
    queryKey: ["pferdeakte-reminders", horseId],
    queryFn: async () => {
      const now = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [appts, vaccs, followups] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, date, service_type, status")
          .eq("horse_id", horseId)
          .in("status", ["scheduled", "planned", "confirmed"])
          .gte("date", now.toISOString().split("T")[0])
          .lte("date", in30Days)
          .order("date", { ascending: true }),
        supabase
          .from("horse_vaccinations")
          .select("id, vaccine_type, next_due_date")
          .eq("horse_id", horseId)
          .not("next_due_date", "is", null)
          .lte("next_due_date", in30Days)
          .order("next_due_date", { ascending: true }),
        supabase
          .from("partner_treatment_notes")
          .select("id, title, partner_type, follow_up_date")
          .eq("horse_id", horseId)
          .not("follow_up_date", "is", null)
          .gte("follow_up_date", now.toISOString().split("T")[0])
          .order("follow_up_date", { ascending: true }),
      ]);

      const items: { id: string; what: string; when: string; urgency: "overdue" | "soon" | "planned"; type: string }[] = [];
      const today = now.getTime();
      const in14Days = today + 14 * 24 * 60 * 60 * 1000;

      appts.data?.forEach((a: any) => {
        const d = new Date(a.date).getTime();
        items.push({
          id: a.id,
          what: a.service_type || "Termin",
          when: a.date,
          urgency: d < today ? "overdue" : d < in14Days ? "soon" : "planned",
          type: "appointment",
        });
      });

      vaccs.data?.forEach((v: any) => {
        const d = new Date(v.next_due_date).getTime();
        items.push({
          id: v.id,
          what: `${v.vaccine_type} Impfung`,
          when: v.next_due_date,
          urgency: d < today ? "overdue" : d < in14Days ? "soon" : "planned",
          type: "vaccination",
        });
      });

      followups.data?.forEach((f: any) => {
        const d = new Date(f.follow_up_date).getTime();
        items.push({
          id: f.id,
          what: f.title || "Nachuntersuchung",
          when: f.follow_up_date,
          urgency: d < today ? "overdue" : d < in14Days ? "soon" : "planned",
          type: "followup",
        });
      });

      items.sort((a, b) => {
        const order = { overdue: 0, soon: 1, planned: 2 };
        return order[a.urgency] - order[b.urgency] || new Date(a.when).getTime() - new Date(b.when).getTime();
      });

      return items;
    },
    enabled: !!horseId,
  });

  const newsItems = newsSinceLastVisit?.items || [];

  return (
    <div className="space-y-6">
      {/* News Since Last Visit */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border bg-muted/30">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Seit deinem letzten Besuch</span>
          {newsItems.length > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">{newsItems.length}</Badge>
          )}
        </div>
        <div className="p-4">
          {newsItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Keine Neuigkeiten seit deinem letzten Besuch ✓
            </div>
          ) : (
            <div className="space-y-2">
              {newsItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    item.type === "huf" ? "bg-primary" :
                    item.type === "therapy" ? "bg-purple-500" :
                    "bg-green-500"
                  }`} />
                  <span className={`flex-1 truncate ${item.highlight ? "text-primary font-medium" : "text-foreground"}`}>
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(item.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground mt-2">
                Lesezeit: ~{Math.max(5, newsItems.length * 5)} Sekunden
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reminders */}
      {reminders && reminders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Erinnerungen</p>
          {reminders.map((r) => {
            const borderColor = r.urgency === "overdue" ? "border-l-red-500" : r.urgency === "soon" ? "border-l-amber-500" : "border-l-purple-500";
            const dotColor = r.urgency === "overdue" ? "bg-red-500" : r.urgency === "soon" ? "bg-amber-500" : "bg-purple-500";
            const daysUntil = Math.ceil((new Date(r.when).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const whenLabel = daysUntil < 0 ? `${Math.abs(daysUntil)} Tage überfällig` :
              daysUntil === 0 ? "Heute" : daysUntil === 1 ? "Morgen" : `In ${daysUntil} Tagen`;

            return (
              <Card key={r.id} className={`border-l-4 ${borderColor}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.what}</p>
                    <p className="text-xs text-muted-foreground">
                      {whenLabel} · {new Date(r.when).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 gap-3">
        <QuickTile icon={<Footprints className="h-5 w-5" />} label="Huf" onClick={() => onTabChange?.("huf")} />
        <QuickTile icon={<Stethoscope className="h-5 w-5" />} label="Tierarzt" onClick={() => onTabChange?.("vet")} />
        <QuickTile icon={<Activity className="h-5 w-5" />} label="Therapie" onClick={() => onTabChange?.("therapie")} />
        <QuickTile icon={<FileText className="h-5 w-5" />} label="Berichte" onClick={() => onTabChange?.("berichte")} />
      </div>

      {/* Stammdaten Summary */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Stammdaten</p>
          {horse?.chip_number && <StammdatenRow label="Chip-Nr." value={horse.chip_number} />}
          {(horse as any)?.ueln && <StammdatenRow label="Lebensnr." value={(horse as any).ueln} />}
          {(horse as any)?.passport_number && <StammdatenRow label="Passnr." value={(horse as any).passport_number} />}
          {horse?.readable_id && <StammdatenRow label="#EQID" value={`#${horse.readable_id}`} mono />}
          {(horse as any)?.insurance_company && (
            <StammdatenRow label="Versicherung" value={`${(horse as any).insurance_company}${(horse as any).insurance_type ? ` (${(horse as any).insurance_type})` : ""}`} highlight />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

function StammdatenRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? "font-mono text-xs" : ""} ${highlight ? "text-primary font-medium" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
