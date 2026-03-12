import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, HelpCircle, Mail, PlayCircle } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { Badge } from "@/components/ui/badge";

interface SupportProps {
  /** Base path for FAQ/video sub-routes */
  basePath?: string;
  /** Whether to show the chatbot inline or just open the FAB */
  onChatOpen?: () => void;
}

const Support = ({ basePath = "/hilfe", onChatOpen }: SupportProps) => {
  const navigate = useNavigate();
  const [chatTriggered, setChatTriggered] = useState(false);

  const handleChatOpen = () => {
    if (onChatOpen) {
      onChatOpen();
    } else {
      // Click the AI chat FAB button
      const fab = document.querySelector('[aria-label="Hilfe"]') as HTMLButtonElement
        || document.querySelector('button.fixed.bottom-24, button.fixed.bottom-6') as HTMLButtonElement;
      if (fab) fab.click();
      setChatTriggered(true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="🛟" title="Hilfe & Support" subtitle="Finde Antworten oder kontaktiere uns" />

      <TileCategory title="Support-Optionen">
        <Tile
          icon={<MessageCircle className="w-10 h-10 text-primary" />}
          title="Chat starten"
          description="Frag Hufi — unser KI-Assistent"
          status={
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs">
              Sofort
            </Badge>
          }
          onClick={handleChatOpen}
        />
        <Tile
          icon={<HelpCircle className="w-10 h-10 text-primary" />}
          title="FAQ"
          description="Häufige Fragen"
          onClick={() => navigate(basePath)}
        />
        <Tile
          icon={<Mail className="w-10 h-10 text-primary" />}
          title="E-Mail"
          description="support@hufmanager.de"
          onClick={() => window.location.href = "mailto:support@hufmanager.de"}
        />
        <Tile
          icon={<PlayCircle className="w-10 h-10 text-primary" />}
          title="Video-Tutorials"
          description="Schritt-für-Schritt"
          onClick={() => navigate(`${basePath}?section=videos`)}
        />
      </TileCategory>
    </div>
  );
};

export default Support;
