import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUpRight } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

export function UpgradeModal({ open, onOpenChange, featureName }: UpgradeModalProps) {
  const handleUpgrade = () => {
    // Open Copecart upgrade page - could be configured via business settings
    window.open("https://hufmanager.de/upgrade", "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center mb-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <DialogTitle className="text-xl">Upgrade erforderlich</DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-semibold text-foreground">{featureName}</span> ist im Profi-Paket verf\u00fcgbar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-border p-4 text-left space-y-3">
            <p className="text-sm font-medium text-foreground">
              Enthaltene Funktionen im Profi-Paket:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>GPS-Navigation zum Stall</li>
              <li>KI-Assistent f\u00fcr Hufpflege-Fragen</li>
              <li>Automatische Termin-Erinnerungen</li>
              <li>Erweiterte Analyse & Statistiken</li>
              <li>MemberHorse Academy Zugang</li>
            </ul>
          </div>

          <Button onClick={handleUpgrade} className="w-full h-12 text-sm gap-2">
            Upgrade ansehen
            <ArrowUpRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Zur\u00fcck
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
