import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COMPLETENESS_FIELDS = [
  "name", "breed", "gender", "birth_year",
  "chip_number", "passport_number", "contacts", "insurance_company",
] as const;

function calcScore(horse: any): number {
  let filled = 0;
  for (const f of COMPLETENESS_FIELDS) {
    if (f === "contacts") {
      if (horse.contacts && typeof horse.contacts === "object" && Object.keys(horse.contacts).length > 0) filled++;
    } else if (horse[f]) filled++;
  }
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

function MiniRing({ percent, size = 28 }: { percent: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percent / 100);
  const color = percent >= 80 ? "stroke-green-500" : percent >= 50 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={2} className="stroke-muted" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={2}
        className={color}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[7px] font-bold">
        {percent}
      </text>
    </svg>
  );
}

export function RecentPferdeakten() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: horses, isLoading } = useQuery({
    queryKey: ["recent-pferdeakten", user?.id],
    queryFn: async () => {
      // Get last 5 distinct horses from completed appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("horse_id, date")
        .eq("provider_id", user!.id)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(20);

      if (!appts?.length) return [];

      const seen = new Set<string>();
      const uniqueIds: string[] = [];
      for (const a of appts) {
        if (!seen.has(a.horse_id) && uniqueIds.length < 5) {
          seen.add(a.horse_id);
          uniqueIds.push(a.horse_id);
        }
      }

      const { data: horseData } = await supabase
        .from("horses")
        .select("id, name, photo_url, breed, gender, birth_year, chip_number, passport_number, contacts, insurance_company")
        .in("id", uniqueIds)
        .is("deleted_at", null);

      // Map with date
      const dateMap = new Map(appts.map(a => [a.horse_id, a.date]));
      return (horseData || []).map(h => ({
        ...h,
        lastDate: dateMap.get(h.id),
        score: calcScore(h),
      })).sort((a, b) => (b.lastDate || "").localeCompare(a.lastDate || ""));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-28 rounded-xl flex-shrink-0" />)}
      </div>
    );
  }

  if (!horses?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Letzte Pferdeakten</p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {horses.map((h) => (
          <button
            key={h.id}
            onClick={() => navigate(`/pferd/${h.id}?tab=pferdeakte`)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors flex-shrink-0 min-w-[100px]"
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={h.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {h.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <MiniRing percent={h.score} size={20} />
              </div>
            </div>
            <span className="text-xs font-medium text-foreground truncate max-w-[80px]">{h.name}</span>
            {h.lastDate && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(h.lastDate).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export { MiniRing };
