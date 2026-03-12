import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HOOF_PROTECTION_OPTIONS, HOLDING_TYPE_OPTIONS, USAGE_TYPE_OPTIONS } from "./types";
import type { Horse } from "./types";

interface HorseDetailHeroProps {
  horse: Horse;
  backPath?: string;
}

export function HorseDetailHero({ horse, backPath }: HorseDetailHeroProps) {
  const navigate = useNavigate();

  const calculateAge = (birthYear: number | null, birthDate: string | null) => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }
    if (birthYear) return new Date().getFullYear() - birthYear;
    return null;
  };

  const age = calculateAge(horse.birth_year, horse.birth_date);
  const hoofProtection = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection);
  const holdingType = HOLDING_TYPE_OPTIONS.find(h => h.value === horse.holding_type);
  const usageType = USAGE_TYPE_OPTIONS.find(u => u.value === horse.usage_type);

  const genderLabel = horse.gender === "gelding" ? "Wallach" : 
    horse.gender === "mare" ? "Stute" : 
    horse.gender === "stallion" ? "Hengst" : horse.gender;

  const horseAny = horse as any;
  const horseStatus = horseAny.horse_status || "active";
  const statusLabel = horseStatus === "active" ? "Aktiv" : 
    horseStatus === "sold" ? "Verkauft" : 
    horseStatus === "deceased" ? "Verstorben" :
    horseStatus === "archived" ? "Archiviert" : "Aktiv";

  const statusColor = horseStatus === "active"
    ? "bg-green-500/20 text-green-400 border-green-500/30"
    : horseStatus === "sold" 
    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(0,0%,14%)] via-[hsl(0,0%,11%)] to-[hsl(26,30%,10%)] p-5 pb-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 left-3 text-[hsl(0,0%,60%)] hover:text-foreground hover:bg-[hsl(0,0%,20%)] z-10"
        onClick={() => {
          if (backPath) {
            navigate(backPath);
          } else if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/");
          }
        }}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Content */}
      <div className="flex items-center gap-4 mt-8">
        <Avatar className="h-[72px] w-[72px] ring-2 ring-primary shadow-lg flex-shrink-0">
          <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
          <AvatarFallback className="bg-primary/15 text-primary text-2xl font-bold">
            {horse.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{horse.name}</h1>
            {horse.readable_id && (
              <Badge variant="outline" className="font-mono text-xs bg-[hsl(0,0%,16%)] border-border text-muted-foreground shrink-0">
                #{horse.readable_id}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-0.5">
            {[horse.breed, genderLabel, age !== null ? `Geb. ${horse.birth_year}` : null]
              .filter(Boolean)
              .join(" · ")}
            {hoofProtection ? ` · ${hoofProtection.label}` : " · Barhuf"}
          </p>
        </div>
      </div>

      {/* Tags Row */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>

        {hoofProtection && (
          <span className="inline-flex items-center rounded-full bg-[hsl(0,0%,18%)] border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {hoofProtection.icon} {hoofProtection.label}
          </span>
        )}
        {holdingType && (
          <span className="inline-flex items-center rounded-full bg-[hsl(0,0%,18%)] border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {holdingType.icon} {holdingType.label}
          </span>
        )}
        {usageType && (
          <span className="inline-flex items-center rounded-full bg-[hsl(0,0%,18%)] border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {usageType.label}
          </span>
        )}
      </div>
    </div>
  );
}
