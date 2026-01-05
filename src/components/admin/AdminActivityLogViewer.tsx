import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, History, User, FileText, Users, Settings } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ActivityLogEntry {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  provider_created: { label: "Provider erstellt", color: "bg-green-500" },
  provider_suspended: { label: "Provider gesperrt", color: "bg-red-500" },
  provider_unsuspended: { label: "Provider entsperrt", color: "bg-green-500" },
  provider_deleted: { label: "Provider gelöscht", color: "bg-red-500" },
  provider_updated: { label: "Provider aktualisiert", color: "bg-blue-500" },
  client_created: { label: "Kunde erstellt", color: "bg-green-500" },
  feature_flags_updated: { label: "Feature-Flags geändert", color: "bg-purple-500" },
  plan_override_updated: { label: "Plan-Override geändert", color: "bg-orange-500" },
  blog_post_created: { label: "Blog-Post erstellt", color: "bg-green-500" },
  blog_post_updated: { label: "Blog-Post aktualisiert", color: "bg-blue-500" },
  blog_post_published: { label: "Blog-Post veröffentlicht", color: "bg-green-500" },
  blog_post_unpublished: { label: "Blog-Post deaktiviert", color: "bg-orange-500" },
  blog_post_deleted: { label: "Blog-Post gelöscht", color: "bg-red-500" },
  bulk_action: { label: "Bulk-Aktion", color: "bg-purple-500" },
};

const TARGET_ICONS: Record<string, React.ReactNode> = {
  provider: <User className="w-4 h-4" />,
  client: <Users className="w-4 h-4" />,
  blog_post: <FileText className="w-4 h-4" />,
  bulk: <Settings className="w-4 h-4" />,
};

interface AdminActivityLogViewerProps {
  limit?: number;
  compact?: boolean;
}

export default function AdminActivityLogViewer({ limit = 50, compact = false }: AdminActivityLogViewerProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [limit]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs((data || []) as ActivityLogEntry[]);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (actionType: string) => {
    return ACTION_LABELS[actionType] || { label: actionType, color: "bg-gray-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Letzte Aktivitäten
          </h4>
          <Button variant="ghost" size="icon" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Aktivitäten vorhanden
              </p>
            ) : (
              logs.map((log) => {
                const action = getActionLabel(log.action_type);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 text-sm"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${action.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{action.label}</p>
                      {log.target_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {log.target_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd.MM. HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Aktivitätsprotokoll
            </CardTitle>
            <CardDescription>
              Alle Admin-Aktionen im Überblick
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Aktivitäten protokolliert</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const action = getActionLabel(log.action_type);
              const targetIcon = log.target_type ? TARGET_ICONS[log.target_type] : null;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${action.color}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {action.label}
                      </Badge>
                      {log.target_type && targetIcon && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          {targetIcon}
                          {log.target_type}
                        </Badge>
                      )}
                    </div>
                    
                    {log.target_name && (
                      <p className="font-medium mt-1">{log.target_name}</p>
                    )}
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                        {Object.entries(log.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground">{key}:</span>{" "}
                            <span>{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{log.admin_email || "Admin"}</span>
                      <span>
                        {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
