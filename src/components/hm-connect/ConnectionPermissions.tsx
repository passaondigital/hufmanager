import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, EyeOff, Calendar, FileText, MessageSquare, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionItem {
  label: string;
  icon: React.ElementType;
  granted: boolean;
  description: string;
}

interface ConnectionPermissionsProps {
  viewerRole: string;
  targetRole: string;
}

export function ConnectionPermissions({ viewerRole, targetRole }: ConnectionPermissionsProps) {
  const getPermissions = (): PermissionItem[] => {
    if (viewerRole === "provider" && targetRole === "client") {
      return [
        { label: "Stammdaten", icon: Eye, granted: true, description: "Name, Kontakt, Adresse des Kunden" },
        { label: "Pferdedaten", icon: Eye, granted: true, description: "Alle Pferde des Kunden inkl. Behandlungshistorie" },
        { label: "Termine", icon: Calendar, granted: true, description: "Termine erstellen, bearbeiten, abschließen" },
        { label: "Rechnungen", icon: FileText, granted: true, description: "Rechnungen erstellen und verwalten" },
        { label: "Chat", icon: MessageSquare, granted: true, description: "Direkter Chat mit dem Kunden" },
        { label: "Medizinische Daten", icon: Eye, granted: true, description: "Befunde, Hufprotokolle, Messungen" },
      ];
    }
    if (viewerRole === "client" && targetRole === "provider") {
      return [
        { label: "Profildaten", icon: Eye, granted: true, description: "Name, Qualifikation, Kontakt" },
        { label: "Meine Pferde", icon: Eye, granted: true, description: "Deine Pferdeakten mit allen Behandlungen" },
        { label: "Termine", icon: Calendar, granted: true, description: "Eigene Termine einsehen" },
        { label: "Rechnungen", icon: FileText, granted: true, description: "Eigene Rechnungen einsehen" },
        { label: "Chat", icon: MessageSquare, granted: true, description: "Direkter Chat mit deinem Hufpfleger" },
        { label: "Anderer Kunden", icon: EyeOff, granted: false, description: "Keine Einsicht in andere Kundendaten" },
      ];
    }
    if (viewerRole === "partner") {
      return [
        { label: "Freigegebene Pferde", icon: Eye, granted: true, description: "Nur Pferde mit aktiver Freigabe" },
        { label: "Eigene Facheinträge", icon: FileText, granted: true, description: "Eigene Befunde und Behandlungsnotizen" },
        { label: "Provider-Einträge", icon: Eye, granted: true, description: "Hufbearbeitungs-Historie (wenn freigegeben)" },
        { label: "Andere Partner", icon: EyeOff, granted: false, description: "Nur mit aktiver Team-Freigabe sichtbar" },
        { label: "Kundendaten", icon: EyeOff, granted: false, description: "Kein Zugriff auf Kundenstammdaten" },
        { label: "Rechnungsdaten", icon: EyeOff, granted: false, description: "Keine Einsicht in Rechnungen" },
      ];
    }
    // Default / Employee
    return [
      { label: "Zugewiesene Touren", icon: Eye, granted: true, description: "Termine deiner zugewiesenen Touren" },
      { label: "Team-Chat", icon: MessageSquare, granted: true, description: "Chat mit Chef und Kollegen" },
      { label: "Kundendaten (Tour)", icon: Eye, granted: true, description: "Basisdaten der Tour-Kunden" },
      { label: "Andere Mitarbeiter", icon: EyeOff, granted: false, description: "Keine Einsicht in Gehalt etc." },
      { label: "Rechnungen", icon: EyeOff, granted: false, description: "Kein Zugriff auf Rechnungswesen" },
      { label: "Einstellungen", icon: EyeOff, granted: false, description: "Keine Geschäftseinstellungen" },
    ];
  };

  const permissions = getPermissions();
  const granted = permissions.filter(p => p.granted);
  const denied = permissions.filter(p => !p.granted);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Berechtigungen
        </CardTitle>
        <CardDescription>
          Was kannst du sehen und tun? Transparente Übersicht deiner Datenzugänge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Granted */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zugriff erlaubt</h4>
          {granted.map((p) => (
            <div key={p.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p.icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{p.label}</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">{p.description}</p>
                </TooltipContent>
              </Tooltip>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                ✓
              </Badge>
            </div>
          ))}
        </div>

        {/* Denied */}
        {denied.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kein Zugriff</h4>
            {denied.map((p) => (
              <div key={p.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border opacity-70">
                <p.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground flex-1">{p.label}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">{p.description}</p>
                  </TooltipContent>
                </Tooltip>
                <Badge variant="outline" className="text-xs">✗</Badge>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          🔒 Alle Zugriffe werden protokolliert und sind DSGVO-konform.
        </p>
      </CardContent>
    </Card>
  );
}
