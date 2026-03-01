import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    if (!name.trim()) return;
    setSending(true);
    try {
      await supabase.from("website_leads").insert({
        owner_id: providerId,
        contact_name: name.trim(),
        phone: phone || null,
        source: "exit-intent",
        dsgvo_consent: true,
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
            <Button className="w-full" style={{ backgroundColor: primaryColor }} onClick={handleSubmit} disabled={sending || !name.trim()}>
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
