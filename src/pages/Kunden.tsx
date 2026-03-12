import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import {
  Search,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  Navigation,
  Users,
  X,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { ClientBadges } from "@/components/customers/ClientStatusBadges";
import { ListPageHeader } from "@/components/shared/ListPageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { InviteClientButton, InviteStatusBadge } from "@/components/customers/InviteClientButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { AddHorseModal } from "@/components/customers/AddHorseModal";
import { LinkAppUserModal } from "@/components/customers/LinkAppUserModal";
import { PendingConnectionRequests } from "@/components/network/PendingConnectionRequests";
import { ConnectionSearch } from "@/components/network/ConnectionSearch";
import { VerifiedConnectionBadge } from "@/components/network/VerifiedConnectionBadge";
import { Link2 } from "lucide-react";
import { 
  PAYMENT_RATING_OPTIONS, 
  LIFECYCLE_STATUS_OPTIONS,
  PaymentRating,
  LifecycleStatus
} from "@/components/horse-detail/types";
import { exportClientData } from "@/lib/customerExport";

const Kunden = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [paymentFilter, setPaymentFilter] = useState<PaymentRating | "alle">("alle");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleStatus | "alle">("alle");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddHorseModal, setShowAddHorseModal] = useState(false);
  const [addHorseForCustomerId, setAddHorseForCustomerId] = useState<string | null>(null);
  const [showConnectionSearch, setShowConnectionSearch] = useState(false);
  const [showLinkUserModal, setShowLinkUserModal] = useState(false);

  // Fetch profiles (clients) - both created by provider AND connected via access_grants (ACTIVE only)
  const { data: clients = [] } = useQuery({
    queryKey: ["provider-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get clients created by provider
      const { data: createdClients, error: createdError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, readable_id, created_at, city, zip_code, street, has_logged_in, created_by_provider_id, invited_at, payment_rating, lifecycle_status")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null);
      
      if (createdError) throw createdError;
      
      // Then get clients connected via access_grants (ACTIVE + PENDING status, and is_active = true)
      const { data: accessGrants, error: grantsError } = await supabase
        .from("access_grants")
        .select("client_id, status")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .in("status", ["active", "pending"]);
      
      if (grantsError) throw grantsError;
      
      const grantedClientIds = accessGrants?.map(g => g.client_id) || [];
      
      // Fetch granted client profiles if any exist
      let grantedClients: any[] = [];
      if (grantedClientIds.length > 0) {
        const { data: grantedData, error: grantedError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url, readable_id, created_at, city, zip_code, street, has_logged_in, created_by_provider_id, invited_at, payment_rating, lifecycle_status")
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
        .select("id, name, breed, photo_url, owner_id, readable_id, hoof_type, hoof_protection, color, birth_year, gender, latitude, longitude")
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

    // Status filter
    let matchesStatus = true;
    if (statusFilter === "aktiv") matchesStatus = c.has_logged_in;
    else if (statusFilter === "eingeladen") matchesStatus = c.invited_at && !c.has_logged_in;
    else if (statusFilter === "ausstehend") matchesStatus = !c.invited_at && !c.has_logged_in;

    // Payment rating filter
    const matchesPayment = paymentFilter === "alle" || c.payment_rating === paymentFilter;

    // Lifecycle status filter
    const matchesLifecycle = lifecycleFilter === "alle" || c.lifecycle_status === lifecycleFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesLifecycle;
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

  const notInvitedCount = clients.filter(c => !c.has_logged_in && !c.invited_at).length;

  const animatedClients = useAnimatedCounter(clients.length, 600, clients.length > 0);
  const animatedHorses = useAnimatedCounter(totalHorses, 600, totalHorses > 0);
  const animatedNotInvited = useAnimatedCounter(notInvitedCount, 600, notInvitedCount > 0);

  const handleConnectionStatusChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
    queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
  };

  // Export handler
  const handleExport = (type: "clients" | "horses" | "all") => {
    if (clients.length === 0) {
      toast({ title: "Keine Daten zum Exportieren", variant: "destructive" });
      return;
    }
    exportClientData(clients, horses, type);
    toast({ 
      title: "Export gestartet", 
      description: type === "all" 
        ? "Kunden- und Pferdedaten werden heruntergeladen" 
        : `${type === "clients" ? "Kundendaten" : "Pferdedaten"} werden heruntergeladen`
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <ListPageHeader
        title="Kunden"
        count={clients.length}
        countLabel="Kunden"
        action={
          <Button className="gap-2 min-h-[44px]" onClick={() => navigate("/aufnahme")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Neuer Kunde</span>
          </Button>
        }
      />

      {/* Search - full width */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kunde suchen (Name, E-Mail, ID)..."
          className="pl-10 h-11"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{animatedClients}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Kunden gesamt</p>
        </div>
        <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
          <span className="text-base block mb-1">🐴</span>
          <p className="text-xl font-bold text-foreground">{animatedHorses}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pferde gesamt</p>
        </div>
        {notInvitedCount > 0 && (
          <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
            <Mail className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{animatedNotInvited}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nicht eingeladen</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleExport("clients")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Kunden exportieren (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("horses")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Pferde exportieren (CSV)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("all")}>
              <Download className="h-4 w-4 mr-2" />
              Alle Daten exportieren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2" 
          onClick={() => setShowLinkUserModal(true)}
        >
          <Link2 className="h-4 w-4" />
          App-Nutzer verknüpfen
        </Button>
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
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-h-[44px]">
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
          
          <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentRating | "alle")}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Zahlung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Ratings</SelectItem>
              {PAYMENT_RATING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className={opt.textColor}>{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={lifecycleFilter} onValueChange={(v) => setLifecycleFilter(v as LifecycleStatus | "alle")}>
            <SelectTrigger className="min-h-[44px] col-span-2 md:col-span-1">
              <SelectValue placeholder="Kundenstatus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Kunden</SelectItem>
              {LIFECYCLE_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Active Filters Display */}
        {(paymentFilter !== "alle" || lifecycleFilter !== "alle") && (
          <div className="flex flex-wrap gap-2">
            {paymentFilter !== "alle" && (
              <Badge variant="secondary" className="gap-1">
                Zahlungsmoral: {PAYMENT_RATING_OPTIONS.find(o => o.value === paymentFilter)?.label}
                <button onClick={() => setPaymentFilter("alle")} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {lifecycleFilter !== "alle" && (
              <Badge variant="secondary" className="gap-1">
                Status: {LIFECYCLE_STATUS_OPTIONS.find(o => o.value === lifecycleFilter)?.label}
                <button onClick={() => setLifecycleFilter("alle")} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => {
                setPaymentFilter("alle");
                setLifecycleFilter("alle");
              }}
            >
              Alle Filter zurücksetzen
            </Button>
          </div>
        )}
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
                        {/* Zahlungsmoral & Kundenstatus Badges */}
                        <ClientBadges 
                          paymentRating={client.payment_rating}
                          lifecycleStatus={client.lifecycle_status}
                          size="sm"
                        />
                        <InviteStatusBadge
                          hasLoggedIn={client.has_logged_in}
                          invitedAt={client.invited_at}
                        />
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
                      <div className="flex flex-wrap gap-2 items-center">
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
                        
                        {/* Invite Button - only for non-active clients */}
                        {!client.has_logged_in && (
                          <InviteClientButton
                            clientId={client.id}
                            clientName={client.full_name}
                            clientPhone={client.phone}
                            clientEmail={client.email}
                            horseName={clientHorses[0]?.name}
                            compact
                          />
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

      {/* Link App User Modal */}
      <LinkAppUserModal
        open={showLinkUserModal}
        onClose={() => setShowLinkUserModal(false)}
        onSuccess={handleConnectionStatusChanged}
      />
    </div>
  );
};

export default Kunden;
