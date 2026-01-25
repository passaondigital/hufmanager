import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, CheckCircle, Navigation, Calendar, Plus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, addWeeks } from "date-fns";
import { de } from "date-fns/locale";

interface Horse {
  id: string;
  name: string;
  readable_id?: string;
  breed?: string;
  equine_type?: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  last_appointment_date?: string;
  shoeing_interval?: number;
  hoof_details?: any;
}

interface CustomerHorseCardsProps {
  horses: Horse[];
  onAddHorse: () => void;
  onEditHorse: (horseId: string) => void;
}

const EQUINE_TYPE_LABELS: Record<string, string> = {
  horse: "Pferd",
  pony: "Pony",
  donkey: "Esel",
  mule: "Maultier",
  zebra: "Zebra",
};

export function CustomerHorseCards({ horses, onAddHorse, onEditHorse }: CustomerHorseCardsProps) {
  const navigate = useNavigate();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch signed URLs for horse photos
    const fetchPhotoUrls = async () => {
      const urls: Record<string, string> = {};
      for (const horse of horses) {
        if (horse.photo_url) {
          try {
            const { data } = await supabase.storage
              .from("horse-photos")
              .createSignedUrl(horse.photo_url, 3600);
            if (data?.signedUrl) {
              urls[horse.id] = data.signedUrl;
            }
          } catch (e) {
            // Use photo_url directly if it's already a full URL
            if (horse.photo_url.startsWith('http')) {
              urls[horse.id] = horse.photo_url;
            }
          }
        }
      }
      setPhotoUrls(urls);
    };
    
    if (horses.length > 0) {
      fetchPhotoUrls();
    }
  }, [horses]);

  const getAppointmentStatus = (horse: Horse) => {
    if (!horse.last_appointment_date || !horse.shoeing_interval) {
      return { status: "unknown", label: "Kein Intervall", color: "text-muted-foreground" };
    }

    const lastDate = new Date(horse.last_appointment_date);
    const nextDue = addWeeks(lastDate, horse.shoeing_interval);
    const daysUntil = differenceInDays(nextDue, new Date());

    if (daysUntil < 0) {
      return { status: "overdue", label: `${Math.abs(daysUntil)} Tage überfällig`, color: "text-red-600" };
    } else if (daysUntil <= 7) {
      return { status: "soon", label: `In ${daysUntil} Tagen`, color: "text-amber-600" };
    } else {
      return { status: "ok", label: `In ${daysUntil} Tagen`, color: "text-green-600" };
    }
  };

  const hasHoofIssues = (horse: Horse) => {
    if (!horse.hoof_details) return false;
    const details = horse.hoof_details as any;
    return ['vl', 'vr', 'hl', 'hr'].some(pos => {
      const hoof = details[pos];
      return hoof?.issues && hoof.issues.length > 0;
    });
  };

  const openNavigation = (lat: number, lng: number) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  if (horses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Keine Pferde zugeordnet</p>
          <Button onClick={onAddHorse}>
            <Plus className="h-4 w-4 mr-2" />
            Pferd hinzufügen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Pferde ({horses.length})
        </h3>
        <Button size="sm" onClick={onAddHorse}>
          <Plus className="h-4 w-4 mr-2" />
          Pferd hinzufügen
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {horses.map((horse) => {
          const appointmentStatus = getAppointmentStatus(horse);
          const hasIssues = hasHoofIssues(horse);

          return (
            <Card 
              key={horse.id}
              className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/pferd/${horse.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Horse Avatar */}
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage 
                      src={photoUrls[horse.id]} 
                      alt={horse.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-lg font-semibold">
                      {horse.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Name & ID */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg truncate">{horse.name}</span>
                      {horse.readable_id && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          #{horse.readable_id}
                        </Badge>
                      )}
                    </div>

                    {/* Type & Breed */}
                    <p className="text-sm text-muted-foreground mb-2">
                      {horse.equine_type && EQUINE_TYPE_LABELS[horse.equine_type]}
                      {horse.breed && ` • ${horse.breed}`}
                    </p>

                    {/* Status Indicators */}
                    <div className="flex flex-wrap gap-2">
                      {/* Appointment Status */}
                      <div className={`flex items-center gap-1 text-xs ${appointmentStatus.color}`}>
                        {appointmentStatus.status === 'overdue' ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : appointmentStatus.status === 'soon' ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        <span>{appointmentStatus.label}</span>
                      </div>

                      {/* Hoof Issues Indicator */}
                      {hasIssues && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Huf-Befund
                        </Badge>
                      )}
                    </div>

                    {/* Last Appointment */}
                    {horse.last_appointment_date && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Letzter Termin: {format(new Date(horse.last_appointment_date), "dd.MM.yyyy", { locale: de })}
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-1">
                    {horse.latitude && horse.longitude && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openNavigation(horse.latitude!, horse.longitude!);
                        }}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}