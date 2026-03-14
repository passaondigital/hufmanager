import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Pencil, User, Stethoscope, Home, GraduationCap } from "lucide-react";
import type { HorseContacts } from "./types";

interface HorseContactsSectionProps {
  contacts: HorseContacts | null;
  onEdit?: () => void;
  editable?: boolean;
}

interface ContactRowProps {
  icon: React.ReactNode;
  label: string;
  name?: string | null;
  phone?: string | null;
}

function ContactRow({ icon, label, name, phone }: ContactRowProps) {
  if (!name && !phone) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground truncate">{name || "—"}</p>
        </div>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-1 text-sm text-primary hover:underline flex-shrink-0"
        >
          <Phone className="h-3.5 w-3.5" />
          {phone}
        </a>
      )}
    </div>
  );
}

export function HorseContactsSection({ contacts, onEdit, editable = false }: HorseContactsSectionProps) {
  const c = contacts || {};
  const hasAny = c.vet || c.vet_phone || c.trainer || c.trainer_phone || c.stable || c.stable_phone || c.caretaker || c.caretaker_phone;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between group">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          Kontakte & Notfall
          <span className="flex-1 h-px bg-border ml-2" />
        </CardTitle>
        {editable && onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <div>
            <ContactRow
              icon={<Stethoscope className="h-4 w-4 text-primary" />}
              label="Tierarzt"
              name={c.vet}
              phone={c.vet_phone}
            />
            <ContactRow
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
              label="Trainer"
              name={c.trainer}
              phone={c.trainer_phone}
            />
            <ContactRow
              icon={<Home className="h-4 w-4 text-primary" />}
              label="Stallbetreiber"
              name={c.stable}
              phone={c.stable_phone}
            />
            <ContactRow
              icon={<User className="h-4 w-4 text-primary" />}
              label="Betreuer"
              name={c.caretaker}
              phone={c.caretaker_phone}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Kontakte hinterlegt
          </p>
        )}
      </CardContent>
    </Card>
  );
}
