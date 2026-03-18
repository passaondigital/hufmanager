import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrdersSectionProps {
  userId: string;
}

const FILTERS = ["Alle", "Offen", "Aktiv", "Erledigt"] as const;
type Filter = typeof FILTERS[number];

const STATUS_MAP: Record<Filter, string[] | null> = {
  Alle: null,
  Offen: ["pending", "open"],
  Aktiv: ["active", "in_progress"],
  Erledigt: ["completed", "done"],
};

export function OrdersSection({ userId }: OrdersSectionProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>("Alle");

  const { data: orders = [] } = useQuery({
    queryKey: ["client-orders", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_orders")
        .select("id, title, status, created_at, horse_id, horses(name)")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const filtered = activeFilter === "Alle"
    ? orders
    : orders.filter((o: any) => STATUS_MAP[activeFilter]?.includes(o.status));

  return (
    <div className="px-4">
      <div className="hm-section-header">
        <span className="hm-section-title">📋 Aufträge</span>
        <span className="hm-section-link">Alle →</span>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-1.5 mb-3" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={activeFilter === f}
            onClick={() => setActiveFilter(f)}
            className={`hm-pill ${activeFilter === f ? "active" : ""}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <p className="text-center py-6 text-[13px]" style={{ color: "var(--hm-text3)" }}>
          Keine offenen Aufträge 🎉
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.slice(0, 5).map((order: any) => {
            const isOpen = ["pending", "open"].includes(order.status);
            return (
              <div
                key={order.id}
                className="hm-card flex items-center gap-3"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: isOpen ? "var(--hm-amber)" : "var(--hm-green)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate" style={{ color: "var(--hm-text)" }}>
                    {order.title || "Auftrag"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--hm-text3)" }}>
                    {(order as any).horses?.name || "–"} · {new Date(order.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-[20px] flex-shrink-0"
                  style={{
                    background: isOpen ? "var(--hm-amber-glow)" : "var(--hm-green-bg)",
                    color: isOpen ? "var(--hm-amber)" : "var(--hm-green)",
                  }}
                >
                  {isOpen ? "Offen" : "Erledigt"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
