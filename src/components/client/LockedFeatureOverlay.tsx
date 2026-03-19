import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientMode } from "@/hooks/useClientMode";

interface LockedFeatureOverlayProps {
  feature: string;
  requiredMode: "stall" | "commercial";
}

export function LockedFeatureOverlay({ feature, requiredMode }: LockedFeatureOverlayProps) {
  const navigate = useNavigate();
  const { modeInfo, MODE_LABELS } = useClientMode();

  const isPending = modeInfo.verificationStatus === "pending";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Shield className="h-10 w-10 text-primary" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">
        {isPending ? "Verifizierung läuft..." : `${feature} ist gesperrt`}
      </h2>

      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {isPending
          ? "Dein Antrag wird gerade von unserem Team geprüft. Du wirst benachrichtigt, sobald die Verifizierung abgeschlossen ist (1–2 Werktage)."
          : `Diese Funktion steht nur verifizierten ${MODE_LABELS[requiredMode]}-Accounts zur Verfügung. Wechsle deinen Account-Typ und durchlaufe die Verifizierung.`}
      </p>

      {!isPending && (
        <Button onClick={() => navigate("/client-account-type")} className="gap-2">
          Account-Typ ändern
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {isPending && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-500/10 px-4 py-2 rounded-full">
          <Shield className="h-4 w-4" />
          Prüfung läuft – bitte Geduld
        </div>
      )}
    </div>
  );
}
