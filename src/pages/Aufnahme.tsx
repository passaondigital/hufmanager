import { useNavigate } from "react-router-dom";
import { UserPlus, Footprints, Send, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
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

  // Uninvited clients for the invitation modal
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
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Aufnahme</h1>
        <p className="text-sm text-muted-foreground mt-1">Was möchtest du anlegen?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div
          onClick={() => navigate("/kunden?new=true")}
          className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:bg-accent/10 transition-all cursor-pointer"
        >
          <UserPlus className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Neuen Kunden anlegen</h2>
          <p className="text-sm text-muted-foreground mb-4">Kunden mit Pferden aufnehmen</p>
          <span className="text-primary text-sm font-medium group-hover:text-primary/80 flex items-center gap-1">
            Starten <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        <div
          onClick={() => navigate("/pferde?new=true")}
          className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:bg-accent/10 transition-all cursor-pointer"
        >
          <Footprints className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Neues Pferd anlegen</h2>
          <p className="text-sm text-muted-foreground mb-4">Pferd einem bestehenden oder neuen Kunden zuordnen</p>
          <span className="text-primary text-sm font-medium group-hover:text-primary/80 flex items-center gap-1">
            Starten <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        <div
          onClick={() => setShowInviteModal(true)}
          className="group sm:col-span-2 bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:bg-accent/10 transition-all cursor-pointer"
        >
          <Send className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Einladung senden</h2>
          <p className="text-sm text-muted-foreground mb-4">Bestehenden Kunden zur HufManager-App einladen</p>
          <span className="text-primary text-sm font-medium group-hover:text-primary/80 flex items-center gap-1">
            Einladung senden <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      {recentClients.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Zuletzt angelegt</h3>
          </div>
          <div className="space-y-3">
            {recentClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between text-sm">
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

      {/* Invitation Dialog */}
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
