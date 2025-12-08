import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Phone, Plus, Trash2, Stethoscope, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface EmergencyContact {
  role: string;
  name: string;
  phone: string;
}

interface EmergencyContactsCardProps {
  userId: string;
  contacts: EmergencyContact[];
  onUpdate: () => void;
}

const CONTACT_ROLES = [
  { value: "tierarzt", label: "Tierarzt", icon: "🩺" },
  { value: "klinik", label: "Klinik", icon: "🏥" },
  { value: "osteo", label: "Osteopath", icon: "🦴" },
  { value: "physio", label: "Physiotherapeut", icon: "💆" },
  { value: "trainer", label: "Trainer", icon: "🏇" },
];

export function EmergencyContactsCard({
  userId,
  contacts,
  onUpdate,
}: EmergencyContactsCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newContact, setNewContact] = useState<EmergencyContact>({
    role: "",
    name: "",
    phone: "",
  });

  const getRoleInfo = (role: string) => {
    return CONTACT_ROLES.find((r) => r.value === role) || { label: role, icon: "👤" };
  };

  const handleAddContact = async () => {
    if (!newContact.role || !newContact.name || !newContact.phone) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    // Validate phone number format
    const cleanPhone = newContact.phone.replace(/\s/g, "");
    if (!/^[+]?[\d\s-]{6,20}$/.test(cleanPhone)) {
      toast.error("Bitte gültige Telefonnummer eingeben");
      return;
    }

    setIsSaving(true);
    const updatedContacts = [...contacts, { ...newContact, phone: cleanPhone }];

    const { error } = await supabase
      .from("profiles")
      .update({ emergency_contacts: JSON.parse(JSON.stringify(updatedContacts)) as Json })
      .eq("id", userId);

    setIsSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Kontakt hinzugefügt!");
      setShowAddModal(false);
      setNewContact({ role: "", name: "", phone: "" });
      onUpdate();
    }
  };

  const handleDeleteContact = async (index: number) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);

    const { error } = await supabase
      .from("profiles")
      .update({ emergency_contacts: JSON.parse(JSON.stringify(updatedContacts)) as Json })
      .eq("id", userId);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Kontakt entfernt");
      onUpdate();
    }
  };

  const formatPhoneLink = (phone: string) => {
    return `tel:${phone.replace(/\s/g, "")}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Mein Kompetenzteam
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-4">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Noch keine Kontakte hinterlegt
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Kontakt hinzufügen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact, index) => {
                const roleInfo = getRoleInfo(contact.role);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-xl">{roleInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{roleInfo.label}</p>
                    </div>
                    <a
                      href={formatPhoneLink(contact.phone)}
                      className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteContact(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kontakt hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Rolle</Label>
              <Select
                value={newContact.role}
                onValueChange={(value) =>
                  setNewContact((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rolle wählen" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.icon} {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newContact.name}
                onChange={(e) =>
                  setNewContact((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Dr. Müller"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Telefonnummer</Label>
              <Input
                type="tel"
                value={newContact.phone}
                onChange={(e) =>
                  setNewContact((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+49 123 456789"
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddContact} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Hinzufügen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
