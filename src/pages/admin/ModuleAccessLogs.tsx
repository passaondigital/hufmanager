import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bell, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface ModuleAccessNotification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string;
  type: string | null;
}

export default function ModuleAccessLogs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["module-access-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("type", "module_access_blocked")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ModuleAccessNotification[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-access-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("type", "module_access_blocked")
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-access-notifications"] });
      toast({ title: "Alle als gelesen markiert" });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-access-notifications"] });
      toast({ title: "Benachrichtigung gelöscht" });
    },
  });

  const filteredNotifications = notifications?.filter(n => 
    filter === "all" || !n.is_read
  ) || [];

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/mission-control")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Modul-Zugriffs-Logs</h1>
            <p className="text-muted-foreground">
              Benachrichtigungen über blockierte Modul-Zugriffsversuche
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Zugriffsversuche
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount} ungelesen</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Provider-Versuche auf deaktivierte Module zuzugreifen
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Alle
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Ungelesen
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Alle gelesen
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Keine blockierten Zugriffsversuche</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        notification.is_read 
                          ? "bg-muted/30 border-border" 
                          : "bg-destructive/5 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <Badge variant="destructive" className="text-xs">Neu</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              title="Als gelesen markieren"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            className="text-destructive hover:text-destructive"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
