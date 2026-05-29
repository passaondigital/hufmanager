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
import { Loader2, Mail, KeyRound, Copy, Check } from "lucide-react";
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
  tempPassword: string;
}

export function InviteByEmailModal({ open, onOpenChange }: InviteByEmailModalProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setSuccess(null);
    setCopied(false);
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

      setSuccess({ fullName, email: email.trim().toLowerCase(), tempPassword: data.tempPassword });
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      toast.success(`Einladung an ${fullName} gesendet`);
    } catch (err: any) {
      toast.error(err?.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!success) return;
    const text = `Login: ${window.location.origin}/auth\nE-Mail: ${success.email}\nEinmalpasswort: ${success.tempPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 space-y-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                ✓ Einladung erfolgreich gesendet
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                <strong>{success.fullName}</strong> ({success.email}) hat eine E-Mail mit dem Einmalpasswort erhalten.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zugangsdaten (zur Sicherheit)</p>
              <div className="flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{success.email}</p>
                  <p className="text-2xl font-bold font-mono tracking-[0.3em] text-primary">{success.tempPassword}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Kopiert!" : "Zugangsdaten kopieren"}
              </Button>
            </div>

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
