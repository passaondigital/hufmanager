import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Loader2,
  Bug,
  Lightbulb,
  Sparkles,
  CheckSquare
} from "lucide-react";

interface AdminQuickNoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-500" },
  idea: { label: "Idee", icon: Lightbulb, color: "text-yellow-500" },
  prompt: { label: "Prompt", icon: Sparkles, color: "text-purple-500" },
  task: { label: "Task", icon: CheckSquare, color: "text-blue-500" },
};

export function AdminQuickNote({ open, onOpenChange }: AdminQuickNoteProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"bug" | "idea" | "prompt" | "task">("idea");

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Titel erforderlich");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_notes")
        .insert({
          title,
          content: content || null,
          type,
          priority: "normal",
          status: "inbox",
          created_by: user?.id,
        });

      if (error) throw error;
      toast.success("Notiz erstellt");
      onOpenChange(false);
      setTitle("");
      setContent("");
      setType("idea");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              placeholder="Was ist zu tun?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung (optional)</Label>
            <Textarea
              placeholder="Details..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Typ</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <Button
                  key={key}
                  type="button"
                  variant={type === key ? "default" : "outline"}
                  className="flex flex-col gap-1 h-auto py-2"
                  onClick={() => setType(key as typeof type)}
                >
                  <config.icon className={`w-5 h-5 ${type === key ? "" : config.color}`} />
                  <span className="text-xs">{config.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
