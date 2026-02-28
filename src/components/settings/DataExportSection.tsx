import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Download, Loader2, FileJson, Shield } from "lucide-react";

export function DataExportSection() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Nicht eingeloggt");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Export fehlgeschlagen" }));
        throw new Error(err.error || "Export fehlgeschlagen");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hufmanager-datenexport-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Datenexport erfolgreich heruntergeladen.");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Fehler beim Datenexport.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          Datenexport (Art. 15 DSGVO)
        </CardTitle>
        <CardDescription>
          Lade alle deine personenbezogenen Daten als JSON-Datei herunter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <div>
              <p>Der Export enthält: Profildaten, Pferde, Termine, Nachrichten, Rechnungen, Kontakte und alle weiteren gespeicherten Daten.</p>
              <p className="mt-1 opacity-70">Format: JSON (maschinenlesbar, gem. Art. 20 DSGVO)</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileJson className="h-4 w-4 mr-2" />
            )}
            {exporting ? "Exportiere…" : "Daten exportieren"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
