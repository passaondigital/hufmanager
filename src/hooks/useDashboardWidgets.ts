import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";
import {
  DashboardWidgetData,
  DEFAULT_PROVIDER_WIDGETS,
  DEFAULT_PARTNER_WIDGETS,
  DEFAULT_EMPLOYEE_WIDGETS,
} from "@/components/dashboard/widgets/widgetRegistry";

type Role = "provider" | "partner" | "employee";

function getDefaults(role: Role) {
  switch (role) {
    case "partner": return DEFAULT_PARTNER_WIDGETS;
    case "employee": return DEFAULT_EMPLOYEE_WIDGETS;
    default: return DEFAULT_PROVIDER_WIDGETS;
  }
}

export function useDashboardWidgets(role: Role = "provider") {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["dashboard-widgets", user?.id, role];

  const { data: widgets = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_widgets")
        .select("id, user_id, widget_type, position_x, position_y, width, height, is_active, settings")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("position_y", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const defaults = getDefaults(role);
        const inserts = defaults.map((w) => ({
          ...w,
          user_id: user!.id,
          settings: (w.settings || {}) as Json,
        }));
        const { data: seeded, error: seedErr } = await supabase
          .from("dashboard_widgets")
          .insert(inserts)
          .select("id, user_id, widget_type, position_x, position_y, width, height, is_active, settings");

        if (seedErr) throw seedErr;
        return (seeded || []) as unknown as DashboardWidgetData[];
      }

      return data as unknown as DashboardWidgetData[];
    },
    enabled: !!user?.id,
  });

  const updateWidget = useMutation({
    mutationFn: async (update: Partial<DashboardWidgetData> & { id: string }) => {
      const { id, settings, ...rest } = update;
      const payload: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString(),
      };
      if (settings !== undefined) {
        payload.settings = settings as Json;
      }
      const { error } = await supabase
        .from("dashboard_widgets")
        .update(payload as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const addWidget = useMutation({
    mutationFn: async (widget: Omit<DashboardWidgetData, "id" | "user_id">) => {
      const { error } = await supabase
        .from("dashboard_widgets")
        .insert({
          ...widget,
          user_id: user!.id,
          settings: (widget.settings || {}) as Json,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const removeWidget = useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase
        .from("dashboard_widgets")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", widgetId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const resetWidgets = useMutation({
    mutationFn: async () => {
      await supabase.from("dashboard_widgets").delete().eq("user_id", user!.id);
      const defaults = getDefaults(role);
      const inserts = defaults.map((w) => ({
        ...w,
        user_id: user!.id,
        settings: (w.settings || {}) as Json,
      }));
      const { error } = await supabase.from("dashboard_widgets").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    widgets,
    isLoading,
    updateWidget: updateWidget.mutate,
    addWidget: addWidget.mutate,
    removeWidget: removeWidget.mutate,
    resetWidgets: resetWidgets.mutate,
  };
}
