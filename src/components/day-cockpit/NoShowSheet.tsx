import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserX } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

interface NoShowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
  isSending: boolean;
  clientName?: string;
}

export function NoShowSheet({ open, onOpenChange, onConfirm, isSending, clientName }: NoShowSheetProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes("");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#1a1a1a] border-t border-white/10">
        <DrawerHeader>
          <DrawerTitle className="text-white flex items-center gap-2">
            <UserX className="h-5 w-5 text-amber-500" />
            Nicht angetroffen
            <HelpTip id="cockpit.no_show" />
          </DrawerTitle>
          {clientName && (
            <p className="text-sm text-white/60 mt-1">
              {clientName} war nicht vor Ort
            </p>
          )}
        </DrawerHeader>

        <div className="px-4 space-y-4">
          <Textarea
            placeholder="Optionale Notiz (z.B. niemand am Stall, Pferd nicht bereitgestellt...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
            maxLength={500}
          />
        </div>

        <DrawerFooter className="gap-2">
          <Button
            onClick={handleConfirm}
            disabled={isSending}
            className="w-full h-12 font-bold text-base"
            style={{ background: "#f59e0b", color: "#111" }}
          >
            {isSending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <UserX className="h-5 w-5 mr-2" />
                Nicht angetroffen bestätigen
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60"
          >
            Abbrechen
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
