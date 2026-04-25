import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function NextHorseCard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: appt } = useQuery({
    queryKey: ["next-horse-appt", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, notes, horses(id, name, photo_url, breed)")
        .eq("provider_id", user!.id)
        .gte("date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  if (!appt) return null;

  const horse = Array.isArray(appt.horses) ? appt.horses[0] : appt.horses;
  const isToday = appt.date === today;
  const dateLabel = isToday
    ? "Heute"
    : format(new Date(appt.date + "T00:00:00"), "EEE d. MMM", { locale: de });
  const timeLabel = appt.time ? ` · ${appt.time.slice(0, 5)} Uhr` : "";

  return (
    <div style={{
      background: "#1c1c1c",
      border: "1px solid #303030",
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
        background: "#2a2a2a", border: "1px solid #303030",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, overflow: "hidden",
      }}>
        {horse?.photo_url
          ? <img src={horse.photo_url} alt={horse.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : "🐴"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ece4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {horse?.name ?? "Pferd"}
        </div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
          {dateLabel}{timeLabel}
          {horse?.breed ? <span style={{ color: "#555" }}> · {horse.breed}</span> : null}
        </div>
      </div>

      <div style={{
        padding: "3px 9px", borderRadius: 20, flexShrink: 0,
        fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
        textTransform: "uppercase" as const,
        background: isToday ? "rgba(232,160,32,.15)" : "rgba(255,255,255,.06)",
        color: isToday ? "#e8a020" : "#888",
        border: `1px solid ${isToday ? "rgba(232,160,32,.3)" : "#303030"}`,
      }}>
        {isToday ? "Heute" : "Nächster"}
      </div>
    </div>
  );
}
