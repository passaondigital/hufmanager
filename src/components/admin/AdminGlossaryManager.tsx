import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  EyeOff,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

interface GlossaryEntry {
  id: string;
  term: string;
  description: string;
  category: string;
  icon: string | null;
  tags: string[];
  related_terms: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Kernfunktionen",
  "Dokumentation",
  "Finanzen",
  "Kommunikation",
  "Team",
  "Marketing",
  "Schnittstellen",
  "Technik",
  "Kunden-Portal",
  "Administration",
  "Rechtliches",
];

const emptyEntry = {
  term: "",
  description: "",
  category: "Kernfunktionen",
  icon: "",
  tags: "",
  related_terms: "",
  is_published: true,
  sort_order: 0,
};

export function AdminGlossaryManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [form, setForm] = useState(emptyEntry);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["glossary-admin"],
    queryFn: async () => {
      // Admin can see all entries (published + unpublished) via the admin policy
      const { data, error } = await supabase
        .from("glossary_entries")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as GlossaryEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: typeof form & { id?: string }) => {
      const payload = {
        term: entry.term,
        description: entry.description,
        category: entry.category,
        icon: entry.icon || null,
        tags: entry.tags ? entry.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        related_terms: entry.related_terms ? entry.related_terms.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        is_published: entry.is_published,
        sort_order: entry.sort_order,
      };

      if (entry.id) {
        const { error } = await supabase.from("glossary_entries").update(payload).eq("id", entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("glossary_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary-admin"] });
      toast.success(editingEntry ? "Eintrag aktualisiert" : "Eintrag erstellt");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("glossary_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary-admin"] });
      toast.success("Eintrag gelöscht");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("glossary_entries").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary-admin"] });
    },
  });

  const resetForm = () => {
    setForm(emptyEntry);
    setEditingEntry(null);
  };

  const openEdit = (entry: GlossaryEntry) => {
    setEditingEntry(entry);
    setForm({
      term: entry.term,
      description: entry.description,
      category: entry.category,
      icon: entry.icon || "",
      tags: entry.tags?.join(", ") || "",
      related_terms: entry.related_terms?.join(", ") || "",
      is_published: entry.is_published,
      sort_order: entry.sort_order,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const filtered = entries.filter((e) => {
    const matchesSearch = !search || e.term.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(entries.map((e) => e.category))];
  const publishedCount = entries.filter((e) => e.is_published).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
            <p className="text-xs text-muted-foreground">Veröffentlicht</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-xs text-muted-foreground">Kategorien</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Glossar durchsuchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Keine Einträge gefunden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.id} className={!entry.is_published ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{entry.term}</h3>
                    <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                    {!entry.is_published && <Badge variant="secondary" className="text-xs">Entwurf</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
                  {entry.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-muted rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => togglePublish.mutate({ id: entry.id, published: !entry.is_published })}
                  >
                    {entry.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(`"${entry.term}" wirklich löschen?`)) deleteMutation.mutate(entry.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Eintrag bearbeiten" : "Neuer Glossar-Eintrag"}</DialogTitle>
            <DialogDescription>Funktion oder Begriff dokumentieren</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Begriff *</Label>
              <Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="z.B. Tourenplanung" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung *</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Was macht diese Funktion?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon (Lucide-Name)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="z.B. Calendar" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (kommagetrennt)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="kalender, planung, termine" />
            </div>
            <div className="space-y-2">
              <Label>Verwandte Begriffe (kommagetrennt)</Label>
              <Input value={form.related_terms} onChange={(e) => setForm({ ...form, related_terms: e.target.value })} placeholder="Terminverwaltung, GPS-Tracking" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sortierung</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Veröffentlicht</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingEntry?.id })}
              disabled={!form.term || !form.description || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Speichern..." : editingEntry ? "Aktualisieren" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
