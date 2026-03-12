import { useNavigate } from "react-router-dom";
import { UserPlus, Horse, Send, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { InvitationModal } from "@/components/customers/InvitationModal";

const Aufnahme = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: recentClients = [] } = useQuery({
    queryKey: ["aufnahme-recent-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;

      // Get horse counts
      const ids = (data || []).map((c) => c.id);
      if (ids.length === 0) return [];

      const { data: horses } = await supabase
        .from("horses")
        .select("owner_id")
        .in("owner_id", ids)
        .is("deleted_at", null);

      const counts: Record<string, number> = {};
      horses?.forEach((h) => {
        counts[h.owner_id] = (counts[h.owner_id] || 0) + 1;
      });

      return (data || []).map((c) => ({
        id: c.id,
        name: c.full_name || "Unbekannt",
        createdAt: c.created_at,
        horses: counts[c.id] || 0,
      }));
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Aufnahme</h1>
        <p className="text-sm text-muted-foreground mt-1">Was möchtest du anlegen?</p>
      </div>

      {/* Action tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Neuer Kunde */}
        <div
          onClick={() => navigate("/kunden?new=true")}
          className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:bg-accent/10 transition-all cursor-pointer"
        >
          <UserPlus className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Neuen Kunden anlegen</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Kunden mit Pferden aufnehmen
          </p>
          <span className="text-primary text-sm font-medium group-hover:text-primary/80 flex items-center gap-1">
            Starten <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        {/* Neues Pferd */}
        <div
          onClick={() => navigate("/pferde?new=true")}
          className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:bg-accent/10 transition-all cursor-pointer"
        >
          <Horse className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Neues Pferd anlegen</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pferd einem bestehenden oder neuen Kunden zuordnen
          </p>
          <span className="text-primary text-sm font-medium group-hover:text-primary/80 flex items-center gap-1">
            Starten <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        {/* Einladung — full width */}
        <div
          onClick={() => setShowInviteModal(true)}
          className="group sm:col-span-2 bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:bg-accent/10 transition-all cursor-pointer"
        >
          <Send className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Einladung senden</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Bestehenden Kunden zur HufManager-App einladen
          </p>
          <span className="text-primary text-sm font-medium group-hover:text-primary/80 flex items-center gap-1">
            Einladung senden <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Recent clients */}
      {recentClients.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Zuletzt angelegt</h3>
          </div>
          <div className="space-y-3">
            {recentClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">{client.name}</span>
                  <span className="text-muted-foreground ml-2">
                    · {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true, locale: de })}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {client.horses} Pferd{client.horses !== 1 ? "e" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitation Modal */}
      {showInviteModal && (
        <InvitationModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
};

export default Aufnahme;
