import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardWelcomeHeader } from "@/components/dashboard/DashboardWelcomeHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Heart, Calendar, FileText, TrendingUp, Clock, Activity, ChevronRight, Euro,
  CheckCircle2, Circle, X, User, Building2, Eye, Stethoscope, CalendarPlus, Receipt, MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";

// VERBESSERUNG 4: Onboarding Checklist
interface ChecklistStep {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
  check: (data: any) => boolean;
}

const CHECKLIST_STEPS: ChecklistStep[] = [
  { key: "profile", label: "Profil vervollständigen", icon: User, path: "/partner-profile", check: (d) => !!(d.profile?.full_name && d.profile?.avatar_url) },
  { key: "business", label: "Geschäftsdaten hinterlegen", icon: Building2, path: "/partner-settings", check: (d) => !!(d.settings?.business_name) },
  { key: "horse", label: "Erstes Pferd ansehen", icon: Eye, path: "/partner-horses", check: (d) => d.grants?.length > 0 },
  { key: "note", label: "Erste Behandlungsnotiz erfassen", icon: Stethoscope, path: "/partner-notes", check: (d) => d.notesCount > 0 },
  { key: "appointment", label: "Ersten Termin eintragen", icon: CalendarPlus, path: "/partner-calendar", check: (d) => d.appointmentsCount > 0 },
  { key: "invoice", label: "Erste Rechnung erstellen", icon: Receipt, path: "/partner-invoices", check: (d) => d.invoicesCount > 0 },
  { key: "chat", label: "Chat mit Provider/Besitzer starten", icon: MessageSquare, path: "/partner-chat", check: (d) => d.conversationsCount > 0 },
];

export default function PartnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["partner-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, readable_id, avatar_url, onboarding_dismissed")
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

  // VERBESSERUNG 6: Next provider appointment on shared horses
  const { data: nextProviderAppointment } = useQuery({
    queryKey: ["partner-next-provider-apt", user?.id],
    queryFn: async () => {
      const horseIds = grants.map((g: any) => g.horse_id);
      if (horseIds.length === 0) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time, horse_id, horses:horse_id (name)")
        .in("horse_id", horseIds)
        .gte("date", today)
        .in("status", ["planned", "confirmed"])
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user && grants.length > 0,
  });

  const { data: monthlyNotes = [] } = useQuery({
    queryKey: ["partner-monthly-stats", user?.id],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data } = await supabase
        .from("partner_treatment_notes")
        .select("id")
        .eq("partner_id", user!.id)
        .gte("treatment_date", start)
        .lte("treatment_date", end);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: monthlyInvoices = [] } = useQuery({
    queryKey: ["partner-monthly-invoices", user?.id],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data } = await supabase
        .from("partner_invoices")
        .select("id, total, status")
        .eq("partner_id", user!.id)
        .gte("issue_date", start)
        .lte("issue_date", end);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ["partner-settings-onboarding", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_business_settings")
        .select("business_name")
        .eq("partner_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: conversationsCount = 0 } = useQuery({
    queryKey: ["partner-convs-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("partner_conversations")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const dismissOnboarding = useMutation({
    mutationFn: async () => {
      await supabase.from("profiles").update({ onboarding_dismissed: true } as any).eq("id", user!.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-profile"] }),
  });

  const partnerType = grants?.[0]?.partner_type;
  const typeConfig = getPartnerTypeConfig(partnerType);
  const monthlyRevenue = monthlyInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);

  // Checklist data
  const checklistData = {
    profile,
    settings,
    grants,
    notesCount: recentNotes.length,
    appointmentsCount: upcomingAppointments.length,
    invoicesCount: monthlyInvoices.length,
    conversationsCount,
  };
  const completedSteps = CHECKLIST_STEPS.filter(s => s.check(checklistData)).length;
  const allDone = completedSteps === CHECKLIST_STEPS.length;
  const showChecklist = !allDone && !(profile as any)?.onboarding_dismissed;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <DashboardWelcomeHeader
          fullName={profile?.full_name}
          readableId={profile?.readable_id}
          subtitle={partnerType ? typeConfig.label : undefined}
        />
        {partnerType && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0">
            <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
            {typeConfig.label}
          </Badge>
        )}
      </div>

      {/* VERBESSERUNG 4: Onboarding Checklist */}
      {showChecklist && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                🚀 Einrichtung — {completedSteps}/{CHECKLIST_STEPS.length} erledigt
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => dismissOnboarding.mutate()}>
                <X className="h-3 w-3 mr-1" /> Später
              </Button>
            </div>
            <Progress value={(completedSteps / CHECKLIST_STEPS.length) * 100} className="h-2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-1 pt-2">
            {CHECKLIST_STEPS.map((step) => {
              const done = step.check(checklistData);
              return (
                <button
                  key={step.key}
                  onClick={() => !done && navigate(step.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${done ? "text-muted-foreground" : "hover:bg-primary/10 text-foreground cursor-pointer"}`}
                  disabled={done}
                >
                  {done ? <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <step.icon className="h-4 w-4 flex-shrink-0" />
                  <span className={done ? "line-through" : ""}>{step.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* VERBESSERUNG 6: Next Provider Appointment */}
      {nextProviderAppointment && (
        <Card className="bg-accent/30 border-accent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Nächste Hufpflege: {format(new Date(nextProviderAppointment.date), "dd.MM.yyyy", { locale: de })}
                {nextProviderAppointment.time && ` · ${nextProviderAppointment.time.substring(0, 5)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                🐴 {(nextProviderAppointment as any).horses?.name}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Nächste Termine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine anstehenden Termine</p>
            ) : (
              upcomingAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate("/partner-calendar")}>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Letzte Behandlungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Behandlungsnotizen</p>
            ) : (
              recentNotes.map((note: any) => (
                <div key={note.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/partner-horse/${note.horse_id}`)}>
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
          <Heart className="h-5 w-5 text-primary" /> Meine Pferde
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
