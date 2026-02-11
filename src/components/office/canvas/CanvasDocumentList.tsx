import { CanvasDocument } from "./types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Search, Trash2, FileDown, Edit, Calendar, CheckCircle2, FileEdit, Layers } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CanvasDocumentListProps {
  documents: CanvasDocument[];
  onOpenDocument: (doc: CanvasDocument) => void;
  onDeleteDocument: (id: string) => void;
  onExportPdf: (doc: CanvasDocument) => void;
}

export function CanvasDocumentList({ documents, onOpenDocument, onDeleteDocument, onExportPdf }: CanvasDocumentListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = documents.filter((doc) => {
    const matchesSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-medium mb-1">Noch keine Dokumente</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Wähle eine Vorlage oder starte mit einem leeren Dokument.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-4 w-4" />
          <span>{documents.length} gesamt</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dokument suchen..." className="pl-9" />
        </div>
        <div className="flex gap-1 items-center">
          {[
            { value: "all", label: "Alle" },
            { value: "draft", label: "Entwürfe" },
            { value: "completed", label: "Fertig" },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                statusFilter === s.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <Card key={doc.id} className="overflow-hidden hover:border-primary/40 transition-all group cursor-pointer" onClick={() => onOpenDocument(doc)}>
            <div className={cn("h-1", doc.status === "completed" ? "bg-emerald-500" : "bg-primary/40")} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", doc.status === "completed" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted")}>
                  {doc.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.updated_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.updated_at), "dd. MMM yy", { locale: de })}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{doc.blocks?.length || 0} Bausteine</span>
                </div>
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => onOpenDocument(doc)}>
                  <Edit className="h-3 w-3" /> Bearbeiten
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onExportPdf(doc)}>
                  <FileDown className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
                      <AlertDialogDescription>„{doc.title}" wird unwiderruflich gelöscht.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteDocument(doc.id!)} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && documents.length > 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Keine Dokumente für diesen Filter gefunden.</p>
        </div>
      )}
    </div>
  );
}
