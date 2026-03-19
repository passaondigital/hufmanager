import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Syringe, CheckCircle, AlertTriangle, Clock, FileDown, ImagePlus } from "lucide-react";
import { TabImpfungEntwurmung } from "@/components/horse-detail/TabImpfungEntwurmung";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PFERDEAKTE_HELP } from "./pferdeakteHelpTexts";
import { XrayUpload } from "./XrayUpload";
import { toast } from "sonner";
import type { PferdeakteUserRole } from "./types";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
}

export function PferdeakteVet({ horseId, userRole }: Props) {
  const [showXrayUpload, setShowXrayUpload] = useState(false);
  // Fetch vaccination status summary
  const { data: vaccStatus } = useQuery({
    queryKey: ["pferdeakte-vacc-status", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_vaccinations")
        .select("vaccine_type, vaccination_date, next_due_date")
        .eq("horse_id", horseId)
        .order("vaccination_date", { ascending: false });
      if (error) throw error;

      // Group by vaccine type - latest per type
      const byType = new Map<string, { type: string; lastDate: string; nextDue: string | null; status: "current" | "due" | "overdue" }>();
      const now = new Date();

      data?.forEach((v: any) => {
        if (!byType.has(v.vaccine_type)) {
          let status: "current" | "due" | "overdue" = "current";
          if (v.next_due_date) {
            const due = new Date(v.next_due_date);
            if (due < now) status = "overdue";
            else if (due < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) status = "due";
          }
          byType.set(v.vaccine_type, {
            type: v.vaccine_type,
            lastDate: v.vaccination_date,
            nextDue: v.next_due_date,
            status,
          });
        }
      });

      return Array.from(byType.values());
    },
    enabled: !!horseId,
  });

  const statusIcon = {
    current: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
    due: <Clock className="h-3.5 w-3.5 text-amber-500" />,
    overdue: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  };

  const statusLabel = {
    current: "Aktuell",
    due: "Fällig",
    overdue: "Überfällig",
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      {vaccStatus && vaccStatus.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Syringe className="h-4 w-4 text-blue-500" />
              Impfstatus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vaccStatus.map((v) => (
                <div key={v.type} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-2">
                    {statusIcon[v.status]}
                    <span className="text-sm text-foreground">{v.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        v.status === "current" ? "bg-green-500/10 text-green-600" :
                        v.status === "due" ? "bg-amber-500/10 text-amber-600" :
                        "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {statusLabel[v.status]}
                    </Badge>
                    {v.nextDue && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(v.nextDue).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Röntgenbilder */}
      {(userRole === "provider" || userRole === "client") && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                Röntgenbilder
                <InfoTooltip {...PFERDEAKTE_HELP.sections.xray} />
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowXrayUpload(!showXrayUpload)}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {showXrayUpload ? "Abbrechen" : "Hochladen"}
              </Button>
            </div>
          </CardHeader>
          {showXrayUpload && (
            <CardContent>
              <XrayUpload
                horseId={horseId}
                onComplete={() => setShowXrayUpload(false)}
                onCancel={() => setShowXrayUpload(false)}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Existing Impfung/Entwurmung component */}
      <TabImpfungEntwurmung horseId={horseId} readOnly={userRole !== "provider"} />
    </div>
  );
}
