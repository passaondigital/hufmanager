import { useState } from "react";
import { useWebsiteEditor } from "@/hooks/useWebsiteEditor";
import { EditorHeader } from "./EditorHeader";
import { SectionsPanel } from "./SectionsPanel";
import { DesignPanel } from "./DesignPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StatsPanel } from "./StatsPanel";
import { EditorPreview } from "./EditorPreview";
import { SectionEditPanels } from "./SectionEditPanels";
import { Loader2, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const LandingEditorPage = () => {
  const editor = useWebsiteEditor();
  const [editorTab, setEditorTab] = useState("sections");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("desktop");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  if (editor.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <EditorHeader
        editor={editor}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
      />

      {/* Mobile tab switch */}
      <div className="md:hidden flex border-b border-border">
        <button
          onClick={() => setMobileView("edit")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center transition-colors",
            mobileView === "edit"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          )}
        >
          ✏️ Bearbeiten
        </button>
        <button
          onClick={() => setMobileView("preview")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center transition-colors",
            mobileView === "preview"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          )}
        >
          👁 Vorschau
        </button>
      </div>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div
          className={cn(
            "w-full md:w-[400px] md:min-w-[400px] md:max-w-[400px] border-r border-border flex flex-col overflow-hidden",
            mobileView === "preview" && "hidden md:flex"
          )}
        >
          <Tabs value={editorTab} onValueChange={setEditorTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-4 mx-3 mt-3 mb-0 shrink-0">
              <TabsTrigger value="sections" className="text-xs gap-1">✏️ Abschnitte</TabsTrigger>
              <TabsTrigger value="design" className="text-xs gap-1">🎨 Design</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs gap-1">⚙️ Einstellungen</TabsTrigger>
              <TabsTrigger value="stats" className="text-xs gap-1">📊 Stats</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="sections" className="mt-0 p-3 space-y-3">
                <SectionsPanel editor={editor} />
                <SectionEditPanels editor={editor} />
              </TabsContent>
              <TabsContent value="design" className="mt-0 p-3">
                <DesignPanel editor={editor} />
              </TabsContent>
              <TabsContent value="settings" className="mt-0 p-3">
                <SettingsPanel editor={editor} />
              </TabsContent>
              <TabsContent value="stats" className="mt-0 p-3">
                <StatsPanel editor={editor} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right panel - Preview */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-muted/30 overflow-hidden",
            mobileView === "edit" && "hidden md:flex"
          )}
        >
          {/* Preview controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-lg p-0.5">
                <Button
                  variant={previewMode === "mobile" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                  className="gap-1 h-7 px-2"
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobil
                </Button>
                <Button
                  variant={previewMode === "desktop" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("desktop")}
                  className="gap-1 h-7 px-2"
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </Button>
              </div>
            </div>
            {editor.websiteUrl && (
              <code className="text-xs text-muted-foreground truncate max-w-[300px]">
                {editor.websiteUrl}
              </code>
            )}
          </div>

          {/* Preview area */}
          <EditorPreview editor={editor} previewMode={previewMode} />
        </div>
      </div>
    </div>
  );
};
