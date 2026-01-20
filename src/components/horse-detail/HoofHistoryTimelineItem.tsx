import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { HoofHistoryEntry } from "./TabHufHistorie";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface TimelineItemProps {
  entry: HoofHistoryEntry;
  typeInfo: {
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };
  isFirst: boolean;
  onDelete: () => void;
}

export function HoofHistoryTimelineItem({ entry, typeInfo, isFirst, onDelete }: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(isFirst);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const Icon = typeInfo.icon;

  const hasPhotos = entry.photo_before_url || entry.photo_after_url;

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className={cn(
          "relative ml-10 transition-all",
          isFirst && "ring-2 ring-[#F47B20]/30"
        )}>
          {/* Timeline dot */}
          <div className={cn(
            "absolute -left-[29px] top-4 w-4 h-4 rounded-full border-2 border-background",
            "bg-[#F47B20]"
          )} />

          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    "bg-muted"
                  )}>
                    <Icon className={cn("h-4 w-4", typeInfo.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {typeInfo.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.entry_date), "d. MMMM yyyy", { locale: de })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasPhotos && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      <ImageIcon className="h-3 w-3" />
                      Fotos
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4 border-t border-border">
              {/* Description */}
              {entry.description && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Befund / Notizen:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {entry.description}
                  </p>
                </div>
              )}

              {/* Photos */}
              {hasPhotos && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {entry.photo_before_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Vorher:</p>
                      <img
                        src={entry.photo_before_url}
                        alt="Vorher"
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxImage(entry.photo_before_url)}
                      />
                    </div>
                  )}
                  {entry.photo_after_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nachher:</p>
                      <img
                        src={entry.photo_after_url}
                        alt="Nachher"
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxImage(entry.photo_after_url)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Löschen
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Vollbild"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
