import { get, set, del, keys } from "idb-keyval";
import { IDB_KEYS } from "./offlineConfig";

/**
 * Offline Image Queue
 * Stores images locally when offline and uploads them when back online
 */

export interface OfflineImage {
  id: string;
  blob: Blob;
  fileName: string;
  bucket: string;
  path: string;
  metadata: {
    horseId?: string;
    horseName?: string;
    hoofPosition?: string;
    viewAngle?: string;
    capturedAt: string;
    appointmentId?: string;
  };
  createdAt: string;
  retryCount: number;
}

const IMAGE_QUEUE_PREFIX = `${IDB_KEYS.OFFLINE_IMAGES}-`;

/**
 * Get all pending offline images
 */
export async function getOfflineImages(): Promise<OfflineImage[]> {
  try {
    const allKeys = await keys();
    const imageKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith(IMAGE_QUEUE_PREFIX)
    );
    
    const images: OfflineImage[] = [];
    for (const key of imageKeys) {
      const image = await get<OfflineImage>(key as string);
      if (image) {
        images.push(image);
      }
    }
    
    return images.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (error) {
    console.error("Failed to get offline images:", error);
    return [];
  }
}

/**
 * Add an image to the offline queue
 */
export async function addOfflineImage(
  image: Omit<OfflineImage, "id" | "createdAt" | "retryCount">
): Promise<string> {
  const id = crypto.randomUUID();
  const offlineImage: OfflineImage = {
    ...image,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  
  try {
    await set(`${IMAGE_QUEUE_PREFIX}${id}`, offlineImage);
    
    // Dispatch event for UI updates
    window.dispatchEvent(
      new CustomEvent("offlineImagesUpdated", {
        detail: { action: "added", id },
      })
    );
    
    return id;
  } catch (error) {
    console.error("Failed to add offline image:", error);
    throw error;
  }
}

/**
 * Remove an image from the offline queue (after successful upload)
 */
export async function removeOfflineImage(id: string): Promise<void> {
  try {
    await del(`${IMAGE_QUEUE_PREFIX}${id}`);
    
    window.dispatchEvent(
      new CustomEvent("offlineImagesUpdated", {
        detail: { action: "removed", id },
      })
    );
  } catch (error) {
    console.error("Failed to remove offline image:", error);
  }
}

/**
 * Update retry count for a failed upload
 */
export async function updateImageRetryCount(id: string): Promise<void> {
  try {
    const image = await get<OfflineImage>(`${IMAGE_QUEUE_PREFIX}${id}`);
    if (image) {
      image.retryCount += 1;
      await set(`${IMAGE_QUEUE_PREFIX}${id}`, image);
    }
  } catch (error) {
    console.error("Failed to update image retry count:", error);
  }
}

/**
 * Get a local URL for an offline image (for preview)
 */
export function getOfflineImageUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Convert a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Get count of pending offline images
 */
export async function getOfflineImageCount(): Promise<number> {
  const images = await getOfflineImages();
  return images.length;
}
