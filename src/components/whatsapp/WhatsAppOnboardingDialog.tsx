import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const STORAGE_KEY = "hm_whatsapp_onboarding_seen";

interface WhatsAppOnboardingDialogProps {
  /** Nur anzeigen wenn Provider WhatsApp-Mode nutzt */
  enabled: boolean;
}

/**
 * Einmalige Anleitung beim ersten Klick auf einen WhatsApp-Button.
 * Wird nur 1x angezeigt, dann über localStorage gemerkt.
 */
export function useWhatsAppOnboarding(enabled: boolean) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasSeen = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";

  const triggerIfNeeded = (): boolean => {
    if (!enabled || hasSeen) return false;
    setShowOnboarding(true);
    return true;
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowOnboarding(false);
  };

  return { showOnboarding, triggerIfNeeded, dismiss };
}

export function WhatsAppOnboardingDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            So funktioniert WhatsApp-Kommunikation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
            <p>Klicke auf den WhatsApp-Button</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
            <p>WhatsApp öffnet sich automatisch mit einem vorbereiteten Text</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
            <p>Du kannst den Text noch anpassen</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">4</span>
            <p>Auf Senden tippen – fertig! ✓</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-xs">
            💡 <strong>Tipp:</strong> Speichere die Nummer deines Kunden in WhatsApp, damit er dich erkennt.
          </div>
        </div>
        <Button onClick={onClose} className="w-full mt-2">
          Verstanden!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
