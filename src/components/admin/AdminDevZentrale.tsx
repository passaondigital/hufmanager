import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, 
  RefreshCw, 
  Loader2,
  Bug,
  Lightbulb,
  Sparkles,
  CheckSquare,
  GripVertical,
  Trash2,
  Edit
} from "lucide-react";
import { format } from "date-fns";

interface AdminNote {
  id: string;
  title: string;
  content: string | null;
  type: "bug" | "idea" | "prompt" | "task";
  status: "inbox" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-500" },
  idea: { label: "Idee", icon: Lightbulb, color: "text-yellow-500" },
  prompt: { label: "Prompt", icon: Sparkles, color: "text-purple-500" },
  task: { label: "Task", icon: CheckSquare, color: "text-blue-500" },
};

const STATUS_CONFIG: Record<string, { label: string; column: string }> = {
  inbox: { label: "Inbox / Ideen", column: "inbox" },
  in_progress: { label: "In Arbeit", column: "in_progress" },
  done: { label: "Erledigt", column: "done" },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Niedrig", variant: "outline" },
  normal: { label: "Normal", variant: "secondary" },
  high: { label: "Hoch", variant: "default" },
  urgent: { label: "Urgent", variant: "destructive" },
};

export function AdminDevZentrale() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<AdminNote | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<AdminNote["type"]>("idea");
  const [formPriority, setFormPriority] = useState<AdminNote["priority"]>("normal");

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes((data || []) as AdminNote[]);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Fehler beim Laden der Notizen");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error("Titel erforderlich");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_notes")
        .insert({
          title: formTitle,
          content: formContent || null,
          type: formType,
          priority: formPriority,
          status: "inbox",
          created_by: user?.id,
        });

      if (error) throw error;
      toast.success("Notiz erstellt");
      setCreateOpen(false);
      resetForm();
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editNote || !formTitle.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_notes")
        .update({
          title: formTitle,
          content: formContent || null,
          type: formType,
          priority: formPriority,
        })
        .eq("id", editNote.id);

      if (error) throw error;
      toast.success("Notiz aktualisiert");
      setEditNote(null);
      resetForm();
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Aktualisieren");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (noteId: string, newStatus: AdminNote["status"]) => {
    try {
      const { error } = await supabase
        .from("admin_notes")
        .update({ status: newStatus })
        .eq("id", noteId);

      if (error) throw error;
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, status: newStatus } : n));
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Verschieben");
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("admin_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      toast.success("Notiz gelöscht");
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Löschen");
    }
  };

  const openEditDialog = (note: AdminNote) => {
    setEditNote(note);
    setFormTitle(note.title);
    setFormContent(note.content || "");
    setFormType(note.type);
    setFormPriority(note.priority);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormType("idea");
    setFormPriority("normal");
  };

  const getNotesByStatus = (status: AdminNote["status"]) => {
    return notes.filter(n => n.status === status);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dev-Zentrale</h2>
          <p className="text-muted-foreground">
            {notes.length} Notizen • Dein zweiter Mitarbeiter
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchNotes} size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Neue Notiz
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["inbox", "in_progress", "done"] as const).map((status) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{STATUS_CONFIG[status].label}</h3>
              <Badge variant="outline">{getNotesByStatus(status).length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px] p-2 bg-muted/30 rounded-lg">
              {getNotesByStatus(status).map((note) => {
                const TypeIcon = TYPE_CONFIG[note.type].icon;
                return (
                  <Card key={note.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`w-4 h-4 ${TYPE_CONFIG[note.type].color}`} />
                          <span className="font-medium text-sm line-clamp-1">{note.title}</span>
                        </div>
                        <Badge variant={PRIORITY_CONFIG[note.priority].variant} className="text-xs shrink-0">
                          {PRIORITY_CONFIG[note.priority].label}
                        </Badge>
                      </div>
                      {note.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{note.content}</p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), "dd.MM.yy")}
                        </span>
                        <div className="flex gap-1">
                          {status !== "inbox" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(note.id, status === "done" ? "in_progress" : "inbox");
                              }}
                            >
                              ←
                            </Button>
                          )}
                          {status !== "done" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(note.id, status === "inbox" ? "in_progress" : "done");
                              }}
                            >
                              →
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(note);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(note.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {getNotesByStatus(status).length === 0 && (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                  Keine Einträge
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Notiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input
                placeholder="Was ist zu tun?"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                placeholder="Details..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as AdminNote["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as AdminNote["priority"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editNote} onOpenChange={(open) => { if (!open) { setEditNote(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notiz bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as AdminNote["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as AdminNote["priority"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditNote(null); resetForm(); }}>Abbrechen</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
