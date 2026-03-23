import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Notebook,
  Plus,
  Trash2,
  Search,
  Image as ImageIcon,
  X,
  StickyNote,
  Lock,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NotebookEntry {
  id: string;
  title: string;
  content: string;
  images: string[]; // base64
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "hm-employee-notebook";

function loadEntries(): NotebookEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: NotebookEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const EmployeeNotizbuch = () => {
  
  const [entries, setEntries] = useState<NotebookEntry[]>(loadEntries);
  const [search, setSearch] = useState("");
  const [editEntry, setEditEntry] = useState<NotebookEntry | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Max. 5 MB pro Bild");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    if (editEntry) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editEntry.id ? { ...e, title, content, images, updated_at: now } : e
        )
      );
    } else {
      const newEntry: NotebookEntry = {
        id: crypto.randomUUID(),
        title,
        content,
        images,
        created_at: now,
        updated_at: now,
      };
      setEntries((prev) => [newEntry, ...prev]);
    }
    resetForm();
    toast.success("Notiz wurde lokal gespeichert.");
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Gelöscht" });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setEditEntry(null);
    setShowNew(false);
  };

  const openEdit = (entry: NotebookEntry) => {
    setEditEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setImages(entry.images);
    setShowNew(true);
  };

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Notebook className="h-5 w-5 text-primary" />
            Mein Notizbuch
            <HelpTip id="mitarbeiter.notizbuch" />
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Lock className="h-3 w-3" />
            Nur lokal gespeichert – dein Provider hat keinen Zugriff
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Neue Notiz</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Notizen durchsuchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{search ? "Keine Treffer" : "Noch keine Notizen"}</p>
            <p className="text-sm">
              {search
                ? "Versuche einen anderen Suchbegriff"
                : "Erstelle deine erste private Notiz"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => openEdit(entry)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm truncate flex-1">{entry.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 -mr-1 -mt-1 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{entry.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.updated_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </span>
                  {entry.images.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {entry.images.length}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={showNew} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Notiz bearbeiten" : "Neue Notiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Titel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Deine Notiz..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
            {/* Images */}
            <div>
              <label className="text-sm font-medium mb-2 block">Bilder</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ImageIcon className="h-4 w-4" />
                  Bild hinzufügen
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeNotizbuch;
