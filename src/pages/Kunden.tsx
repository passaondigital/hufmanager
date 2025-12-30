import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  Navigation,
  CheckCircle,
  Clock,
  Users,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { AddHorseModal } from "@/components/customers/AddHorseModal";
import { PendingConnectionRequests } from "@/components/network/PendingConnectionRequests";
import { ConnectionSearch } from "@/components/network/ConnectionSearch";
import { VerifiedConnectionBadge } from "@/components/network/VerifiedConnectionBadge";

const Kunden = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddHorseModal, setShowAddHorseModal] = useState(false);
  const [addHorseForCustomerId, setAddHorseForCustomerId] = useState<string | null>(null);
  const [showConnectionSearch, setShowConnectionSearch] = useState(false);

  // Fetch profiles (clients) - both created by provider AND connected via access_grants (ACTIVE only)
  const { data: clients = [] } = useQuery({
    queryKey: ["provider-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get clients created by provider
      const { data: createdClients, error: createdError } = await supabase
        .from("profiles")
        .select("*")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null);
      
      if (createdError) throw createdError;
      
      // Then get clients connected via access_grants (ACTIVE + PENDING status)
      const { data: accessGrants, error: grantsError } = await supabase
        .from("access_grants")
        .select("client_id, status")
        .eq("provider_id", user.id)
        .in("status", ["active", "pending"]);
      
      if (grantsError) throw grantsError;
      
      const grantedClientIds = accessGrants?.map(g => g.client_id) || [];
      
      // Fetch granted client profiles if any exist
      let grantedClients: any[] = [];
      if (grantedClientIds.length > 0) {
        const { data: grantedData, error: grantedError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", grantedClientIds)
          .is("deleted_at", null);
        
        if (grantedError) throw grantedError;
        grantedClients = grantedData || [];
      }
      
      // Combine and deduplicate, mark connection type
      const allClients = [...(createdClients || [])].map(c => ({
        ...c,
        connectionType: 'created',
        isVerified: true,
      }));
      const existingIds = new Set(allClients.map(c => c.id));
      
      for (const client of grantedClients) {
        if (!existingIds.has(client.id)) {
          allClients.push({
            ...client,
            connectionType: 'granted',
            isVerified: true,
          });
        }
      }
      
      // Sort by created_at descending
      return allClients.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
  });

  // Fetch horses for all clients (by owner_id, regardless of who created them)
  const { data: horses = [] } = useQuery({
    queryKey: ["provider-horses", user?.id, clients],
    queryFn: async () => {
      if (!user?.id || clients.length === 0) return [];
      
      // Get all client IDs
      const clientIds = clients.map(c => c.id);
      
      // Fetch all horses where owner_id matches any of the client IDs
      // This ensures we see ALL horses belonging to clients, regardless of who created them
      const { data, error } = await supabase
        .from("horses")
        .select("*")
        .in("owner_id", clientIds)
        .is("deleted_at", null);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && clients.length > 0,
  });

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.readable_id?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "alle") return matchesSearch;
    if (statusFilter === "aktiv") return matchesSearch && c.has_logged_in;
    if (statusFilter === "eingeladen") return matchesSearch && c.invited_at && !c.has_logged_in;
    if (statusFilter === "ausstehend") return matchesSearch && !c.invited_at && !c.has_logged_in;
    return matchesSearch;
  });

  // Get horses for a client
  const getHorsesForClient = (clientId: string) => {
    return horses.filter((h) => h.owner_id === clientId);
  };

  const handleClientClick = (client: any) => {
    setSelectedCustomer(client);
    setShowDetailModal(true);
  };

  const handleAddHorse = (customerId: string) => {
    setAddHorseForCustomerId(customerId);
    setShowAddHorseModal(true);
    setShowDetailModal(false);
  };

  const totalHorses = horses.filter((h) =>
    clients.some((c) => c.id === h.owner_id)
  ).length;

  const handleConnectionStatusChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
    queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kunden</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} verifizierte Verbindungen • {totalHorses} Pferde
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setShowConnectionSearch(!showConnectionSearch)}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Kunde finden</span>
          </Button>
          <Button className="gap-2" onClick={() => navigate("/aufnahme")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Neuer Kunde</span>
          </Button>
        </div>
      </div>

      {/* Pending Connection Requests */}
      <PendingConnectionRequests 
        userType="provider" 
        onStatusChanged={handleConnectionStatusChanged}
      />

      {/* Connection Search */}
      {showConnectionSearch && (
        <ConnectionSearch 
          searchType="client" 
          onConnectionRequested={() => setShowConnectionSearch(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kunde suchen (Name, E-Mail, ID)..."
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
            <SelectItem value="eingeladen">Eingeladen</SelectItem>
            <SelectItem value="ausstehend">Ausstehend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                onClick={() => handleClientClick(client)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {client.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground">
                          {client.full_name || "Unbekannt"}
                        </h3>
                        {client.readable_id && (
                          <Badge variant="outline" className="font-mono text-xs">
                            #{client.readable_id}
                          </Badge>
                        )}
                        {/* Verified Connection Badge */}
                        {client.isVerified && (
                          <VerifiedConnectionBadge status="active" size="sm" />
                        )}
                        {client.has_logged_in ? (
                          <Badge className="bg-green-500/10 text-green-600 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            aktiv
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

                      {/* Horses Count & Preview */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1">
                          {clientHorses.length} {clientHorses.length === 1 ? "Pferd" : "Pferde"}
                        </Badge>
                        {clientHorses.slice(0, 3).map((horse) => {
                          const hasGps = horse.latitude && horse.longitude;
                          return (
                            <div
                              key={horse.id}
                              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-medium text-foreground">{horse.name}</span>
                              {horse.readable_id && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{horse.readable_id}
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
                                  className="text-primary hover:text-primary/80"
                                  title="Route starten"
                                >
                                  <Navigation className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {clientHorses.length > 3 && (
                          <span className="text-sm text-muted-foreground px-2 py-1">
                            +{clientHorses.length - 3} weitere
                          </span>
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

      {/* Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        horses={selectedCustomer ? getHorsesForClient(selectedCustomer.id) : []}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }}
        onAddHorse={handleAddHorse}
      />

      {/* Add Horse Modal */}
      <AddHorseModal
        customerId={addHorseForCustomerId}
        customerName={
          addHorseForCustomerId
            ? clients.find((c) => c.id === addHorseForCustomerId)?.full_name
            : undefined
        }
        open={showAddHorseModal}
        onClose={() => {
          setShowAddHorseModal(false);
          setAddHorseForCustomerId(null);
        }}
      />
    </div>
  );
};

export default Kunden;
