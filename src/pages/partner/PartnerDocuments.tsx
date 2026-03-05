import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, Plus, Search, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const CATEGORIES: Record<string, string> = {
  xray: "Röntgen",
  lab_result: "Laborbefund",
  report: "Bericht",
  photo: "Foto",
  thermography: "Thermografie",
  ultrasound: "Ultraschall",
  protocol: "Protokoll",
  certificate: "Zertifikat",
  other: "Sonstiges",
};

export default function PartnerDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ horse_id: "", category: "other", description: "", visible_to_pid: true, visible_to_kid: true });
  const [file, setFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["partner-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_documents")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: horses = [] } = useQuery({
    queryKey: ["partner-horses-for-docs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses:horse_id (id, name)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((d: any) => d.horses).filter(Boolean);
    },
    enabled: !!user,
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !form.horse_id || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${form.horse_id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("partner-documents")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("partner-documents")
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from("partner_documents").insert({
        partner_id: user.id,
        horse_id: form.horse_id,
        file_name: file.name,
        file_url: path,
        file_type: file.type,
        file_size_bytes: file.size,
        category: form.category as any,
        description: form.description || null,
        visible_to_pid: form.visible_to_pid,
        visible_to_kid: form.visible_to_kid,
      });

      if (dbError) throw dbError;

      toast.success("Dokument hochgeladen");
      queryClient.invalidateQueries({ queryKey: ["partner-documents"] });
      setUploadOpen(false);
      setFile(null);
      setForm({ horse_id: "", category: "other", description: "", visible_to_pid: true, visible_to_kid: true });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("partner-documents").remove([doc.file_url]);
      const { error } = await supabase.from("partner_documents").delete().eq("id", doc.id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dokument gelöscht");
      queryClient.invalidateQueries({ queryKey: ["partner-documents"] });
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const openDoc = async (doc: any) => {
    const { data } = await supabase.storage.from("partner-documents").createSignedUrl(doc.file_url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const filtered = documents.filter((d: any) =>
    d.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.horses?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce((acc: Record<string, any[]>, doc: any) => {
    const horseName = doc.horses?.name || "Unbekannt";
    if (!acc[horseName]) acc[horseName] = [];
    acc[horseName].push(doc);
    return acc;
  }, {});

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">Dokumente & Befunde <HelpTip id="partner.dokumente" /></h1>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Hochladen
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Suchen..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Keine Dokumente vorhanden</p>
            <p className="text-sm text-muted-foreground mt-1">Laden Sie Röntgenbilder, Laborergebnisse oder Berichte hoch.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([horseName, docs]) => (
          <div key={horseName} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              🐴 {horseName}
              <Badge variant="secondary" className="text-xs">{(docs as any[]).length}</Badge>
            </h2>
            <div className="grid gap-2">
              {(docs as any[]).map(doc => (
                <Card key={doc.id} className="hover:shadow-sm transition-all">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{CATEGORIES[doc.category] || doc.category}</Badge>
                        {doc.file_size_bytes && <span>{formatSize(doc.file_size_bytes)}</span>}
                        <span>{format(new Date(doc.uploaded_at), "dd.MM.yy", { locale: de })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDoc(doc)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(doc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dokument hochladen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Datei *</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.dicom" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>
            <div>
              <Label>Pferd *</Label>
              <Select value={form.horse_id} onValueChange={v => setForm(p => ({ ...p, horse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pferd auswählen" /></SelectTrigger>
                <SelectContent>
                  {horses.map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>🐴 {h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-sm font-medium">Sichtbarkeit</p>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Für Hufbearbeiter sichtbar</Label>
                <Switch checked={form.visible_to_pid} onCheckedChange={v => setForm(p => ({ ...p, visible_to_pid: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Für Pferdebesitzer sichtbar</Label>
                <Switch checked={form.visible_to_kid} onCheckedChange={v => setForm(p => ({ ...p, visible_to_kid: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={uploading || !file || !form.horse_id}>
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hochladen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
