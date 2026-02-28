import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

export function DeleteProviderAccountSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || confirmText !== "LÖSCHEN") return;

    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_provider_cascade", {
        _provider_id: user.id,
      });

      if (error) throw error;

      await signOut();
      toast.success("Dein Konto und alle Daten wurden gelöscht.");
      navigate("/auth");
    } catch (error: any) {
      console.error("Provider account deletion error:", error);
      toast.error("Fehler beim Löschen. Bitte kontaktiere den Support.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Konto löschen
          </CardTitle>
          <CardDescription>
            Alle deine Daten werden unwiderruflich gelöscht (Art. 17 DSGVO).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Dies umfasst: Profildaten, Geschäftseinstellungen, Kunden, Termine,
            Rechnungen, Dienstleistungen, Chat-Verläufe und alle Verbindungen.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Konto und Daten löschen
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Provider-Konto endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden.
                Folgende Daten werden unwiderruflich gelöscht:
              </p>
              <ul className="list-disc ml-4 space-y-1 text-sm">
                <li>Dein Profil und Geschäftseinstellungen</li>
                <li>Alle Dienstleistungen und Preise</li>
                <li>Alle Kundenverbindungen (werden deaktiviert)</li>
                <li>Alle zukünftigen Termine (werden storniert)</li>
                <li>Alle Chat-Nachrichten und Benachrichtigungen</li>
                <li>AutoFlow-Einstellungen und Touren</li>
                <li>Kontakte werden anonymisiert</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Hinweis: Abgeschlossene Rechnungen bleiben aus steuerlichen Gründen
                (§147 AO) für 10 Jahre archiviert.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-provider-delete" className="text-foreground font-medium">
                  Tippe <span className="font-mono text-destructive">LÖSCHEN</span> zur Bestätigung:
                </Label>
                <Input
                  id="confirm-provider-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="LÖSCHEN"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmText !== "LÖSCHEN" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
