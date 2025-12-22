import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  X, 
  Loader2, 
  Image as ImageIcon,
  GripVertical,
  Trash2,
  Plus
} from "lucide-react";

interface GalleryImage {
  url: string;
  caption?: string;
}

export const GalleryManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);

  // Fetch current gallery images from business_settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings-gallery", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("id, gallery_images")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const images: GalleryImage[] = Array.isArray(settings?.gallery_images) 
    ? (settings.gallery_images as unknown as GalleryImage[]) 
    : [];

  // Update gallery mutation
  const updateGalleryMutation = useMutation({
    mutationFn: async (newImages: GalleryImage[]) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const galleryData = JSON.parse(JSON.stringify(newImages));
      
      if (settings?.id) {
        const { error } = await supabase
          .from("business_settings")
          .update({ gallery_images: galleryData })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_settings")
          .insert({ user_id: user.id, gallery_images: galleryData });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-gallery"] });
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    setUploading(true);
    const newImages: GalleryImage[] = [...images];

    try {
      for (const file of Array.from(files)) {
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "Ungültiges Format",
            description: `${file.name}: Nur JPG, PNG oder WebP erlaubt.`,
            variant: "destructive"
          });
          continue;
        }

        if (file.size > maxSize) {
          toast({
            title: "Datei zu groß",
            description: `${file.name}: Maximal 5MB erlaubt.`,
            variant: "destructive"
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("gallery")
          .getPublicUrl(fileName);

        newImages.push({ url: publicUrl, caption: "" });
      }

      if (newImages.length > images.length) {
        await updateGalleryMutation.mutateAsync(newImages);
        toast({ title: "Bilder hochgeladen", description: `${newImages.length - images.length} Bild(er) hinzugefügt.` });
      }
    } catch (error) {
      console.error("Gallery upload error:", error);
      toast({ title: "Fehler", description: "Bilder konnten nicht hochgeladen werden.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Extract path from URL for deletion
    try {
      const url = new URL(imageToRemove.url);
      const pathParts = url.pathname.split('/gallery/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from("gallery").remove([filePath]);
      }
    } catch (e) {
      console.warn("Could not delete file from storage:", e);
    }

    const newImages = images.filter((_, i) => i !== index);
    await updateGalleryMutation.mutateAsync(newImages);
    toast({ title: "Bild entfernt" });
  };

  const handleUpdateCaption = async (index: number, caption: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], caption };
    await updateGalleryMutation.mutateAsync(newImages);
    setEditingCaption(null);
  };

  const moveImage = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    await updateGalleryMutation.mutateAsync(newImages);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Galerie - "Meine Arbeit"
        </CardTitle>
        <CardDescription>
          Laden Sie Bilder hoch, die auf Ihrer Landingpage in der Galerie-Sektion angezeigt werden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Wird hochgeladen...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Bilder hochladen</p>
              <p className="text-sm text-muted-foreground">JPG, PNG oder WebP, max. 5MB pro Bild</p>
            </div>
          )}
        </div>

        {/* Images Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Noch keine Bilder hochgeladen
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div 
                key={index} 
                className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={image.url}
                  alt={image.caption || `Galerie-Bild ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay with controls */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  {/* Top row: move & delete */}
                  <div className="flex justify-between">
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveImage(index, index - 1)}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Bottom: caption input */}
                  <div>
                    {editingCaption === index ? (
                      <Input
                        autoFocus
                        defaultValue={image.caption || ""}
                        placeholder="Bildunterschrift..."
                        className="h-8 text-xs"
                        onBlur={(e) => handleUpdateCaption(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateCaption(index, e.currentTarget.value);
                          }
                        }}
                      />
                    ) : (
                      <button
                        className="w-full text-left text-white text-xs truncate hover:underline"
                        onClick={() => setEditingCaption(index)}
                      >
                        {image.caption || "Klicken für Bildunterschrift..."}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {images.length} Bild{images.length !== 1 ? 'er' : ''} • Hover für Optionen
          </p>
        )}
      </CardContent>
    </Card>
  );
};
