import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { uploadFile, getStorageUrl } from "@/lib/storage";

interface LTZHoofPhotoCaptureProps {
  hoofKey: string;
  hoofLabel: string;
  photoUrl?: string;
  onPhotoChange: (url: string | undefined) => void;
  horseId: string;
}

export function LTZHoofPhotoCapture({ 
  hoofKey, 
  hoofLabel, 
  photoUrl, 
  onPhotoChange,
  horseId 
}: LTZHoofPhotoCaptureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte wähle ein Bild aus.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Das Bild darf maximal 5MB groß sein.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      // Use UUID for unpredictable file names
      const fileName = `${horseId}/${hoofKey}_${crypto.randomUUID()}.${fileExt}`;

      const { path, error: uploadError } = await uploadFile('horse-documents', fileName, file);
      if (uploadError || !path) throw uploadError || new Error("Upload failed");

      // Get a signed URL for immediate display
      const signedUrl = await getStorageUrl('horse-documents', path);
      
      // Pass the file path (not URL) to parent - parent should store path
      onPhotoChange(path);
      
      toast({
        title: "Foto hochgeladen",
        description: `Huf-Foto für ${hoofLabel} wurde gespeichert.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload fehlgeschlagen",
        description: "Das Foto konnte nicht hochgeladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(undefined);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Camera className="h-4 w-4" />
        Huf-Foto {hoofLabel}
      </Label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {photoUrl ? (
        <div className="relative">
          <img
            src={photoUrl}
            alt={`Huf ${hoofLabel}`}
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={handleRemovePhoto}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-24 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Hochladen...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Foto aufnehmen</span>
            </div>
          )}
        </Button>
      )}
    </div>
  );
}
