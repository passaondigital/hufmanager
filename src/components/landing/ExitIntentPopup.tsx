import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  providerId: string;
  providerName: string;
  primaryColor: string;
}

export const ExitIntentPopup = ({ providerId, providerName, primaryColor }: Props) => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10 && !dismissed) {
        setShow(true);
      }
    };
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }, [dismissed]);

  const handleSubmit = async () => {
    if (!name.trim() || !dsgvo) return;
    setSending(true);
    try {
      await supabase.from("website_leads").insert({
        owner_id: providerId,
        contact_name: name.trim(),
        phone: phone || null,
        source: "exit-intent",
        dsgvo_consent: dsgvo,
      });
      setSent(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    setDismissed(true);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-sm">
        {sent ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-2xl">✅</p>
            <p className="font-semibold text-foreground">Danke!</p>
            <p className="text-sm text-muted-foreground">{providerName} meldet sich bei dir.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl mb-2">👋</p>
              <h3 className="font-semibold text-foreground">Warte kurz — hast du Fragen?</h3>
              <p className="text-sm text-muted-foreground">Schreib mir einfach:</p>
            </div>
            <Input placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Telefon (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="flex items-start gap-3">
              <Checkbox
                id="exit-dsgvo"
                checked={dsgvo}
                onCheckedChange={(v) => setDsgvo(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="exit-dsgvo" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
                <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Datenschutzerklärung</a> zu. *
              </Label>
            </div>
            <Button className="w-full" style={{ backgroundColor: primaryColor }} onClick={handleSubmit} disabled={sending || !name.trim() || !dsgvo}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Jetzt anfragen
            </Button>
            <Button variant="ghost" className="w-full text-xs" onClick={handleClose}>Nein danke</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
