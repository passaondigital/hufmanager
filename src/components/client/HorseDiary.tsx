import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Star, AlertTriangle, Pill, StickyNote, Loader2, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface DiaryEntry {
  id: string;
  category: string;
  text: string;
  photo_url: string | null;
  shared_with_provider: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "moment", label: "Besonderer Moment", icon: Star, emoji: "🌟" },
  { value: "concern", label: "Auffälligkeit", icon: AlertTriangle, emoji: "⚠️" },
  { value: "treatment", label: "Behandlung", icon: Pill, emoji: "💊" },
  { value: "note", label: "Notiz", icon: StickyNote, emoji: "📝" },
] as const;

function getCategoryConfig(category: string) {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[3];
}

interface HorseDiaryProps {
  horseId: string;
}

export function HorseDiary({ horseId }: HorseDiaryProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<string>("note");
  const [shareWithProvider, setShareWithProvider] = useState(false);

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("horse_diary_entries")
      .select("*")
      .eq("horse_id", horseId)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEntries(data as DiaryEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [horseId, user]);

  const handleSave = async () => {
    if (!user || !newText.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from("horse_diary_entries")
      .insert({
        horse_id: horseId,
        owner_id: user.id,
        category: newCategory,
        text: newText.trim(),
        shared_with_provider: shareWithProvider,
      });

    if (error) {
      toast.error("Speichern fehlgeschlagen");
    } else {
      toast.success("Eintrag gespeichert!");
      setNewText("");
      setNewCategory("note");
      setShareWithProvider(false);
      setShowForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("horse_diary_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success("Eintrag gelöscht");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Entry Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Neuer Eintrag
        </Button>
      )}

      {/* New Entry Form */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Category Selection */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat.value}
                  variant={newCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setNewCategory(cat.value)}
                >
                  <span>{cat.emoji}</span>
                  <span className="text-xs">{cat.label}</span>
                </Button>
              ))}
            </div>

            {/* Text */}
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Was möchtest du festhalten?"
              rows={3}
            />

            {/* Share toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Mit Hufpfleger teilen</Label>
              </div>
              <Switch checked={shareWithProvider} onCheckedChange={setShareWithProvider} />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !newText.trim()} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      {entries.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-8 text-center">
            <StickyNote className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Noch keine Einträge</p>
            <p className="text-xs text-muted-foreground mt-1">
              Halte besondere Momente, Auffälligkeiten oder Notizen zu deinem Pferd fest.
            </p>
          </CardContent>
        </Card>
      ) : (
        entries.map(entry => {
          const cat = getCategoryConfig(entry.category);
          return (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{cat.emoji}</span>
                      <Badge variant="secondary" className="text-xs">{cat.label}</Badge>
                      {entry.shared_with_provider && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Share2 className="h-3 w-3" />
                          Geteilt
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{entry.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(entry.created_at), "dd. MMMM yyyy, HH:mm", { locale: de })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
