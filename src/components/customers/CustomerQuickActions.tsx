import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Navigation } from "lucide-react";
import { toast } from "sonner";

interface CustomerQuickActionsProps {
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
}

export function CustomerQuickActions({
  phone,
  email,
  latitude,
  longitude,
  street,
  zipCode,
  city,
}: CustomerQuickActionsProps) {
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
      // Clean phone number for WhatsApp
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("0") 
        ? `49${cleanPhone.substring(1)}` 
        : cleanPhone;
      window.open(`https://wa.me/${formattedPhone}`, "_blank");
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
    <div className="grid grid-cols-4 gap-2">
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
  );
}
