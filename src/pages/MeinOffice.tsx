import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { FileText, Plus, LayoutTemplate, FolderOpen, Star, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasDocument, CanvasBlock } from "@/components/office/canvas/types";
import { FARRIER_TEMPLATES } from "@/components/office/canvas/templates";
import { OfficeDocumentList } from "@/components/office/OfficeDocumentList";
import { OfficeTemplateGallery } from "@/components/office/OfficeTemplateGallery";
import { OfficeRenameDialog } from "@/components/office/OfficeRenameDialog";
import { OfficeEmptyState } from "@/components/office/OfficeEmptyState";
import { OfficeStatsBar } from "@/components/office/OfficeStatsBar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type TabId = "documents" | "templates" | "favorites" | "archive";

export default function MeinOffice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("documents");
  const [renameDoc, setRenameDoc] = useState<ExtendedCanvasDocument | null>(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["office-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_documents")
        .select("*")
        .eq("provider_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        provider_id: d.provider_id,
        title: d.title,
        blocks: (d.blocks as unknown as CanvasBlock[]) || [],
        branding: d.branding as unknown as CanvasDocument["branding"],
        horse_id: d.horse_id || undefined,
        horse_name: d.horse_name || undefined,
        contact_id: d.contact_id || undefined,
        status: (d.status || "draft") as "draft" | "completed" | "archived",
        template_id: d.template_id || undefined,
        template_type: d.template_type || undefined,
        color_tag: d.color_tag || "default",
        is_favorite: d.is_favorite || false,
        created_at: d.created_at,
        updated_at: d.updated_at,
        last_edited_at: d.last_edited_at || d.updated_at,
        pdf_url: d.pdf_url || undefined,
        pdf_generated_at: d.pdf_generated_at || undefined,
      })) as ExtendedCanvasDocument[];
    },
    enabled: !!user,
  });

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

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from("office_documents").update({ is_favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-documents"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_documents").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-documents"] });
      toast({ title: "Dokument archiviert" });
    },
  });

  const handleCreateFromTemplate = useCallback(async (templateIndex: number) => {
    if (!user) return;
    const template = FARRIER_TEMPLATES[templateIndex];
    const dateStr = format(new Date(), "dd.MM.yy", { locale: de });
    const payload = {
      provider_id: user.id,
      title: `${template.name} – ${dateStr}`,
      blocks: JSON.parse(JSON.stringify(template.blocks)) as Json,
      branding: JSON.parse(JSON.stringify(template.branding || {})) as Json,
      template_id: template.id,
      template_type: template.category,
      status: "draft",
      color_tag: "default",
      is_favorite: false,
      last_edited_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("office_documents").insert(payload).select().single();
    if (error) {
      toast({ title: "Fehler", description: "Dokument konnte nicht erstellt werden.", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["office-documents"] });
    navigate(`/mein-office/${data.id}`);
  }, [user, queryClient, navigate]);

  const handleCreateBlank = useCallback(async () => {
    if (!user) return;
    const payload = {
      provider_id: user.id,
      title: "Neues Dokument",
      blocks: "[]" as unknown as Json,
      status: "draft",
      color_tag: "default",
      is_favorite: false,
      last_edited_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("office_documents").insert(payload).select().single();
    if (error) {
      toast({ title: "Fehler", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["office-documents"] });
    // Open rename dialog, then navigate
    setRenameDoc({
      id: data.id,
      title: "Neues Dokument",
      blocks: [],
      status: "draft",
      color_tag: "default",
      is_favorite: false,
    } as ExtendedCanvasDocument);
  }, [user, queryClient]);

  const handleOpenDocument = useCallback((doc: ExtendedCanvasDocument) => {
    if (doc.title === "Neues Dokument" || !doc.title) {
      setRenameDoc(doc);
    } else {
      navigate(`/mein-office/${doc.id}`);
    }
  }, [navigate]);

  const handleRenameConfirm = useCallback((title: string) => {
    if (!renameDoc?.id) return;
    supabase.from("office_documents").update({ title }).eq("id", renameDoc.id).then();
    queryClient.invalidateQueries({ queryKey: ["office-documents"] });
    setRenameDoc(null);
    navigate(`/mein-office/${renameDoc.id}`);
  }, [renameDoc, queryClient, navigate]);

  const handleExportPdf = useCallback(async (doc: ExtendedCanvasDocument) => {
    // Navigate to editor which handles PDF export
    navigate(`/mein-office/${doc.id}`);
  }, [navigate]);

  // Filtered lists
  const activeDocuments = useMemo(() => documents.filter(d => d.status !== "archived"), [documents]);
  const favoriteDocuments = useMemo(() => documents.filter(d => d.is_favorite && d.status !== "archived"), [documents]);
  const archivedDocuments = useMemo(() => documents.filter(d => d.status === "archived"), [documents]);

  // Stats
  const stats = useMemo(() => ({
    total: activeDocuments.length,
    pdfs: documents.filter(d => d.pdf_generated_at).length,
    completed: documents.filter(d => d.status === "completed").length,
    avgBlocks: activeDocuments.length > 0 ? Math.round(activeDocuments.reduce((s, d) => s + (d.blocks?.length || 0), 0) / activeDocuments.length) : 0,
  }), [documents, activeDocuments]);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: "documents", label: "Dokumente", icon: FolderOpen, count: activeDocuments.length || undefined },
    { id: "templates", label: "Vorlagen", icon: LayoutTemplate },
    { id: "favorites", label: "Favoriten", icon: Star, count: favoriteDocuments.length || undefined },
    { id: "archive", label: "Archiv", icon: Archive, count: archivedDocuments.length || undefined },
  ];

  const currentDocs = activeTab === "favorites" ? favoriteDocuments
    : activeTab === "archive" ? archivedDocuments
    : activeDocuments;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Mein Office
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={handleCreateBlank} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Neues Dokument</span>
          </Button>
          <Button onClick={() => setActiveTab("templates")} size="sm" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Aus Vorlage</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {activeDocuments.length > 0 && <OfficeStatsBar stats={stats} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count ? (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "templates" ? (
        <OfficeTemplateGallery
          onSelectTemplate={handleCreateFromTemplate}
          onCreateBlank={handleCreateBlank}
        />
      ) : currentDocs.length === 0 && activeTab === "documents" ? (
        <OfficeEmptyState
          onCreateBlank={handleCreateBlank}
          onSelectTemplate={() => {
            handleCreateFromTemplate(0);
          }}
          onShowTemplates={() => setActiveTab("templates")}
        />
      ) : currentDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            {activeTab === "favorites" ? <Star className="h-8 w-8 text-muted-foreground/40" /> : <Archive className="h-8 w-8 text-muted-foreground/40" />}
          </div>
          <h3 className="text-lg font-medium mb-1">
            {activeTab === "favorites" ? "Keine Favoriten" : "Kein Archiv"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {activeTab === "favorites"
              ? "Markiere Dokumente mit ♡ als Favoriten für schnellen Zugriff."
              : "Archivierte Dokumente werden hier angezeigt."}
          </p>
        </div>
      ) : (
        <OfficeDocumentList
          documents={currentDocs}
          onOpenDocument={handleOpenDocument}
          onDeleteDocument={(id) => deleteDocMutation.mutate(id)}
          onExportPdf={handleExportPdf}
          onToggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, is_favorite: fav })}
          onArchive={(id) => archiveMutation.mutate(id)}
          isArchiveView={activeTab === "archive"}
        />
      )}

      {/* Rename Dialog */}
      <OfficeRenameDialog
        open={!!renameDoc}
        onOpenChange={(open) => { if (!open) setRenameDoc(null); }}
        currentTitle={renameDoc?.title || ""}
        onConfirm={handleRenameConfirm}
      />

      {/* Mobile FAB */}
      <button
        onClick={handleCreateBlank}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors md:hidden"
        aria-label="Neues Dokument"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

// Extended type with new fields
export interface ExtendedCanvasDocument extends CanvasDocument {
  horse_name?: string;
  template_type?: string;
  color_tag?: string;
  is_favorite?: boolean;
  last_edited_at?: string;
  pdf_generated_at?: string;
  pdf_url?: string;
}
