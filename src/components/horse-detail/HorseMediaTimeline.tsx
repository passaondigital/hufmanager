import { useEffect, useState } from "react";
import { Camera, Video, Mic, Loader2, Play } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  listHorseMedia,
  getSignedHorseMediaUrl,
  type HorseMediaRecord,
} from "@/lib/hufai-media";

interface Props {
  horseId: string;
  refreshTrigger?: number;
}

const TYPE_META = {
  photo: { icon: Camera,  label: "Foto",  color: "#F97316" },
  video: { icon: Video,   label: "Video", color: "#8B5CF6" },
  audio: { icon: Mic,     label: "Audio", color: "#3B82F6" },
};

export function HorseMediaTimeline({ horseId, refreshTrigger = 0 }: Props) {
  const [items, setItems] = useState<HorseMediaRecord[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listHorseMedia(horseId, 6).then(async (records) => {
      if (cancelled) return;
      setItems(records);
      setLoading(false);

      // Fetch signed URLs for photos/videos
      const urlMap: Record<string, string> = {};
      await Promise.all(
        records
          .filter((r) => r.type !== "audio")
          .map(async (r) => {
            const url = await getSignedHorseMediaUrl(r.bucket_path, 3600);
            if (url) urlMap[r.id] = url;
          }),
      );
      if (!cancelled) setUrls(urlMap);
    });
    return () => { cancelled = true; };
  }, [horseId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Lade Medien…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground rounded-xl border border-dashed border-border">
        Noch keine Medien gespeichert.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.photo;
          const Icon = meta.icon;
          const url = urls[item.id];

          return (
            <div
              key={item.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30"
            >
              {item.type === "photo" && url ? (
                <img
                  src={url}
                  alt={item.file_name ?? "Foto"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : item.type === "video" && url ? (
                <div className="w-full h-full flex items-center justify-center bg-black/60">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.4)" }}
                  >
                    <Play className="h-5 w-5 text-purple-400 ml-0.5" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon className="h-6 w-6" style={{ color: meta.color }} />
                </div>
              )}

              {/* Type badge */}
              <div
                className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  backgroundColor: `${meta.color}22`,
                  color: meta.color,
                  border: `1px solid ${meta.color}44`,
                }}
              >
                {meta.label}
              </div>

              {/* Timestamp */}
              <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-[9px] text-white/80 leading-none">
                  {format(new Date(item.captured_at), "dd.MM.yy", { locale: de })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 6 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Letzte 6 Medien · Vollständige Galerie in Pferdeakte
        </p>
      )}
    </div>
  );
}
