import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote, Save, Loader2, CheckCircle, Bell, Bot, User,
} from "lucide-react";
import {
  createAccountNote, fetchAccountNotes, resolveAccountNote,
} from "@/services/accountNotesService";
import { toast } from "sonner";

interface AccountNotesPanelProps {
  accountId: string;
  accountType?: string;
}

export function AccountNotesPanel({ accountId, accountType = "provider" }: AccountNotesPanelProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAccountNotes(accountId);
      setNotes(data);
    } catch (err) {
      console.error("Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const { error } = await createAccountNote({
        accountId,
        accountType,
        noteText: noteText.trim(),
        reminderAt: reminderDate || null,
      });
      if (error) throw error;
      toast.success("Notiz gespeichert");
      setNoteText("");
      setReminderDate("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (noteId: string) => {
    const { error } = await resolveAccountNote(noteId);
    if (error) {
      toast.error("Fehler beim Markieren");
    } else {
      toast.success("Als erledigt markiert");
      load();
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const isOverdue = (reminderAt: string | null) => {
    if (!reminderAt) return false;
    return new Date(reminderAt) <= new Date();
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <StickyNote className="w-4 h-4 text-primary" />
        Admin-Notizen ({notes.length})
      </div>

      {/* Add note */}
      <div className="space-y-2">
        <Textarea
          placeholder="Neue Admin-Notiz…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          className="text-xs"
        />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="h-7 text-xs w-auto"
              placeholder="Erinnerung"
            />
            {reminderDate && (
              <span className="text-[10px] text-muted-foreground">Erinnerung</span>
            )}
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || !noteText.trim()} className="h-7 text-xs gap-1">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">Keine Notizen vorhanden.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-2 text-[11px] rounded-md px-2.5 py-1.5 border ${
                n.resolved_at
                  ? "bg-muted/30 border-border opacity-60"
                  : n.is_system
                  ? "bg-primary/5 border-primary/10"
                  : "bg-background border-border"
              }`}
            >
              {n.is_system ? (
                <Bot className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              ) : (
                <User className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className={n.resolved_at ? "line-through" : ""}>{n.note_text}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-muted-foreground">{formatDate(n.created_at)}</span>
                  {n.reminder_at && !n.resolved_at && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${
                        isOverdue(n.reminder_at)
                          ? "border-destructive/30 text-destructive"
                          : "border-primary/20 text-primary"
                      }`}
                    >
                      <Bell className="w-2.5 h-2.5 mr-0.5" />
                      {new Date(n.reminder_at).toLocaleDateString("de-DE")}
                    </Badge>
                  )}
                  {n.resolved_at && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                      erledigt
                    </Badge>
                  )}
                </div>
              </div>
              {!n.resolved_at && !n.is_system && (
                <button
                  onClick={() => handleResolve(n.id)}
                  className="p-0.5 hover:bg-muted rounded shrink-0"
                  title="Als erledigt markieren"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-green-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
