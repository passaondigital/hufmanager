import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Clock, FileText, Send, CheckCircle, Ban, Loader2, Save, Plus,
  ScrollText, Bot, User,
} from "lucide-react";
import { fetchDocumentEvents, logDocumentEvent } from "@/services/accountNotesService";
import { toast } from "sonner";

interface DocumentHistoryProps {
  documentId: string;
  documentType: "invoice" | "contract";
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  created: <FileText className="w-3 h-3 text-primary" />,
  pdf_generated: <FileText className="w-3 h-3 text-muted-foreground" />,
  sent: <Send className="w-3 h-3 text-blue-500" />,
  paid: <CheckCircle className="w-3 h-3 text-green-600" />,
  cancelled: <Ban className="w-3 h-3 text-destructive" />,
  storno: <Ban className="w-3 h-3 text-destructive" />,
  amendment: <ScrollText className="w-3 h-3 text-primary" />,
  note: <User className="w-3 h-3 text-muted-foreground" />,
  system: <Bot className="w-3 h-3 text-primary" />,
};

const EVENT_LABELS: Record<string, string> = {
  created: "Erstellt",
  pdf_generated: "PDF generiert",
  sent: "Per E-Mail versendet",
  paid: "Als bezahlt markiert",
  cancelled: "Storniert",
  storno: "Stornorechnung erstellt",
  amendment: "Nachtrag erstellt",
  note: "Manuelle Notiz",
  status_change: "Status geändert",
};

export function DocumentHistory({ documentId, documentType }: DocumentHistoryProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDocumentEvents(documentId);
      setEvents(data);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [documentId]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const { error } = await logDocumentEvent({
        documentId,
        documentType,
        eventType: "note",
        eventData: { text: noteText.trim() },
      });
      if (error) throw error;
      toast.success("Notiz hinzugefügt");
      setNoteText("");
      setShowInput(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Historie
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-1.5"
          onClick={() => setShowInput(!showInput)}
        >
          <Plus className="w-3 h-3" /> Notiz
        </Button>
      </div>

      {showInput && (
        <div className="flex gap-1.5">
          <Textarea
            placeholder="Notiz zum Dokument…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={1}
            className="text-[11px] min-h-[28px]"
          />
          <Button size="sm" className="h-7 text-[10px] shrink-0" onClick={handleAddNote} disabled={saving || !noteText.trim()}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Keine Einträge.</p>
      ) : (
        <div className="relative pl-4 space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
          {events.map((e, i) => {
            const icon = EVENT_ICONS[e.event_type] || EVENT_ICONS.system;
            const label = EVENT_LABELS[e.event_type] || e.event_type;
            const detail = e.event_data?.text || e.event_data?.detail || "";
            const email = e.event_data?.email || "";

            return (
              <div key={e.id} className="relative flex items-start gap-2 py-1">
                <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-background border border-border flex items-center justify-center z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div className="text-[10px] leading-relaxed">
                  <span className="text-muted-foreground">[{formatDate(e.created_at)}]</span>{" "}
                  <span className="font-medium">{label}</span>
                  {detail && <span className="text-muted-foreground"> – {detail}</span>}
                  {email && <span className="text-muted-foreground"> an {email}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
