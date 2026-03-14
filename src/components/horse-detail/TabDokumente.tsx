import { useState, useRef, useEffect } from "react";
import { HoofPhoto, HorseDocument } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, FileText, Trash2, Loader2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getStorageUrl, uploadFile } from "@/lib/storage";
import { useStorageQuota, formatBytes } from "@/hooks/useStorageQuota";
import { StorageQuotaCard } from "@/components/storage/StorageQuotaCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const DOCUMENT_CATEGORIES = [
  { value: "equidenpass", label: "Equidenpass" },
  { value: "kaufvertrag", label: "Kaufvertrag" },
  { value: "versicherung", label: "Versicherung" },
  { value: "tierarztbericht", label: "Tierarztbericht" },
  { value: "klinikbericht", label: "Klinikbericht" },
  { value: "roentgenbefund", label: "Röntgenbefund" },
  { value: "blutbild_labor", label: "Blutbild / Labor" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_CATEGORIES.map(c => [c.value, c.label])
);

function getCategoryLabel(category: string | null): string {
  if (!category) return "Sonstiges";
  return CATEGORY_LABELS[category] || category;
}

function getCategoryColor(category: string | null): string {
  switch (category) {
    case "equidenpass": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "kaufvertrag": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "versicherung": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "tierarztbericht": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "klinikbericht": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "roentgenbefund": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "blutbild_labor": return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
    default: return "bg-muted text-muted-foreground";
  }
}

interface TabDokumenteProps {
  horseId: string;
  hoofPhotos: HoofPhoto[];
  documents: HorseDocument[];
  onRefresh: () => void;
}

export function TabDokumente({ horseId, hoofPhotos, documents, onRefresh }: TabDokumenteProps) {
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<HorseDocument | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { checkQuota, trackUpload, removeUpload, usage, quota } = useStorageQuota("horse", horseId);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const loadSignedUrls = async () => {
      const urls: Record<string, string> = {};
      for (const doc of documents) {
        const signedUrl = await getStorageUrl('horse-documents', doc.file_url);
        if (signedUrl) urls[doc.id] = signedUrl;
      }
      for (const photo of hoofPhotos) {
        const signedUrl = await getStorageUrl('horse-documents', photo.photo_url);
        if (signedUrl) urls[photo.id] = signedUrl;
      }
      setSignedUrls(urls);
    };
    loadSignedUrls();
  }, [documents, hoofPhotos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory) {
      toast({ title: "Bitte Kategorie und Datei wählen", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const quotaCheck = await checkQuota(selectedFile.size);
      if (quotaCheck && !quotaCheck.allowed) {
        if (quotaCheck.exceeds_max_file_size) {
          throw new Error(`Datei zu groß. Maximum: ${formatBytes(quotaCheck.max_file_size)}`);
        }
        if (quotaCheck.would_exceed_quota) {
          throw new Error(`Speicherplatz erschöpft. Verfügbar: ${formatBytes(quotaCheck.remaining)}`);
        }
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${horseId}/${fileName}`;

      const { path, error: uploadError } = await uploadFile('horse-documents', filePath, selectedFile);
      if (uploadError || !path) throw uploadError || new Error("Upload failed");

      await trackUpload('horse-documents', filePath, selectedFile.size);

      const { error: dbError } = await supabase
        .from('horse_documents')
        .insert({
          horse_id: horseId,
          file_name: selectedFile.name,
          file_url: filePath,
          file_type: selectedFile.type,
          category: selectedCategory,
          uploaded_by: userData.user.id,
        });

      if (dbError) throw dbError;

      toast({ title: "Datei hochgeladen", description: `${selectedFile.name} (${getCategoryLabel(selectedCategory)})` });
      setShowUploadDialog(false);
      setSelectedCategory("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefresh();
    } catch (error: any) {
      toast({ title: "Fehler beim Hochladen", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try {
      const urlParts = deleteDoc.file_url.split('/');
      const filePath = `${horseId}/${urlParts[urlParts.length - 1]}`;
      await supabase.storage.from('horse-documents').remove([filePath]);
      await removeUpload('horse-documents', deleteDoc.file_url);
      await supabase.from('horse_documents').delete().eq('id', deleteDoc.id);
      toast({ title: "Datei gelöscht" });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Fehler beim Löschen", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDoc(null);
    }
  };

  return (
    <div className="space-y-4">
      <StorageQuotaCard entityType="horse" entityId={horseId} compact />
      
      {/* Upload Button */}
      <Card>
        <CardContent className="p-4">
          <Button 
            className="w-full" 
            onClick={() => setShowUploadDialog(true)}
            disabled={uploading || (usage && usage.remaining <= 0)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Datei hochladen
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Röntgenbilder, Befunde, Fotos (max. {quota ? formatBytes(quota.maxFileSize) : "10MB"})
          </p>
        </CardContent>
      </Card>

      {/* Hoof Photos from Provider */}
      {hoofPhotos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              Huf-Fotos vom Hufbearbeiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {hoofPhotos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedPhoto(signedUrls[photo.id] || photo.photo_url)}
                >
                  <img 
                    src={signedUrls[photo.id] || photo.photo_url} 
                    alt={photo.hoof_position || "Huf-Foto"}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Meine Dokumente ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {doc.file_type?.startsWith('image/') ? (
                    <div 
                      className="w-12 h-12 rounded bg-muted overflow-hidden cursor-pointer"
                      onClick={() => setSelectedPhoto(signedUrls[doc.id] || doc.file_url)}
                    >
                      <img 
                        src={signedUrls[doc.id] || doc.file_url} 
                        alt={doc.file_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getCategoryColor(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setDeleteDoc(doc)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Dokumente hochgeladen
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog with Category Selection */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dokument hochladen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategorie *</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datei</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full mt-1" 
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedCategory}
              >
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Datei wählen"}
              </Button>
              {!selectedCategory && (
                <p className="text-xs text-muted-foreground mt-1">Bitte zuerst eine Kategorie wählen</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setSelectedCategory(""); setSelectedFile(null); }}>Abbrechen</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !selectedCategory}>
              {uploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img 
            src={selectedPhoto} 
            alt="Foto"
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
