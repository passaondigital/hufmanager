import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  addOfflineImage, 
  getOfflineImageUrl, 
  dataUrlToBlob 
} from "@/lib/offline/imageQueue";
import { toast } from "sonner";

interface UseOfflinePhotoUploadOptions {
  bucket: string;
  horseId: string;
  horseName: string;
  appointmentId?: string;
}

interface PhotoUploadResult {
  url: string;
  isOffline: boolean;
  offlineId?: string;
}

/**
 * Hook for handling photo uploads that work offline
 * - Uploads immediately when online
 * - Queues for later upload when offline
 * - Returns a usable URL in both cases
 */
export function useOfflinePhotoUpload(options: UseOfflinePhotoUploadOptions) {
  const { bucket, horseId, horseName, appointmentId } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);

  const uploadPhoto = useCallback(async (
    imageData: string | Blob,
    metadata: {
      hoofPosition?: string;
      viewAngle?: string;
      fileName?: string;
    }
  ): Promise<PhotoUploadResult> => {
    setIsUploading(true);
    
    try {
      // Convert data URL to blob if needed
      const blob = typeof imageData === "string" 
        ? dataUrlToBlob(imageData) 
        : imageData;
      
      const fileName = metadata.fileName || `${Date.now()}.jpg`;
      const path = `${horseId}/${fileName}`;
      
      // Check if online
      if (!navigator.onLine) {
        // Queue for offline upload
        const offlineId = await addOfflineImage({
          blob,
          fileName,
          bucket,
          path,
          metadata: {
            horseId,
            horseName,
            hoofPosition: metadata.hoofPosition,
            viewAngle: metadata.viewAngle,
            capturedAt: new Date().toISOString(),
            appointmentId,
          },
        });
        
        setPendingUploads((prev) => prev + 1);
        
        // Return a local URL for preview
        const localUrl = getOfflineImageUrl(blob);
        
        toast.info("Foto wird gespeichert", {
          description: "Upload erfolgt sobald du online bist",
          icon: "📷",
          duration: 2000,
        });
        
        return {
          url: localUrl,
          isOffline: true,
          offlineId,
        };
      }
      
      // Online - upload directly
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        // If upload fails, queue it for retry
        const offlineId = await addOfflineImage({
          blob,
          fileName,
          bucket,
          path,
          metadata: {
            horseId,
            horseName,
            hoofPosition: metadata.hoofPosition,
            viewAngle: metadata.viewAngle,
            capturedAt: new Date().toISOString(),
            appointmentId,
          },
        });
        
        const localUrl = getOfflineImageUrl(blob);
        
        toast.warning("Upload fehlgeschlagen", {
          description: "Wird automatisch erneut versucht",
          icon: "⚠️",
        });
        
        return {
          url: localUrl,
          isOffline: true,
          offlineId,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return {
        url: urlData.publicUrl,
        isOffline: false,
      };
      
    } finally {
      setIsUploading(false);
    }
  }, [bucket, horseId, horseName, appointmentId]);

  return {
    uploadPhoto,
    isUploading,
    pendingUploads,
  };
}
