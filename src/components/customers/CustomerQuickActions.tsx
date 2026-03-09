import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { openWhatsApp, waTextGeneral } from "@/lib/whatsappTemplates";

interface CustomerQuickActionsProps {
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  customerName?: string | null;
}

export function CustomerQuickActions({
  phone,
  email,
  latitude,
  longitude,
  street,
  zipCode,
  city,
  customerName,
}: CustomerQuickActionsProps) {
  const { isWhatsApp } = useCommunicationMode();

  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error("Keine Telefonnummer hinterlegt");
    }
  };

  const handleEmail = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    } else {
      toast.error("Keine E-Mail-Adresse hinterlegt");
    }
  };

  const handleWhatsApp = () => {
    if (phone) {
      openWhatsApp(phone, waTextGeneral(customerName || ""));
    } else {
      toast.error("Keine Telefonnummer für WhatsApp hinterlegt");
    }
  };

  const handleNavigate = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (latitude && longitude) {
      const url = isIOS
        ? `maps://maps.apple.com/?daddr=${latitude},${longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      window.open(url, "_blank");
    } else if (street && zipCode && city) {
      const address = encodeURIComponent(`${street}, ${zipCode} ${city}`);
      const url = isIOS
        ? `maps://maps.apple.com/?daddr=${address}`
        : `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      window.open(url, "_blank");
    } else {
      toast.error("Keine Adresse oder GPS-Koordinaten verfügbar");
    }
  };

  const hasNavigation = (latitude && longitude) || (street && zipCode && city);

  return (
    <div className="space-y-2">
      {/* WhatsApp primary button when in WA mode */}
      {isWhatsApp && (
        <Button
          className="w-full gap-2 bg-[#F5970A] hover:bg-[#F5970A]/90 text-white h-12 text-base font-semibold"
          onClick={handleWhatsApp}
          disabled={!phone}
        >
          <MessageCircle className="h-5 w-5" />
          Per WhatsApp schreiben
        </Button>
      )}
      
      <div className={`grid ${isWhatsApp ? "grid-cols-3" : "grid-cols-4"} gap-2`}>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
          onClick={handleCall}
          disabled={!phone}
        >
          <Phone className="h-5 w-5 text-green-600" />
          <span className="text-xs">Anrufen</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
          onClick={handleEmail}
          disabled={!email}
        >
          <Mail className="h-5 w-5 text-blue-600" />
          <span className="text-xs">Mail</span>
        </Button>
        
        {!isWhatsApp && (
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={handleWhatsApp}
            disabled={!phone}
          >
            <MessageCircle className="h-5 w-5 text-green-500" />
            <span className="text-xs">WhatsApp</span>
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
          onClick={handleNavigate}
          disabled={!hasNavigation}
        >
          <Navigation className="h-5 w-5 text-primary" />
          <span className="text-xs">Route</span>
        </Button>
      </div>
    </div>
  );
}
