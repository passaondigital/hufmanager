import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Share2, Copy, Check } from "lucide-react";
import { shareViaWhatsApp, waTextInvite } from "@/lib/whatsappTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WhatsAppInviteButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}

export function WhatsAppInviteButton({
  variant = "outline",
  size = "sm",
  className = "",
  label = "Freunde einladen",
}: WhatsAppInviteButtonProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user?.id]);

  const inviteText = waTextInvite(fullName || "Ein Pferdefreund");
  const inviteLink = "https://hufiapp.de/auth";

  const handleWhatsAppShare = () => {
    shareViaWhatsApp(inviteText);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={`gap-2 ${className}`}>
          <Share2 className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Freunde & Partner einladen
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Teile Hufi mit deinen Stallkollegen, Reitbeteiligungen oder Pferdefreunden.
          </p>

          <div className="p-3 rounded-lg bg-muted/50 text-sm text-foreground whitespace-pre-line">
            {inviteText}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleWhatsAppShare}
              className="flex-1 gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Per WhatsApp teilen
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert" : "Link"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Pferdeschutz + Datenschutz 🐴🔒
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
