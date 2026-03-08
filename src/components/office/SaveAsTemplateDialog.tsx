import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus } from "lucide-react";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, category: string) => void;
  saving?: boolean;
}

export function SaveAsTemplateDialog({ open, onOpenChange, onSave, saving }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("eigene");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), category);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Als eigene Vorlage speichern
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mein Hufprotokoll"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="eigene">Eigene</option>
              <option value="protokoll">Protokoll</option>
              <option value="aufnahme">Aufnahme</option>
              <option value="verlauf">Verlauf</option>
              <option value="analyse">Analyse</option>
              <option value="uebergabe">Übergabe</option>
              <option value="kommunikation">Kommunikation</option>
              <option value="verwaltung">Verwaltung</option>
              <option value="notfall">Notfall</option>
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? "Speichert..." : "💾 Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
