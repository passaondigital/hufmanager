import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { CanvasEditor } from "@/components/office/canvas/CanvasEditor";
import { CanvasDocument, CanvasBlock } from "@/components/office/canvas/types";
import { exportCanvasToPdf } from "@/components/office/canvas/canvasPdfExport";
import { OfficePdfShareDialog } from "@/components/office/OfficePdfShareDialog";
import { Loader2 } from "lucide-react";

export default function OfficeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingDoc, setEditingDoc] = useState<CanvasDocument | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [pdfShareOpen, setPdfShareOpen] = useState(false);

  // Load document from DB
  const { data: dbDoc, isLoading } = useQuery({
    queryKey: ["office-doc", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_documents")
        .select("*")
        .eq("id", id!)
        .eq("provider_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user && id !== "neu",
  });

  // Load horses for horse picker
  const { data: horses = [] } = useQuery({
    queryKey: ["horses-for-office", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name, breed")
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  // Initialize editing doc from DB data
  useEffect(() => {
    if (dbDoc && !editingDoc) {
      setEditingDoc({
        id: dbDoc.id,
        provider_id: dbDoc.provider_id,
        title: dbDoc.title,
        blocks: (dbDoc.blocks as unknown as CanvasBlock[]) || [],
        branding: dbDoc.branding as unknown as CanvasDocument["branding"],
        horse_id: dbDoc.horse_id || undefined,
        contact_id: dbDoc.contact_id || undefined,
        status: (dbDoc.status || "draft") as CanvasDocument["status"],
        template_id: dbDoc.template_id || undefined,
        created_at: dbDoc.created_at,
        updated_at: dbDoc.updated_at,
      });
    }
  }, [dbDoc, editingDoc]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  const handleDocChange = useCallback((doc: CanvasDocument) => {
    setEditingDoc(doc);
    setHasUnsaved(true);
  }, []);

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
        last_edited_at: new Date().toISOString(),
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
      queryClient.invalidateQueries({ queryKey: ["office-doc", id] });
      setHasUnsaved(false);
      if (editingDoc && !editingDoc.id) {
        setEditingDoc({ ...editingDoc, id: data.id });
        // Replace URL to new doc ID
        navigate(`/mein-office/${data.id}`, { replace: true });
      }
      toast({ title: "✓ Gespeichert" });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
    },
  });

  const handleExportPdf = useCallback(async () => {
    if (!editingDoc) return;
    const toastId = toast({ title: "📄 PDF wird erstellt..." });
    try {
      const pdf = await exportCanvasToPdf(editingDoc);
      pdf.save(`${editingDoc.title || "Dokument"}.pdf`);

      // Store in Supabase Storage
      if (user && editingDoc.id) {
        try {
          const pdfBytes = pdf.output("arraybuffer");
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const fileName = `${user.id}/${editingDoc.id}_${Date.now()}.pdf`;

          const { data: upload } = await supabase.storage
            .from("office-pdfs")
            .upload(fileName, blob, { upsert: true, contentType: "application/pdf" });

          if (upload) {
            const { data: urlData } = supabase.storage
              .from("office-pdfs")
              .getPublicUrl(fileName);

            await supabase
              .from("office_documents")
              .update({
                pdf_url: urlData.publicUrl,
                pdf_generated_at: new Date().toISOString(),
              })
              .eq("id", editingDoc.id);
          }
        } catch {
          // Storage upload failed silently – PDF was still downloaded
        }
      }

      toast({ title: "✅ PDF erstellt!" });
      setPdfShareOpen(true);
    } catch {
      toast({ title: "❌ PDF-Fehler", description: "Export fehlgeschlagen. Bitte erneut versuchen.", variant: "destructive" });
    }
  }, [editingDoc, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!editingDoc) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-muted-foreground">Dokument nicht gefunden.</p>
        <button onClick={() => navigate("/mein-office")} className="text-primary text-sm mt-2">
          ← Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)]">
      <CanvasEditor
        document={editingDoc}
        onChange={handleDocChange}
        onSave={() => saveMutation.mutate(editingDoc)}
        onExportPdf={handleExportPdf}
        onBack={() => navigate("/mein-office")}
        saving={saveMutation.isPending}
        horses={horses}
      />
      <OfficePdfShareDialog
        open={pdfShareOpen}
        onOpenChange={setPdfShareOpen}
        document={editingDoc as any}
      />
    </div>
  );
}
