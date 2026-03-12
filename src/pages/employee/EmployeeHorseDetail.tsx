import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AlertTriangle, MapPin, Phone, Calendar, Footprints, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { HoofStatusGrid } from "@/components/horse-detail/HoofStatusGrid";
import type { HoofDetails } from "@/components/horse-detail/types";

interface HorseBasic {
  id: string;
  name: string;
  breed: string | null;
  gender: string | null;
  birth_year: number | null;
  color: string | null;
  photo_url: string | null;
  hoof_protection: string | null;
  shoeing_interval: number | null;
  handling_warnings: string | null;
  hoof_details: any;
  hoof_measurements: any;
  location_name: string | null;
  last_appointment_date: string | null;
  owner_id: string;
}

interface OwnerBasic {
  full_name: string | null;
  phone: string | null;
}

interface HoofHistoryEntry {
  id: string;
  entry_date: string;
  entry_type: string;
  description: string | null;
  created_at: string;
}

interface TodayAppointment {
  id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  notes: string | null;
  status: string;
}

export default function EmployeeHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: empProfile } = useEmployeeProfile();
  const navigate = useNavigate();

  const [horse, setHorse] = useState<HorseBasic | null>(null);
  const [owner, setOwner] = useState<OwnerBasic | null>(null);
  const [todayAppt, setTodayAppt] = useState<TodayAppointment | null>(null);
  const [hoofHistory, setHoofHistory] = useState<HoofHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (user && id && empProfile?.id) fetchData();
  }, [user, id, empProfile?.id]);

  const fetchData = async () => {
    if (!empProfile?.id || !id) return;
    setLoading(true);

    try {
      // Check employee has assignment for this horse
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: assignments } = await supabase
        .from("employee_assignments")
        .select("id, appointment:appointments!inner(id, date, time, service_type, notes, status, horse_id)")
        .eq("employee_id", empProfile.id)
        .not("status", "eq", "cancelled");

      const hasAssignment = assignments?.some(
        (a: any) => a.appointment?.horse_id === id
      );

      if (!hasAssignment) {
        toast.error("Kein Zugriff auf dieses Pferd");
        navigate("/employee/tour");
        return;
      }
      setHasAccess(true);

      // Fetch horse basic data (explicit columns, no sensitive data)
      const { data: horseData, error } = await supabase
        .from("horses")
        .select("id, name, breed, gender, birth_year, color, photo_url, hoof_protection, shoeing_interval, handling_warnings, hoof_details, hoof_measurements, location_name, last_appointment_date, owner_id")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !horseData) { toast.error("Pferd nicht gefunden"); navigate("/employee/tour"); return; }
      setHorse(horseData as HorseBasic);

      // Fetch owner name + phone only
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", horseData.owner_id)
        .single();
      setOwner(ownerData);

      // Today's appointment
      const todayAssignment = assignments?.find(
        (a: any) => a.appointment?.horse_id === id && a.appointment?.date === today
      );
      if (todayAssignment?.appointment) {
        setTodayAppt(todayAssignment.appointment as TodayAppointment);
      }

      // Last 5 hoof history entries
      const { data: hoofData } = await supabase
        .from("hoof_history")
        .select("id, treatment_date, treatment_type, notes, created_at")
        .eq("horse_id", id)
        .order("treatment_date", { ascending: false })
        .limit(5);
      setHoofHistory((hoofData || []) as HoofHistoryEntry[]);

    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!horse || !hasAccess) return null;

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/employee/tour")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
            {horse.photo_url ? (
              <img src={horse.photo_url} alt={horse.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">🐴</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{horse.name}</h1>
            <p className="text-sm text-muted-foreground">
              {horse.breed} {horse.gender && `· ${horse.gender}`} {age && `· ${age}J`}
            </p>
            <p className="text-xs text-muted-foreground">
              {horse.hoof_protection || "Barhuf"} · Intervall: {horse.shoeing_interval || "–"} Wo.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Warning Banner */}
      {horse.handling_warnings && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Sicherheitshinweis</p>
              <p className="text-sm text-foreground">{horse.handling_warnings}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner & Location */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {horse.location_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {horse.location_name}
            </div>
          )}
          {owner && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{owner.full_name || "Besitzer"}</span>
              {owner.phone && (
                <a href={`tel:${owner.phone}`} className="text-primary underline ml-1">{owner.phone}</a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="heute">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heute" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Heute</span>
          </TabsTrigger>
          <TabsTrigger value="hufstatus" className="flex items-center gap-1">
            <Footprints className="h-4 w-4" />
            <span className="text-xs">Hufstatus</span>
          </TabsTrigger>
          <TabsTrigger value="behandlungen" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            <span className="text-xs">Letzte</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heute" className="mt-3">
          {todayAppt ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Heutiger Termin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {todayAppt.time ? `${todayAppt.time} Uhr` : "Keine Uhrzeit"}
                  </span>
                  <Badge variant="secondary">{todayAppt.status}</Badge>
                </div>
                {todayAppt.service_type && (
                  <p className="text-sm font-medium text-foreground">{todayAppt.service_type}</p>
                )}
                {todayAppt.notes && (
                  <p className="text-sm text-muted-foreground">{todayAppt.notes}</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Kein Termin für heute
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hufstatus" className="mt-3 space-y-3">
          <HoofStatusGrid
            hoofDetails={horse.hoof_details as HoofDetails}
            lastAppointmentDate={horse.last_appointment_date}
            shoeingInterval={horse.shoeing_interval}
            horseName={horse.name}
            horseId={horse.id}
          />
        </TabsContent>

        <TabsContent value="behandlungen" className="mt-3 space-y-2">
          {hoofHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Keine Behandlungshistorie
              </CardContent>
            </Card>
          ) : (
            hoofHistory.map(entry => (
              <Card key={entry.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {entry.treatment_type || "Behandlung"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.treatment_date
                        ? new Date(entry.treatment_date).toLocaleDateString("de-DE")
                        : new Date(entry.created_at).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
