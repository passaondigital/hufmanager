import { useState, useRef } from "react";
import { HoofPhoto, HorseDocument } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image, FileText, Trash2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${horseId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('horse-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('horse-documents')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('horse_documents')
        .insert({
          horse_id: horseId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          category: file.type.startsWith('image/') ? 'image' : 'document',
          uploaded_by: userData.user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Datei hochgeladen",
        description: file.name,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Fehler beim Hochladen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    
    try {
      // Extract file path from URL
      const urlParts = deleteDoc.file_url.split('/');
      const filePath = `${horseId}/${urlParts[urlParts.length - 1]}`;

      // Delete from storage
      await supabase.storage.from('horse-documents').remove([filePath]);

      // Delete from database
      await supabase.from('horse_documents').delete().eq('id', deleteDoc.id);

      toast({ title: "Datei gelöscht" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDoc(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <Card>
        <CardContent className="p-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
          />
          <Button 
            className="w-full" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Datei hochladen
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Röntgenbilder, Befunde, Fotos (max. 10MB)
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
                  onClick={() => setSelectedPhoto(photo.photo_url)}
                >
                  <img 
                    src={photo.photo_url} 
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
                      onClick={() => setSelectedPhoto(doc.file_url)}
                    >
                      <img 
                        src={doc.file_url} 
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
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}
                    </p>
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
