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

export function DeleteAccountSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || confirmText !== "LÖSCHEN") return;

    setDeleting(true);
    try {
      // 1. Delete all horses owned by this client (cascades to appointments, hoof_analyses etc.)
      await supabase.from("horses").delete().eq("owner_id", user.id);

      // 2. Delete all access_grants where client
      await supabase.from("access_grants").delete().eq("client_id", user.id);

      // 3. Delete conversations
      await supabase.from("conversations").delete().eq("client_id", user.id);

      // 4. Delete client consents
      await supabase.from("client_consents").delete().eq("client_id", user.id);

      // 5. Delete push subscriptions
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

      // 6. Delete AI chat messages
      await supabase.from("ai_chat_messages").delete().eq("user_id", user.id);

      // 7. Delete notifications
      await supabase.from("notifications").delete().eq("user_id", user.id);

      // 8. Soft-delete profile (mark as deleted)
      await supabase
        .from("profiles")
        .update({
          deleted_at: new Date().toISOString(),
          full_name: "Gelöschter Benutzer",
          email: null,
          phone: null,
          stable_street: null,
          stable_zip: null,
          stable_city: null,
          stable_latitude: null,
          stable_longitude: null,
          emergency_contacts: null,
        })
        .eq("id", user.id);

      // 9. Sign out
      await signOut();

      toast.success("Dein Konto und alle Daten wurden gelöscht.");
      navigate("/auth");
    } catch (error: any) {
      console.error("Account deletion error:", error);
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
            Dies umfasst: Profildaten, Pferde, Termine, Chat-Verläufe, 
            Huffotos und alle Verbindungen zu Hufbearbeitern.
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
              Konto endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. 
                Folgende Daten werden unwiderruflich gelöscht:
              </p>
              <ul className="list-disc ml-4 space-y-1 text-sm">
                <li>Dein Profil und alle persönlichen Daten</li>
                <li>Alle Pferde und deren Gesundheitsdaten</li>
                <li>Alle Termine und Behandlungshistorien</li>
                <li>Alle Chat-Nachrichten</li>
                <li>Alle Huffotos und Dokumente</li>
                <li>Verbindungen zu Hufbearbeitern</li>
              </ul>
              <div className="pt-2">
                <Label htmlFor="confirm-delete" className="text-foreground font-medium">
                  Tippe <span className="font-mono text-destructive">LÖSCHEN</span> zur Bestätigung:
                </Label>
                <Input
                  id="confirm-delete"
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
              onClick={handleDeleteAccount}
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
