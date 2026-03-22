import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageCircle,
  Mail,
  Smartphone,
  Send,
  Check,
  CheckCheck,
  Link2,
  Copy,
} from "lucide-react";
import type { ImportResult } from "./types";

interface ImportInvitationPanelProps {
  results: ImportResult[];
}

const ImportInvitationPanel = ({ results }: ImportInvitationPanelProps) => {
  const { user } = useAuth();
  const successful = results.filter(r => r.success);
  const [selected, setSelected] = useState<Set<string>>(new Set(successful.map(r => r.contact.id)));
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === successful.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(successful.map(r => r.contact.id)));
    }
  };

  const selectedContacts = successful.filter(r => selected.has(r.contact.id));
  const registrationUrl = `${window.location.origin}/auth?source=invitation`;

  const sendWhatsApp = () => {
    const contacts = selectedContacts.filter(r => r.contact.phone);
    if (contacts.length === 0) {
      toast({ title: "Keine Telefonnummern", description: "Ausgewählte Kontakte haben keine Telefonnummer", variant: "destructive" });
      return;
    }
    const c = contacts[0].contact;
    const msg = encodeURIComponent(
      `Hallo ${c.full_name}! 🐴\n\nIch nutze den HufManager für die Verwaltung meiner Pferde-Termine. Damit du als Pferdebesitzer alle Infos direkt auf dem Handy hast, registriere dich hier:\n\n${registrationUrl}\n\nDort kannst du deine digitale Pferdeakte anlegen und Termine verwalten.`
    );
    const phone = c.phone?.replace(/[^\d+]/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    setSentIds(prev => new Set([...prev, c.id]));
    toast({ title: `WhatsApp geöffnet für ${c.full_name}` });
  };

  const sendSMS = () => {
    const contacts = selectedContacts.filter(r => r.contact.phone);
    if (contacts.length === 0) {
      toast({ title: "Keine Telefonnummern", description: "Ausgewählte Kontakte haben keine Telefonnummer", variant: "destructive" });
      return;
    }
    const c = contacts[0].contact;
    const phone = c.phone?.replace(/[^\d+]/g, "");
    const msg = encodeURIComponent(
      `Hallo ${c.full_name}! Registriere dich beim HufManager: ${registrationUrl}`
    );
    window.open(`sms:${phone}?body=${msg}`, "_self");
    setSentIds(prev => new Set([...prev, c.id]));
  };

  const sendEmailInvites = async () => {
    const withEmail = selectedContacts.filter(r => r.contact.email);
    if (withEmail.length === 0) {
      toast({ title: "Keine E-Mails", description: "Ausgewählte Kontakte haben keine E-Mail", variant: "destructive" });
      return;
    }
    // Open mailto for now (batch)
    const emails = withEmail.map(r => r.contact.email).join(",");
    const subject = encodeURIComponent("Einladung zum HufManager – Deine digitale Pferdeakte");
    const body = encodeURIComponent(
      `Hallo!\n\nIch nutze den HufManager für die professionelle Pferdepflege und möchte dich einladen.\n\nRegistriere dich hier und lege deine digitale Pferdeakte an:\n${registrationUrl}\n\nBis bald!`
    );
    window.open(`mailto:${emails}?subject=${subject}&body=${body}`, "_self");
    const ids = new Set([...sentIds, ...withEmail.map(r => r.contact.id)]);
    setSentIds(ids);
    toast({ title: `E-Mail-Einladung für ${withEmail.length} Kontakte geöffnet` });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    toast({ title: "Einladungslink kopiert!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          {successful.length} Kontakte importiert — jetzt einladen!
        </h3>
        <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
          {selected.size === successful.length ? "Keine" : "Alle"} auswählen
        </Button>
      </div>

      {/* Contact list with checkboxes */}
      <ScrollArea className="max-h-[35vh] rounded-lg border">
        <div className="divide-y">
          {successful.map(r => {
            const c = r.contact;
            const isSent = sentIds.has(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={selected.has(c.id)}
                  onCheckedChange={() => toggleSelect(c.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[c.email, c.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {isSent && (
                  <Badge variant="secondary" className="gap-1 text-xs text-emerald-600">
                    <CheckCheck className="h-3 w-3" /> Eingeladen
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Invitation action buttons - vertical */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={sendWhatsApp}
          disabled={selected.size === 0}
          className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white justify-start"
        >
          <MessageCircle className="h-4 w-4" />
          Per WhatsApp einladen ({selectedContacts.filter(r => r.contact.phone).length})
        </Button>
        <Button
          onClick={sendSMS}
          disabled={selected.size === 0}
          variant="outline"
          className="w-full gap-2 justify-start"
        >
          <Smartphone className="h-4 w-4" />
          Per SMS einladen ({selectedContacts.filter(r => r.contact.phone).length})
        </Button>
        <Button
          onClick={sendEmailInvites}
          disabled={selected.size === 0}
          variant="outline"
          className="w-full gap-2 justify-start"
        >
          <Mail className="h-4 w-4" />
          Per E-Mail einladen ({selectedContacts.filter(r => r.contact.email).length})
        </Button>
        <Button
          onClick={copyLink}
          variant="ghost"
          className="w-full gap-2 justify-start"
        >
          <Copy className="h-4 w-4" />
          Einladungslink kopieren
        </Button>
      </div>
    </div>
  );
};

export default ImportInvitationPanel;
