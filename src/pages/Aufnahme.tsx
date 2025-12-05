import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, PlusCircle, Send, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { LocationPicker } from "@/components/LocationPicker";
import { z } from "zod";

// Validation schemas
const customerSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich").max(100, "Vorname darf maximal 100 Zeichen haben"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich").max(100, "Nachname darf maximal 100 Zeichen haben"),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255, "E-Mail darf maximal 255 Zeichen haben").or(z.literal("")),
  phone: z.string().trim().max(50, "Telefonnummer darf maximal 50 Zeichen haben").regex(/^[+\d\s()-]*$/, "Ungültiges Telefonnummernformat").or(z.literal("")),
});

const horseSchema = z.object({
  ownerId: z.string().uuid("Ungültige Kunden-ID"),
  name: z.string().trim().min(1, "Pferdename ist erforderlich").max(100, "Pferdename darf maximal 100 Zeichen haben"),
  breed: z.string().trim().max(100, "Rasse darf maximal 100 Zeichen haben").optional(),
  birthYear: z.string().regex(/^(\d{4})?$/, "Ungültiges Geburtsjahr").optional(),
  notes: z.string().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen haben").optional(),
});

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
    sendInvitation: true,
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
  });

  // Fetch profiles (clients) created by this provider
  const { data: clients = [] } = useQuery({
    queryKey: ["provider-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("created_by_provider_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter clients that haven't logged in yet (for invitation dropdown)
  const uninvitedClients = clients.filter(
    (c) => !c.has_logged_in && c.email
  );

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: {
      full_name: string;
      email: string;
      phone: string;
      created_by_provider_id: string;
    }) => {
      // Generate a UUID for the new profile
      const newId = crypto.randomUUID();
      
      const { error } = await supabase.from("profiles").insert({
        id: newId,
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        created_by_provider_id: data.created_by_provider_id,
        has_logged_in: false,
      });
      if (error) throw error;
      return { id: newId, email: data.email, full_name: data.full_name };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      
      const fullName = customerForm.firstName + " " + customerForm.lastName;
      
      // Send invitation email if checkbox is checked and email exists
      if (customerForm.sendInvitation && result.email) {
        try {
          await sendInvitation.mutateAsync({
            profileId: result.id,
            email: result.email,
            fullName: result.full_name,
          });
          toast({
            title: "Kunde angelegt & eingeladen",
            description: `${fullName} wurde erstellt und hat eine Einladungs-E-Mail erhalten.`,
          });
        } catch {
          toast({
            title: "Kunde angelegt",
            description: `${fullName} wurde erstellt, aber die E-Mail konnte nicht gesendet werden.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Kunde angelegt",
          description: `${fullName} wurde erfolgreich erstellt.`,
        });
      }
      
      resetCustomerForm();
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast({
        title: "Fehler",
        description: error.message || "Der Kunde konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  // Send invitation mutation
  const sendInvitation = useMutation({
    mutationFn: async (data: { profileId: string; email: string; fullName: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nicht angemeldet");

      const response = await supabase.functions.invoke("send-client-invitation", {
        body: data,
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
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
    // Validate with zod schema
    const validationResult = customerSchema.safeParse({
      firstName: customerForm.firstName,
      lastName: customerForm.lastName,
      email: customerForm.email || "",
      phone: customerForm.phone || "",
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validierungsfehler",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Fehler",
        description: "Sie müssen angemeldet sein.",
        variant: "destructive",
      });
      return;
    }

    if (customerForm.sendInvitation && !customerForm.email) {
      toast({
        title: "Fehler",
        description: "Für die Einladung wird eine E-Mail-Adresse benötigt.",
        variant: "destructive",
      });
      return;
    }

    const validated = validationResult.data;
    createCustomer.mutate({
      full_name: `${validated.firstName} ${validated.lastName}`.trim(),
      email: validated.email || "",
      phone: validated.phone || "",
      created_by_provider_id: user.id,
    });
  };

  const handleCreateHorse = () => {
    // Validate with zod schema
    const validationResult = horseSchema.safeParse({
      ownerId: horseForm.ownerId,
      name: horseForm.name,
      breed: horseForm.breed || undefined,
      birthYear: horseForm.birthYear || undefined,
      notes: horseForm.notes || undefined,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validierungsfehler",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const validated = validationResult.data;
    createHorse.mutate({
      owner_id: validated.ownerId,
      name: validated.name,
      breed: validated.breed || undefined,
      birth_year: validated.birthYear ? Number(validated.birthYear) : undefined,
      gender: horseForm.gender || undefined,
      color: horseForm.color || undefined,
      hoof_type: horseForm.hoofType || undefined,
      shoeing_interval: Number(horseForm.interval),
      special_notes: validated.notes || undefined,
      latitude: horseForm.latitude || undefined,
      longitude: horseForm.longitude || undefined,
      location_name: horseForm.locationName || undefined,
    });
  };

  const handleSendInvitation = async () => {
    if (!inviteForm.customerId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Kunden aus.",
        variant: "destructive",
      });
      return;
    }

    const selectedClient = clients.find((c) => c.id === inviteForm.customerId);
    if (!selectedClient?.email) {
      toast({
        title: "Fehler",
        description: "Dieser Kunde hat keine E-Mail-Adresse.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendInvitation.mutateAsync({
        profileId: selectedClient.id,
        email: selectedClient.email,
        fullName: selectedClient.full_name || "Kunde",
      });
      
      toast({
        title: "Einladung gesendet",
        description: `Die Einladung wurde an ${selectedClient.email} gesendet.`,
      });
      
      setInviteForm({ customerId: "" });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Die Einladung konnte nicht gesendet werden.",
        variant: "destructive",
      });
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      sendInvitation: true,
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
                  <Label htmlFor="email">
                    E-Mail {customerForm.sendInvitation && "*"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="max@beispiel.de"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
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

              {/* Invitation Checkbox */}
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="sendInvitation"
                  checked={customerForm.sendInvitation}
                  onCheckedChange={(checked) =>
                    setCustomerForm({ ...customerForm, sendInvitation: checked as boolean })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="sendInvitation" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4 text-primary" />
                    Sofort Einladungs-E-Mail senden
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Der Kunde erhält eine E-Mail mit Link zur KundenApp-Registrierung.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={resetCustomerForm}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleCreateCustomer} 
                  disabled={createCustomer.isPending || sendInvitation.isPending}
                >
                  {createCustomer.isPending || sendInvitation.isPending ? "Wird angelegt..." : "Kunde anlegen"}
                </Button>
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
                    {clients.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Keine Kunden vorhanden. Bitte legen Sie zuerst einen Kunden an.
                      </div>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name || client.email || "Unbekannt"}
                        </SelectItem>
                      ))
                    )}
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
                    {uninvitedClients.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Keine Kunden ohne Einladung vorhanden.
                      </div>
                    ) : (
                      uninvitedClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span>{client.full_name || "Unbekannt"}</span>
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Hier werden nur Kunden angezeigt, die noch keinen Login haben.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 border">
                <h4 className="font-medium mb-2">Die Einladung enthält:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Link zur Registrierung in der KundenApp</li>
                  <li>• Ihre Geschäftsinformationen</li>
                  <li>• Übersicht der Vorteile der KundenApp</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setInviteForm({ customerId: "" })}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSendInvitation}
                  disabled={sendInvitation.isPending || !inviteForm.customerId}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendInvitation.isPending ? "Wird gesendet..." : "Einladung senden"}
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
