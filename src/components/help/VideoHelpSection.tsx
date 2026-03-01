import { Play, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VideoHelpItem {
  title: string;
  description: string;
  videoUrl: string | null; // null = placeholder
  duration?: string;
}

interface VideoHelpSectionProps {
  title?: string;
  videos: VideoHelpItem[];
}

/**
 * Eingebettete Video-Hilfe pro Modul.
 * Zeigt YouTube/Loom-Videos oder "[VIDEO FOLGT]" Placeholder.
 */
export function VideoHelpSection({ title = 'Video-Anleitungen', videos }: VideoHelpSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {videos.map((video, i) => (
          <Card key={i} className="overflow-hidden">
            {video.videoUrl ? (
              <div className="aspect-video">
                <iframe
                  src={video.videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title={video.title}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted/50 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Play className="h-5 w-5 text-muted-foreground" />
                </div>
                <Badge variant="secondary" className="text-xs">VIDEO FOLGT</Badge>
              </div>
            )}
            <CardContent className="p-3">
              <p className="font-medium text-sm text-foreground">{video.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{video.description}</p>
                {video.duration && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" /> {video.duration}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Default video list for the main modules */
export const MODULE_VIDEOS: VideoHelpItem[] = [
  { title: 'Dashboard erklärt', description: 'Deine Zentrale im Überblick', videoUrl: null, duration: '2 Min' },
  { title: 'Kunden & Pferde anlegen', description: 'So legst du deine ersten Daten an', videoUrl: null, duration: '3 Min' },
  { title: 'Termin erstellen', description: 'Vom Kalender zum Bearbeitungstermin', videoUrl: null, duration: '2 Min' },
  { title: 'Rechnung schreiben', description: 'In 30 Sekunden zur fertigen Rechnung', videoUrl: null, duration: '1 Min' },
  { title: 'Tour-Modus', description: 'Deine tägliche Route effizient planen', videoUrl: null, duration: '3 Min' },
  { title: 'Team verwalten', description: 'Mitarbeiter einladen und Termine zuweisen', videoUrl: null, duration: '2 Min' },
];
