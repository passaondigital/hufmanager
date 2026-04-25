import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MessageCircle, Calendar, ChevronRight, Heart } from "lucide-react";

const GR = "#7ab87a";
const GR2 = "rgba(122,184,122,.15)";
const GR3 = "rgba(122,184,122,.08)";

interface Horse {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string | null;
}

interface OwnerDashboardProps {
  horses: Horse[];
  displayName: string | null;
}

export function OwnerDashboard({ horses, displayName }: OwnerDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: nextAppt } = useQuery({
    queryKey: ["owner-next-appt", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, notes, provider:profiles!provider_id(full_name)")
        .eq("client_id", user!.id)
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

  const { data: recentServices = [] } = useQuery({
    queryKey: ["owner-recent-services", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_orders")
        .select("id, created_at, notes, order_status, provider:profiles!provider_id(full_name)")
        .eq("client_id", user!.id)
        .in("order_status", ["completed", "closed"])
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["owner-unread-chat", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("read", false);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Greeting */}
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f0ece4", letterSpacing: "-.3px" }}>
          Hallo{displayName ? `, ${displayName.split(" ")[0]}` : ""} 👋
        </div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
          {horses.length > 0
            ? `${horses.length} Pferd${horses.length !== 1 ? "e" : ""} · Übersicht`
            : "Noch kein Pferd angelegt"}
        </div>
      </div>

      {/* Horse cards */}
      {horses.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {horses.slice(0, 3).map(horse => (
            <button
              key={horse.id}
              onClick={() => navigate(`/client-horse/${horse.id}`)}
              style={{
                background: "#1c1c1c", border: `1px solid #303030`, borderRadius: 14,
                padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", width: "100%", textAlign: "left",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, overflow: "hidden",
              }}>
                {horse.photo_url
                  ? <img src={horse.photo_url} alt={horse.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "🐴"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f0ece4" }}>{horse.name}</div>
                {horse.breed && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{horse.breed}</div>}
              </div>
              <Heart size={14} style={{ color: GR, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* Next appointment */}
      {nextAppt && (
        <div style={{ background: "#1c1c1c", border: "1px solid #303030", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#555", marginBottom: 8 }}>
            Nächster Termin
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: GR2,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Calendar size={16} style={{ color: GR }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ece4" }}>
                {nextAppt.date === today
                  ? "Heute"
                  : format(new Date(nextAppt.date + "T00:00:00"), "EEE d. MMM", { locale: de })}
                {nextAppt.time ? ` · ${nextAppt.time.slice(0, 5)} Uhr` : ""}
              </div>
              {nextAppt.provider && (
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  {(nextAppt.provider as any).full_name}
                </div>
              )}
            </div>
            <div style={{
              padding: "3px 9px", borderRadius: 20,
              fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
              background: GR2, color: GR, border: `1px solid rgba(122,184,122,.3)`,
            }}>
              Geplant
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          onClick={() => navigate("/client-chat")}
          style={{
            background: "#1c1c1c", border: "1px solid #303030", borderRadius: 14,
            padding: "14px", display: "flex", flexDirection: "column", alignItems: "flex-start",
            gap: 8, cursor: "pointer",
          }}
        >
          <div style={{ position: "relative" }}>
            <MessageCircle size={20} style={{ color: GR }} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -6, background: GR,
                color: "#071407", fontSize: 9, fontWeight: 700,
                width: 14, height: 14, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ece4" }}>Nachrichten</div>
            <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
              {unreadCount > 0 ? `${unreadCount} ungelesen` : "Alle gelesen"}
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate("/client-booking")}
          style={{
            background: "#1c1c1c", border: "1px solid #303030", borderRadius: 14,
            padding: "14px", display: "flex", flexDirection: "column", alignItems: "flex-start",
            gap: 8, cursor: "pointer",
          }}
        >
          <Calendar size={20} style={{ color: GR }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ece4" }}>Termin buchen</div>
            <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Beim Experten</div>
          </div>
        </button>
      </div>

      {/* Recent service history */}
      {recentServices.length > 0 && (
        <div style={{ background: "#1c1c1c", border: "1px solid #303030", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #303030" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#f0ece4" }}>Letzte Bearbeitungen</span>
          </div>
          {recentServices.map((s, i) => (
            <div key={s.id} style={{
              padding: "11px 14px", display: "flex", alignItems: "center", gap: 10,
              borderBottom: i < recentServices.length - 1 ? "1px solid #232323" : "none",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: GR, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#f0ece4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(s.provider as any)?.full_name ?? "Hufpfleger"}
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>
                  {format(new Date(s.created_at), "d. MMM yyyy", { locale: de })}
                </div>
              </div>
              <ChevronRight size={14} style={{ color: "#555", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
