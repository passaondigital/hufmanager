import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { de } from "date-fns/locale";

interface HomeHeroProps {
  firstName: string;
  userId: string;
}

export function HomeHero({ firstName, userId }: HomeHeroProps) {
  const navigate = useNavigate();

  const { data: nextAppt } = useQuery({
    queryKey: ["client-next-appointment", userId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, horse_id, provider_id, horses(name), profiles!appointments_provider_id_fkey(full_name)")
        .eq("client_id", userId)
        .gte("date", today)
        .in("status", ["scheduled", "planned", "confirmed"])
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const daysUntil = nextAppt?.date
    ? differenceInDays(new Date(nextAppt.date), new Date())
    : null;

  const horseName = (nextAppt as any)?.horses?.name || "Pferd";
  const providerName = (nextAppt as any)?.profiles?.full_name || "";

  return (
    <div className="px-4 pt-5 md:px-6 lg:px-8 md:pt-8">
      {/* Greeting */}
      <h1
        className="text-[22px] md:text-[28px] lg:text-[32px] font-semibold tracking-[-0.3px]"
        style={{ color: "var(--hm-text)" }}
      >
        Hallo {firstName}! 👋
      </h1>
      <p className="text-[13px] md:text-[15px] mt-1 mb-4 md:mb-6" style={{ color: "var(--hm-text3)" }}>
        Dein Pferdeplaner auf einen Blick
      </p>

      {/* Next Appointment Card — wider on desktop */}
      <div className="hm-gradient-card md:max-w-2xl">
        {nextAppt ? (
          <div className="flex items-center gap-3.5 md:gap-5 relative z-10">
            <div
              className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-xl md:text-2xl flex-shrink-0"
              style={{ background: "var(--hm-amber-glow)" }}
            >
              📅
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] md:text-[16px] font-medium" style={{ color: "var(--hm-text)" }}>
                Nächster Termin: {horseName}
              </p>
              <p className="text-[12px] md:text-[13px] mt-0.5" style={{ color: "var(--hm-text3)" }}>
                {format(new Date(nextAppt.date), "EEEE, dd.MM.yyyy", { locale: de })}
                {nextAppt.time ? ` · ${nextAppt.time.substring(0, 5)}` : ""}
                {providerName ? ` · ${providerName}` : ""}
              </p>
            </div>
            {daysUntil !== null && (
              <span
                className="flex-shrink-0 text-[11px] md:text-[12px] font-medium px-2.5 py-1 rounded-[20px]"
                style={{
                  background: "var(--hm-amber-glow)",
                  color: "var(--hm-amber)",
                }}
                aria-live="polite"
              >
                {daysUntil === 0 ? "Heute" : daysUntil === 1 ? "Morgen" : `in ${daysUntil} Tagen`}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[13px] md:text-[14px]" style={{ color: "var(--hm-text3)" }}>
              Kein Termin geplant
            </p>
            <button
              onClick={() => navigate("/client-booking")}
              className="text-[12px] md:text-[13px] font-medium"
              style={{ color: "var(--hm-amber)" }}
            >
              Jetzt buchen →
            </button>
          </div>
        )}
      </div>

      {/* Contact Bar */}
      <div className="flex gap-2 mt-3 md:max-w-md">
        <button
          onClick={() => navigate("/client-chat")}
          className="hm-btn-primary flex-1 py-2.5 rounded-lg text-[12px] md:text-[13px] font-medium"
        >
          💬 Chat
        </button>
        <button
          onClick={() => {/* tel action */}}
          className="hm-btn-ghost flex-1 py-2.5 rounded-lg text-[12px] md:text-[13px] font-medium"
        >
          📞 Anrufen
        </button>
        <button
          onClick={() => navigate("/client-booking")}
          className="hm-btn-ghost flex-1 py-2.5 rounded-lg text-[12px] md:text-[13px] font-medium"
        >
          📅 Buchen
        </button>
      </div>
    </div>
  );
}