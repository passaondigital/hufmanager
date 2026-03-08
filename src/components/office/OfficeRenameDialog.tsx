import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileEdit } from "lucide-react";

const SUGGESTIONS = ["Erstbefund", "Verlaufskontrolle", "Hufrehebericht", "Übergabe", "Beschlagprotokoll"];

interface OfficeRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onConfirm: (title: string) => void;
}

export function OfficeRenameDialog({ open, onOpenChange, currentTitle, onConfirm }: OfficeRenameDialogProps) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle(currentTitle === "Neues Dokument" ? "" : currentTitle);
  }, [open, currentTitle]);

  const handleSubmit = () => {
    onConfirm(title.trim() || "Unbenanntes Dokument");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary" />
            Wie soll dieses Dokument heißen?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hufbearbeitung Bella – März 2026"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Vorschläge:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTitle(s)}
                  className="px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { onConfirm(currentTitle || "Neues Dokument"); }}>
            Überspringen
          </Button>
          <Button onClick={handleSubmit}>
            Speichern →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
