import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Camera, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Horse {
  id: string;
  name: string;
  breed: string | null;
  birth_year: number | null;
  gender: string | null;
  color: string | null;
  height: string | null;
  discipline: string | null;
  hoof_type: string | null;
  shoeing_interval: number | null;
  special_notes: string | null;
  photo_url: string | null;
}

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  status: string | null;
  notes: string | null;
}

interface HoofPhoto {
  id: string;
  photo_url: string;
  hoof_position: string | null;
  taken_at: string | null;
}

export default function ClientHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [horse, setHorse] = useState<Horse | null>(null);
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch horse details
      const { data: horseData } = await supabase
        .from("horses")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!horseData) {
        navigate("/client-home");
        return;
      }
      setHorse(horseData);

      // Fetch appointments
      const today = new Date().toISOString().split("T")[0];
      
      // Last appointment
      const { data: lastApt } = await supabase
        .from("appointments")
        .select("*")
        .eq("horse_id", id)
        .lt("date", today)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastAppointment(lastApt);

      // Next appointment
      const { data: nextApt } = await supabase
        .from("appointments")
        .select("*")
        .eq("horse_id", id)
        .gte("date", today)
        .eq("status", "scheduled")
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      setNextAppointment(nextApt);

      // Fetch hoof photos
      const { data: photos } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", id)
        .order("taken_at", { ascending: false })
        .limit(8);
      setHoofPhotos(photos || []);

      setLoading(false);
    };

    fetchData();
  }, [user, id, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!horse) return null;

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd. MMMM yyyy", { locale: de });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-foreground">{horse.name}</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Horse Info Card */}
        <Card className="overflow-hidden">
          <div className="h-48 bg-muted flex items-center justify-center">
            {horse.photo_url ? (
              <img 
                src={horse.photo_url} 
                alt={horse.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-6xl">🐴</span>
            )}
          </div>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-xl font-bold text-foreground">{horse.name}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {horse.breed && (
                <div>
                  <span className="text-muted-foreground">Rasse:</span>
                  <p className="font-medium text-foreground">{horse.breed}</p>
                </div>
              )}
              {horse.birth_year && (
                <div>
                  <span className="text-muted-foreground">Geburtsjahr:</span>
                  <p className="font-medium text-foreground">{horse.birth_year}</p>
                </div>
              )}
              {horse.color && (
                <div>
                  <span className="text-muted-foreground">Farbe:</span>
                  <p className="font-medium text-foreground">{horse.color}</p>
                </div>
              )}
              {horse.height && (
                <div>
                  <span className="text-muted-foreground">Stockmaß:</span>
                  <p className="font-medium text-foreground">{horse.height}</p>
                </div>
              )}
              {horse.shoeing_interval && (
                <div>
                  <span className="text-muted-foreground">Beschlagsintervall:</span>
                  <p className="font-medium text-foreground">{horse.shoeing_interval} Wochen</p>
                </div>
              )}
            </div>
            {horse.special_notes && (
              <div className="pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Notizen:</span>
                <p className="text-sm text-foreground mt-1">{horse.special_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointments */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Termine
          </h3>
          
          {/* Next Appointment */}
          <Card className={nextAppointment ? "border-primary/50 bg-primary/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nächster Termin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {nextAppointment ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {formatDate(nextAppointment.date)}
                  </p>
                  {nextAppointment.time && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {nextAppointment.time.slice(0, 5)} Uhr
                    </p>
                  )}
                  {nextAppointment.service_type && (
                    <p className="text-sm text-muted-foreground">
                      {nextAppointment.service_type}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Kein Termin geplant</p>
              )}
            </CardContent>
          </Card>

          {/* Last Appointment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Letzter Termin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {lastAppointment ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {formatDate(lastAppointment.date)}
                  </p>
                  {lastAppointment.service_type && (
                    <p className="text-sm text-muted-foreground">
                      {lastAppointment.service_type}
                    </p>
                  )}
                  {lastAppointment.notes && (
                    <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-2">
                      {lastAppointment.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Noch kein Termin durchgeführt</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hoof Photos */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Huf-Fotos
          </h3>
          
          {hoofPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {hoofPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted">
                    <img 
                      src={photo.photo_url} 
                      alt={photo.hoof_position || "Huf-Foto"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {photo.hoof_position && (
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground text-center">
                        {photo.hoof_position}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Noch keine Fotos vorhanden</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
