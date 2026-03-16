import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Heart } from "lucide-react";

interface BusinessUpgradeHintProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

/**
 * Shown once when a private client creates their 6th horse.
 * Asks: "Do you run a business?"
 */
export function BusinessUpgradeHint({ open, onClose, onUpgrade }: BusinessUpgradeHintProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Du hast jetzt 6 Pferde! 🐴</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground text-center">
          <p>
            Betreibst du einen Stall, eine Pension oder eine Reitschule?
          </p>
          <p>
            Wenn du Pferde verwaltest die nicht dir gehören,
            brauchst du einen Gewerbe-Account.
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onUpgrade} className="w-full gap-2">
            <Building2 className="h-4 w-4" />
            Ja, ich bin Gewerbetreibend
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full gap-2">
            <Heart className="h-4 w-4" />
            Nein, das sind alles meine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
