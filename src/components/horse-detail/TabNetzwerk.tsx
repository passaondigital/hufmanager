import { Horse, HorseContacts } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Users, Phone, Stethoscope, Dumbbell, Home, Heart } from "lucide-react";

interface TabNetzwerkProps {
  horse: Horse;
  onEdit: () => void;
}

export function TabNetzwerk({ horse, onEdit }: TabNetzwerkProps) {
  const contacts = (horse.contacts || {}) as HorseContacts;
  const hasAnyContact = contacts.vet || contacts.trainer || contacts.stable || contacts.caretaker;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Dienstleister & Kontakte
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasAnyContact ? (
            <>
              {contacts.vet && (
                <ContactCard 
                  icon={<Stethoscope className="h-4 w-4" />}
                  role="Tierarzt"
                  name={contacts.vet}
                  phone={contacts.vet_phone}
                />
              )}
              {contacts.trainer && (
                <ContactCard 
                  icon={<Dumbbell className="h-4 w-4" />}
                  role="Trainer / Reitlehrer"
                  name={contacts.trainer}
                  phone={contacts.trainer_phone}
                />
              )}
              {contacts.stable && (
                <ContactCard 
                  icon={<Home className="h-4 w-4" />}
                  role="Stall / Stallbetreiber"
                  name={contacts.stable}
                  phone={contacts.stable_phone}
                />
              )}
              {contacts.caretaker && (
                <ContactCard 
                  icon={<Heart className="h-4 w-4" />}
                  role="Reitbeteiligung / Pflege"
                  name={contacts.caretaker}
                  phone={contacts.caretaker_phone}
                />
              )}
            </>
          ) : (
            <div className="p-6 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Keine Kontakte eingetragen
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Kontakte hinzufügen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>DSGVO-Hinweis:</strong> Speichere hier nur Name und Telefonnummer 
            von Dienstleistern. Für weitere Daten hole dir die Einwilligung der betreffenden Personen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactCard({ 
  icon, 
  role, 
  name, 
  phone 
}: { 
  icon: React.ReactNode; 
  role: string; 
  name: string; 
  phone?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{role}</span>
        <p className="font-medium text-foreground truncate">{name}</p>
        {phone && (
          <a 
            href={`tel:${phone}`}
            className="text-sm text-primary flex items-center gap-1 mt-1"
          >
            <Phone className="h-3 w-3" />
            {phone}
          </a>
        )}
      </div>
    </div>
  );
}
