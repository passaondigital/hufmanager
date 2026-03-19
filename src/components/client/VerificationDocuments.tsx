import { useState } from "react";
import { Upload, FileText, Shield, Check, X, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useClientMode, type ClientMode } from "@/hooks/useClientMode";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerificationDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string | null;
  status: string;
  rejection_reason: string | null;
  uploaded_at: string;
}

const REQUIRED_DOCS: Record<string, { type: string; label: string; description: string; required: boolean }[]> = {
  stall: [
    { type: "gewerbeschein", label: "Gewerbeschein", description: "Gewerbeanmeldung oder Handelsregisterauszug", required: true },
    { type: "paragraph_11", label: "§11 Erlaubnis (TierSchG)", description: "Erlaubnis nach §11 Tierschutzgesetz für die gewerbsmäßige Haltung", required: true },
    { type: "insurance", label: "Betriebshaftpflicht", description: "Nachweis der Betriebshaftpflichtversicherung", required: false },
  ],
  commercial: [
    { type: "gewerbeschein", label: "Gewerbeschein", description: "Gewerbeanmeldung oder Handelsregisterauszug", required: true },
    { type: "tax_number", label: "Steuernummer / USt-ID", description: "Nachweis der Steuernummer oder Umsatzsteuer-ID", required: false },
    { type: "qualification", label: "Qualifikationsnachweis", description: "Meisterbrief, Zertifikate oder Berufsnachweis", required: false },
  ],
};

export function VerificationDocuments({ mode }: { mode: ClientMode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const docs = REQUIRED_DOCS[mode] || [];

  const { data: uploadedDocs = [], isLoading } = useQuery({
    queryKey: ["verification-docs", user?.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("client_verification_documents" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false }) as any);
      return (data || []) as VerificationDocument[];
    },
    enabled: !!user,
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ type, name, file }: { type: string; name: string; file?: File }) => {
      let fileUrl: string | null = null;

      if (file) {
        const filePath = `verification/${user!.id}/${type}_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("client-documents")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("client-documents")
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      const { error } = await (supabase
        .from("client_verification_documents" as any)
        .insert({
          user_id: user!.id,
          document_type: type,
          document_name: name,
          file_url: fileUrl,
        }) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification-docs", user?.id] });
      toast.success("Dokument hochgeladen!");
    },
    onError: () => toast.error("Fehler beim Hochladen."),
  });

  const getDocStatus = (type: string): VerificationDocument | undefined => {
    return uploadedDocs.find((d) => d.document_type === type);
  };

  const handleFileUpload = (type: string, label: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadDoc.mutate({ type, name: label, file });
      }
    };
    input.click();
  };

  if (docs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Verifizierungsdokumente</h3>
          <p className="text-xs text-muted-foreground">
            Lade die erforderlichen Dokumente hoch, damit wir deinen Account prüfen können.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {docs.map((doc) => {
          const uploaded = getDocStatus(doc.type);
          const statusColor = !uploaded
            ? "border-border"
            : uploaded.status === "approved"
              ? "border-green-500/30 bg-green-500/5"
              : uploaded.status === "rejected"
                ? "border-destructive/30 bg-destructive/5"
                : "border-amber-500/30 bg-amber-500/5";

          return (
            <div
              key={doc.type}
              className={cn("p-3 rounded-xl border transition-all", statusColor)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{doc.label}</p>
                    {doc.required && (
                      <span className="text-[10px] font-medium text-destructive">Pflicht</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>

                  {uploaded && (
                    <div className="mt-2 flex items-center gap-2">
                      {uploaded.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> Wird geprüft
                        </span>
                      )}
                      {uploaded.status === "approved" && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3" /> Bestätigt
                        </span>
                      )}
                      {uploaded.status === "rejected" && (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            <X className="h-3 w-3" /> Abgelehnt
                          </span>
                          {uploaded.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">{uploaded.rejection_reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(!uploaded || uploaded.status === "rejected") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => handleFileUpload(doc.type, doc.label)}
                    disabled={uploadDoc.isPending}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploaded?.status === "rejected" ? "Erneut" : "Upload"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Akzeptierte Formate</p>
        <p>PDF, JPG oder PNG • Max. 10 MB pro Datei • Dokumente werden verschlüsselt gespeichert</p>
      </div>
    </div>
  );
}
