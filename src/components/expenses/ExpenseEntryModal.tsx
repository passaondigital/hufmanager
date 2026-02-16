import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenLine, ScanLine, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AddExpenseModal } from "./AddExpenseModal";
import { ReceiptScanner } from "./ReceiptScanner";

interface ExpenseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type EntryMode = "choose" | "manual" | "scan";

export function ExpenseEntryModal({ isOpen, onClose }: ExpenseEntryModalProps) {
  const [mode, setMode] = useState<EntryMode>("choose");

  const handleClose = () => {
    setMode("choose");
    onClose();
  };

  // When in manual or scan mode, render the respective modal directly
  if (mode === "manual") {
    return (
      <AddExpenseModal
        isOpen={isOpen}
        onClose={handleClose}
        onBack={() => setMode("choose")}
      />
    );
  }

  if (mode === "scan") {
    return (
      <ReceiptScanner
        isOpen={isOpen}
        onClose={handleClose}
        onBack={() => setMode("choose")}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Ausgabe erfassen</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3 py-4"
          >
            <p className="text-sm text-muted-foreground text-center mb-4">
              Wie möchtest du deine Ausgabe erfassen?
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* Manual Entry */}
              <Button
                variant="outline"
                className="h-auto p-5 flex items-start gap-4 justify-start text-left"
                onClick={() => setMode("manual")}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <PenLine className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Manuell erfassen</span>
                  <span className="text-xs text-muted-foreground block">
                    Betrag, Datum und Kategorie selbst eingeben
                  </span>
                </div>
              </Button>

              {/* AI Scan */}
              <Button
                variant="outline"
                className="h-auto p-5 flex items-start gap-4 justify-start text-left border-primary/30 hover:border-primary/60"
                onClick={() => setMode("scan")}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ScanLine className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Intelligente Belegerfassung</span>
                  </div>
                  <span className="text-xs text-muted-foreground block">
                    Beleg fotografieren – KI erkennt Betrag, Datum & Kategorie automatisch
                  </span>
                </div>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
