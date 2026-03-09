import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp } from "@/lib/whatsappTemplates";

interface WhatsAppActionButtonProps {
  phone: string | null | undefined;
  text: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Called before opening WhatsApp — return true to block */
  onBeforeOpen?: () => boolean;
}

/**
 * Wiederverwendbarer WhatsApp-Button.
 * Zeigt Fehlermeldung wenn keine Telefonnummer hinterlegt.
 */
export function WhatsAppActionButton({
  phone,
  text,
  label = "Per WhatsApp schreiben",
  variant = "outline",
  size = "sm",
  className = "",
  onBeforeOpen,
}: WhatsAppActionButtonProps) {
  const handleClick = () => {
    if (onBeforeOpen?.()) return;
    if (!phone) {
      toast.error("Keine Telefonnummer hinterlegt");
      return;
    }
    openWhatsApp(phone, text);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      onClick={handleClick}
    >
      <MessageCircle className="h-4 w-4 text-green-500" />
      {label}
    </Button>
  );
}
