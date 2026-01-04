import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Upload, 
  Image, 
  FileText, 
  Video, 
  Trash2, 
  Loader2, 
  X,
  Calendar,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStorageUrl, uploadFile } from "@/lib/storage";

interface MediaAsset {
  id: string;
  horse_id: string;
  file_url: string;
  file_type: string;
  category: string;
  captured_at: string;
  title: string | null;
  notes: string | null;
  uploaded_by: string;
  created_at: string;
}

interface TabMediaVaultProps {
  horseId: string;
}

const CATEGORIES = [
  { value: "general", label: "Allgemein" },
  { value: "xray", label: "Röntgen" },
  { value: "hoof", label: "Huffotos" },
  { value: "vet-report", label: "Tierarzt-Befund" },
  { value: "training", label: "Training" },
];

export function TabMediaVault({ horseId }: TabMediaVaultProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    title: "",
    category: "general",
    capturedAt: format(new Date(), "yyyy-MM-dd"),
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [deleteMedia, setDeleteMedia] = useState<MediaAsset | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch media assets
  const { data: mediaAssets = [], isLoading } = useQuery({
    queryKey: ["media-assets", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("horse_id", horseId)
        .order("captured_at", { ascending: false });
      
      if (error) throw error;
      return data as MediaAsset[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Keine Datei ausgewählt");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nicht authentifiziert");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `media/${horseId}/${fileName}`;

      // Determine file type
      let fileType = "document";
      if (selectedFile.type.startsWith("image/")) fileType = "image";
      else if (selectedFile.type.startsWith("video/")) fileType = "video";
      else if (selectedFile.type === "application/pdf") fileType = "pdf";

      // Upload to storage
      const { path, error: uploadError } = await uploadFile("horse-documents", filePath, selectedFile);
      if (uploadError || !path) throw uploadError || new Error("Upload fehlgeschlagen");

      // Save to database with backdated captured_at
      const { error: dbError } = await supabase.from("media_assets").insert({
        horse_id: horseId,
        file_url: filePath,
        file_type: fileType,
        category: uploadData.category,
        captured_at: new Date(uploadData.capturedAt).toISOString(),
        title: uploadData.title || selectedFile.name,
        uploaded_by: userData.user.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-assets", horseId] });
      toast({ title: "Datei hochgeladen", description: "Die Datei wurde erfolgreich gespeichert." });
      resetUploadState();
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Hochladen", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (media: MediaAsset) => {
      // Delete from storage
      await supabase.storage.from("horse-documents").remove([media.file_url]);
      // Delete from database
      const { error } = await supabase.from("media_assets").delete().eq("id", media.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-assets", horseId] });
      toast({ title: "Datei gelöscht" });
      setDeleteMedia(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Löschen", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resetUploadState = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setUploadData({
      title: "",
      category: "general",
      capturedAt: format(new Date(), "yyyy-MM-dd"),
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadData(prev => ({ ...prev, title: file.name.split('.')[0] }));
      setShowUploadDialog(true);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image": return <Image className="h-5 w-5" />;
      case "video": return <Video className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  // Filter media
  const filteredMedia = filterCategory === "all" 
    ? mediaAssets 
    : mediaAssets.filter(m => m.category === filterCategory);

  // Group by month/year
  const groupedMedia = filteredMedia.reduce((groups, media) => {
    const date = parseISO(media.captured_at);
    const key = format(date, "MMMM yyyy", { locale: de });
    if (!groups[key]) groups[key] = [];
    groups[key].push(media);
    return groups;
  }, {} as Record<string, MediaAsset[]>);

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <Card>
        <CardContent className="p-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="hidden"
          />
          <Button 
            className="w-full" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Datei hochladen
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Fotos, Videos, Röntgenbilder, Befunde (max. 50MB)
          </p>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Media Gallery grouped by date */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      ) : Object.keys(groupedMedia).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Noch keine Medien hochgeladen</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedMedia).map(([monthYear, assets]) => (
          <Card key={monthYear}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {monthYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {assets.map((media) => (
                  <MediaThumbnail
                    key={media.id}
                    media={media}
                    onClick={() => setSelectedMedia(media)}
                    onDelete={() => setDeleteMedia(media)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => !open && resetUploadState()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datei hochladen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                {selectedFile.type.startsWith("image/") ? (
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Preview" 
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-12 bg-background rounded flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Beschreibung der Datei"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select 
                value={uploadData.category} 
                onValueChange={(val) => setUploadData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capturedAt" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Aufnahmedatum
              </Label>
              <Input
                id="capturedAt"
                type="date"
                value={uploadData.capturedAt}
                onChange={(e) => setUploadData(prev => ({ ...prev, capturedAt: e.target.value }))}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              <p className="text-xs text-muted-foreground">
                Wann wurde das Foto/Video aufgenommen oder der Befund erstellt?
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadState}>Abbrechen</Button>
            <Button 
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Lightbox */}
      {selectedMedia && (
        <MediaLightbox 
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMedia} onOpenChange={() => setDeleteMedia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteMedia?.title}" wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMedia && deleteMutation.mutate(deleteMedia)}
              className="bg-destructive text-destructive-foreground"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Thumbnail component
function MediaThumbnail({ 
  media, 
  onClick,
  onDelete 
}: { 
  media: MediaAsset; 
  onClick: () => void;
  onDelete: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Load signed URL
  useEffect(() => {
    getStorageUrl("horse-documents", media.file_url).then(setSignedUrl);
  }, [media.file_url]);

  const isImage = media.file_type === "image";
  const isVideo = media.file_type === "video";

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
      {isImage && signedUrl ? (
        <img 
          src={signedUrl}
          alt={media.title || "Media"}
          className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onClick}
        />
      ) : isVideo && signedUrl ? (
        <video 
          src={signedUrl}
          className="h-full w-full object-cover cursor-pointer"
          onClick={onClick}
        />
      ) : (
        <div 
          className="h-full w-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80"
          onClick={onClick}
        >
          <FileText className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1 px-1 truncate w-full text-center">
            {media.title || "Dokument"}
          </span>
        </div>
      )}
      
      {/* Date badge */}
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white">
        {format(parseISO(media.captured_at), "dd.MM.yy")}
      </div>

      {/* Delete button on hover */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Lightbox component
function MediaLightbox({ media, onClose }: { media: MediaAsset; onClose: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    getStorageUrl("horse-documents", media.file_url).then(setSignedUrl);
  }, [media.file_url]);

  const isImage = media.file_type === "image";
  const isVideo = media.file_type === "video";

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4">
        <div className="text-white">
          <p className="font-medium">{media.title}</p>
          <p className="text-sm text-white/70">
            {format(parseISO(media.captured_at), "dd. MMMM yyyy", { locale: de })}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {isImage && signedUrl && (
          <img 
            src={signedUrl}
            alt={media.title || "Media"}
            className="max-h-full max-w-full object-contain"
          />
        )}
        {isVideo && signedUrl && (
          <video 
            src={signedUrl}
            controls
            autoPlay
            className="max-h-full max-w-full"
          />
        )}
        {!isImage && !isVideo && signedUrl && (
          <div className="text-center text-white">
            <FileText className="h-16 w-16 mx-auto mb-4" />
            <p className="mb-4">{media.title}</p>
            <Button asChild>
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                Dokument öffnen
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
