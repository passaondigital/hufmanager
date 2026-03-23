import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpTip } from "@/components/ui/HelpTip";

import { Loader2, Footprints, MapPin, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface ClientHorse {
  id: string;
  name: string | null;
  breed: string | null;
  birth_year: number | null;
  photo_url: string | null;
  location_name: string | null;
  hoof_type: string | null;
  hoof_protection: string | null;
}

interface NextAppointment {
  horse_id: string;
  date: string;
  service_type: string | null;
}

export default function ClientHorses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [horses, setHorses] = useState<ClientHorse[]>([]);
  const [nextAppts, setNextAppts] = useState<Record<string, NextAppointment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch horses via horses_basic view (no medical data)
      const { data: horseData } = await supabase
        .from("horses")
        .select("id, name, breed, birth_year, photo_url, location_name, hoof_type, hoof_protection")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("name");

      setHorses((horseData as ClientHorse[]) || []);

      // Fetch next appointments for each horse
      if (horseData && horseData.length > 0) {
        const horseIds = horseData.map((h) => h.id);
        const today = new Date().toISOString().split("T")[0];

        const { data: apptData } = await supabase
          .from("appointments")
          .select("horse_id, date, service_type")
          .in("horse_id", horseIds)
          .gte("date", today)
          .in("status", ["planned", "confirmed"])
          .order("date")
          .limit(50);

        const apptMap: Record<string, NextAppointment> = {};
        (apptData || []).forEach((a) => {
          if (!apptMap[a.horse_id]) {
            apptMap[a.horse_id] = a as NextAppointment;
          }
        });
        setNextAppts(apptMap);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getAge = (birthYear: number | null) => {
    if (!birthYear) return null;
    return new Date().getFullYear() - birthYear;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-2">
          <Footprints className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Meine Pferde</h1>
          <HelpTip id="client.horses" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {horses.length === 0 ? (
          <div className="text-center py-12">
            <Footprints className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Noch keine Pferde angelegt.</p>
          </div>
        ) : (
          horses.map((horse) => {
            const age = getAge(horse.birth_year);
            const nextAppt = nextAppts[horse.id];

            return (
              <Card
                key={horse.id}
                className="overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/client-horse/${horse.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4">
                    {/* Photo */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                      {horse.photo_url ? (
                        <img
                          src={horse.photo_url}
                          alt={horse.name || "Pferd"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <Footprints className="h-6 w-6 text-primary/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{horse.name || "Unbenannt"}</span>
                        {horse.hoof_protection && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {horse.hoof_protection}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[horse.breed, age ? `${age} Jahre` : null].filter(Boolean).join(" · ") || "Keine Details"}
                      </p>

                      {/* Location */}
                      {horse.location_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{horse.location_name}</span>
                        </div>
                      )}

                      {/* Next appointment */}
                      {nextAppt && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>
                            Nächster Termin: {format(parseISO(nextAppt.date), "dd. MMM", { locale: de })}
                          </span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
}
