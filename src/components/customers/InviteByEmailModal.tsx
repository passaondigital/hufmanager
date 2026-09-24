import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface InviteByEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SuccessState {
  fullName: string;
  email: string;
  /** Angelegter Kunde — fuer einen erneuten Versand der Einladung. */
  userId?: string;
  /** P1-4: false, wenn der Kunde angelegt wurde, der Mailversand aber fehlschlug. */
  emailSent: boolean;
}

export function InviteByEmailModal({ open, onOpenChange }: InviteByEmailModalProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [resending, setResending] = useState(false);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setSuccess(null);
    setResending(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error } = await supabase.functions.invoke("invite-client-with-password", {
        body: { email: email.trim().toLowerCase(), fullName },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Fehler beim Einladen");
        return;
      }

      const emailSent = data?.emailSent !== false;
      setSuccess({ fullName, email: email.trim().toLowerCase(), userId: data.userId, emailSent });
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      if (emailSent) {
        toast.success(`Einladung an ${fullName} gesendet`);
      } else {
        toast.warning(`${fullName} wurde angelegt, die E-Mail konnte aber nicht versendet werden.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  // Kein Klartext-Passwort im Browser: bei Zustellfehler setzt der Server
  // ein NEUES Einmalpasswort und stellt es ausschliesslich per Mail zu.
  const handleResend = async () => {
    if (!success?.userId) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-client-with-password", {
        body: { action: "resend", userId: success.userId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Erneuter Versand fehlgeschlagen");
      } else if (data?.emailSent) {
        setSuccess({ ...success, emailSent: true });
        toast.success(`Einladung an ${success.fullName} erneut gesendet`);
      } else {
        toast.error("E-Mail konnte weiterhin nicht zugestellt werden. Bitte später erneut versuchen.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Kunden einladen
          </DialogTitle>
          <DialogDescription>
            Dein Kunde erhält eine E-Mail mit einem Einmalpasswort und kann sich sofort einloggen.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-2">
            {success.emailSent ? (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 space-y-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  ✓ Einladung erfolgreich gesendet
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>{success.fullName}</strong> ({success.email}) hat eine E-Mail mit dem Einmalpasswort erhalten.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 space-y-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Kunde angelegt — E-Mail nicht zugestellt
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>{success.fullName}</strong> ({success.email}) wurde angelegt, die E-Mail mit den Zugangsdaten kam aber nicht an.
                  Beim erneuten Versand wird ein neues Einmalpasswort erzeugt.
                </p>
              </div>
            )}

            {!success.emailSent && success.userId && (
              <Button variant="outline" className="w-full gap-2" onClick={handleResend} disabled={resending}>
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Einladung erneut senden
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Der Kunde muss beim ersten Login ein eigenes Passwort festlegen.
            </p>

            <DialogFooter>
              <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
                Fertig
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-first">Vorname *</Label>
                <Input
                  id="inv-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Maria"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-last">Nachname *</Label>
                <Input
                  id="inv-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Muster"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">E-Mail-Adresse *</Label>
              <Input
                id="inv-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kunde@beispiel.de"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Einladung senden
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
