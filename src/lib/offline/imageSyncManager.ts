import { supabase } from "@/integrations/supabase/client";
import { 
  getOfflineImages, 
  removeOfflineImage, 
  updateImageRetryCount,
  OfflineImage 
} from "./imageQueue";
import { MAX_SYNC_RETRIES } from "./offlineConfig";
import { toast } from "sonner";

/**
 * Upload a single offline image to Supabase Storage
 */
async function uploadOfflineImage(image: OfflineImage): Promise<boolean> {
  try {
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(image.bucket)
      .upload(image.path, image.blob, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload offline image:", uploadError);
      return false;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(image.bucket)
      .getPublicUrl(image.path);

    // If we have horse metadata, also save to hoof_photos table
    if (image.metadata.horseId && image.metadata.hoofPosition) {
      const { error: dbError } = await supabase.from("hoof_photos").insert({
        horse_id: image.metadata.horseId,
        photo_url: urlData.publicUrl,
        hoof_position: image.metadata.hoofPosition,
        view_angle: image.metadata.viewAngle || "side",
        notes: `Offline aufgenommen: ${image.metadata.capturedAt}`,
        appointment_id: image.metadata.appointmentId,
      });

      if (dbError) {
        console.error("Failed to save hoof photo record:", dbError);
        // Don't fail the upload, just log the error
      }
    }

    return true;
  } catch (error) {
    console.error("Error uploading offline image:", error);
    return false;
  }
}

/**
 * Process all pending offline images
 */
export async function processOfflineImages(): Promise<void> {
  const images = await getOfflineImages();
  
  if (images.length === 0) {
    return;
  }

  console.log(`Processing ${images.length} offline images...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const image of images) {
    // Skip if max retries exceeded
    if (image.retryCount >= MAX_SYNC_RETRIES) {
      console.warn(`Skipping image ${image.id} - max retries exceeded`);
      failCount++;
      continue;
    }

    const success = await uploadOfflineImage(image);
    
    if (success) {
      await removeOfflineImage(image.id);
      successCount++;
    } else {
      await updateImageRetryCount(image.id);
      failCount++;
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} Foto${successCount > 1 ? "s" : ""} hochgeladen`);
  }
  
  if (failCount > 0 && failCount < images.length) {
    toast.warning(`${failCount} Foto${failCount > 1 ? "s" : ""} konnten nicht hochgeladen werden`);
  }
}

/**
 * Initialize image sync on online event
 */
export function initImageSyncManager(): () => void {
  const handleOnline = () => {
    console.log("Online - processing offline images...");
    // Delay slightly to ensure stable connection
    setTimeout(processOfflineImages, 2000);
  };

  window.addEventListener("online", handleOnline);

  // Process queue on initial load if online
  if (navigator.onLine) {
    setTimeout(processOfflineImages, 3000);
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
