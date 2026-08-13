import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowRight,
  CalendarPlus,
  Clock3,
  Euro,
  FileWarning,
  Footprints,
  MapPin,
  Navigation,
  Route,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AppointmentRow = {
  id: string;
  date: string;
  time: string | null;
  status: string | null;
  service_type: string | null;
  location: string | null;
  applied_price: number | null;
  price: number | null;
  horses: Array<{ id: string; name: string; owner_id?: string | null }>;
  client: {
    id: string;
    full_name: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
  } | null;
};

function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "Ohne Uhrzeit";
}

function formatShortDate(value: string) {
  return format(parseISO(value), "EEEE, d. MMMM", { locale: de });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function TodayScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const todayQuery = useQuery({
    queryKey: ["slim-today-unchained", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { appointments: [] as AppointmentRow[], overdueInvoices: 0, followUps: 0, distanceKm: null as number | null };

      const [appointmentsResult, invoicesResult, followupsResult, tourResult] = await Promise.all([
        supabase
          .from("appointments")
          .select(`
            id, date, time, status, service_type, location, applied_price, price,
            horses(id, name, owner_id),
            client:profiles!appointments_client_id_fkey(id, full_name, street, zip_code, city)
          ` as any)
          .eq("date", today)
          .eq("provider_id", user.id)
          .neq("status", "cancelled")
          .order("time", { ascending: true }) as any,
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("provider_id", user.id).in("status", ["open", "overdue"]),
        supabase.from("hufi_followup_suggestions").select("horse_id", { count: "exact", head: true }).eq("provider_id", user.id).in("status", ["open", "overdue"]),
        supabase.from("daily_tours").select("total_distance_km").eq("provider_id", user.id).eq("tour_date", today).maybeSingle(),
      ]);

      if (appointmentsResult.error) {
        console.error("Today appointments failed", { code: appointmentsResult.error.code });
        throw new Error("TODAY_LOAD_FAILED");
      }

      const appointments = (appointmentsResult.data ?? []).map((row: any) => {
        const horses = Array.isArray(row.horses) ? row.horses : row.horses ? [row.horses] : [];
        const client = Array.isArray(row.client) ? row.client[0] : row.client;
        return {
          id: row.id,
          date: row.date,
          time: row.time,
          status: row.status,
          service_type: row.service_type,
          location: row.location,
          applied_price: row.applied_price == null ? null : Number(row.applied_price),
          price: row.price == null ? null : Number(row.price),
          horses,
          client: client
            ? { id: client.id, full_name: client.full_name, street: client.street, zip: client.zip_code, city: client.city }
            : null,
        } satisfies AppointmentRow;
      });

      return {
        appointments,
        overdueInvoices: invoicesResult.count ?? 0,
        followUps: followupsResult.count ?? 0,
        distanceKm: tourResult.data?.total_distance_km == null ? null : Number(tourResult.data.total_distance_km),
      };
    },
  });

  const appointments = todayQuery.data?.appointments ?? [];
  const nextAppointment = appointments.find((appointment) => appointment.status !== "completed") ?? appointments[0] ?? null;
  const totalHorses = useMemo(() => new Set(appointments.flatMap((appointment) => appointment.horses.map((horse) => horse.id))).size, [appointments]);
  const totalCustomers = useMemo(() => new Set(appointments.map((appointment) => appointment.client?.id).filter(Boolean)).size, [appointments]);
  const totalVisits = useMemo(() => {
    const visitKeys = appointments.map((appointment) => {
      const normalizedAddress = [
        appointment.client?.street,
        appointment.client?.zip,
        appointment.client?.city,
        appointment.location,
      ]
        .filter(Boolean)
        .join("|")
        .trim()
        .toLowerCase();

      return [
        appointment.client?.id ?? appointment.id,
        appointment.time?.slice(0, 5) ?? "ohne-uhrzeit",
        normalizedAddress || appointment.id,
      ].join("::");
    });

    return new Set(visitKeys).size;
  }, [appointments]);
  const plannedRevenue = useMemo(() => appointments.reduce((sum, appointment) => sum + (appointment.applied_price ?? appointment.price ?? 0), 0), [appointments]);
  const nextAddress = nextAppointment
    ? [nextAppointment.client?.street, nextAppointment.client?.zip, nextAppointment.client?.city].filter(Boolean).join(", ") || nextAppointment.location
    : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--hm-text-secondary)]">{formatShortDate(today)}</p>
          <h1 className="mt-1 text-[clamp(1.75rem,3vw,2rem)] font-bold tracking-[-0.035em] text-[var(--hm-text-primary)]">Heute</h1>
          <p className="mt-1 text-sm text-[var(--hm-text-secondary)]">Dein Arbeitstag, auf einen Blick.</p>
        </div>
        <button type="button" className="hm-button-secondary" onClick={() => navigate("/kalender?new=true")}>
          <CalendarPlus className="h-4 w-4" />
          Termin hinzufügen
        </button>
      </header>

      {todayQuery.isLoading ? (
        <TodaySkeleton />
      ) : todayQuery.isError ? (
        <section className="hm-card flex min-h-52 flex-col items-start justify-center p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600"><FileWarning className="h-5 w-5" /></div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--hm-text-primary)]">Der Arbeitstag konnte gerade nicht geladen werden.</h2>
          <p className="mt-1 text-sm text-[var(--hm-text-secondary)]">Prüfe die Verbindung und versuche es erneut.</p>
          <button type="button" className="hm-button-primary mt-5" onClick={() => void todayQuery.refetch()}>Erneut versuchen</button>
        </section>
      ) : !nextAppointment ? (
        <section className="hm-card flex min-h-64 flex-col items-start justify-center p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><CalendarPlus className="h-6 w-6" /></div>
          <h2 className="mt-5 text-xl font-semibold text-[var(--hm-text-primary)]">Heute sind noch keine Termine geplant.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--hm-text-secondary)]">Lege einen Termin an oder öffne deine Kunden- und Pferdeakte, um den nächsten Besuch zu planen.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="hm-button-primary" onClick={() => navigate("/kalender?new=true")}>Termin hinzufügen</button>
            <button type="button" className="hm-button-secondary" onClick={() => navigate("/home/kunden")}>Kunden & Pferde</button>
          </div>
        </section>
      ) : (
        <>
          <section className="hm-card overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
              <div className="p-5 sm:p-7">
                <p className="text-sm font-semibold text-orange-600">Nächster Termin</p>
                <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="min-w-24 text-4xl font-bold tracking-[-0.05em] text-[var(--hm-text-primary)]">{formatTime(nextAppointment.time)}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-2xl font-bold tracking-[-0.025em] text-[var(--hm-text-primary)]">{nextAppointment.client?.full_name || "Kunde"}</h2>
                    <p className="mt-1 text-lg font-medium text-[var(--hm-text-secondary)]">{nextAppointment.horses.map((horse) => horse.name).join(" · ") || "Pferd noch nicht zugeordnet"}</p>
                    <p className="mt-4 flex items-start gap-2 text-sm text-[var(--hm-text-secondary)]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{nextAddress || "Adresse noch nicht hinterlegt"}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" className="hm-button-primary" onClick={() => navigate("/home/tour")}><Navigation className="h-4 w-4" />Navigation starten</button>
                  <button type="button" className="hm-button-secondary" onClick={() => navigate(`/pferd/${nextAppointment.horses[0]?.id ?? ""}`)} disabled={!nextAppointment.horses[0]?.id}>Termin öffnen<ArrowRight className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="border-t border-[var(--hm-border)] bg-[var(--hm-surface-elevated)] p-5 lg:border-l lg:border-t-0 sm:p-6">
                <div className="grid grid-cols-2 gap-4">
                  <WorkdayValue icon={Route} value={todayQuery.data?.distanceKm == null ? "Route offen" : `${todayQuery.data.distanceKm} km`} label="Tagesstrecke" />
                  <WorkdayValue icon={Clock3} value={`${totalVisits} Stopps`} label="Tagesplan" />
                  <WorkdayValue icon={Users} value={`${totalCustomers} Kunden`} label={`${totalHorses} Pferde`} />
                  <WorkdayValue icon={Euro} value={formatCurrency(plannedRevenue)} label="geplante Leistungen" />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
            <section className="hm-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-[var(--hm-text-primary)]">Heutiger Tagesplan</h2>
                <button type="button" className="text-sm font-semibold text-orange-600 hover:text-orange-700" onClick={() => navigate("/home/tour")}>Tour öffnen</button>
              </div>
              <div className="mt-4 divide-y divide-[var(--hm-border)]">
                {appointments.map((appointment, index) => (
                  <button key={appointment.id} type="button" onClick={() => navigate("/home/tour")} className="group grid w-full grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left first:pt-1">
                    <span className="text-sm font-semibold text-[var(--hm-text-primary)]">{formatTime(appointment.time)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-[var(--hm-text-primary)]">{appointment.client?.full_name || "Kunde"}</span>
                      <span className="mt-0.5 block truncate text-sm text-[var(--hm-text-secondary)]">{appointment.horses.map((horse) => horse.name).join(" + ") || appointment.service_type || "Termin"}</span>
                    </span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${index === 0 ? "bg-orange-600 text-white" : "text-[var(--hm-text-secondary)] group-hover:bg-orange-500/10 group-hover:text-orange-600"}`}><ArrowRight className="h-4 w-4" /></span>
                  </button>
                ))}
              </div>
            </section>

            <aside className="space-y-5">
              {(todayQuery.data?.followUps ?? 0) + (todayQuery.data?.overdueInvoices ?? 0) > 0 && (
                <section className="hm-card p-5">
                  <h2 className="text-lg font-semibold text-[var(--hm-text-primary)]">Offene Dinge</h2>
                  <div className="mt-3 space-y-2">
                    {(todayQuery.data?.followUps ?? 0) > 0 && <AttentionRow icon={Footprints} label={`${todayQuery.data?.followUps} Follow-up`} onClick={() => navigate("/home/kunden")} />}
                    {(todayQuery.data?.overdueInvoices ?? 0) > 0 && <AttentionRow icon={FileWarning} label={`${todayQuery.data?.overdueInvoices} Rechnung offen`} onClick={() => navigate("/rechnungen")} />}
                  </div>
                </section>
              )}
              <section className="hm-card p-5">
                <h2 className="text-lg font-semibold text-[var(--hm-text-primary)]">Danach</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--hm-text-secondary)]">Die Tour führt dich automatisch zum nächsten offenen Stopp.</p>
                <button type="button" className="hm-button-secondary mt-4 w-full" onClick={() => navigate("/home/tour")}>Tagesroute ansehen<ArrowRight className="h-4 w-4" /></button>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function WorkdayValue({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return <div><Icon className="h-4 w-4 text-orange-600" /><p className="mt-2 text-base font-semibold text-[var(--hm-text-primary)]">{value}</p><p className="mt-0.5 text-xs text-[var(--hm-text-secondary)]">{label}</p></div>;
}

function AttentionRow({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-orange-500/10 px-3 text-left text-sm font-semibold text-[var(--hm-text-primary)]"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-orange-600" />{label}</span><ArrowRight className="h-4 w-4 text-orange-600" /></button>;
}

function TodaySkeleton() {
  return <div className="space-y-5" aria-label="Heute wird geladen"><div className="hm-card h-72 animate-pulse bg-[var(--hm-surface-elevated)]" /><div className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]"><div className="hm-card h-80 animate-pulse bg-[var(--hm-surface-elevated)]" /><div className="hm-card h-48 animate-pulse bg-[var(--hm-surface-elevated)]" /></div></div>;
}
