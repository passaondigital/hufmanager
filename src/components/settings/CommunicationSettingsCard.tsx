import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { CommunicationModeSelector } from "@/components/onboarding/CommunicationModeSelector";
import { toast } from "sonner";

export function CommunicationSettingsCard() {
  const { mode, whatsappNumber, setMode } = useCommunicationMode();

  const handleSelect = async (newMode: "whatsapp" | "hufmanager", number?: string) => {
    await setMode(newMode, number);
    toast.success(
      newMode === "whatsapp"
        ? "WhatsApp als Kommunikationsweg aktiviert"
        : "Hufi Chat als Kommunikationsweg aktiviert"
    );
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Kommunikationsweg
        </CardTitle>
        <CardDescription>
          Dein Kommunikationsweg bestimmt wie deine Kunden dich kontaktieren und wie du Dokumente und Infos teilst.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CommunicationModeSelector
          onSelect={handleSelect}
          compact
          currentMode={mode}
          currentNumber={whatsappNumber}
        />
      </CardContent>
    </Card>
  );
}
