import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface Props {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientInquiryDialog({ listingId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      if (!listingId || !user) throw new Error("Nicht eingeloggt");
      const { error } = await supabase.from("client_marketplace_inquiries").insert({
        listing_id: listingId,
        sender_id: user.id,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Anfrage gesendet!", description: "Der Anbieter wurde benachrichtigt." });
      setMessage("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Anfrage konnte nicht gesendet werden.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anfrage senden</DialogTitle>
          <DialogDescription>
            Schreibe dem Anbieter eine Nachricht zu diesem Inserat.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Hallo, ich interessiere mich für…"
        />
        <Button
          className="w-full"
          disabled={!message.trim() || send.isPending}
          onClick={() => send.mutate()}
        >
          <Send className="h-4 w-4 mr-1" />
          {send.isPending ? "Wird gesendet…" : "Anfrage absenden"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
