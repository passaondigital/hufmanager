import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, PlusCircle, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { LocationPicker } from "@/components/LocationPicker";

const intervalOptions = [2, 4, 6, 8, 10, 12];

const Aufnahme = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Horse form state
  const [horseForm, setHorseForm] = useState({
    ownerId: "",
    name: "",
    breed: "",
    birthYear: "",
    gender: "",
    color: "",
    hoofType: "",
    interval: "6",
    notes: "",
    latitude: null as number | null,
    longitude: null as number | null,
    locationName: "",
  });

  // Invitation form state
  const [inviteForm, setInviteForm] = useState({
    customerId: "",
    method: "",
  });

  // Fetch profiles (clients) for selection
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Create horse mutation
  const createHorse = useMutation({
    mutationFn: async (data: {
      owner_id: string;
      name: string;
      breed?: string;
      birth_year?: number;
      gender?: string;
      color?: string;
      hoof_type?: string;
      shoeing_interval?: number;
      special_notes?: string;
      latitude?: number;
      longitude?: number;
      location_name?: string;
    }) => {
      const { error } = await supabase.from("horses").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horses"] });
      toast({
        title: "Pferd angelegt",
        description: "Das Pferd wurde erfolgreich erstellt.",
      });
      setHorseForm({
        ownerId: "",
        name: "",
        breed: "",
        birthYear: "",
        gender: "",
        color: "",
        hoofType: "",
        interval: "6",
        notes: "",
        latitude: null,
        longitude: null,
        locationName: "",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Das Pferd konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCustomer = () => {
    if (!customerForm.firstName || !customerForm.lastName) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Vor- und Nachnamen ein.",
        variant: "destructive",
      });
      return;
    }

    // Note: Creating users requires auth.signUp or admin access
    // For now, show info toast
    toast({
      title: "Info",
      description: "Neue Kunden werden über die Einladungsfunktion angelegt. Der Kunde erhält einen Zugang per E-Mail.",
    });
  };

  const handleCreateHorse = () => {
    if (!horseForm.ownerId || !horseForm.name) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Kunden und geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }

    createHorse.mutate({
      owner_id: horseForm.ownerId,
      name: horseForm.name,
      breed: horseForm.breed || undefined,
      birth_year: horseForm.birthYear ? Number(horseForm.birthYear) : undefined,
      gender: horseForm.gender || undefined,
      color: horseForm.color || undefined,
      hoof_type: horseForm.hoofType || undefined,
      shoeing_interval: Number(horseForm.interval),
      special_notes: horseForm.notes || undefined,
      latitude: horseForm.latitude || undefined,
      longitude: horseForm.longitude || undefined,
      location_name: horseForm.locationName || undefined,
    });
  };

  const handleSendInvitation = () => {
    if (!inviteForm.customerId || !inviteForm.method) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Kunden und eine Versandmethode.",
        variant: "destructive",
      });
      return;
    }

    // Simulate sending invitation
    toast({
      title: "Einladung gesendet",
      description: `Die Einladung wurde per ${inviteForm.method === "email" ? "E-Mail" : inviteForm.method === "sms" ? "SMS" : "QR-Code"} versendet.`,
    });

    setInviteForm({ customerId: "", method: "" });
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aufnahme</h1>
        <p className="text-muted-foreground mt-1">
          Neue Kunden und Pferde anlegen, KundenApp-Einladungen versenden
        </p>
      </div>

      <Tabs defaultValue="kunde" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="kunde" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Neuer Kunde
          </TabsTrigger>
          <TabsTrigger value="pferd" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Neues Pferd
          </TabsTrigger>
          <TabsTrigger value="einladung" className="gap-2">
            <Send className="h-4 w-4" />
            Einladung
          </TabsTrigger>
        </TabsList>

        {/* Neuer Kunde */}
        <TabsContent value="kunde" className="mt-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Neuen Kunden anlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    placeholder="Max"
                    value={customerForm.firstName}
                    onChange={(e) => setCustomerForm({ ...customerForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    placeholder="Mustermann"
                    value={customerForm.lastName}
                    onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="max@beispiel.de"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+49 171 1234567"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Straße, PLZ Ort"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  placeholder="Zusätzliche Informationen..."
                  rows={3}
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={resetCustomerForm}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateCustomer}>Kunde anlegen</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neues Pferd */}
        <TabsContent value="pferd" className="mt-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Neues Pferd anlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer">Kunde auswählen *</Label>
                <Select
                  value={horseForm.ownerId}
                  onValueChange={(value) => setHorseForm({ ...horseForm, ownerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name || client.email || "Unbekannt"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horseName">Name des Pferdes *</Label>
                  <Input
                    id="horseName"
                    placeholder="Bella"
                    value={horseForm.name}
                    onChange={(e) => setHorseForm({ ...horseForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Rasse</Label>
                  <Input
                    id="breed"
                    placeholder="Warmblut"
                    value={horseForm.breed}
                    onChange={(e) => setHorseForm({ ...horseForm, breed: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthYear">Geburtsjahr</Label>
                  <Input
                    id="birthYear"
                    type="number"
                    placeholder="2015"
                    value={horseForm.birthYear}
                    onChange={(e) => setHorseForm({ ...horseForm, birthYear: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Geschlecht</Label>
                  <Select
                    value={horseForm.gender}
                    onValueChange={(value) => setHorseForm({ ...horseForm, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stute">Stute</SelectItem>
                      <SelectItem value="wallach">Wallach</SelectItem>
                      <SelectItem value="hengst">Hengst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Farbe</Label>
                  <Input
                    id="color"
                    placeholder="Braun"
                    value={horseForm.color}
                    onChange={(e) => setHorseForm({ ...horseForm, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hoofType">Huftyp</Label>
                  <Select
                    value={horseForm.hoofType}
                    onValueChange={(value) => setHorseForm({ ...horseForm, hoofType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barhuf">Barhuf</SelectItem>
                      <SelectItem value="beschlag">Beschlag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Beschlagsintervall (Wochen)</Label>
                  <Select
                    value={horseForm.interval}
                    onValueChange={(value) => setHorseForm({ ...horseForm, interval: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {intervalOptions.map((weeks) => (
                        <SelectItem key={weeks} value={weeks.toString()}>
                          {weeks} Wochen
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horseNotes">Besondere Hinweise</Label>
                <Textarea
                  id="horseNotes"
                  placeholder="Allergien, Verhaltenshinweise, etc."
                  rows={3}
                  value={horseForm.notes}
                  onChange={(e) => setHorseForm({ ...horseForm, notes: e.target.value })}
                />
              </div>

              {/* GPS Location */}
              <div className="space-y-2">
                <Label>Standort der Koppel (GPS)</Label>
                <LocationPicker
                  latitude={horseForm.latitude}
                  longitude={horseForm.longitude}
                  locationName={horseForm.locationName}
                  onChange={(lat, lng, name) => 
                    setHorseForm({ 
                      ...horseForm, 
                      latitude: lat, 
                      longitude: lng, 
                      locationName: name || "" 
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setHorseForm({
                      ownerId: "",
                      name: "",
                      breed: "",
                      birthYear: "",
                      gender: "",
                      color: "",
                      hoofType: "",
                      interval: "6",
                      notes: "",
                      latitude: null,
                      longitude: null,
                      locationName: "",
                    })
                  }
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreateHorse} disabled={createHorse.isPending}>
                  {createHorse.isPending ? "Wird angelegt..." : "Pferd anlegen"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Einladung */}
        <TabsContent value="einladung" className="mt-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>KundenApp-Einladung versenden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inviteCustomer">Kunde auswählen *</Label>
                <Select
                  value={inviteForm.customerId}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name || client.email || "Unbekannt"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteMethod">Versandmethode *</Label>
                <Select
                  value={inviteForm.method}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Methode auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="qr">QR-Code generieren</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Der Kunde erhält eine Einladung mit seinen Zugangsdaten (KID + PIN) zur KundenApp.
                  Dort kann er seine Pferdedaten, Termine und Rechnungen einsehen.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setInviteForm({ customerId: "", method: "" })}>
                  Abbrechen
                </Button>
                <Button className="gap-2" onClick={handleSendInvitation}>
                  <Send className="h-4 w-4" />
                  Einladung senden
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Aufnahme;
