import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";

interface WelcomeHeroCardProps {
  userId: string;
  firstName: string;
}

interface HeroData {
  horse: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
  lastVisit: {
    date: string;
    service_type: string | null;
  } | null;
  nextAppointment: {
    date: string;
    time: string | null;
  } | null;
  providerName: string | null;
}

export function WelcomeHeroCard({ userId, firstName }: WelcomeHeroCardProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeroData = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Parallel: horse, last visit, next appointment, provider
      const [horsesRes, lastVisitRes, nextApptRes, grantRes] = await Promise.all([
        supabase
          .from("horses")
          .select("id, name, photo_url")
          .eq("owner_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("appointments")
          .select("date, service_type")
          .eq("status", "completed")
          .lt("date", today)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("appointments")
          .select("date, time")
          .gte("date", today)
          .neq("status", "cancelled")
          .order("date", { ascending: true })
          .order("time", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("access_grants")
          .select("provider_id")
          .eq("client_id", userId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);

      let providerName: string | null = null;
      if (grantRes.data?.provider_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", grantRes.data.provider_id)
          .maybeSingle();
        providerName = profile?.full_name || null;
      }

      setData({
        horse: horsesRes.data as HeroData["horse"],
        lastVisit: lastVisitRes.data as HeroData["lastVisit"],
        nextAppointment: nextApptRes.data as HeroData["nextAppointment"],
        providerName,
      });
      setLoading(false);
    };

    fetchHeroData();
  }, [userId]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-24 rounded-2xl mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if no horse data at all
  if (!data?.horse) return null;

  const lastVisitText = data.lastVisit
    ? `${formatDistanceToNow(new Date(data.lastVisit.date), { locale: de, addSuffix: false })}${data.providerName ? ` durch ${data.providerName}` : ""}`
    : null;

  const nextApptText = data.nextAppointment
    ? format(new Date(data.nextAppointment.date), "EEEE, dd. MMM", { locale: de })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 shadow-lg">
        <CardContent className="p-6 space-y-5">
          {/* Greeting */}
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-foreground">
              🐴 Hallo {firstName}!
            </p>
            <p className="text-sm text-muted-foreground">
              Dein Pferdeportal ist bereit
            </p>
          </div>

          {/* Horse Hero */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 rounded-2xl bg-muted overflow-hidden ring-2 ring-primary/20 shadow-md">
              {data.horse.photo_url ? (
                <img
                  src={data.horse.photo_url}
                  alt={data.horse.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl">
                  🐴
                </div>
              )}
            </div>
            <p className="font-semibold text-lg text-foreground">
              {data.horse.name}
            </p>
          </div>

          {/* Info Rows */}
          <div className="space-y-2.5">
            {lastVisitText && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Letzter Besuch</p>
                  <p className="text-foreground font-medium">
                    vor {lastVisitText}
                  </p>
                </div>
              </div>
            )}

            {nextApptText && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nächster Termin</p>
                  <p className="text-foreground font-medium">
                    {nextApptText}
                    {data.nextAppointment?.time && ` • ${data.nextAppointment.time.slice(0, 5)} Uhr`}
                  </p>
                </div>
              </div>
            )}

            {!lastVisitText && !nextApptText && data.providerName && (
              <p className="text-sm text-muted-foreground text-center">
                Dein Betreuer <span className="font-medium text-foreground">{data.providerName}</span> hat alles vorbereitet.
              </p>
            )}
          </div>

          {/* CTA */}
          <Button
            className="w-full gap-2"
            onClick={() => navigate(`/client-horse/${data.horse!.id}`)}
          >
            Pferd ansehen
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
