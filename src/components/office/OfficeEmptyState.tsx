import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardList, FileText, LayoutTemplate, Sparkles } from "lucide-react";

interface OfficeEmptyStateProps {
  onCreateBlank: () => void;
  onSelectTemplate: () => void;
  onShowTemplates: () => void;
}

export function OfficeEmptyState({ onCreateBlank, onSelectTemplate, onShowTemplates }: OfficeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <ClipboardList className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Dein erstes Dokument wartet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Starte mit einer Vorlage oder erstelle ein leeres Dokument nach deinen Vorstellungen.
      </p>

      <Card className="w-full p-4 mb-4 border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={onSelectTemplate}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-medium text-sm">Hufbearbeitungsprotokoll</h4>
            <p className="text-xs text-muted-foreground">Die meistgenutzte Vorlage</p>
          </div>
          <span className="text-xs text-primary font-medium">Jetzt starten →</span>
        </div>
      </Card>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 gap-2" onClick={onShowTemplates}>
          <LayoutTemplate className="h-4 w-4" />
          Alle Vorlagen
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={onCreateBlank}>
          <FileText className="h-4 w-4" />
          Leeres Dokument
        </Button>
      </div>
    </div>
  );
}
