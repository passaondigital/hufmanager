import { cn } from "@/lib/utils";

interface EditorPreviewProps {
  editor: any;
  previewMode: "mobile" | "desktop";
}

export const EditorPreview = ({ editor, previewMode }: EditorPreviewProps) => {
  const { websiteUrl } = editor;

  if (!websiteUrl) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Keine Subdomain hinterlegt. Erstelle zuerst deine Website.
        </p>
      </div>
    );
  }

  // Add cache-bust to force reload on save
  const previewUrl = `${websiteUrl}?preview=true&t=${editor.lastSaved?.getTime() || ""}`;

  return (
    <div className="flex-1 flex items-start justify-center overflow-auto p-4">
      <div
        className={cn(
          "bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 border border-border",
          previewMode === "mobile" && "w-[390px]",
          previewMode === "desktop" && "w-full max-w-[1200px]"
        )}
        style={{
          height: previewMode === "mobile" ? "844px" : "calc(100vh - 160px)",
        }}
      >
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="Website-Vorschau"
        />
      </div>
    </div>
  );
};
