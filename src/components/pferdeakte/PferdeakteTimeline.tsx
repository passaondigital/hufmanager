import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, ChevronDown, ChevronUp, History, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { DemoFeatureHighlight } from "@/components/demo/DemoFeatureHighlight";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PFERDEAKTE_HELP } from "./pferdeakteHelpTexts";
import { DocumentViewer } from "./DocumentViewer";
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
      <DemoFeatureHighlight label="Multi-Dienstleister Timeline" delay={1000} />
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

function TimelineCard({ item }: { item: TimelineItem }) {
  const [expanded, setExpanded] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);

  const dotBg = item.type === "huf" ? "bg-primary" :
    item.type.startsWith("vet") ? "bg-blue-500" :
    item.type === "therapy" ? "bg-purple-500" :
    item.type.startsWith("owner") ? "bg-green-500" :
    "bg-muted-foreground";

  const raw = item.rawData;

  return (
    <div className="flex gap-3 relative">
      <div className={cn("h-[22px] w-[22px] rounded-full flex-shrink-0 flex items-center justify-center z-10", dotBg)}>
        <div className="h-2 w-2 rounded-full bg-background" />
      </div>

      <Card className="flex-1 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.badgeText}</Badge>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {!expanded && item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          {item.edid && (
            <span className="text-[10px] font-mono text-muted-foreground mt-1 inline-block">{item.edid}</span>
          )}

          {/* Collapsed photo thumbnails */}
          {!expanded && item.photos && item.photos.length > 0 && (
            <div className="flex gap-1 mt-2">
              {item.photos.slice(0, 4).map((url, i) => (
                <div key={i} className="h-9 w-9 rounded bg-muted overflow-hidden flex-shrink-0">
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
              {item.photos.length > 4 && (
                <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                  +{item.photos.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
              {/* Huf details */}
              {item.type === "huf" && raw && (
                <>
                  {raw.notes && <DetailRow label="Befund" value={raw.notes} />}
                  {raw.completion_notes && <DetailRow label="Dokumentation" value={raw.completion_notes} />}
                </>
              )}

              {/* Therapy details */}
              {item.type === "therapy" && raw && (
                <>
                  {raw.findings && <DetailRow label="Befund" value={raw.findings} />}
                  {raw.treatment && <DetailRow label="Behandlung" value={raw.treatment} />}
                  {raw.recommendations && <DetailRow label="Empfehlung" value={raw.recommendations} />}
                  {raw.next_treatment && <DetailRow label="Nächster Termin" value={raw.next_treatment} />}
                </>
              )}

              {/* Vaccination details */}
              {item.type === "vet_vaccination" && raw && (
                <>
                  {raw.batch_number && <DetailRow label="Charge" value={raw.batch_number} />}
                  {raw.administered_by && <DetailRow label="Tierarzt" value={raw.administered_by} />}
                  {raw.next_due_date && <DetailRow label="Nächste fällig" value={new Date(raw.next_due_date).toLocaleDateString("de-DE")} />}
                </>
              )}

              {/* Deworming details */}
              {item.type === "vet_deworming" && raw && (
                <>
                  {raw.active_substance && <DetailRow label="Wirkstoff" value={raw.active_substance} />}
                  {raw.fecal_egg_count != null && <DetailRow label="Kotprobe (EPG)" value={String(raw.fecal_egg_count)} />}
                </>
              )}

              {/* Owner notes */}
              {(item.type === "owner_note" || item.type === "owner_health") && raw && (
                <>
                  {raw.text && <DetailRow label="Inhalt" value={raw.text} />}
                  {raw.content && <DetailRow label="Inhalt" value={raw.content} />}
                  {raw.notes && <DetailRow label="Notizen" value={raw.notes} />}
                </>
              )}

              {/* Expanded photos */}
              {item.photos && item.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {item.photos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}
