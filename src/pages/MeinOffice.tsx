import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, LayoutTemplate, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasDocument, CanvasBlock } from "@/components/office/canvas/types";
import { CanvasEditor } from "@/components/office/canvas/CanvasEditor";
import { FARRIER_TEMPLATES } from "@/components/office/canvas/templates";
import { exportCanvasToPdf } from "@/components/office/canvas/canvasPdfExport";
import { CanvasDocumentList } from "@/components/office/canvas/CanvasDocumentList";
import { CanvasTemplateGallery } from "@/components/office/canvas/CanvasTemplateGallery";

type ViewMode = "list" | "editor";

export default function MeinOffice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState("documents");
  const [editingDoc, setEditingDoc] = useState<CanvasDocument | null>(null);

  // Fetch documents from Supabase
  const { data: documents = [] } = useQuery({
    queryKey: ["office-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_documents")
        .select("*")
        .eq("provider_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d) => ({
        id: d.id,
        provider_id: d.provider_id,
        title: d.title,
        blocks: (d.blocks as unknown as CanvasBlock[]) || [],
        branding: d.branding as unknown as CanvasDocument["branding"],
        horse_id: d.horse_id || undefined,
        contact_id: d.contact_id || undefined,
        status: (d.status || "draft") as "draft" | "completed",
        template_id: d.template_id || undefined,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })) as CanvasDocument[];
    },
    enabled: !!user,
  });

  // Save document mutation
  const saveMutation = useMutation({
    mutationFn: async (doc: CanvasDocument) => {
      if (!user) throw new Error("Nicht angemeldet");
      const payload = {
        provider_id: user.id,
        title: doc.title || "Unbenanntes Dokument",
        blocks: JSON.parse(JSON.stringify(doc.blocks || [])) as Json,
        branding: JSON.parse(JSON.stringify(doc.branding || {})) as Json,
        horse_id: doc.horse_id || null,
        contact_id: doc.contact_id || null,
        status: doc.status || "draft",
        template_id: doc.template_id || null,
      };
      if (doc.id) {
        const { data, error } = await supabase.from("office_documents").update(payload).eq("id", doc.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("office_documents").insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["office-documents"] });
      if (editingDoc) setEditingDoc({ ...editingDoc, id: data.id });
      toast({ title: "✓ Gespeichert" });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
    },
  });

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-documents"] });
      toast({ title: "Dokument gelöscht" });
    },
  });

  const handleCreateFromTemplate = useCallback((templateIndex: number) => {
    const template = FARRIER_TEMPLATES[templateIndex];
    setEditingDoc({
      title: template.name,
      blocks: JSON.parse(JSON.stringify(template.blocks)),
      branding: template.branding,
      template_id: template.id,
      status: "draft",
    });
    setView("editor");
  }, []);

  const handleCreateBlank = useCallback(() => {
    setEditingDoc({
      title: "Neues Dokument",
      blocks: [],
      status: "draft",
    });
    setView("editor");
  }, []);

  const handleOpenDocument = useCallback((doc: CanvasDocument) => {
    setEditingDoc(doc);
    setView("editor");
  }, []);

  const handleExportPdf = useCallback(async (doc?: CanvasDocument) => {
    const target = doc || editingDoc;
    if (!target) return;
    try {
      const pdf = await exportCanvasToPdf(target);
      pdf.save(`${target.title || "Dokument"}.pdf`);
      toast({ title: "✓ PDF exportiert" });
    } catch {
      toast({ title: "PDF-Fehler", description: "Export fehlgeschlagen.", variant: "destructive" });
    }
  }, [editingDoc]);

  // Editor view
  if (view === "editor" && editingDoc) {
    return (
      <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)]">
        <CanvasEditor
          document={editingDoc}
          onChange={setEditingDoc}
          onSave={() => saveMutation.mutate(editingDoc)}
          onExportPdf={() => handleExportPdf()}
          onBack={() => setView("list")}
          saving={saveMutation.isPending}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Mein Office
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            PDF-Baukasten für Hufbearbeiter – Vorlagen, Protokolle & Formulare
          </p>
        </div>
        <Button onClick={handleCreateBlank} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Neues Dokument</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Dokumente
            {documents.length > 0 && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{documents.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Vorlagen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <CanvasDocumentList
            documents={documents}
            onOpenDocument={handleOpenDocument}
            onDeleteDocument={(id) => deleteDocMutation.mutate(id)}
            onExportPdf={(doc) => handleExportPdf(doc)}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <CanvasTemplateGallery
            onSelectTemplate={handleCreateFromTemplate}
            onCreateBlank={handleCreateBlank}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
