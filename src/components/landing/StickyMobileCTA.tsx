import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  primaryColor: string;
  onBooking: () => void;
  whatsappNumber?: string | null;
  providerName: string;
}

export function StickyMobileCTA({ primaryColor, onBooking, whatsappNumber, providerName }: Props) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => {
      const contactEl = document.getElementById("kontakt");
      const contactVisible = contactEl
        ? contactEl.getBoundingClientRect().top < window.innerHeight
        : false;
      setVisible(window.scrollY > 300 && !contactVisible);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  if (!isMobile || !visible) return null;

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(`Hallo ${providerName}, ich hätte Interesse an einem Termin.`)}`
    : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex gap-2 max-w-lg mx-auto">
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
        )}
        <Button
          className="flex-1 gap-2"
          style={{ backgroundColor: primaryColor, color: "#fff" }}
          onClick={onBooking}
        >
          <Calendar className="h-4 w-4" />
          Anfragen
        </Button>
      </div>
    </div>
  );
}
