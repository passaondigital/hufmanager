import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Footprints, Send, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tile, TileHubHeader } from "@/components/ui/TileHub";

const Aufnahme = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteClientId, setInviteClientId] = useState("");

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

  const { data: uninvitedClients = [] } = useQuery({
    queryKey: ["aufnahme-uninvited", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null)
        .eq("has_logged_in", false)
        .not("email", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleSendInvitation = async () => {
    if (!inviteClientId) {
      toast({ title: "Fehler", description: "Bitte wähle einen Kunden aus.", variant: "destructive" });
      return;
    }
    const client = uninvitedClients.find((c) => c.id === inviteClientId);
    if (!client?.email) return;

    try {
      const response = await supabase.functions.invoke("send-client-invitation", {
        body: { profileId: client.id, email: client.email, fullName: client.full_name || "Kunde" },
      });
      if (response.error) throw response.error;
      toast({ title: "Einladung gesendet", description: `Einladung wurde an ${client.email} gesendet.` });
      setShowInviteModal(false);
      setInviteClientId("");
    } catch {
      toast({ title: "Fehler", description: "Einladung konnte nicht gesendet werden.", variant: "destructive" });
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      <TileHubHeader title="Aufnahme" subtitle="Was möchtest du anlegen?" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Tile
          icon={<UserPlus className="w-10 h-10 text-primary" />}
          title="Neuen Kunden anlegen"
          description="Kunden mit Pferden aufnehmen"
          onClick={() => navigate("/kunden?new=true")}
        />
        <Tile
          icon={<Footprints className="w-10 h-10 text-primary" />}
          title="Neues Pferd anlegen"
          description="Pferd einem Kunden zuordnen"
          onClick={() => navigate("/pferde?new=true")}
        />
        <Tile
          icon={<Send className="w-10 h-10 text-primary" />}
          title="Einladung senden"
          description="Kunden zur Hufi-App einladen"
          colSpan
          onClick={() => setShowInviteModal(true)}
        />
      </div>

      {recentClients.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Zuletzt angelegt</h3>
          </div>
          <div className="space-y-3">
            {recentClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between text-sm list-item-hover rounded-lg px-2 py-1.5 -mx-2">
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

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einladung senden</DialogTitle>
          </DialogHeader>
          {uninvitedClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Keine Kunden ohne App-Zugang vorhanden.</p>
          ) : (
            <div className="space-y-4">
              <Select value={inviteClientId} onValueChange={setInviteClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {uninvitedClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || "Unbekannt"} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSendInvitation} className="w-full">
                <Send className="w-4 h-4 mr-2" /> Einladung senden
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aufnahme;
