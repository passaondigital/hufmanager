import { Horse, USAGE_OPTIONS, HOUSING_OPTIONS } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, User, Home, Utensils } from "lucide-react";

interface TabSteckbriefProps {
  horse: Horse;
  onEdit: () => void;
}

export function TabSteckbrief({ horse, onEdit }: TabSteckbriefProps) {
  const calculateAge = (birthYear: number | null) => {
    if (!birthYear) return null;
    return new Date().getFullYear() - birthYear;
  };

  const age = calculateAge(horse.birth_year);

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Basisdaten
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="Name" value={horse.name} />
            <InfoItem label="Rufname" value={horse.nickname} />
            <InfoItem label="Rasse" value={horse.breed} />
            <InfoItem 
              label="Alter" 
              value={age ? `${age} Jahre (geb. ${horse.birth_year})` : null} 
            />
            <InfoItem label="Geschlecht" value={horse.gender} />
            <InfoItem label="Farbe" value={horse.color} />
            <InfoItem label="Stockmaß" value={horse.height ? `${horse.height} cm` : null} />
            <InfoItem label="Disziplin" value={horse.discipline} />
          </div>
        </CardContent>
      </Card>

      {/* Housing & Usage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            Haltung & Nutzung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="Verwendung" value={horse.usage} />
            <InfoItem label="Haltungsform" value={horse.housing} />
          </div>
        </CardContent>
      </Card>

      {/* Feeding */}
      {horse.feeding_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              Fütterung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {horse.feeding_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!horse.nickname && !horse.usage && !horse.housing && !horse.feeding_notes && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Ergänze weitere Details zu deinem Pferd
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Jetzt bearbeiten
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}
