import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowRight, Clock3, MapPin, Route, AlertTriangle, CircleCheckBig, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AppointmentRow = {
  id: string;
  date: string;
  time: string | null;
  status: string | null;
  service_type: string | null;
  location: string | null;
  horses: Array<{ id: string; name: string; owner_id?: string | null }> | null;
  client?: {
    id: string;
    full_name?: string | null;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
  } | null;
};

function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function formatShortDate(value: string) {
  return format(parseISO(value), "EEE, dd.MM.", { locale: de });
}

export function TodayScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["slim-today", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { appointments: [] as AppointmentRow[], overdueInvoices: 0, followUps: 0 };

      const [appointmentsResult, invoicesResult, followupsResult] = await Promise.all([
        supabase
          .from("appointments")
          .select(`
            id, date, time, status, service_type, location,
            horses(id, name, owner_id),
            client_id,
            clients:profiles!appointments_client_id_fkey(id, full_name),
            contacts!appointments_client_id_fkey(id, profile_id, full_name, street, zip_code, city)
          ` as any)
          .eq("date", today)
          .eq("provider_id", user.id)
          .neq("status", "cancelled")
          .order("time", { ascending: true }) as any,
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .eq("status", "overdue"),
        supabase
          .from("hufi_followup_suggestions")
          .select("horse_id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .in("status", ["open", "overdue"]),
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      const appointments = (appointmentsResult.data ?? []).map((row: any) => {
        const client = row.contacts?.[0] || row.clients || null;
        return {
          id: row.id,
          date: row.date,
          time: row.time,
          status: row.status,
          service_type: row.service_type,
          location: row.location,
          horses: row.horses ?? [],
          client: client
            ? {
                id: client.id,
                full_name: client.full_name ?? null,
                street: client.street ?? null,
                zip: client.zip_code ?? null,
                city: client.city ?? null,
              }
            : null,
        } as AppointmentRow;
      });

      return {
        appointments,
        overdueInvoices: invoicesResult.count ?? 0,
        followUps: followupsResult.count ?? 0,
      };
    },
  });

  const firstAppointment = data?.appointments[0] ?? null;
  const secondAppointment = data?.appointments[1] ?? null;
  const nextAction = firstAppointment ? "Tour starten" : "Kunde öffnen";

  const routeSummary = useMemo(() => {
    if (!data?.appointments.length) return "Keine Route für heute";
    const count = data.appointments.length;
    const names = data.appointments
      .slice(0, 2)
      .map((apt) => apt.client?.full_name || apt.horses?.[0]?.name || "Unbekannt")
      .join(" → ");
    return `${count} Stopps${names ? ` · ${names}` : ""}`;
  }, [data?.appointments]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Heute</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{formatShortDate(today)}</h2>
            <p className="mt-1 text-sm text-slate-500">Der schnellste Startpunkt für den Arbeitstag.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/home/tour")}
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            {nextAction}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Clock3} label="Termine heute" value={String(data?.appointments.length ?? 0)} />
          <MetricCard icon={Route} label="Route" value={routeSummary} />
          <MetricCard icon={AlertTriangle} label="Follow-ups" value={String(data?.followUps ?? 0)} />
          <MetricCard icon={CircleCheckBig} label="Rechnungen offen" value={String(data?.overdueInvoices ?? 0)} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Nächste Station</h3>
            {firstAppointment && (
              <span className="text-xs font-medium text-slate-500">
                {firstAppointment.time ? `${formatTime(firstAppointment.time)} Uhr` : "ohne Uhrzeit"}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Heute wird geladen…
              </div>
            </div>
          ) : isError ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Heute konnte nicht geladen werden.</p>
              <p className="mt-1 text-amber-800">{(error as Error)?.message || "Bitte Netzwerk oder Datenzugriff prüfen."}</p>
            </div>
          ) : !data?.appointments.length ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <p className="text-base font-semibold text-slate-900">Heute keine Termine</p>
              <p className="mt-1 text-sm text-slate-500">Kunde öffnen, Tour planen oder offene Follow-ups prüfen.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => navigate("/home/kunden")} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                  Kunden & Pferde
                </button>
                <button onClick={() => navigate("/home/tour")} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                  Tour öffnen
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              {data.appointments.slice(0, 4).map((apt, idx) => {
                const isNext = idx === 0;
                return (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => navigate("/home/tour")}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      isNext ? "border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isNext ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {formatTime(apt.time)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {apt.client?.full_name || "Unbekannter Kunde"}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {apt.service_type || "Termin"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {apt.horses?.map((h) => h.name).join(", ") || "Pferd nicht zugeordnet"}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {[apt.client?.street, apt.client?.zip, apt.client?.city].filter(Boolean).join(", ") || apt.location || "Adresse fehlt"}
                      </p>
                    </div>
                    {isNext && (
                      <span className="rounded-full bg-orange-600 px-2 py-1 text-[11px] font-semibold text-white">
                        Nächster Stop
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <aside className="grid gap-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Nächster sinnvoller Schritt</h3>
          <div className="mt-3 rounded-2xl bg-slate-50 p-4">
            <p className="text-base font-semibold text-slate-950">{firstAppointment ? "Tour starten" : "Kunden öffnen"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {firstAppointment
                ? "Starte mit dem ersten Termin und arbeite die Route in Reihenfolge ab."
                : "Kein Termin heute: über Kunde oder Tour mit Planung fortfahren."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => navigate(firstAppointment ? "/home/tour" : "/home/kunden")}
                className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
              >
                Öffnen
              </button>
              {secondAppointment && (
                <button
                  type="button"
                  onClick={() => navigate("/home/tour")}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Route ansehen
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Wichtige Hinweise</h3>
          <div className="mt-3 space-y-3">
            <HintRow label="Follow-ups" value={String(data?.followUps ?? 0)} tone={data && data.followUps > 0 ? "warn" : "neutral"} />
            <HintRow label="Fällige Rechnungen" value={String(data?.overdueInvoices ?? 0)} tone={data && data.overdueInvoices > 0 ? "warn" : "neutral"} />
            <HintRow label="Heute" value={data?.appointments.length ? "bereit" : "leer"} tone={data?.appointments.length ? "good" : "neutral"} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function HintRow({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  const toneClass =
    tone === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tone === "warn" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${toneClass}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

