import { OfficeDocument } from "./types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Trash2, FileDown, Edit, Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";

interface DocumentListProps {
  documents: OfficeDocument[];
  onOpenDocument: (doc: OfficeDocument) => void;
  onDeleteDocument: (id: string) => void;
  onExportPdf: (doc: OfficeDocument) => void;
  horses?: { id: string; name: string }[];
}

export function DocumentList({ documents, onOpenDocument, onDeleteDocument, onExportPdf, horses }: DocumentListProps) {
  const [search, setSearch] = useState("");
  const [horseFilter, setHorseFilter] = useState<string>("all");

  const filtered = documents.filter((doc) => {
    const matchesSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase());
    const matchesHorse = horseFilter === "all" || doc.horse_id === horseFilter;
    return matchesSearch && matchesHorse;
  });

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium mb-1">Noch keine Dokumente</h3>
        <p className="text-sm text-muted-foreground">Erstelle dein erstes Dokument über eine Vorlage oder starte leer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dokument suchen..."
            className="pl-9"
          />
        </div>
        {horses && horses.length > 0 && (
          <Select value={horseFilter} onValueChange={setHorseFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pferd filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Pferde</SelectItem>
              {horses.map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <Card key={doc.id} className="p-4 hover:border-primary/50 transition-all group">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={doc.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                    {doc.status === "completed" ? "Abgeschlossen" : "Entwurf"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(doc.updated_at), "dd.MM.yy", { locale: de })}
                  </span>
                </div>
                <div className="flex gap-1 mt-3">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onOpenDocument(doc)}>
                    <Edit className="h-3 w-3" /> Öffnen
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onExportPdf(doc)}>
                    <FileDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDeleteDocument(doc.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
