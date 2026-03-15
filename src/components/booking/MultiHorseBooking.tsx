import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MultiHorseBookingProps {
  providerId: string;
  primaryHorseId: string;
  serviceDuration: number;
  selectedHorses: string[];
  onHorsesChange: (horseIds: string[]) => void;
}

export function MultiHorseBooking({ providerId, primaryHorseId, serviceDuration, selectedHorses, onHorsesChange }: MultiHorseBookingProps) {
  const { user } = useAuth();

  const { data: horses = [] } = useQuery({
    queryKey: ["client-horses-booking", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const availableHorses = horses.filter((h) => h.id !== primaryHorseId && !selectedHorses.includes(h.id));
  const totalDuration = (1 + selectedHorses.length) * serviceDuration;
  const hours = Math.floor(totalDuration / 60);
  const mins = totalDuration % 60;

  if (horses.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Weitere Pferde hinzufügen</p>
        <Badge variant="outline" className="text-[10px] flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Geschätzt: {hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}min` : ""}
        </Badge>
      </div>

      {selectedHorses.map((horseId) => {
        const horse = horses.find((h) => h.id === horseId);
        return (
          <div key={horseId} className="flex items-center gap-2 text-sm">
            <span>+ {horse?.name || "Pferd"}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onHorsesChange(selectedHorses.filter((id) => id !== horseId))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      {availableHorses.length > 0 && (
        <Select onValueChange={(v) => onHorsesChange([...selectedHorses, v])}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="+ Weiteres Pferd hinzufügen" />
          </SelectTrigger>
          <SelectContent>
            {availableHorses.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
