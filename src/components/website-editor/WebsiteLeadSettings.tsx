import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  settings: any;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Neu", variant: "default" },
  contacted: { label: "Kontaktiert", variant: "secondary" },
  qualified: { label: "Qualifiziert", variant: "outline" },
  converted: { label: "Konvertiert", variant: "default" },
  archived: { label: "Archiviert", variant: "secondary" },
};

const URGENCY_LABELS = ["", "Nicht eilig", "Bald", "Mittel", "Dringend", "Sofort"];
const CONDITION_LABELS: Record<string, string> = {
  good: "🟢 Gut",
  noticeable: "🟡 Auffällig",
  urgent: "🔴 Dringend",
};

export const WebsiteLeadSettings = ({ settings }: Props) => {
  const { user } = useAuth();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["website-leads", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("website_leads")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Eingehende Anfragen</span>
            <Badge variant="outline">{leads?.length || 0} Leads</Badge>
          </CardTitle>
          <CardDescription>Anfragen über dein Website-Kontaktformular</CardDescription>
        </CardHeader>
        <CardContent>
          {!leads || leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Anfragen eingegangen. Teile den Link zu deiner Website!
            </p>
          ) : (
            <div className="space-y-3">
              {leads.map((lead: any) => (
                <div key={lead.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{lead.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.hoof_condition && (
                        <span className="text-xs">{CONDITION_LABELS[lead.hoof_condition] || lead.hoof_condition}</span>
                      )}
                      <Badge variant={STATUS_MAP[lead.status]?.variant || "secondary"}>
                        {STATUS_MAP[lead.status]?.label || lead.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                    {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                    {lead.plz && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.plz}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(lead.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </span>
                  </div>
                  {lead.horse_name && (
                    <p className="text-xs text-foreground">🐴 {lead.horse_name}{lead.breed ? ` (${lead.breed})` : ""}</p>
                  )}
                  {lead.service_interest && (
                    <p className="text-xs text-muted-foreground">Interesse: {lead.service_interest}</p>
                  )}
                  {lead.urgency && lead.urgency > 1 && (
                    <p className="text-xs text-muted-foreground">Dringlichkeit: {URGENCY_LABELS[lead.urgency]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
