import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, ChevronUp, Plus, X, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import type { TourAppointment } from "./TourCard";

interface StableGroup {
  id: string;
  title: string;
  stable_name: string | null;
  stable_address: string | null;
}

interface StableGroupPanelProps {
  tourDate: Date;
  userId: string;
  appointments: TourAppointment[];
  onRefetch: () => void;
}

export function StableGroupPanel({
  tourDate,
  userId,
  appointments,
  onRefetch,
}: StableGroupPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const dateStr = format(tourDate, "yyyy-MM-dd");

  // Fetch stable groups for the date
  const { data: stableGroups = [] } = useQuery<StableGroup[]>({
    queryKey: ["stable-groups-tour", dateStr, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_groups")
        .select("id, title, stable_name, stable_address")
        .eq("date", dateStr)
        .eq("created_by", userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch appointments grouped by stable
  const { data: groupedAppointments = [] } = useQuery({
    queryKey: ["grouped-appointments-tour", dateStr, userId],
    queryFn: async () => {
      const groupIds = stableGroups.map((g) => g.id);
      if (groupIds.length === 0) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select("id, stable_group_id")
        .in("stable_group_id", groupIds);

      if (error) throw error;
      return data || [];
    },
    enabled: stableGroups.length > 0,
  });

  // Group appointments by stable location (auto-detect by address/coords)
  const autoGroupedByLocation = appointments.reduce((acc, apt) => {
    const locationKey = apt.client?.city || 
      (apt.client?.geo_lat && apt.client?.geo_lng 
        ? `${apt.client.geo_lat.toFixed(2)},${apt.client.geo_lng.toFixed(2)}` 
        : "unknown");
    
    if (!acc[locationKey]) {
      acc[locationKey] = {
        location: apt.client?.city || "Unbekannt",
        address: apt.client?.street || undefined,
        appointments: [],
      };
    }
    acc[locationKey].appointments.push(apt);
    return acc;
  }, {} as Record<string, { location: string; address?: string; appointments: TourAppointment[] }>);

  // Filter to only show groups with 2+ appointments
  const significantGroups = Object.entries(autoGroupedByLocation)
    .filter(([_, group]) => group.appointments.length >= 2)
    .sort((a, b) => b[1].appointments.length - a[1].appointments.length);

  const handleCreateGroup = async (locationKey: string, group: { location: string; appointments: TourAppointment[] }) => {
    try {
      // Create stable group
      const { data: newGroup, error: groupError } = await supabase
        .from("appointment_groups")
        .insert({
          title: `Sammeltermin ${group.location}`,
          stable_name: group.location,
          date: dateStr,
          created_by: userId,
          status: "planned",
        })
        .select("id")
        .single();

      if (groupError) throw groupError;

      // Link appointments
      const appointmentIds = group.appointments.map((a) => a.id);
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ stable_group_id: newGroup.id })
        .in("id", appointmentIds);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["stable-groups-tour"] });
      queryClient.invalidateQueries({ queryKey: ["grouped-appointments-tour"] });
      onRefetch();
      toast.success(`Sammeltermin "${group.location}" erstellt`);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Gruppe konnte nicht erstellt werden");
    }
  };

  const getGroupAppointmentCount = (groupId: string) =>
    groupedAppointments.filter((a) => a.stable_group_id === groupId).length;

  if (stableGroups.length === 0 && significantGroups.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-16 left-4 z-[1000] max-w-xs">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border overflow-hidden"
      >
        {/* Header */}
        <button
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Sammeltermine</span>
            {(stableGroups.length > 0 || significantGroups.length > 0) && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {stableGroups.length + significantGroups.length}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t"
            >
              <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
                {/* Existing Groups */}
                {stableGroups.map((group) => (
                  <div
                    key={group.id}
                    className="p-2 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium">{group.title}</span>
                      </div>
                      <Badge variant="outline" className="h-5 text-xs gap-1">
                        <Users className="h-3 w-3" />
                        {getGroupAppointmentCount(group.id)}
                      </Badge>
                    </div>
                    {group.stable_name && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {group.stable_name}
                      </div>
                    )}
                  </div>
                ))}

                {/* Auto-detected groups (suggestions) */}
                {significantGroups.map(([key, group]) => {
                  // Check if already grouped
                  const alreadyGrouped = stableGroups.some(
                    (sg) => sg.stable_name === group.location
                  );
                  if (alreadyGrouped) return null;

                  return (
                    <div
                      key={key}
                      className="p-2 rounded-lg bg-muted/50 border border-dashed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{group.location}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {group.appointments.length} Termine erkannt
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleCreateGroup(key, group)}
                        >
                          <Plus className="h-3 w-3" />
                          Gruppieren
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {stableGroups.length === 0 && significantGroups.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    Keine Sammeltermine erkannt
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
