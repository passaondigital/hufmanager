import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useEffect } from "react";

interface EmployeeNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  link_to: string | null;
  created_at: string;
}

export function EmployeeNotificationBell() {
  const { data: profile } = useEmployeeProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["employee-notifications-unread", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await supabase
        .from("employee_notifications")
        .select("*", { count: "exact", head: true })
        .eq("employee_id", profile.id)
        .is("read_at", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["employee-notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("employee_notifications")
        .select("*")
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data as EmployeeNotification[];
    },
    enabled: !!profile?.id && open,
  });

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("employee-notif-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "employee_notifications", filter: `employee_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-notifications-unread"] });
          queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("employee_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["employee-notifications-unread"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      await supabase
        .from("employee_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("employee_id", profile.id)
        .is("read_at", null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["employee-notifications-unread"] });
    },
  });

  const handleClick = (n: EmployeeNotification) => {
    if (!n.read_at) markAsRead.mutate(n.id);
    if (n.link_to) { navigate(n.link_to); setOpen(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-label="Benachrichtigungen">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Benachrichtigungen</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={() => markAllRead.mutate()}>
              Alle gelesen
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-muted-foreground text-sm">Keine Benachrichtigungen</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                    !n.read_at && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                    <div className={cn("flex-1", n.read_at && "ml-4")}>
                      <p className="font-medium text-sm">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "dd.MM. HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
