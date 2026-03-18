import { Camera, FileText, CalendarPlus, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  horseId: string;
}

const ACTIONS = [
  { label: "HufCam", icon: Camera, primary: true, action: "hufcam" },
  { label: "Befund", icon: FileText, primary: false, action: "befund" },
  { label: "Termin", icon: CalendarPlus, primary: false, action: "termin" },
  { label: "Chat", icon: MessageCircle, primary: false, action: "chat" },
] as const;

export function QuickActions({ horseId }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    switch (action) {
      case "hufcam":
        navigate(`/client-horse/${horseId}?tab=fotos`);
        break;
      case "befund":
        navigate(`/client-horse/${horseId}?tab=gesundheit`);
        break;
      case "termin":
        navigate(`/kalender?horse=${horseId}&action=new`);
        break;
      case "chat":
        navigate(`/client-horse/${horseId}?tab=team`);
        break;
    }
  };

  return (
    <div className="flex gap-2 px-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.action}
            onClick={() => handleAction(a.action)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
              a.primary ? "hp-primary-btn" : "hp-ghost-btn"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
