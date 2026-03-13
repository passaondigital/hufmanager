import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Werbemittel = {
  id: string;
  created_at: string | null;
  category: string;
  title: string;
  content: string;
  target_audience: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

const CATEGORIES = ["email", "whatsapp", "instagram", "facebook", "text", "image"];
const AUDIENCES = ["alle", "besitzer", "profis", "unternehmen"];
const CAT_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-400",
  whatsapp: "bg-green-500/20 text-green-400",
  instagram: "bg-pink-500/20 text-pink-400",
  facebook: "bg-indigo-500/20 text-indigo-400",
  text: "bg-gray-500/20 text-gray-400",
  image: "bg-yellow-500/20 text-yellow-400",
};

export function AdminBotschafterWerbemittel() {
  const [items, setItems] = useState<Werbemittel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Werbemittel | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("whatsapp");
  const [audience, setAudience] = useState("alle");
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("botschafter_werbemittel").select("id, created_at, category, title, content, target_audience, is_active, sort_order").order("sort_order");
    if (error) toast.error("Fehler beim Laden");
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => {
    setIsNew(true); setTitle(""); setCategory("whatsapp"); setAudience("alle"); setContent(""); setSortOrder(0); setIsActive(true); setEditItem({} as Werbemittel);
  };

  const openEdit = (item: Werbemittel) => {
    setIsNew(false); setEditItem(item); setTitle(item.title); setCategory(item.category); setAudience(item.target_audience || "alle"); setContent(item.content); setSortOrder(item.sort_order || 0); setIsActive(item.is_active !== false);
  };

  const handleSave = async () => {
    if (!title || !content) { toast.error("Titel und Inhalt erforderlich"); return; }
    setSaving(true);
    const payload = { title, category, content, target_audience: audience, sort_order: sortOrder, is_active: isActive };
    let error;
    if (isNew) {
      ({ error } = await supabase.from("botschafter_werbemittel").insert(payload));
    } else {
      ({ error } = await supabase.from("botschafter_werbemittel").update(payload).eq("id", editItem!.id));
    }
    setSaving(false);
    if (error) toast.error("Fehler: " + error.message);
    else { toast.success(isNew ? "Erstellt" : "Gespeichert"); setEditItem(null); fetchAll(); }
  };

  const handleDuplicate = async (item: Werbemittel) => {
    const { error } = await supabase.from("botschafter_werbemittel").insert({ title: item.title + " (Kopie)", category: item.category, content: item.content, target_audience: item.target_audience, sort_order: (item.sort_order || 0) + 1, is_active: false });
    if (error) toast.error("Fehler"); else { toast.success("Dupliziert"); fetchAll(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Werbemittel löschen?")) return;
    const { error } = await supabase.from("botschafter_werbemittel").delete().eq("id", id);
    if (error) toast.error("Fehler"); else { toast.success("Gelöscht"); fetchAll(); }
  };

  const handleToggleActive = async (id: string, val: boolean) => {
    const { error } = await supabase.from("botschafter_werbemittel").update({ is_active: val }).eq("id", id);
    if (error) toast.error("Fehler"); else fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Werbemittel</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Neu erstellen</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Kategorie</th><th className="pb-2">Titel</th><th className="pb-2">Zielgruppe</th>
                <th className="pb-2">Aktiv</th><th className="pb-2">Aktionen</th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[item.category] || ""}`}>{item.category}</span></td>
                    <td className="py-3 font-medium">{item.title}</td>
                    <td className="py-3"><Badge variant="outline">{item.target_audience || "alle"}</Badge></td>
                    <td className="py-3"><Switch checked={item.is_active !== false} onCheckedChange={v => handleToggleActive(item.id, v)} /></td>
                    <td className="py-3 flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicate(item)}><Copy className="w-3 h-3" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3" /></Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Keine Werbemittel</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isNew ? "Neues Werbemittel" : "Bearbeiten"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Inhalt ({{CODE}} = Referral-Code)" value={content} onChange={e => setContent(e.target.value)} rows={8} />
            <div className="flex items-center gap-4">
              <Input type="number" placeholder="Sortierung" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-24 h-10" />
              <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><span className="text-sm">Aktiv</span></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
