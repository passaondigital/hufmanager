import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, ArrowUpRight } from "lucide-react";

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
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Upgrade erforderlich</DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-semibold text-foreground">{featureName}</span> ist Teil des Profi-Pakets.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
            <p className="font-medium flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Im Profi-Paket enthalten:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                GPS-Navigation zum Stall
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                KI-Assistent für Hufpflege-Fragen
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Automatische Termin-Erinnerungen
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Erweiterte Analyse & Statistiken
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                MemberHorse Academy Zugang
              </li>
            </ul>
          </div>

          <Button onClick={handleUpgrade} className="w-full h-12 text-base gap-2">
            Jetzt upgraden
            <ArrowUpRight className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Später
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
