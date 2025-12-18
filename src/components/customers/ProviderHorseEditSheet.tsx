import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import type { Horse } from "@/components/horse-detail/types";

type ProviderHorseEditSheetProps = {
  horseId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function ProviderHorseEditSheet({ horseId, open, onClose, onSaved }: ProviderHorseEditSheetProps) {
  const { data: horse, isLoading, error } = useQuery({
    queryKey: ["horse", horseId],
    enabled: open && !!horseId,
    queryFn: async () => {
      if (!horseId) throw new Error("horseId missing");

      const { data, error } = await supabase
        .from("horses")
        .select("*")
        .eq("id", horseId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Pferd nicht gefunden oder kein Zugriff");

      return data as unknown as Horse;
    },
  });

  useEffect(() => {
    if (!open) return;
    if (error) {
      console.error("Horse load error:", error);
      toast({
        title: "Fehler",
        description: (error as any)?.message || "Pferd konnte nicht geladen werden.",
        variant: "destructive",
      });
      onClose();
    }
  }, [open, error, onClose]);

  if (!open) return null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Pferd wird geladen…</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!horse) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Pferd nicht gefunden</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Das Pferd konnte nicht geladen werden.
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return <EditHorseModal horse={horse} open={open} onClose={onClose} onSaved={onSaved} />;
}
