import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ServiceHistoryProps {
  userId: string;
}

export function ServiceHistory({ userId }: ServiceHistoryProps) {
  const { data: services = [] } = useQuery({
    queryKey: ["client-service-history", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, service_type, price, horse_id, provider_id, horses(name), profiles!appointments_provider_id_fkey(full_name)")
        .eq("client_id", userId)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (services.length === 0) return null;

  return (
    <div className="px-4 md:px-0">
      <div className="hm-section-header">
        <span className="hm-section-title">🕐 Service Historie</span>
        <span className="hm-section-link">Alle →</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {services.map((svc: any) => (
          <div key={svc.id} className="hm-card flex items-center gap-3">
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-md flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: "var(--hm-amber-glow)" }}
            >
              ◈
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] md:text-[14px] truncate" style={{ color: "var(--hm-text)" }}>
                {svc.service_type || "Hufbearbeitung"} · {svc.horses?.name || "–"}
              </p>
              <p className="text-[11px] md:text-[12px]" style={{ color: "var(--hm-text3)" }}>
                {format(new Date(svc.date), "dd.MM.yyyy", { locale: de })}
                {svc.profiles?.full_name ? ` · ${svc.profiles.full_name}` : ""}
              </p>
            </div>
            {svc.price && (
              <span className="text-[13px] md:text-[14px] font-medium flex-shrink-0" style={{ color: "var(--hm-amber)" }}>
                {svc.price}€
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}