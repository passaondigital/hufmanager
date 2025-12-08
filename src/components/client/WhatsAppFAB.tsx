import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface WhatsAppFABProps {
  userId: string;
}

export function WhatsAppFAB({ userId }: WhatsAppFABProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviderPhone = async () => {
      // Get the active access grant to find the provider
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!grant) return;

      // Get the provider's business settings
      const { data: settings } = await supabase
        .from("business_settings")
        .select("phone")
        .eq("user_id", grant.provider_id)
        .maybeSingle();

      if (settings?.phone) {
        // Format phone number for WhatsApp (remove spaces, ensure country code)
        let phone = settings.phone.replace(/\s/g, "").replace(/[^\d+]/g, "");
        if (phone.startsWith("0")) {
          phone = "+49" + phone.slice(1);
        }
        setPhoneNumber(phone);
      }
    };

    fetchProviderPhone();
  }, [userId]);

  if (!phoneNumber) return null;

  const handleClick = () => {
    window.open(`https://wa.me/${phoneNumber.replace("+", "")}`, "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-green-500 hover:bg-green-600 z-50"
      size="icon"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Button>
  );
}
