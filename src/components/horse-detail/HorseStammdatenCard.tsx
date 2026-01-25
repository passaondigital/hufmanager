import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Pencil, 
  Cake, 
  Ruler, 
  Palette, 
  Dog, 
  Home,
  Shield
} from "lucide-react";
import type { Horse } from "./types";
import { HOOF_PROTECTION_OPTIONS, HOLDING_TYPE_OPTIONS, USAGE_TYPE_OPTIONS } from "./types";

interface HorseStammdatenCardProps {
  horse: Horse;
  onEdit?: () => void;
  compact?: boolean;
}

export function HorseStammdatenCard({ horse, onEdit, compact = false }: HorseStammdatenCardProps) {
  const calculateAge = (birthYear: number | null, birthDate: string | null) => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }
    if (birthYear) {
      return new Date().getFullYear() - birthYear;
    }
    return null;
  };

  const age = calculateAge(horse.birth_year, horse.birth_date);
  const hoofProtection = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection);
  const holdingType = HOLDING_TYPE_OPTIONS.find(h => h.value === horse.holding_type);
  const usageType = USAGE_TYPE_OPTIONS.find(u => u.value === horse.usage_type);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-2 ring-border">
          <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {horse.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground truncate">{horse.name}</h2>
            {horse.readable_id && (
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                #{horse.readable_id}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
            {horse.breed && <span>{horse.breed}</span>}
            {age !== null && <span>• {age} Jahre</span>}
            {horse.color && <span>• {horse.color}</span>}
            {horse.height_cm && <span>• {horse.height_cm} cm</span>}
          </div>
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hoofProtection && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {hoofProtection.icon} {hoofProtection.label}
              </Badge>
            )}
            {holdingType && (
              <Badge variant="outline" className="text-xs">
                {holdingType.icon} {holdingType.label}
              </Badge>
            )}
            {usageType && (
              <Badge variant="outline" className="text-xs">
                {usageType.label}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Dog className="h-4 w-4 text-primary" />
          Stammdaten
        </CardTitle>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header mit Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-border">
            <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {horse.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{horse.name}</h3>
              {horse.readable_id && (
                <Badge variant="outline" className="font-mono text-xs">
                  #{horse.readable_id}
                </Badge>
              )}
            </div>
            {horse.official_name && (
              <p className="text-sm text-muted-foreground">
                Offiziell: {horse.official_name}
              </p>
            )}
            {horse.chip_number && (
              <p className="text-xs text-muted-foreground font-mono">
                Chip: {horse.chip_number}
              </p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem 
            icon={<Dog className="h-4 w-4" />}
            label="Rasse" 
            value={horse.breed} 
          />
          <InfoItem 
            icon={<Cake className="h-4 w-4" />}
            label="Alter" 
            value={age !== null ? `${age} Jahre` : null}
            subValue={horse.birth_year ? `(geb. ${horse.birth_year})` : undefined}
          />
          <InfoItem 
            icon={<Ruler className="h-4 w-4" />}
            label="Stockmaß" 
            value={horse.height_cm ? `${horse.height_cm} cm` : (horse.height || null)}
          />
          <InfoItem 
            icon={<Palette className="h-4 w-4" />}
            label="Farbe" 
            value={horse.color} 
          />
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {horse.gender && (
            <Badge variant="outline">
              {horse.gender === "gelding" ? "Wallach" : 
               horse.gender === "mare" ? "Stute" : 
               horse.gender === "stallion" ? "Hengst" : horse.gender}
            </Badge>
          )}
          {hoofProtection && (
            <Badge variant="secondary">
              {hoofProtection.icon} {hoofProtection.label}
            </Badge>
          )}
          {holdingType && (
            <Badge variant="outline">
              <Home className="h-3 w-3 mr-1" />
              {holdingType.label}
            </Badge>
          )}
          {usageType && (
            <Badge variant="outline">
              {usageType.label}
            </Badge>
          )}
          {horse.shoeing_status && (
            <Badge variant="default">Beschlagen</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ 
  icon, 
  label, 
  value, 
  subValue 
}: { 
  icon: React.ReactNode;
  label: string; 
  value: string | null | undefined;
  subValue?: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className="font-medium text-foreground">
          {value || <span className="text-muted-foreground">—</span>}
        </span>
        {subValue && (
          <span className="text-xs text-muted-foreground ml-1">{subValue}</span>
        )}
      </div>
    </div>
  );
}
