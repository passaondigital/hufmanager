import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SharePreviewSheet } from "./SharePreviewSheet";

interface EditorHeaderProps {
  editor: any;
  previewMode: string;
  setPreviewMode: (m: "mobile" | "desktop") => void;
}

export const EditorHeader = ({ editor }: EditorHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Zurück</span>
        </Button>
        <h1 className="text-sm font-semibold text-foreground">Landing-Editor</h1>
        {editor.hasChanges && (
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>

      <div className="flex items-center gap-2">
        {editor.lastSaved && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            💾 {formatDistanceToNow(editor.lastSaved, { locale: de, addSuffix: true })}
          </span>
        )}
        <Button
          size="sm"
          onClick={editor.save}
          disabled={editor.isSaving || !editor.hasChanges}
          className="gap-1"
        >
          {editor.isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Speichern
        </Button>
        {editor.websiteUrl && (
          <Button variant="outline" size="sm" asChild className="gap-1">
            <a href={editor.websiteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Öffnen</span>
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};
