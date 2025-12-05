import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, AlertTriangle, Clock, Settings2 } from "lucide-react";
import { format, addMonths, isBefore, parseISO, differenceInMonths } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AnamnesisStatusCardProps {
  horseId: string;
  horseName: string;
  lastAnamnesisDate: string | null;
  intervalMonths: number;
  onStartAnamnesis: () => void;
}

const INTERVAL_OPTIONS = [
  { value: 3, label: "3 Monate (Reha)" },
  { value: 6, label: "6 Monate" },
  { value: 12, label: "12 Monate (Standard)" },
  { value: 18, label: "18 Monate" },
  { value: 24, label: "24 Monate" },
];

export function AnamnesisStatusCard({
  horseId,
  horseName,
  lastAnamnesisDate,
  intervalMonths,
  onStartAnamnesis,
}: AnamnesisStatusCardProps) {
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [interval, setInterval] = useState(intervalMonths);
  const [isSaving, setIsSaving] = useState(false);

  const now = new Date();
  const isNew = !lastAnamnesisDate;
  const lastDate = lastAnamnesisDate ? parseISO(lastAnamnesisDate) : null;
  const dueDate = lastDate ? addMonths(lastDate, intervalMonths) : null;
  const isOverdue = dueDate ? isBefore(dueDate, now) : true;
  const monthsUntilDue = dueDate ? differenceInMonths(dueDate, now) : 0;

  const handleSaveInterval = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("horses")
        .update({ anamnesis_interval_months: interval })
        .eq("id", horseId);

      if (error) throw error;

      toast({
        title: "Intervall gespeichert",
        description: `Check-Intervall für ${horseName} auf ${interval} Monate gesetzt.`,
      });
      queryClient.invalidateQueries({ queryKey: ["horse"] });
      setShowSettings(false);
    } catch {
      toast({
        title: "Fehler",
        description: "Intervall konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      isNew && "border-amber-500/50 bg-amber-500/5 animate-pulse-slow",
      isOverdue && !isNew && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Gesundheits-Monitor
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div>
            {isNew ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium text-amber-500">Erstaufnahme erforderlich</span>
              </div>
            ) : isOverdue ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">Überfällig</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-500">Aktuell</span>
              </div>
            )}
            
            {lastDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Letzte Aufnahme: {format(lastDate, "dd. MMMM yyyy", { locale: de })}
              </p>
            )}
            
            {dueDate && !isOverdue && (
              <p className="text-sm text-muted-foreground">
                Nächste fällig in {monthsUntilDue} {monthsUntilDue === 1 ? "Monat" : "Monaten"}
              </p>
            )}
          </div>

          <Badge variant={isNew || isOverdue ? "destructive" : "outline"}>
            {intervalMonths} Monate
          </Badge>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 bg-muted/50 rounded-lg border space-y-3">
            <p className="text-sm font-medium">Check-Intervall anpassen</p>
            <div className="flex gap-2">
              <Select value={interval.toString()} onValueChange={(v) => setInterval(Number(v))}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSaveInterval} 
                disabled={isSaving || interval === intervalMonths}
              >
                Speichern
              </Button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          className={cn(
            "w-full",
            (isNew || isOverdue) && "animate-pulse bg-primary hover:bg-primary/90"
          )}
          onClick={onStartAnamnesis}
        >
          <ClipboardCheck className="h-4 w-4 mr-2" />
          {isNew ? "Große Aufnahme starten" : "Neue Bestandsaufnahme"}
        </Button>
      </CardContent>
    </Card>
  );
}
