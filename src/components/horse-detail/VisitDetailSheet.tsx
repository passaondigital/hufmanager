import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2,
  MessageSquare,
  AlertCircle,
  Stethoscope,
  MoreHorizontal,
  Trash2,
  Download
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStorageUrl, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Appointment } from "./types";

const EVIDENCE_CATEGORIES = [
  { value: "chat", label: "Chat-Verlauf", icon: MessageSquare, color: "bg-blue-500" },
  { value: "before", label: "Vorher-Zustand", icon: AlertCircle, color: "bg-orange-500" },
  { value: "xray", label: "Röntgen/Befund", icon: Stethoscope, color: "bg-purple-500" },
  { value: "other", label: "Sonstiges", icon: MoreHorizontal, color: "bg-gray-500" },
];

interface VisitDetailSheetProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
}

interface MediaAsset {
  id: string;
  file_url: string;
  file_type: string;
  category: string;
  captured_at: string;
  title: string | null;
  appointment_id: string | null;
}

export function VisitDetailSheet({ appointment, open, onClose }: VisitDetailSheetProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("chat");
  const [uploadTitle, setUploadTitle] = useState("");
  const [lightboxImage, setLightboxImage] = useState<MediaAsset | null>(null);

  // Fetch evidence attached to this visit
  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["visit-evidence", appointment?.id],
    queryFn: async () => {
      if (!appointment?.id) return [];
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("appointment_id", appointment.id)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MediaAsset[];
    },
    enabled: !!appointment?.id && open,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !appointment) throw new Error("Keine Datei ausgewählt");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nicht authentifiziert");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `evidence/${appointment.horse_id}/${fileName}`;

      let fileType = "document";
      if (selectedFile.type.startsWith("image/")) fileType = "image";
      else if (selectedFile.type.startsWith("video/")) fileType = "video";
      else if (selectedFile.type === "application/pdf") fileType = "pdf";

      const { error: uploadError } = await uploadFile("horse-documents", filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("media_assets").insert({
        horse_id: appointment.horse_id,
        appointment_id: appointment.id,
        file_url: filePath,
        file_type: fileType,
        category: uploadCategory,
        captured_at: new Date().toISOString(),
        title: uploadTitle || selectedFile.name,
        uploaded_by: userData.user.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit-evidence", appointment?.id] });
      queryClient.invalidateQueries({ queryKey: ["media-assets-for-visits"] });
      toast({ title: "Beweis hochgeladen", description: "Die Datei wurde dem Termin zugeordnet." });
      resetUpload();
    },
    onError: (error: any) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (media: MediaAsset) => {
      await supabase.storage.from("horse-documents").remove([media.file_url]);
      const { error } = await supabase.from("media_assets").delete().eq("id", media.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit-evidence", appointment?.id] });
      queryClient.invalidateQueries({ queryKey: ["media-assets-for-visits"] });
      toast({ title: "Datei gelöscht" });
      setLightboxImage(null);
    },
  });

  const resetUpload = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setUploadCategory("chat");
    setUploadTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadTitle(file.name.split('.')[0]);
      setShowUploadDialog(true);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return "bg-green-500/10 text-green-600 border-green-500/20";
      case 'cancelled': return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'Erledigt';
      case 'cancelled':
        return 'Abgesagt';
      case 'scheduled':
      case 'planned':
        return 'Geplant';
      default:
        return status || 'Unbekannt';
    }
  };

  if (!appointment) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Termindetails
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Visit Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {format(parseISO(appointment.date), "EEEE, d. MMMM yyyy", { locale: de })}
                  </p>
                  {appointment.time && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="h-4 w-4" />
                      {appointment.time.slice(0, 5)} Uhr
                      {appointment.duration && ` • ${appointment.duration} Min.`}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={cn("border", getStatusColor(appointment.status))}>
                  {getStatusLabel(appointment.status)}
                </Badge>
              </div>

              {appointment.service_type && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{appointment.service_type}</p>
                </div>
              )}

              {appointment.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {appointment.location}
                </p>
              )}

              {appointment.notes && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              )}
            </div>

            {/* Evidence Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Beweise & Dokumente
                </h3>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : evidence.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Keine Beweise angehängt</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Screenshots, Fotos oder Befunde hochladen
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {evidence.map((item) => (
                    <EvidenceThumbnail
                      key={item.id}
                      media={item}
                      onClick={() => setLightboxImage(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upload Category Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={() => resetUpload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Beweis kategorisieren</DialogTitle>
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
              <Label>Titel</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="z.B. WhatsApp Screenshot vom Notfall"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategorie</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVIDENCE_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    type="button"
                    variant={uploadCategory === cat.value ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => setUploadCategory(cat.value)}
                  >
                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center mr-2", cat.color)}>
                      <cat.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm">{cat.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUpload}>Abbrechen</Button>
            <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxImage && (
        <EvidenceLightbox
          media={lightboxImage}
          onClose={() => setLightboxImage(null)}
          onDelete={() => deleteMutation.mutate(lightboxImage)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}

function EvidenceThumbnail({ media, onClick }: { media: MediaAsset; onClick: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const category = EVIDENCE_CATEGORIES.find(c => c.value === media.category) || EVIDENCE_CATEGORIES[3];

  useEffect(() => {
    getStorageUrl("horse-documents", media.file_url).then(setSignedUrl);
  }, [media.file_url]);

  const isImage = media.file_type === "image";

  return (
    <div 
      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
      onClick={onClick}
    >
      {isImage && signedUrl ? (
        <img src={signedUrl} alt={media.title || ""} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      
      {/* Category badge */}
      <div className={cn("absolute top-1 left-1 h-5 w-5 rounded-full flex items-center justify-center", category.color)}>
        <category.icon className="h-3 w-3 text-white" />
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs font-medium px-2 text-center line-clamp-2">
          {media.title || "Öffnen"}
        </span>
      </div>
    </div>
  );
}

function EvidenceLightbox({ 
  media, 
  onClose, 
  onDelete,
  isDeleting 
}: { 
  media: MediaAsset; 
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const category = EVIDENCE_CATEGORIES.find(c => c.value === media.category) || EVIDENCE_CATEGORIES[3];

  useEffect(() => {
    getStorageUrl("horse-documents", media.file_url).then(setSignedUrl);
  }, [media.file_url]);

  const isImage = media.file_type === "image";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", category.color)}>
                  <category.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-white font-medium">{media.title || "Beweis"}</span>
                <Badge variant="secondary" className="text-xs">{category.label}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {signedUrl && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20"
                    onClick={() => window.open(signedUrl, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-white hover:bg-destructive/80"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex items-center justify-center min-h-[400px] bg-black">
            {isImage && signedUrl ? (
              <img src={signedUrl} alt={media.title || ""} className="max-h-[80vh] object-contain" />
            ) : signedUrl ? (
              <iframe src={signedUrl} className="w-full h-[80vh]" title={media.title || "Document"} />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white/70 text-sm">
              {format(parseISO(media.captured_at), "dd.MM.yyyy HH:mm", { locale: de })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}