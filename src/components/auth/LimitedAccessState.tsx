import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LimitedAccessStateProps {
  onSignOut?: () => void;
}

export function LimitedAccessState({ onSignOut }: LimitedAccessStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Zugriff noch nicht freigegeben</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deine Anmeldung ist aktiv, aber Rolle oder Arbeitskontext konnten nicht sicher aufgeloest werden.
        </p>
        {onSignOut && (
          <Button type="button" variant="outline" className="mt-6 w-full gap-2" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        )}
      </div>
    </div>
  );
}

