import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import type { PferdeakteUserRole, TimelineItem } from "./types";

const FILTER_CHIPS = [
  { value: "all", label: "Alle" },
  { value: "huf", label: "Huf", color: "text-primary" },
  { value: "vet", label: "Vet", color: "text-blue-500" },
  { value: "therapy", label: "Therapie", color: "text-purple-500" },
  { value: "owner", label: "Besitzer", color: "text-green-500" },
  { value: "document", label: "Dokumente", color: "text-muted-foreground" },
];

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
}

export function PferdeakteTimeline({ horseId, userRole }: Props) {
  const [activeFilters, setActiveFilters] = useState<string[]>(["all"]);
  const [limit, setLimit] = useState(20);

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ["pferdeakte-timeline", horseId, limit],
    queryFn: async () => {
      const [appts, partnerNotes, vaccinations, dewormings, healthLogs, diaryEntries, documents] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, date, status, notes, completion_notes, edid, provider_id, service_type")
          .eq("horse_id", horseId)
          .order("date", { ascending: false })
          .limit(limit),
        supabase
          .from("partner_treatment_notes")
          .select("id, partner_id, partner_type, title, findings, treatment, recommendations, treatment_date, visible_to_pid, created_at")
          .eq("horse_id", horseId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("horse_vaccinations")
          .select("id, vaccine_type, vaccine_name, vaccination_date, next_due_date, administered_by")
          .eq("horse_id", horseId)
          .order("vaccination_date", { ascending: false })
          .limit(limit),
        supabase
          .from("horse_deworming")
          .select("id, product_name, date, next_due_date, administered_by, method")
          .eq("horse_id", horseId)
          .order("date", { ascending: false })
          .limit(limit),
        supabase
          .from("horse_health_logs")
          .select("id, date, wellbeing_score, weight_kg, notes, created_by")
          .eq("horse_id", horseId)
          .order("date", { ascending: false })
          .limit(limit),
        supabase
          .from("horse_diary_entries")
          .select("id, category, title, content, photo_url, shared_with_provider, created_at")
          .eq("horse_id", horseId)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("horse_documents")
          .select("id, title, category, file_url, file_type, created_at")
          .eq("horse_id", horseId)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const items: TimelineItem[] = [];

      // Map appointments
      appts.data?.forEach((a: any) => {
        items.push({
          id: a.id,
          type: "huf",
          date: a.date,
          title: a.service_type || "Hufbearbeitung",
          description: (a.completion_notes || a.notes || "").substring(0, 150),
          personName: "",
          personRole: "provider",
          edid: a.edid,
          color: "hsl(var(--primary))",
          badgeText: "Hufbearbeitung",
          rawData: a,
        });
      });

      // Map partner notes
      partnerNotes.data?.forEach((n: any) => {
        const config = getPartnerTypeConfig(n.partner_type);
        items.push({
          id: n.id,
          type: "therapy",
          date: n.treatment_date || n.created_at,
          title: n.title || config.label,
          description: (n.findings || "").substring(0, 150),
          personName: "",
          personRole: "partner",
          color: "#a855f7",
          badgeText: config.label,
          rawData: n,
        });
      });

      // Map vaccinations
      vaccinations.data?.forEach((v: any) => {
        items.push({
          id: v.id,
          type: "vet_vaccination",
          date: v.vaccination_date,
          title: `${v.vaccine_type || "Impfung"}${v.vaccine_name ? ` – ${v.vaccine_name}` : ""}`,
          description: v.administered_by ? `Tierarzt: ${v.administered_by}` : "",
          personName: v.administered_by || "",
          personRole: "vet",
          color: "#3b82f6",
          badgeText: "Impfung",
          rawData: v,
        });
      });

      // Map dewormings
      dewormings.data?.forEach((d: any) => {
        items.push({
          id: d.id,
          type: "vet_deworming",
          date: d.date,
          title: d.product_name || "Entwurmung",
          description: [d.administered_by, d.method].filter(Boolean).join(" · "),
          personName: d.administered_by || "",
          personRole: "vet",
          color: "#3b82f6",
          badgeText: "Entwurmung",
          rawData: d,
        });
      });

      // Map health logs
      healthLogs.data?.forEach((h: any) => {
        items.push({
          id: h.id,
          type: "owner_health",
          date: h.date,
          title: `Wohlbefinden: ${h.wellbeing_score}/5${h.weight_kg ? ` · ${h.weight_kg}kg` : ""}`,
          description: (h.notes || "").substring(0, 150),
          personName: "",
          personRole: "owner",
          color: "#22c55e",
          badgeText: "Gesundheits-Log",
          rawData: h,
        });
      });

      // Map diary entries
      diaryEntries.data?.forEach((d: any) => {
        items.push({
          id: d.id,
          type: "owner_note",
          date: d.created_at,
          title: d.title || d.category || "Notiz",
          description: (d.content || "").substring(0, 150),
          personName: "",
          personRole: "owner",
          photos: d.photo_url ? [d.photo_url] : undefined,
          color: "#22c55e",
          badgeText: d.category || "Besitzer-Notiz",
          rawData: d,
        });
      });

      // Map documents
      documents.data?.forEach((doc: any) => {
        items.push({
          id: doc.id,
          type: "document",
          date: doc.created_at,
          title: doc.title || "Dokument",
          description: doc.category || "",
          personName: "",
          personRole: "",
          color: "#6b7280",
          badgeText: doc.category || "Dokument",
          rawData: doc,
        });
      });

      // Sort by date DESC
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items;
    },
    enabled: !!horseId,
  });

  const toggleFilter = (value: string) => {
    if (value === "all") {
      setActiveFilters(["all"]);
      return;
    }
    setActiveFilters((prev) => {
      const without = prev.filter((f) => f !== "all" && f !== value);
      if (prev.includes(value)) {
        return without.length === 0 ? ["all"] : without;
      }
      return [...without, value];
    });
  };

  const filteredItems = useMemo(() => {
    if (!timelineData) return [];
    if (activeFilters.includes("all")) return timelineData;
    return timelineData.filter((item) => {
      if (activeFilters.includes("huf") && item.type === "huf") return true;
      if (activeFilters.includes("vet") && (item.type === "vet_vaccination" || item.type === "vet_deworming" || item.type === "vet_check")) return true;
      if (activeFilters.includes("therapy") && item.type === "therapy") return true;
      if (activeFilters.includes("owner") && (item.type === "owner_note" || item.type === "owner_health")) return true;
      if (activeFilters.includes("document") && item.type === "document") return true;
      return false;
    });
  }, [timelineData, activeFilters]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Chips */}
      <div className="flex overflow-x-auto gap-1.5 scrollbar-hide">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilters.includes(chip.value);
          return (
            <button
              key={chip.value}
              onClick={() => toggleFilter(chip.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border",
                isActive
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "text-muted-foreground border-border hover:bg-secondary"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground mb-1">Noch keine Einträge</p>
            <p className="text-xs text-muted-foreground">Der erste Termin erstellt den Beginn der Pferdeakte.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline Rail */}
          <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />

          <div className="space-y-3">
            {filteredItems.map((item) => (
              <TimelineCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>

          {/* Load More */}
          {filteredItems.length >= limit && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 20)} className="gap-1 min-h-[44px]">
                <ChevronDown className="h-4 w-4" />
                Weitere Einträge laden
              </Button>
            </div>
          )}

          {filteredItems.length > 0 && filteredItems.length < limit && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Akte beginnt am {new Date(filteredItems[filteredItems.length - 1].date).toLocaleDateString("de-DE")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
