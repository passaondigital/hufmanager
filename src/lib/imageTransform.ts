/**
 * Supabase Storage image transform helpers.
 * Uses Supabase's built-in image transformation API for WebP + resize.
 */

import { supabase } from "@/integrations/supabase/client";

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

const PRESETS = {
  avatar: { width: 200, height: 200, quality: 80, resize: "cover" as const },
  avatarSmall: { width: 80, height: 80, quality: 75, resize: "cover" as const },
  hoofPhoto: { width: 1200, quality: 85 },
  hoofThumb: { width: 300, height: 300, quality: 70, resize: "cover" as const },
  heroImage: { width: 1920, quality: 85 },
  cardImage: { width: 800, quality: 80 },
  thumbnail: { width: 400, quality: 70 },
} as const;

/**
 * Get a transformed public URL for an image in Supabase Storage.
 * Returns WebP format automatically when transforms are applied.
 */
export function getTransformedUrl(
  bucket: string,
  path: string,
  preset: keyof typeof PRESETS | TransformOptions
): string {
  const opts: TransformOptions = typeof preset === "string" ? { ...PRESETS[preset] } : preset;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: {
      width: opts.width,
      height: opts.height,
      quality: opts.quality ?? 80,
      resize: opts.resize ?? "contain",
    },
  });

  return data.publicUrl;
}

/**
 * Get raw (untransformed) public URL — for non-image files or when transforms aren't needed.
 */
export function getRawUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export { PRESETS as IMAGE_PRESETS };
