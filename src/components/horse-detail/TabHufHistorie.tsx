import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, Stethoscope, Wrench, Eye, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { HoofHistoryEntryModal } from "./HoofHistoryEntryModal";
import { HoofHistoryTimelineItem } from "./HoofHistoryTimelineItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface TabHufHistorieProps {
  horseId: string;
  horseName: string;
}

export interface HoofHistoryEntry {
  id: string;
  horse_id: string;
  created_by: string;
  entry_date: string;
  entry_type: "standard" | "beschlag" | "krankheitsfall" | "kontrolle";
  description: string | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
  voice_note_url: string | null;
  created_at: string;
}

const ENTRY_TYPES = [
  { value: "standard", label: "Standard-Bearbeitung", icon: Wrench, color: "text-blue-500" },
  { value: "beschlag", label: "Beschlag", icon: Wrench, color: "text-amber-500" },
  { value: "krankheitsfall", label: "Krankheitsfall", icon: AlertCircle, color: "text-red-500" },
  { value: "kontrolle", label: "Kontrolle", icon: Eye, color: "text-green-500" },
] as const;

export function TabHufHistorie({ horseId, horseName }: TabHufHistorieProps) {
  const queryClient = useQueryClient();
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["hoof-history", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoof_history")
        .select("*")
        .eq("horse_id", horseId)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      return data as HoofHistoryEntry[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("hoof_history")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hoof-history", horseId] });
      toast.success("Eintrag gelöscht");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Fehler beim Löschen");
    },
  });

  const getEntryTypeInfo = (type: string) => {
    return ENTRY_TYPES.find((t) => t.value === type) || ENTRY_TYPES[0];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Huf-Historie</h3>
          <p className="text-sm text-muted-foreground">
            Dokumentiere Behandlungen und Befunde für {horseName}
          </p>
        </div>
        <Button 
          onClick={() => setShowEntryModal(true)}
          className="bg-[#F47B20] hover:bg-[#F47B20]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Noch keine Einträge vorhanden
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Dokumentiere den ersten Besuch oder Befund
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[#F47B20]/20" />
          
          {/* Timeline entries */}
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <HoofHistoryTimelineItem
                key={entry.id}
                entry={entry}
                typeInfo={getEntryTypeInfo(entry.entry_type)}
                isFirst={index === 0}
                onDelete={() => setDeleteId(entry.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Entry Modal */}
      <HoofHistoryEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        horseId={horseId}
        horseName={horseName}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Eintrag wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
