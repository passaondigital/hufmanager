import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Film, Image as ImageIcon, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatAttachmentProps {
  filePath: string;
  fileType: 'image' | 'video' | 'document';
  fileName?: string;
  className?: string;
}

export function ChatAttachment({ filePath, fileType, fileName, className }: ChatAttachmentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get signed URL on mount
  useState(() => {
    const fetchSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('chat-images')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Error getting signed URL:', error);
          setError(true);
        } else if (data) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignedUrl();
  });

  const handleDownload = async () => {
    if (!signedUrl) return;
    window.open(signedUrl, '_blank');
  };

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-muted rounded-lg h-32 w-48", className)} />
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <FileText className="h-4 w-4" />
        <span>Datei nicht verfügbar</span>
      </div>
    );
  }

  // Render based on file type
  if (fileType === 'image') {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
        <img 
          src={signedUrl} 
          alt={fileName || "Bild"} 
          className={cn("rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity", className)}
        />
      </a>
    );
  }

  if (fileType === 'video') {
    return (
      <div className={cn("rounded-lg overflow-hidden max-w-full", className)}>
        <video 
          src={signedUrl} 
          controls 
          className="max-w-full max-h-64"
          preload="metadata"
        >
          <source src={signedUrl} />
          Dein Browser unterstützt dieses Video nicht.
        </video>
      </div>
    );
  }

  // Document
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors",
        className
      )}
      onClick={handleDownload}
    >
      <FileText className="h-8 w-8 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{fileName || 'Dokument'}</p>
        <p className="text-xs text-muted-foreground">Klicken zum Öffnen</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

// Helper to determine file type from extension
export function getFileType(fileName: string): 'image' | 'video' | 'document' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return 'document';
}

// Helper to get emoji for file type
export function getFileEmoji(fileType: 'image' | 'video' | 'document'): string {
  switch (fileType) {
    case 'image': return '📷';
    case 'video': return '🎥';
    case 'document': return '📄';
  }
}