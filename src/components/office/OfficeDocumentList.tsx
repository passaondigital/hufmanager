import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText, Search, Trash2, FileDown, Edit, Calendar,
  CheckCircle2, FileEdit, LayoutGrid, List, Heart,
  Archive, MoreHorizontal, Blocks,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ExtendedCanvasDocument } from "@/pages/MeinOffice";

const COLOR_TAG_CLASSES: Record<string, string> = {
  default: "bg-primary/40",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
};

const STATUS_CONFIG = {
  draft: { label: "Entwurf", icon: FileEdit, className: "bg-muted text-muted-foreground" },
  completed: { label: "Fertig", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  archived: { label: "Archiviert", icon: Archive, className: "bg-muted/60 text-muted-foreground/60" },
};

interface OfficeDocumentListProps {
  documents: ExtendedCanvasDocument[];
  onOpenDocument: (doc: ExtendedCanvasDocument) => void;
  onDeleteDocument: (id: string) => void;
  onExportPdf: (doc: ExtendedCanvasDocument) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
  onArchive: (id: string) => void;
  isArchiveView?: boolean;
}

export function OfficeDocumentList({
  documents, onOpenDocument, onDeleteDocument, onExportPdf,
  onToggleFavorite, onArchive, isArchiveView,
}: OfficeDocumentListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(documents.length > 6 ? "list" : "grid");

  const filtered = documents.filter((doc) => {
    const matchesSearch = !search ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.horse_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dokument suchen..." className="pl-9 h-9" />
        </div>
        <div className="flex gap-1 items-center">
          {!isArchiveView && [
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
          <div className="h-5 w-px bg-border mx-1" />
          <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded", viewMode === "grid" ? "bg-muted" : "text-muted-foreground hover:bg-muted/50")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded", viewMode === "list" ? "bg-muted" : "text-muted-foreground hover:bg-muted/50")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={() => onOpenDocument(doc)}
              onDelete={() => onDeleteDocument(doc.id!)}
              onExport={() => onExportPdf(doc)}
              onToggleFavorite={() => onToggleFavorite(doc.id!, !doc.is_favorite)}
              onArchive={() => onArchive(doc.id!)}
              isArchiveView={isArchiveView}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={() => onOpenDocument(doc)}
              onDelete={() => onDeleteDocument(doc.id!)}
              onExport={() => onExportPdf(doc)}
              onToggleFavorite={() => onToggleFavorite(doc.id!, !doc.is_favorite)}
              onArchive={() => onArchive(doc.id!)}
              isArchiveView={isArchiveView}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && documents.length > 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Keine Dokumente für diesen Filter gefunden.</p>
        </div>
      )}
    </div>
  );
}

// Grid Card
function DocumentCard({
  doc, onOpen, onDelete, onExport, onToggleFavorite, onArchive, isArchiveView,
}: {
  doc: ExtendedCanvasDocument;
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  isArchiveView?: boolean;
}) {
  const status = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden hover:border-primary/40 transition-all group cursor-pointer" onClick={onOpen}>
      <div className={cn("h-1.5", COLOR_TAG_CLASSES[doc.color_tag || "default"])} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", status.className)}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{doc.title}</h4>
            {(doc.horse_name || doc.template_type) && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {[doc.horse_name, doc.template_type && CATEGORY_LABELS[doc.template_type]].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", status.className)}>
                {status.label}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Blocks className="h-3 w-3" />
                {doc.blocks?.length || 0}
              </span>
              {doc.updated_at && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(doc.updated_at), "dd. MMM yy", { locale: de })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
          >
            <Heart className={cn("h-4 w-4", doc.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground/40")} />
          </button>
        </div>
        <div className="flex gap-1 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={onOpen}>
            <Edit className="h-3 w-3" /> Bearbeiten
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onExport}>
            <FileDown className="h-3.5 w-3.5" />
          </Button>
          <DocumentActions doc={doc} onDelete={onDelete} onArchive={onArchive} isArchiveView={isArchiveView} />
        </div>
      </div>
    </Card>
  );
}

// List Row
function DocumentRow({
  doc, onOpen, onDelete, onExport, onToggleFavorite, onArchive, isArchiveView,
}: {
  doc: ExtendedCanvasDocument;
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  isArchiveView?: boolean;
}) {
  const status = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/40 transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <div className={cn("p-1.5 rounded-md shrink-0", status.className)}>
        <StatusIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{doc.title}</h4>
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", status.className)}>
            {status.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {[
            doc.horse_name,
            doc.updated_at && format(new Date(doc.updated_at), "dd.MM.yy", { locale: de }),
            `${doc.blocks?.length || 0} Bausteine`,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={onToggleFavorite} className="p-1.5 rounded hover:bg-muted transition-colors">
          <Heart className={cn("h-3.5 w-3.5", doc.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground/40")} />
        </button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onExport}>
          <FileDown className="h-3.5 w-3.5" />
        </Button>
        <DocumentActions doc={doc} onDelete={onDelete} onArchive={onArchive} isArchiveView={isArchiveView} />
      </div>
    </div>
  );
}

function DocumentActions({
  doc, onDelete, onArchive, isArchiveView,
}: {
  doc: ExtendedCanvasDocument;
  onDelete: () => void;
  onArchive: () => void;
  isArchiveView?: boolean;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isArchiveView && (
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archivieren
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
          <AlertDialogDescription>„{doc.title}" wird unwiderruflich gelöscht.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  protokoll: "Protokoll",
  aufnahme: "Aufnahme",
  verlauf: "Verlauf",
  analyse: "Analyse",
  uebergabe: "Übergabe",
  kommunikation: "Kommunikation",
  verwaltung: "Verwaltung",
  notfall: "Notfall",
};
