import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, FileDown, Loader2, UserPlus } from "lucide-react";
import { getPartnerTypeConfig, PARTNER_TYPE_OPTIONS } from "@/lib/partnerTypes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InvitePartnerModal } from "@/components/horse-detail/InvitePartnerModal";
import { DemoFeatureHighlight } from "@/components/demo/DemoFeatureHighlight";
import type { PferdeakteUserRole } from "./types";

const THERAPY_FILTERS = [
  { value: "all", label: "Alle" },
  ...PARTNER_TYPE_OPTIONS.filter((o) =>
    ["tierarzt", "osteopath", "physiotherapeut", "chiropraktiker", "zahnarzt"].includes(o.value)
  ),
  { value: "other", label: "Sonstige" },
];

interface Props {
  horseId: string;
  horseName?: string;
  userRole: PferdeakteUserRole;
}

export function PferdeakteTherapie({ horseId, horseName, userRole }: Props) {
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { data: treatmentNotes, isLoading } = useQuery({
    queryKey: ["pferdeakte-therapy", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_treatment_notes")
        .select("*")
        .eq("horse_id", horseId)
        .is("deleted_at", null)
        .order("treatment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  const filtered = treatmentNotes?.filter((n: any) => {
    if (filter === "all") return true;
    return n.partner_type === filter;
  }) || [];

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-partner-report", {
        body: { horse_id: horseId },
      });
      if (error) throw error;
      if (data?.pdf_url) {
        window.open(data.pdf_url, "_blank");
      } else {
        toast.info(data?.message || "Bericht wird erstellt...");
      }
    } catch {
      toast.error("Fehler beim PDF-Export");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Chips + Invite Button */}
      <div className="flex items-center gap-2">
        <div className="flex overflow-x-auto gap-1.5 scrollbar-hide flex-1">
          {THERAPY_FILTERS.map((f) => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border",
                  isActive
                    ? "bg-purple-500/15 text-purple-600 border-purple-500/30"
                    : "text-muted-foreground border-border hover:bg-secondary"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {(userRole === "provider" || userRole === "client") && (
          <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Einladen</span>
          </Button>
        )}
      </div>

      {/* Treatment Notes */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground mb-1">Keine Therapie-Einträge</p>
            <p className="text-xs text-muted-foreground mb-3">Lade einen Fachpartner ein, um Befunde hier zu dokumentieren.</p>
            {(userRole === "provider" || userRole === "client") && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" />
                Fachpartner einladen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((note: any) => {
            const config = getPartnerTypeConfig(note.partner_type);
            return (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <config.icon className={`h-3 w-3 ${config.color}`} />
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.treatment_date || note.created_at).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{note.title}</p>
                  {note.findings && <p className="text-xs text-muted-foreground mt-1">{note.findings}</p>}
                  {note.treatment && (
                    <div className="mt-2 p-2 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Maßnahme</p>
                      <p className="text-xs text-foreground">{note.treatment}</p>
                    </div>
                  )}
                  {note.recommendations && (
                    <p className="text-xs text-primary mt-2">💡 {note.recommendations}</p>
                  )}
                  {note.follow_up_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nächster Termin: {new Date(note.follow_up_date).toLocaleDateString("de-DE")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PDF Export */}
      {filtered.length > 0 && (
        <Button variant="outline" onClick={handleExportPDF} disabled={exporting} className="w-full gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Therapie-Bericht als PDF
        </Button>
      )}

      {/* Partner Invite Modal */}
      <InvitePartnerModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        horseId={horseId}
        horseName={horseName || "Pferd"}
        inviterRole={userRole === "client" ? "client" : "provider"}
        onSent={() => setShowInvite(false)}
      />
    </div>
  );
}
