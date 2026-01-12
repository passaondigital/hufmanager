import { supabase } from "@/integrations/supabase/client";

// Buckets that should use signed URLs (private access)
const PRIVATE_BUCKETS = ['horse-documents', 'hoof_photos', 'legal-documents', 'signatures', 'completion-reports', 'chat-images'];

// Buckets that are intentionally public
const PUBLIC_BUCKETS = ['logos'];

/**
 * Get a URL for accessing a file in Supabase storage.
 * For private buckets, returns a signed URL with 1-hour expiry.
 * For public buckets, returns the public URL.
 */
export async function getStorageUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  if (!filePath) return null;
  
  // If it's already a full URL, extract the path
  const path = extractFilePath(bucket, filePath);
  if (!path) return null;

  if (PUBLIC_BUCKETS.includes(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // For private buckets, create a signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Extract the file path from a full URL or return the path as-is
 */
function extractFilePath(bucket: string, urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  
  // If it's already just a path (not a URL), return it
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }

  // Extract path from full Supabase storage URL
  // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  // or: https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]?token=...
  try {
    const url = new URL(urlOrPath);
    const pathParts = url.pathname.split('/');
    
    // Find the bucket name in the path and get everything after it
    const bucketIndex = pathParts.findIndex(part => part === bucket);
    if (bucketIndex !== -1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    // Fallback: try to extract after /object/public/ or /object/sign/
    const objectIndex = pathParts.findIndex(part => part === 'object');
    if (objectIndex !== -1 && objectIndex + 2 < pathParts.length) {
      return pathParts.slice(objectIndex + 3).join('/');
    }
  } catch {
    // If URL parsing fails, assume it's a path
    return urlOrPath;
  }
  
  return urlOrPath;
}

/**
 * Upload a file and return just the file path (not a full URL)
 * The path can be used later to generate signed URLs
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ path: string | null; error: Error | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, options);

  if (error) {
    return { path: null, error };
  }

  return { path: filePath, error: null };
}

/**
 * Get the file path to store in the database
 * For new uploads, just return the path
 * For existing URLs, extract the path
 */
export function getFilePathForStorage(bucket: string, urlOrPath: string): string {
  return extractFilePath(bucket, urlOrPath) || urlOrPath;
}
