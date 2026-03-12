import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import {
  Search,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { InviteClientButton, InviteStatusBadge } from "@/components/customers/InviteClientButton";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { AddHorseModal } from "@/components/customers/AddHorseModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const PartnerKunden = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddHorseModal, setShowAddHorseModal] = useState(false);
  const [addHorseForCustomerId, setAddHorseForCustomerId] = useState<string | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Fetch clients created by this partner
  const { data: clients = [] } = useQuery({
    queryKey: ["partner-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, readable_id, created_at, city, zip_code, street, has_logged_in, invited_at")
        .eq("created_by_partner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((c) => ({ ...c, connectionType: "created" }));
    },
    enabled: !!user?.id,
  });

  // Fetch horses for all clients
  const { data: horses = [] } = useQuery({
    queryKey: ["partner-client-horses-list", user?.id, clients],
    queryFn: async () => {
      if (!user?.id || clients.length === 0) return [];
      const clientIds = clients.map((c) => c.id);
      const { data, error } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url, owner_id, readable_id, hoof_type, hoof_protection")
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

    let matchesStatus = true;
    if (statusFilter === "aktiv") matchesStatus = c.has_logged_in;
    else if (statusFilter === "eingeladen") matchesStatus = c.invited_at && !c.has_logged_in;
    else if (statusFilter === "ausstehend") matchesStatus = !c.invited_at && !c.has_logged_in;

    return matchesSearch && matchesStatus;
  });

  const getHorsesForClient = (clientId: string) =>
    horses.filter((h) => h.owner_id === clientId);

  const totalHorses = horses.length;
  const notInvitedCount = clients.filter((c) => !c.has_logged_in && !c.invited_at).length;

  const animatedClients = useAnimatedCounter(clients.length, 600, clients.length > 0);
  const animatedHorses = useAnimatedCounter(totalHorses, 600, totalHorses > 0);
  const animatedNotInvited = useAnimatedCounter(notInvitedCount, 600, notInvitedCount > 0);

  const handleClientClick = (client: any) => {
    setSelectedCustomer(client);
    setShowDetailModal(true);
  };

  const handleAddHorse = (customerId: string) => {
    setAddHorseForCustomerId(customerId);
    setShowAddHorseModal(true);
    setShowDetailModal(false);
  };

  const resetNewClientForm = () => {
    setNewClient({ first_name: "", last_name: "", email: "", phone: "", address: "", notes: "" });
  };

  const handleCreateClient = async () => {
    if (!user?.id) return;
    if (!newClient.first_name.trim() || !newClient.last_name.trim()) {
      toast({ title: "Vor- und Nachname sind Pflichtfelder", variant: "destructive" });
      return;
    }
    if (!newClient.email.trim()) {
      toast({ title: "E-Mail ist ein Pflichtfeld", variant: "destructive" });
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newClient.email.trim())) {
      toast({ title: "Bitte eine gültige E-Mail-Adresse eingeben", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const fullName = `${newClient.first_name.trim()} ${newClient.last_name.trim()}`;
      const { error } = await supabase.from("profiles").insert({
        full_name: fullName,
        email: newClient.email.trim(),
        phone: newClient.phone.trim() || null,
        street: newClient.address.trim() || null,
        created_by_partner_id: user.id,
        managing_partner_id: user.id,
        role: "client",
      });

      if (error) throw error;

      toast({ title: "Kunde angelegt", description: fullName });
      queryClient.invalidateQueries({ queryKey: ["partner-clients"] });
      setShowNewClientModal(false);
      resetNewClientForm();
    } catch (err: any) {
      toast({ title: "Fehler beim Anlegen", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-responsive-h2 text-foreground">Kunden</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {clients.length} Kunden · {totalHorses} Pferde
          </p>
        </div>
        <Button className="gap-2 min-h-[44px]" onClick={() => setShowNewClientModal(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Neuer Kunde</span>
        </Button>
      </div>

      {/* Search */}
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

      {/* Filters */}
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
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Kunden gefunden.</p>
              <Button className="mt-4" onClick={() => setShowNewClientModal(true)}>
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
                        {clientHorses.slice(0, 3).map((horse) => (
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
                          </div>
                        ))}
                        {clientHorses.length > 3 && (
                          <span className="text-sm text-muted-foreground px-2 py-1">
                            +{clientHorses.length - 3} weitere
                          </span>
                        )}

                        {/* Invite Button */}
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

                    <div className="text-right">
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

      {/* New Client Modal */}
      <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Kunden anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vorname *</Label>
                <Input
                  value={newClient.first_name}
                  onChange={(e) => setNewClient((p) => ({ ...p, first_name: e.target.value }))}
                  placeholder="Max"
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Nachname *</Label>
                <Input
                  value={newClient.last_name}
                  onChange={(e) => setNewClient((p) => ({ ...p, last_name: e.target.value }))}
                  placeholder="Mustermann"
                  maxLength={100}
                />
              </div>
            </div>
            <div>
              <Label>E-Mail *</Label>
              <Input
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                placeholder="max@beispiel.de"
                maxLength={254}
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                type="tel"
                value={newClient.phone}
                onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+49 170 1234567"
                maxLength={30}
              />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={newClient.address}
                onChange={(e) => setNewClient((p) => ({ ...p, address: e.target.value }))}
                placeholder="Straße, PLZ Ort"
                maxLength={200}
              />
            </div>
            <div>
              <Label>Notiz</Label>
              <Textarea
                value={newClient.notes}
                onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optionale Notiz zum Kunden..."
                rows={2}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewClientModal(false); resetNewClientForm(); }}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateClient} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kunde anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerKunden;
