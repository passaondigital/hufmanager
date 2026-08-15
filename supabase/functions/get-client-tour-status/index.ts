import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const finishedStatuses = new Set(["completed", "no_show", "cancelled"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nicht autorisiert" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration missing" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Ungültiger Token" }, 401);

    const requestBody = await req.json().catch(() => ({}));
    const date = safeDate(requestBody?.date);
    if (!date) return json({ error: "Ungültiges Datum" }, 400);

    const { data: horses, error: horseError } = await supabase
      .from("horses")
      .select("id, name")
      .eq("owner_id", user.id)
      .is("deleted_at", null);
    if (horseError) throw horseError;

    const horseIds = (horses || []).map((horse: any) => horse.id);
    const appointmentSelect = "id, time, status, provider_id, tour_order, horse_id, client_id, completed_at";

    const [directResult, horseResult] = await Promise.all([
      supabase
        .from("appointments")
        .select(appointmentSelect)
        .eq("date", date)
        .eq("client_id", user.id)
        .neq("status", "cancelled"),
      horseIds.length > 0
        ? supabase
            .from("appointments")
            .select(appointmentSelect)
            .eq("date", date)
            .in("horse_id", horseIds)
            .neq("status", "cancelled")
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (directResult.error) throw directResult.error;
    if (horseResult.error) throw horseResult.error;

    const byId = new Map<string, any>();
    for (const appointment of [...(directResult.data || []), ...(horseResult.data || [])]) {
      byId.set(appointment.id, appointment);
    }

    const myAppointments = [...byId.values()].sort((a, b) => {
      const aDone = finishedStatuses.has(a.status) ? 1 : 0;
      const bDone = finishedStatuses.has(b.status) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const orderA = a.tour_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.tour_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.time || "23:59").localeCompare(String(b.time || "23:59"));
    });

    const myAppointment = myAppointments[0];
    if (!myAppointment?.provider_id) return json({ tourStatus: null });

    const providerId = myAppointment.provider_id;
    const { data: tour, error: tourError } = await supabase
      .from("daily_tours")
      .select("id, status, tour_active_since, tour_ended_at")
      .eq("provider_id", providerId)
      .eq("tour_date", date)
      .maybeSingle();
    if (tourError) throw tourError;

    const isActive = !!tour && !tour.tour_ended_at && (tour.status === "active" || !!tour.tour_active_since);
    if (!tour || !isActive) return json({ tourStatus: null });

    const { data: allAppointments, error: allAppointmentsError } = await supabase
      .from("appointments")
      .select("id, status, tour_order, time, completed_at")
      .eq("provider_id", providerId)
      .eq("date", date)
      .neq("status", "cancelled")
      .order("tour_order", { ascending: true, nullsFirst: false })
      .order("time", { ascending: true });
    if (allAppointmentsError) throw allAppointmentsError;

    const stops = allAppointments || [];
    const myIndex = stops.findIndex((appointment: any) => appointment.id === myAppointment.id);
    if (myIndex < 0) return json({ tourStatus: null });

    const finishedCount = stops.filter((appointment: any) => finishedStatuses.has(appointment.status)).length;
    const openStopsBeforeMe = stops
      .slice(0, myIndex)
      .filter((appointment: any) => !finishedStatuses.has(appointment.status)).length;
    const isMyTurn = !finishedStatuses.has(myAppointment.status) && openStopsBeforeMe === 0;

    let estimatedArrival: string | null = null;
    const timedFinishedStops = stops.filter((appointment: any) =>
      finishedStatuses.has(appointment.status) && appointment.completed_at,
    );
    if (tour.tour_active_since && timedFinishedStops.length > 0 && openStopsBeforeMe > 0) {
      const tourStartMs = new Date(tour.tour_active_since).getTime();
      const lastFinishedMs = new Date(timedFinishedStops[timedFinishedStops.length - 1].completed_at).getTime();
      const avgMsPerStop = Math.max((lastFinishedMs - tourStartMs) / timedFinishedStops.length, 0);
      if (Number.isFinite(avgMsPerStop) && avgMsPerStop > 0) {
        const eta = new Date(lastFinishedMs + openStopsBeforeMe * avgMsPerStop);
        estimatedArrival = new Intl.DateTimeFormat("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Berlin",
        }).format(eta);
      }
    }

    const [{ data: providerProfile }, { data: businessSettings }, { data: emergency }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", providerId).maybeSingle(),
      supabase.from("business_settings").select("business_name").eq("user_id", providerId).maybeSingle(),
      supabase
        .from("tour_emergency_status")
        .select("estimated_delay_minutes, reason")
        .eq("tour_id", tour.id)
        .is("ended_at", null)
        .maybeSingle(),
    ]);

    const horseName = (horses || []).find((horse: any) => horse.id === myAppointment.horse_id)?.name || null;

    return json({
      tourStatus: {
        isActive: true,
        providerName: providerProfile?.full_name || businessSettings?.business_name || "Dein Hufpfleger",
        completedCount: finishedCount,
        totalCount: stops.length,
        myPosition: myIndex + 1,
        stationsAway: openStopsBeforeMe,
        isMyTurn,
        isCompleted: finishedStatuses.has(myAppointment.status),
        myTime: myAppointment.time,
        estimatedArrival,
        horseName,
        hasDelay: !!emergency,
        delayMinutes: emergency?.estimated_delay_minutes || 0,
        delayMessage: emergency?.reason || null,
      },
    });
  } catch (error) {
    console.error("get-client-tour-status error:", error);
    return json({ error: "Tourstatus konnte nicht geladen werden" }, 500);
  }
});
