import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Info, Loader2, ChevronDown } from "lucide-react";

interface TabAktivitaetenProps {
  horseId: string;
}

interface AuditEntry {
  id: string;
  actor_name: string | null;
  actor_kid: string | null;
  actor_role: string | null;
  action_type: string;
  action_detail: Record<string, any> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  view_basic: "Steckbrief angesehen",
  view_medical: "Gesundheitsakte angesehen",
  view_hoof_history: "Hufhistorie angesehen",
  view_documents: "Dokumente angesehen",
  view_vaccinations: "Impfpass angesehen",
  view_insurance: "Versicherungsdaten angesehen",
  upload_document: "Dokument hochgeladen",
  upload_photo: "Foto hochgeladen",
  upload_xray: "Röntgenbild hochgeladen",
  add_treatment_note: "Behandlungsnotiz hinzugefügt",
  add_vaccination: "Impfung eingetragen",
  add_deworming: "Entwurmung eingetragen",
  edit_horse: "Pferdedaten bearbeitet",
  grant_access: "Zugriff gewährt",
  revoke_access: "Zugriff entzogen",
  create_appointment: "Termin erstellt",
  transfer_initiated: "Transfer eingeleitet",
  transfer_completed: "Transfer abgeschlossen",
  status_changed: "Status geändert",
  export_data: "Daten exportiert",
  authority_request: "Behördenanfrage",
};

const ACTION_ICONS: Record<string, string> = {
  view_basic: "📋", view_medical: "🏥", view_hoof_history: "🦶",
  view_documents: "📄", view_vaccinations: "💉", view_insurance: "🛡️",
  upload_document: "📤", upload_photo: "📷", upload_xray: "🔬",
  add_treatment_note: "📝", add_vaccination: "💉", add_deworming: "🐛",
  edit_horse: "✏️", grant_access: "🔓", revoke_access: "🔒",
  create_appointment: "📅", status_changed: "🔄", export_data: "📥",
};

const FILTER_GROUPS: Record<string, string[]> = {
  all: [],
  zugriffe: ["view_basic", "view_medical", "view_hoof_history", "view_documents", "view_vaccinations", "view_insurance"],
  dokumente: ["upload_document", "upload_photo", "upload_xray"],
  behandlungen: ["add_treatment_note", "add_vaccination", "add_deworming", "edit_horse"],
  termine: ["create_appointment"],
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Besitzer", provider: "Hufbearbeiter", partner: "Partner", employee: "Mitarbeiter", admin: "Admin",
};

export function TabAktivitaeten({ horseId }: TabAktivitaetenProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setEntries([]);
    setPage(0);
    setHasMore(true);
    fetchEntries(0);
  }, [horseId, filter]);

  const fetchEntries = async (pageNum: number) => {
    setLoading(true);
    let query = supabase
      .from("horse_audit_log")
      .select("id, actor_name, actor_kid, actor_role, action_type, action_detail, created_at")
      .eq("horse_id", horseId)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (filter !== "all" && FILTER_GROUPS[filter]?.length) {
      query = query.in("action_type", FILTER_GROUPS[filter]);
    }

    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }
    const newEntries = (data || []) as AuditEntry[];
    setEntries(prev => pageNum === 0 ? newEntries : [...prev, ...newEntries]);
    setHasMore(newEntries.length === PAGE_SIZE);
    setLoading(false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntries(nextPage);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Heute, ${time} Uhr`;
    return `${d.toLocaleDateString("de-DE")} · ${time} Uhr`;
  };

  const getActionLabel = (entry: AuditEntry) => {
    let label = ACTION_LABELS[entry.action_type] || entry.action_type;
    if (entry.action_type === "grant_access" && entry.action_detail?.partner_name) {
      label += ` an ${entry.action_detail.partner_name}`;
    }
    if (entry.action_type === "revoke_access" && entry.action_detail?.partner_name) {
      label += ` von ${entry.action_detail.partner_name}`;
    }
    if (entry.action_type === "status_changed" && entry.action_detail?.new_status) {
      label += `: ${entry.action_detail.new_status}`;
    }
    return label;
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Dieser Verlauf ist nur für den Pferdebesitzer und dich sichtbar. Er dient der Transparenz und Nachvollziehbarkeit.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Alle" },
          { key: "zugriffe", label: "Zugriffe" },
          { key: "dokumente", label: "Dokumente" },
          { key: "behandlungen", label: "Behandlungen" },
          { key: "termine", label: "Termine" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Entries */}
      {entries.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Keine Aktivitäten vorhanden
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {entries.map(entry => (
          <Card key={entry.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-muted">
                    {entry.actor_name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{entry.actor_name || "Unbekannt"}</span>
                    {entry.actor_role && (
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[entry.actor_role] || entry.actor_role}
                      </Badge>
                    )}
                    {entry.actor_kid && (
                      <span className="text-[10px] text-muted-foreground">#{entry.actor_kid}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5">
                    {ACTION_ICONS[entry.action_type] || "📌"} {getActionLabel(entry)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatTime(entry.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}

      {hasMore && !loading && entries.length > 0 && (
        <Button variant="outline" className="w-full" onClick={loadMore}>
          <ChevronDown className="h-4 w-4 mr-1" /> Mehr laden
        </Button>
      )}
    </div>
  );
}
