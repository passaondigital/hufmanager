import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Filter,
  Navigation,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Kunden = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch profiles (clients) created by this provider
  const { data: clients = [] } = useQuery({
    queryKey: ["provider-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("created_by_provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch horses
  const { data: horses = [] } = useQuery({
    queryKey: ["horses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Get horses for a client
  const getHorsesForClient = (clientId: string) => {
    return horses.filter((h) => h.owner_id === clientId);
  };

  const handleClientClick = (clientId: string) => {
    // Navigate to client detail or show info
    toast({
      title: "Kunde auswählen",
      description: "Kundendetails werden angezeigt...",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kunden</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} Kunden • {horses.length} Pferde
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/aufnahme")}>
          <Plus className="h-4 w-4" />
          Neuer Kunde
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kunde suchen..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="aktiv">Aktiv</SelectItem>
            <SelectItem value="überfällig">Überfällig</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Keine Kunden gefunden.</p>
              <Button className="mt-4" onClick={() => navigate("/aufnahme")}>
                Ersten Kunden anlegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client, index) => {
            const clientHorses = getHorsesForClient(client.id);
            return (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-all cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleClientClick(client.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {client.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          {client.full_name || "Unbekannt"}
                        </h3>
                        {client.has_logged_in ? (
                          <Badge className="bg-green-500/10 text-green-600 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            registriert
                          </Badge>
                        ) : client.invited_at ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            eingeladen
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            ausstehend
                          </Badge>
                        )}
                        {client.display_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            #{client.display_id}
                          </span>
                        )}
                        <Badge className="bg-accent/10 text-accent">aktiv</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {client.phone}
                          </span>
                        )}
                      </div>

                      {/* Horses */}
                      <div className="flex flex-wrap gap-2">
                        {clientHorses.map((horse) => {
                          const hasGps = horse.latitude && horse.longitude;
                          return (
                            <div
                              key={horse.id}
                              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5"
                            >
                              <span className="font-medium text-foreground">{horse.name}</span>
                              {horse.display_id && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{horse.display_id}
                                </span>
                              )}
                              {hasGps && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                                    const url = isIOS
                                      ? `maps://maps.apple.com/?daddr=${horse.latitude},${horse.longitude}`
                                      : `https://www.google.com/maps/dir/?api=1&destination=${horse.latitude},${horse.longitude}`;
                                    window.open(url, "_blank");
                                  }}
                                  className="text-accent hover:text-accent/80"
                                  title="Route starten"
                                >
                                  <Navigation className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {!hasGps && horse.breed && (
                                <span className="text-xs text-muted-foreground">
                                  ({horse.breed})
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {clientHorses.length === 0 && (
                          <span className="text-sm text-muted-foreground">Keine Pferde zugewiesen</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Kunden;
