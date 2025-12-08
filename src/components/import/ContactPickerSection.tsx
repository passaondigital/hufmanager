import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Contact,
  Users,
  Briefcase,
  Truck,
  UserPlus,
  Smartphone,
  AlertCircle,
} from "lucide-react";

type ContactCategory = "client" | "partner" | "supplier" | "lead";

interface PickedContact {
  name: string[];
  email?: string[];
  tel?: string[];
}

const ContactPickerSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<PickedContact[]>([]);
  const [category, setCategory] = useState<ContactCategory>("client");
  const [isSupported, setIsSupported] = useState(
    "contacts" in navigator && "ContactsManager" in window
  );

  const importMutation = useMutation({
    mutationFn: async (contacts: PickedContact[]) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const contactsToInsert = contacts.map((c) => ({
        provider_id: user.id,
        category,
        full_name: c.name?.join(" ") || "Unbekannt",
        email: c.email?.[0] || null,
        phone: c.tel?.[0] || null,
        source: "contact_picker",
      }));

      const { error } = await supabase
        .from("contacts")
        .insert(contactsToInsert);

      if (error) throw error;
      return contactsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ 
        title: "Import erfolgreich", 
        description: `${count} Kontakte als ${getCategoryLabel(category)} importiert` 
      });
      setSelectedContacts([]);
    },
    onError: () => {
      toast({ 
        title: "Fehler", 
        description: "Kontakte konnten nicht importiert werden", 
        variant: "destructive" 
      });
    },
  });

  const handlePickContacts = async () => {
    try {
      // @ts-ignore - ContactsManager API
      const contacts = await navigator.contacts.select(
        ["name", "email", "tel"],
        { multiple: true }
      );
      setSelectedContacts(contacts);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast({
          title: "Fehler",
          description: "Kontakte konnten nicht geladen werden",
          variant: "destructive",
        });
      }
    }
  };

  const getCategoryLabel = (cat: ContactCategory) => {
    switch (cat) {
      case "client": return "Kunden";
      case "partner": return "Partner";
      case "supplier": return "Lieferanten";
      case "lead": return "Interessenten";
    }
  };

  const getCategoryIcon = (cat: ContactCategory) => {
    switch (cat) {
      case "client": return <Users className="h-4 w-4" />;
      case "partner": return <Briefcase className="h-4 w-4" />;
      case "supplier": return <Truck className="h-4 w-4" />;
      case "lead": return <UserPlus className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Contact className="h-5 w-5 text-primary" />
          Aus Telefonbuch importieren
        </CardTitle>
        <CardDescription>
          Wähle Kontakte direkt aus deinem Handy-Telefonbuch aus (Android/Chrome).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-600">Nicht unterstützt</p>
              <p className="text-sm text-muted-foreground mt-1">
                Die Contact Picker API ist nur auf Android mit Chrome verfügbar. 
                Bitte nutze den CSV-Import für andere Geräte.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Importieren als:</label>
              <Select value={category} onValueChange={(v) => setCategory(v as ContactCategory)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      Kunden
                    </div>
                  </SelectItem>
                  <SelectItem value="partner">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Partner (Tierarzt/Schmied)
                    </div>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Lieferanten
                    </div>
                  </SelectItem>
                  <SelectItem value="lead">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      Interessenten
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pick Button */}
            <Button onClick={handlePickContacts} className="gap-2">
              <Smartphone className="h-4 w-4" />
              Aus Telefonbuch wählen
            </Button>

            {/* Selected Contacts Preview */}
            {selectedContacts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Ausgewählte Kontakte ({selectedContacts.length}):</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedContacts.map((contact, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{contact.name?.join(" ") || "Unbekannt"}</p>
                        <p className="text-sm text-muted-foreground">
                          {contact.tel?.[0] || contact.email?.[0] || "Keine Kontaktdaten"}
                        </p>
                      </div>
                      <Badge variant="secondary">{getCategoryLabel(category)}</Badge>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => importMutation.mutate(selectedContacts)}
                  disabled={importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending ? "Importiere..." : `${selectedContacts.length} Kontakte importieren`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactPickerSection;
