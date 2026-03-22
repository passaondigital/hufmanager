import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Horse } from "@/components/horse-detail/types";
import { HOOF_PROTECTION_OPTIONS } from "@/components/horse-detail/types";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface HorseHeroZoneProps {
  horse: Horse;
  role: Role;
  appointmentsCount: number;
  hoofPhotosCount: number;
  documentsCount: number;
  backPath?: string;
}

export function HorseHeroZone({ horse, role, appointmentsCount, hoofPhotosCount, documentsCount, backPath }: HorseHeroZoneProps) {
  const navigate = useNavigate();

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  const genderLabel = horse.gender === "gelding" ? "Wallach" :
    horse.gender === "mare" ? "Stute" :
    horse.gender === "stallion" ? "Hengst" : horse.gender;
  const hoofProt = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection);
  const hoofLabel = hoofProt?.label || "Barhuf";

  const healthStatus = (horse as any).health_status || "healthy";
  const statusOk = healthStatus === "healthy";
  const statusLabel = statusOk ? "Gesund" : healthStatus === "acute" ? "Akut" : healthStatus === "chronic" ? "Chronisch" : "Reha";

  const defaultBack = role === "client" ? "/client-home" : role === "partner" ? "/partner-home" : role === "employee" ? "/employee/tour" : "/";

  const stats = [
    { value: appointmentsCount, label: "Termine" },
    { value: hoofPhotosCount, label: "Befunde" },
    { value: documentsCount, label: "Fotos" },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-background to-card/80 p-5 pb-4">
      {/* Back */}
      <button
        onClick={() => {
          if (backPath) navigate(backPath);
          else if (window.history.length > 1) navigate(-1);
          else navigate(defaultBack);
        }}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs">Zurück</span>
      </button>

      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <Avatar className="h-[72px] w-[72px] ring-2 ring-primary/60 shadow-lg flex-shrink-0">
          <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
          <AvatarFallback className="bg-primary/12 text-primary text-xl font-bold">
            {horse.name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-foreground truncate">{horse.name}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {[horse.breed, age ? `${age} J.` : null, genderLabel].filter(Boolean).join(" · ")}
          </p>
          {horse.readable_id && (
            <span className="text-[10px] font-mono text-muted-foreground">#{horse.readable_id}</span>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          statusOk ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {hoofLabel}
        </span>
        {horse.birth_year && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            seit {horse.birth_year}
          </span>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {stats.map(s => (
          <div key={s.label} className="text-center py-2.5 rounded-lg bg-muted border border-border/50">
            <p className="text-lg font-semibold text-foreground">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
