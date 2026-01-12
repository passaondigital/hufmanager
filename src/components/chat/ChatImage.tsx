import { useState, useEffect } from "react";
import { getStorageUrl } from "@/lib/storage";
import { Loader2 } from "lucide-react";

interface ChatImageProps {
  imagePath: string;
  className?: string;
}

// Cache for signed URLs to avoid repeated fetches
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function ChatImage({ imagePath, className }: ChatImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setLoading(false);
      return;
    }

    const fetchSignedUrl = async () => {
      // Check cache first (with 5-minute buffer before expiry)
      const cached = urlCache.get(imagePath);
      const now = Date.now();
      if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
        setSignedUrl(cached.url);
        setLoading(false);
        return;
      }

      try {
        // Extract just the path if it's a full URL (for backwards compatibility)
        let path = imagePath;
        if (imagePath.startsWith('http')) {
          // Extract path from URL for old messages
          const url = new URL(imagePath);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(p => p === 'chat-images');
          if (bucketIndex !== -1) {
            path = pathParts.slice(bucketIndex + 1).join('/');
          }
        }

        const url = await getStorageUrl('chat-images', path, 3600); // 1 hour expiry
        if (url) {
          // Cache for 50 minutes (10-minute buffer before actual expiry)
          urlCache.set(imagePath, { 
            url, 
            expiresAt: now + 50 * 60 * 1000 
          });
          setSignedUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [imagePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 w-32 bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex items-center justify-center h-32 w-32 bg-muted rounded-lg text-muted-foreground text-sm">
        Bild nicht verfügbar
      </div>
    );
  }

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
      <img 
        src={signedUrl} 
        alt="Bild" 
        className={className || "rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"}
        onError={() => setError(true)}
      />
    </a>
  );
}
