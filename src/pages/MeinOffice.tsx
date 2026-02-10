import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, LayoutTemplate, FolderOpen } from "lucide-react";
import { OfficeTemplate, OfficeDocument, DocumentBlock } from "@/components/office/types";
import { PRESET_TEMPLATES } from "@/components/office/presets";
import { TemplateGallery } from "@/components/office/TemplateGallery";
import { DocumentList } from "@/components/office/DocumentList";
import { DocumentEditor } from "@/components/office/DocumentEditor";
import { exportDocumentToPdf } from "@/components/office/pdfExport";

type ViewMode = "list" | "editor";

export default function MeinOffice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState("documents");
  const [editingDoc, setEditingDoc] = useState<Partial<OfficeDocument> | null>(null);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["office-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_templates")
        .select("*")
        .eq("provider_id", user!.id)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as OfficeTemplate[];
    },
    enabled: !!user,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["office-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_documents")
        .select("*")
        .eq("provider_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OfficeDocument[];
    },
    enabled: !!user,
  });

  // Fetch horses for assignment
  const { data: horses = [] } = useQuery({
    queryKey: ["office-horses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  // Save document mutation
  const saveMutation = useMutation({
    mutationFn: async (doc: Partial<OfficeDocument>) => {
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
        const { data, error } = await supabase
          .from("office_documents")
          .update(payload)
          .eq("id", doc.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("office_documents")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["office-documents"] });
      setEditingDoc({ ...editingDoc, id: data.id } as OfficeDocument);
      toast({ title: "Gespeichert", description: "Dokument wurde gespeichert." });
    },
    onError: (err) => {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (tmpl: Partial<OfficeTemplate>) => {
      if (!user) throw new Error("Nicht angemeldet");
      const payload = {
        provider_id: user.id,
        name: tmpl.name || "Meine Vorlage",
        description: tmpl.description || null,
        category: tmpl.category || "eigene",
        blocks: JSON.parse(JSON.stringify(tmpl.blocks || [])) as Json,
        branding: JSON.parse(JSON.stringify(tmpl.branding || {})) as Json,
        is_preset: false,
      };
      const { data, error } = await supabase.from("office_templates").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-templates"] });
      toast({ title: "Vorlage gespeichert" });
    },
  });

  // Delete document
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

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-templates"] });
      toast({ title: "Vorlage gelöscht" });
    },
  });

  // Create from preset
  const handleCreateFromPreset = useCallback((index: number) => {
    const preset = PRESET_TEMPLATES[index];
    setEditingDoc({
      title: preset.name,
      blocks: JSON.parse(JSON.stringify(preset.blocks)),
      status: "draft",
    });
    setView("editor");
  }, []);

  // Create blank
  const handleCreateBlank = useCallback(() => {
    setEditingDoc({
      title: "Neues Dokument",
      blocks: [
        { id: crypto.randomUUID(), type: "heading", value: "", headingLevel: 1 },
      ],
      status: "draft",
    });
    setView("editor");
  }, []);

  // Create from user template
  const handleUseTemplate = useCallback((template: OfficeTemplate) => {
    setEditingDoc({
      title: template.name,
      blocks: JSON.parse(JSON.stringify(template.blocks)),
      branding: template.branding,
      template_id: template.id,
      status: "draft",
    });
    setView("editor");
  }, []);

  // Open existing document
  const handleOpenDocument = useCallback((doc: OfficeDocument) => {
    setEditingDoc(doc);
    setView("editor");
  }, []);

  // Duplicate template
  const handleDuplicateTemplate = useCallback((template: OfficeTemplate) => {
    saveTemplateMutation.mutate({
      name: template.name + " (Kopie)",
      description: template.description,
      category: template.category,
      blocks: JSON.parse(JSON.stringify(template.blocks)),
      branding: template.branding,
    });
  }, [saveTemplateMutation]);

  // PDF export
  const handleExportPdf = useCallback(async (doc?: Partial<OfficeDocument>) => {
    const target = doc || editingDoc;
    if (!target) return;
    try {
      const pdf = await exportDocumentToPdf(
        target.title || "Dokument",
        target.blocks || [],
        target.branding
      );
      pdf.save(`${target.title || "Dokument"}.pdf`);
      toast({ title: "PDF exportiert" });
    } catch (err) {
      toast({ title: "PDF-Fehler", description: "Export fehlgeschlagen.", variant: "destructive" });
    }
  }, [editingDoc]);

  // Editor view
  if (view === "editor" && editingDoc) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <DocumentEditor
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
      <div>
        <h1 className="text-2xl font-bold">Mein Office</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dokumente, Vorlagen und Formulare für deinen Arbeitsalltag
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Dokumente
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Vorlagen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <DocumentList
            documents={documents}
            onOpenDocument={handleOpenDocument}
            onDeleteDocument={(id) => deleteDocMutation.mutate(id)}
            onExportPdf={(doc) => handleExportPdf(doc)}
            horses={horses}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateGallery
            templates={templates}
            onSelectTemplate={handleUseTemplate}
            onCreateFromPreset={handleCreateFromPreset}
            onCreateBlank={handleCreateBlank}
            onDuplicateTemplate={handleDuplicateTemplate}
            onDeleteTemplate={(id) => deleteTemplateMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
