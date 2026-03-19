import { useState } from "react";
import { Eye, EyeOff, Shield, Heart, FileText, Syringe, Stethoscope, Footprints, Utensils, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StallAccessPermission {
  key: string;
  label: string;
  description: string;
  icon: typeof Heart;
  default: boolean;
  category: "basic" | "medical" | "operational";
  reason: string; // Why a stall needs this
}

const PERMISSIONS: StallAccessPermission[] = [
  {
    key: "can_view_basic",
    label: "Stammdaten",
    description: "Name, Rasse, Alter, Geschlecht",
    icon: Heart,
    default: true,
    category: "basic",
    reason: "Grundlegende Identifizierung im Stall",
  },
  {
    key: "can_view_equidenpass",
    label: "Equidenpass",
    description: "Pass-Nr., Chipnummer, UELN",
    icon: FileText,
    default: false,
    category: "basic",
    reason: "Behördliche Bestandsmeldung, Tierseuchenkasse",
  },
  {
    key: "can_view_insurance",
    label: "Versicherung",
    description: "Haftpflicht, OP-Versicherung, Policennummer",
    icon: Shield,
    default: false,
    category: "basic",
    reason: "Nachweis für Stallhaftung und Schadensfälle",
  },
  {
    key: "can_view_vaccination",
    label: "Impfstatus",
    description: "Impfungen, Entwurmungen, Fristen",
    icon: Syringe,
    default: false,
    category: "medical",
    reason: "Stallhygiene, Quarantäne-Entscheidungen",
  },
  {
    key: "can_view_health_status",
    label: "Gesundheitsstatus",
    description: "Aktueller Score, chronische Erkrankungen",
    icon: Stethoscope,
    default: false,
    category: "medical",
    reason: "Notfallsituationen, Pflege-Anpassungen",
  },
  {
    key: "can_view_vet_reports",
    label: "Tierarzt-Befunde",
    description: "Diagnosen, Behandlungsverläufe",
    icon: FileText,
    default: false,
    category: "medical",
    reason: "Medikamentengabe, Weide-Einschränkungen",
  },
  {
    key: "can_view_hoof_status",
    label: "Hufstatus",
    description: "Beschlagzyklus, Huf-Score, Befunde",
    icon: Footprints,
    default: false,
    category: "medical",
    reason: "Koordination mit Hufbearbeiter",
  },
  {
    key: "can_view_feeding",
    label: "Fütterung",
    description: "Futterpläne, Allergien, Zusätze",
    icon: Utensils,
    default: true,
    category: "operational",
    reason: "Tägliche Stallarbeit, Futterbestellung",
  },
  {
    key: "can_view_emergency",
    label: "Notfallkontakte",
    description: "Tierarzt, Besitzer, Vertrauensperson",
    icon: Phone,
    default: true,
    category: "operational",
    reason: "Schnelle Erreichbarkeit bei Notfällen",
  },
];

const CATEGORIES = [
  { key: "basic", label: "Stammdaten & Dokumente", description: "Identifizierung und behördliche Pflichten" },
  { key: "medical", label: "Gesundheit & Medizin", description: "Medizinische Daten für die Betreuung" },
  { key: "operational", label: "Betrieblich", description: "Für den täglichen Stallbetrieb" },
];

interface StallDataSharingProps {
  horseName: string;
  horseId: string;
  stallName: string;
  stallOwnerId: string;
  currentPermissions?: Record<string, boolean>;
  onUpdate?: () => void;
}

export function StallDataSharing({
  horseName,
  horseId,
  stallName,
  stallOwnerId,
  currentPermissions,
  onUpdate,
}: StallDataSharingProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    if (currentPermissions) return currentPermissions;
    const defaults: Record<string, boolean> = {};
    PERMISSIONS.forEach((p) => (defaults[p.key] = p.default));
    return defaults;
  });

  const savePermissions = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase
        .from("stall_horse_access" as any)
        .upsert({
          stall_owner_id: stallOwnerId,
          horse_owner_id: user!.id,
          horse_id: horseId,
          granted_by: user!.id,
          ...permissions,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stall_owner_id,horse_id" }) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Datenfreigaben aktualisiert");
      qc.invalidateQueries({ queryKey: ["stall-horse-access"] });
      onUpdate?.();
    },
    onError: () => toast.error("Fehler beim Speichern."),
  });

  const toggle = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Datenfreigabe für {stallName}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wähle welche Daten von <span className="font-medium">{horseName}</span> der Stall sehen darf.
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {enabledCount}/{PERMISSIONS.length} aktiv
        </span>
      </div>

      {CATEGORIES.map((cat) => {
        const catPerms = PERMISSIONS.filter((p) => p.category === cat.key);
        return (
          <Card key={cat.key} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{cat.label}</CardTitle>
              <CardDescription className="text-xs">{cat.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {catPerms.map((perm) => (
                <div
                  key={perm.key}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                    permissions[perm.key] ? "bg-primary/5" : "bg-transparent"
                  )}
                >
                  <perm.icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    permissions[perm.key] ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{perm.label}</p>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                    {permissions[perm.key] && (
                      <p className="text-[10px] text-primary mt-0.5">↳ {perm.reason}</p>
                    )}
                  </div>
                  <Switch
                    checked={permissions[perm.key]}
                    onCheckedChange={() => toggle(perm.key)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">⚠️ Hinweis zur Datensouveränität</p>
        <p>
          Du entscheidest jederzeit, welche Daten dein Stallbetreiber sehen kann.
          Änderungen werden sofort wirksam. Der Stall kann keine weiteren Daten
          einsehen, als du hier freigibst.
        </p>
      </div>

      <Button
        onClick={() => savePermissions.mutate()}
        disabled={savePermissions.isPending}
        className="w-full"
      >
        {savePermissions.isPending ? "Wird gespeichert..." : "Freigaben speichern"}
      </Button>
    </div>
  );
}
