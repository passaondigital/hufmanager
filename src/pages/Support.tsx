import { useNavigate } from "react-router-dom";
import { MessageCircle, HelpCircle, Mail, PlayCircle } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { Badge } from "@/components/ui/badge";

interface SupportProps {
  basePath?: string;
}

const Support = ({ basePath }: SupportProps) => {
  const navigate = useNavigate();

  const handleChatOpen = () => {
    const fab = document.querySelector<HTMLButtonElement>(
      'button.fixed.bottom-24.right-4, button.fixed.bottom-6.right-4, button.fixed.bottom-6.right-6'
    );
    if (fab) fab.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="🛟" title="Hilfe & Support" subtitle="Finde Antworten oder kontaktiere uns" />

      <TileCategory title="Support-Optionen">
        <Tile
          icon={<MessageCircle className="w-10 h-10 text-primary" />}
          title="Chat starten"
          description="Frag Hufi — KI-Assistent, Sofort-Hilfe, 24/7 verfügbar"
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
          description="Häufige Fragen, Anleitungen, Problemlösungen"
          onClick={() => navigate("/faq")}
        />
        <Tile
          icon={<Mail className="w-10 h-10 text-primary" />}
          title="E-Mail"
          description="Persönlicher Support, Feedback, Fehlermeldungen"
          onClick={() => window.location.href = "mailto:support@hufiapp.de"}
        />
        <Tile
          icon={<PlayCircle className="w-10 h-10 text-primary" />}
          title="Video-Tutorials"
          description="Schritt-für-Schritt, Einrichtung, Tipps & Tricks"
          onClick={() => navigate("/hilfe?section=videos")}
        />
      </TileCategory>
    </div>
  );
};

export default Support;
