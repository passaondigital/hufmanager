import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  /** Fallback text shown if image fails */
  fallbackText?: string;
  /** Show skeleton while loading */
  showSkeleton?: boolean;
  /** Aspect ratio class (e.g. "aspect-square", "aspect-video") */
  aspectRatio?: string;
}

/**
 * Optimized image component with:
 * - Native lazy loading
 * - Skeleton placeholder during load
 * - Fallback on error
 * - Explicit width/height to prevent layout shift
 * - Decoding=async for non-blocking rendering
 */
export function OptimizedImage({
  src,
  alt = "",
  className,
  fallbackText,
  showSkeleton = true,
  aspectRatio,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium rounded-lg",
          aspectRatio,
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        {fallbackText || alt?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", aspectRatio)} style={{ width, height }}>
      {showSkeleton && !loaded && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
