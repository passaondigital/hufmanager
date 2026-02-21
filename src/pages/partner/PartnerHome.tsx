import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Calendar, FileText, TrendingUp, Clock, Activity, ChevronRight, Euro } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { format, startOfMonth, endOfMonth, isAfter } from "date-fns";
import { de } from "date-fns/locale";

export default function PartnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["partner-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, readable_id, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["partner-horse-grants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select(`*, horses:horse_id (id, name, readable_id, photo_url, breed, owner_id)`)
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch recent treatment notes
  const { data: recentNotes = [] } = useQuery({
    queryKey: ["partner-recent-notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_treatment_notes")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .order("treatment_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch upcoming appointments
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["partner-upcoming-appointments", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("partner_appointments")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .gte("appointment_date", today)
        .in("status", ["planned", "confirmed", "requested"])
        .order("appointment_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Monthly stats
  const { data: monthlyNotes = [] } = useQuery({
    queryKey: ["partner-monthly-stats", user?.id],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("partner_treatment_notes")
        .select("id, treatment_date")
        .eq("partner_id", user!.id)
        .gte("treatment_date", start)
        .lte("treatment_date", end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch invoices this month
  const { data: monthlyInvoices = [] } = useQuery({
    queryKey: ["partner-monthly-invoices", user?.id],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("partner_invoices")
        .select("id, total, status")
        .eq("partner_id", user!.id)
        .gte("issue_date", start)
        .lte("issue_date", end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const partnerType = grants?.[0]?.partner_type;
  const typeConfig = getPartnerTypeConfig(partnerType);
  const monthlyRevenue = monthlyInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Willkommen{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {profile?.readable_id && (
            <Badge variant="outline" className="font-mono text-xs">{profile.readable_id}</Badge>
          )}
          {partnerType && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
              {typeConfig.label}
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/partner-horses")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Heart className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{grants.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Betreute Pferde</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/partner-calendar")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{upcomingAppointments.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anstehende Termine</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/partner-notes")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{monthlyNotes.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Behandlungen / Monat</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/partner-invoices")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Euro className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{monthlyRevenue.toFixed(0)}€</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Umsatz / Monat</p>
          </CardContent>
        </Card>
      </div>

      {/* Two columns: Upcoming + Recent */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Nächste Termine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine anstehenden Termine</p>
            ) : (
              upcomingAppointments.map((apt: any) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate("/partner-calendar")}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {format(new Date(apt.appointment_date), "dd")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      🐴 {apt.horses?.name} · {format(new Date(apt.appointment_date), "dd.MM.", { locale: de })}
                      {apt.appointment_time && ` · ${apt.appointment_time.substring(0, 5)}`}
                    </p>
                  </div>
                  <Badge variant={apt.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">
                    {apt.status === "confirmed" ? "Bestätigt" : apt.status === "requested" ? "Angefragt" : "Geplant"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Letzte Behandlungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Behandlungsnotizen</p>
            ) : (
              recentNotes.map((note: any) => (
                <div
                  key={note.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/partner-horse/${note.horse_id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground">
                      🐴 {note.horses?.name} · {format(new Date(note.treatment_date), "dd.MM.yyyy", { locale: de })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Horse Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Meine Pferde
        </h2>
        {grants.length === 0 ? (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="p-8 text-center">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">Du hast noch keinen Zugriff auf Pferde.</p>
              <p className="text-sm text-muted-foreground mt-1">Warte auf eine Einladung von einem Hufbearbeiter oder Pferdebesitzer.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {grants.map((grant: any) => {
              const horse = grant.horses;
              if (!horse) return null;
              return (
                <Card key={grant.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(`/partner-horse/${horse.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg">🐴</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{horse.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {horse.readable_id && <Badge variant="outline" className="font-mono text-[10px]">{horse.readable_id}</Badge>}
                          {horse.breed && <span className="text-xs text-muted-foreground">{horse.breed}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {grant.can_view_medical && <Badge variant="secondary" className="text-[10px]">Medizin</Badge>}
                        {grant.can_add_treatment_notes && <Badge variant="secondary" className="text-[10px]">Notizen</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
