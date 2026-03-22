import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { X, Megaphone, AlertTriangle, Info, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  action_url: string | null;
  action_label: string | null;
  priority: number;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Info; bgClass: string; borderClass: string; iconClass: string }> = {
  info: { icon: Info, bgClass: "bg-blue-50 dark:bg-blue-950/30", borderClass: "border-blue-200 dark:border-blue-800", iconClass: "text-blue-600 dark:text-blue-400" },
  warning: { icon: AlertTriangle, bgClass: "bg-amber-50 dark:bg-amber-950/30", borderClass: "border-amber-200 dark:border-amber-800", iconClass: "text-amber-600 dark:text-amber-400" },
  update: { icon: Sparkles, bgClass: "bg-emerald-50 dark:bg-emerald-950/30", borderClass: "border-emerald-200 dark:border-emerald-800", iconClass: "text-emerald-600 dark:text-emerald-400" },
  important: { icon: Megaphone, bgClass: "bg-orange-50 dark:bg-orange-950/30", borderClass: "border-orange-200 dark:border-orange-800", iconClass: "text-[#F47B20]" },
};

export function SystemAnnouncementBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: announcements } = useQuery({
    queryKey: ["system-announcements", user?.id],
    queryFn: async () => {
      // Get active announcements
      const { data: all, error } = await supabase
        .from("system_announcements")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (error) throw error;

      // Get dismissed ones
      const { data: dismissed } = await supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", user!.id);

      const dismissedIds = new Set(dismissed?.map(d => d.announcement_id) || []);
      return (all as Announcement[]).filter(a => !dismissedIds.has(a.id));
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const dismiss = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase.from("announcement_dismissals").insert({
        announcement_id: announcementId,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-announcements"] }),
  });

  if (!announcements?.length) return null;

  return (
    <div className="space-y-2 px-4 pt-3 pb-1">
      {announcements.map((a) => {
        const config = typeConfig[a.type] || typeConfig.info;
        const Icon = config.icon;
        const isExpanded = expanded === a.id;

        return (
          <div
            key={a.id}
            className={cn(
              "rounded-xl border p-3 transition-all",
              config.bgClass,
              config.borderClass
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 shrink-0", config.iconClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setExpanded(isExpanded ? null : a.id)}
                  className="text-left w-full"
                >
                  <p className="font-semibold text-sm text-foreground">{a.title}</p>
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-3">
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {a.content}
                    </p>
                    {a.action_url && (
                      <Button
                        size="sm"
                        className="bg-[#F47B20] hover:bg-[#e06a10] text-white gap-1.5"
                        onClick={() => navigate(a.action_url!)}
                      >
                        {a.action_label || "Jetzt ansehen"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                onClick={() => dismiss.mutate(a.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
