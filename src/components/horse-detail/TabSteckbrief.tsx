import { Horse, USAGE_OPTIONS, HOUSING_OPTIONS, HorseContacts } from "./types";
import { HorseContactsSection } from "./HorseContactsSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, User, Home, Utensils, AlertTriangle, Shield, Dna, Scale, Swords, GraduationCap, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { HelpTip } from "@/components/ui/HelpTip";

interface TabSteckbriefProps {
  horse: Horse;
  onEdit: () => void;
}

// Extended horse type to include new DB fields
interface ExtendedHorse extends Horse {
  ueln?: string | null;
  passport_number?: string | null;
  fn_number?: string | null;
  brand_marks?: string | null;
  markings_diagram_url?: string | null;
  sire_name?: string | null;
  dam_name?: string | null;
  studbook?: string | null;
  breeding_country?: string | null;
  weight_kg?: number | null;
  body_condition_score?: number | null;
  bcs_updated_at?: string | null;
  temperament?: string | null;
  handling_warnings?: string | null;
  behavior_notes?: string | null;
  training_level?: string | null;
  disciplines?: string[] | null;
  equipment_notes?: string | null;
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_type?: string[] | null;
  insurance_valid_until?: string | null;
}

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const TEMPERAMENT_LABELS: Record<string, string> = {
  ruhig: "Ruhig", lebhaft: "Lebhaft", nervös: "Nervös", unberechenbar: "Unberechenbar",
};

const TRAINING_LEVELS = ["Jungpferd", "Freizeitpferd", "A", "L", "M", "S"];

const INSURANCE_TYPE_LABELS: Record<string, string> = {
  op: "OP-Versicherung", haftpflicht: "Haftpflicht", lebens: "Lebensversicherung", unfall: "Unfallversicherung",
};

export function TabSteckbrief({ horse, onEdit }: TabSteckbriefProps) {
  const h = horse as ExtendedHorse;

  const calculateAge = (birthYear: number | null) => {
    if (!birthYear) return null;
    return new Date().getFullYear() - birthYear;
  };

  const age = calculateAge(horse.birth_year);

  return (
    <div className="space-y-4">
      {/* Safety Warning Banner */}
      {h.handling_warnings && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">⚠️ Sicherheitshinweis</p>
              <p className="text-sm text-foreground">{h.handling_warnings}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between group">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Basisdaten
            <span className="flex-1 h-px bg-border ml-2" />
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
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
            <span className="flex-1 h-px bg-border ml-2" />
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

      {/* ─── NEW SECTIONS ─── */}

      {/* Official Identification */}
      {(h.ueln || h.fn_number || h.brand_marks) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Offizielle Identifikation
              <HelpTip id="pferdeakte.ueln" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label={<>Lebensnummer (UELN)<InfoTip text="Universal Equine Life Number – internationale Identifikationsnummer aus dem Equidenpass" /></>} value={h.ueln} />
              <InfoItem label={<>FN-Nummer<InfoTip text="Nummer der Deutschen Reiterlichen Vereinigung" /></>} value={h.fn_number} />
              <InfoItem label={<>Brandzeichen<InfoTip text="Beschreibung der Abzeichen und Brandzeichen" /></>} value={h.brand_marks} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedigree */}
      {(h.sire_name || h.dam_name || h.studbook) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Dna className="h-4 w-4 text-primary" />
              Abstammung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Vater (Sire)" value={h.sire_name} />
              <InfoItem label="Mutter (Dam)" value={h.dam_name} />
              <InfoItem label="Zuchtbuch / Verband" value={h.studbook} />
              <InfoItem label="Zuchtland" value={h.breeding_country} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight & BCS */}
      {(h.weight_kg || h.body_condition_score) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Gewicht & Kondition
              <HelpTip id="pferdeakte.bcs" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label={<>Gewicht<InfoTip text="Gewicht in Kilogramm" /></>} value={h.weight_kg ? `${h.weight_kg} kg` : null} />
              <InfoItem label={<>Body Condition Score<InfoTip text="Body Condition Score nach Henneke-Skala. 1 = extrem mager, 9 = extrem adipös. Idealbereich: 4-6" /></>} value={h.body_condition_score ? `${h.body_condition_score} / 9` : null} />
              {h.bcs_updated_at && (
                <InfoItem label="Zuletzt gemessen" value={new Date(h.bcs_updated_at).toLocaleDateString("de-DE")} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temperament & Safety */}
      {(h.temperament || h.behavior_notes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              Temperament & Sicherheit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Temperament" value={h.temperament ? (TEMPERAMENT_LABELS[h.temperament] || h.temperament) : null} />
            </div>
            {h.behavior_notes && (
              <div>
                <span className="text-muted-foreground text-xs">Verhaltensnotizen</span>
                <p className="text-sm text-foreground whitespace-pre-wrap">{h.behavior_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Training & Equipment */}
      {(h.training_level || (h.disciplines && h.disciplines.length > 0) || h.equipment_notes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Ausbildung & Ausrüstung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Ausbildungsstand" value={h.training_level} />
              {h.disciplines && h.disciplines.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Disziplinen</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.disciplines.map(d => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {h.equipment_notes && (
              <div>
                <span className="text-muted-foreground text-xs">
                  Ausrüstungsnotizen
                  <InfoTip text="Sattelmaße, Trensen, spezielle Ausrüstung" />
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap">{h.equipment_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insurance */}
      {(h.insurance_company || h.insurance_policy_number) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Versicherung
              <InfoTip text="Diese Daten sind nur für berechtigte Personen sichtbar. Der Besitzer kontrolliert den Zugriff." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Versicherer" value={h.insurance_company} />
              <InfoItem label="Vertragsnummer" value={h.insurance_policy_number} />
              {h.insurance_type && h.insurance_type.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Versicherungsart</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.insurance_type.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {INSURANCE_TYPE_LABELS[t] || t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {h.insurance_valid_until && (
                <InfoItem label="Gültig bis" value={new Date(h.insurance_valid_until).toLocaleDateString("de-DE")} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts & Emergency */}
      <HorseContactsSection 
        contacts={h.contacts as HorseContacts | null} 
        onEdit={onEdit} 
        editable 
      />

      {/* Empty State */}
      {!horse.nickname && !horse.usage && !horse.housing && !horse.feeding_notes && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Pencil className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground text-sm">Steckbrief noch unvollständig</p>
            <p className="text-muted-foreground text-xs mt-1">
              Ergänze weitere Details wie Haltung, Nutzung und Fütterung.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Jetzt ausfüllen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: React.ReactNode; value: string | null | undefined }) {
  return (
    <div className="group/info">
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium text-foreground">
        {value || (
          <span className="text-muted-foreground/60 italic group-hover/info:text-primary/60 transition-colors cursor-default">
            —
          </span>
        )}
      </p>
    </div>
  );
}
