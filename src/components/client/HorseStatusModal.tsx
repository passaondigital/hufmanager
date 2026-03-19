import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Skull, AlertTriangle, Archive } from "lucide-react";
import { HorseTransferWizard } from "./HorseTransferWizard";
import { HorseStatusReport } from "./HorseStatusReport";
import { supabase } from "@/integrations/supabase/client";
import { logHorseAction } from "@/utils/auditLog";
import { notifyHorseStakeholders } from "@/utils/notifyHorseStakeholders";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface HorseStatusModalProps {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  onStatusChanged?: () => void;
}

type ModalView = "menu" | "transfer" | "deceased" | "stolen" | "archive";

export function HorseStatusModal({ open, onClose, horseId, horseName, onStatusChanged }: HorseStatusModalProps) {
  const [view, setView] = useState<ModalView>("menu");
  const { user } = useAuth();

  const handleArchive = async () => {
    const { error } = await supabase
      .from("horses")
      .update({
        horse_status: "archived",
        status_changed_at: new Date().toISOString(),
        status_reason: "Vom Besitzer archiviert",
      } as any)
      .eq("id", horseId);

    if (error) {
      toast.error("Fehler beim Archivieren");
      return;
    }

    await logHorseAction(horseId, "status_changed", { new_status: "archived" });

    // Notify all stakeholders
    if (user) {
      await notifyHorseStakeholders({
        horseId,
        horseName,
        event: "archived",
        triggeredBy: user.id,
      });
    }

    toast.success(`${horseName} wurde archiviert`);
    onStatusChanged?.();
    handleClose();
  };

  const handleClose = () => {
    setView("menu");
    onClose();
  };

  if (view === "transfer") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <HorseTransferWizard horseId={horseId} horseName={horseName} onComplete={handleClose} onCancel={() => setView("menu")} />
        </DialogContent>
      </Dialog>
    );
  }

  if (view === "deceased" || view === "stolen") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <HorseStatusReport
            horseId={horseId}
            horseName={horseName}
            reportType={view === "stolen" ? "stolen" : "deceased"}
            onComplete={() => { onStatusChanged?.(); handleClose(); }}
            onCancel={() => setView("menu")}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Was möchtest du melden?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 text-left"
            onClick={() => setView("transfer")}
          >
            <RefreshCw className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="font-medium">Pferd verkaufen / übergeben</div>
              <div className="text-sm text-muted-foreground">Besitz an neue Person übertragen</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 text-left"
            onClick={() => setView("deceased")}
          >
            <Skull className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="font-medium">Pferd ist verstorben</div>
              <div className="text-sm text-muted-foreground">Akte wird archiviert</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 text-left border-destructive/30"
            onClick={() => setView("stolen")}
          >
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <div className="font-medium">Pferd als gestohlen melden</div>
              <div className="text-sm text-muted-foreground">Behörden werden informiert</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 text-left"
            onClick={handleArchive}
          >
            <Archive className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="font-medium">Pferd archivieren</div>
              <div className="text-sm text-muted-foreground">Inaktiv setzen ohne Löschen</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
