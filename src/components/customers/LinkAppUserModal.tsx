import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link2, Loader2, UserCheck, AlertCircle } from "lucide-react";

interface LinkAppUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SearchProfileResult {
  found: boolean;
  id?: string;
  readable_id?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
}

export const LinkAppUserModal = ({ open, onClose, onSuccess }: LinkAppUserModalProps) => {
  const { user } = useAuth();
  const [clientId, setClientId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !clientId.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clean up the input - remove # and whitespace
      const cleanId = clientId.trim().replace(/^#/, "").toUpperCase();

      // Use the existing database function to search by readable_id
      const { data, error: searchError } = await supabase
        .rpc("search_profile_by_readable_id", { search_id: cleanId });

      if (searchError) throw searchError;

      const searchResult = data as unknown as SearchProfileResult;

      if (!searchResult?.found) {
        setError("Kunde nicht gefunden. Bitte überprüfe die ID.");
        setIsLoading(false);
        return;
      }

      const foundClientId = searchResult.id;

      // Check if this is not a client role
      if (searchResult.role !== "client") {
        setError("Diese ID gehört nicht zu einem Kunden-Account.");
        setIsLoading(false);
        return;
      }

      // Check if already connected
      const { data: existingGrant, error: grantCheckError } = await supabase
        .from("access_grants")
        .select("id, is_active, status")
        .eq("provider_id", user.id)
        .eq("client_id", foundClientId)
        .maybeSingle();

      if (grantCheckError) throw grantCheckError;

      if (existingGrant) {
        if (existingGrant.is_active && existingGrant.status === "active") {
          setError("Dieser Kunde ist bereits mit dir verbunden.");
          setIsLoading(false);
          return;
        }
        
        // Reactivate existing grant
        const { error: updateError } = await supabase
          .from("access_grants")
          .update({ 
            is_active: true, 
            status: "active",
            revoked_at: null,
            granted_at: new Date().toISOString()
          })
          .eq("id", existingGrant.id);

        if (updateError) throw updateError;
      } else {
        // Create new access grant
        const { error: insertError } = await supabase
          .from("access_grants")
          .insert({
            provider_id: user.id,
            client_id: foundClientId,
            status: "active",
            is_active: true,
            can_view_basic: true,
            can_view_medical: true,
            can_create_appointments: true,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Kunde verbunden",
        description: `${searchResult.full_name || "Kunde"} wurde erfolgreich verknüpft.`,
      });

      setClientId("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error linking client:", err);
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setClientId("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Bestehenden App-Nutzer hinzufügen
          </DialogTitle>
          <DialogDescription>
            Verknüpfe einen bestehenden App-Nutzer über seine Kunden-ID. Der Kunde erhält automatisch Zugriff auf deine Dienste.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Kunden-ID eingeben</Label>
            <Input
              id="clientId"
              placeholder="z.B. #KID-123456"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setError(null);
              }}
              className="font-mono"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Die ID findest du in der App des Kunden unter "Mein Profil".
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isLoading || !clientId.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suche...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Verbinden
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
