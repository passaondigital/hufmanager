import { Camera, FileText, CalendarPlus, MessageCircle, Phone, PenLine, Upload, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface QuickActionsBarProps {
  horseId: string;
  role: Role;
  onAction?: (action: string) => void;
}

const PROVIDER_ACTIONS = [
  { key: "hufcam", label: "HufCam", icon: Camera, primary: true },
  { key: "befund", label: "Befund", icon: ClipboardList, primary: false },
  { key: "termin", label: "Termin", icon: CalendarPlus, primary: false },
  { key: "notiz", label: "Notiz", icon: PenLine, primary: false },
];

const CLIENT_ACTIONS = [
  { key: "chat", label: "Chat", icon: MessageCircle, primary: true },
  { key: "termin", label: "Termin buchen", icon: CalendarPlus, primary: false },
  { key: "upload-photo", label: "Foto", icon: Camera, primary: false },
  { key: "upload-doc", label: "Dokument", icon: Upload, primary: false },
];

const PARTNER_ACTIONS = [
  { key: "anrufen", label: "Kontakt", icon: Phone, primary: false },
];

export function QuickActionsBar({ horseId, role, onAction }: QuickActionsBarProps) {
  const navigate = useNavigate();

  if (role === "portal") return null;

  const actions = role === "client" ? CLIENT_ACTIONS
    : role === "partner" ? PARTNER_ACTIONS
    : PROVIDER_ACTIONS;

  const handleAction = (key: string) => {
    if (onAction) {
      onAction(key);
      return;
    }
    // Fallback navigation for actions without custom handler
    switch (key) {
      case "termin":
        navigate(role === "client" ? "/client-booking" : "/calendar");
        break;
      case "chat":
        navigate("/client-chat");
        break;
    }
  };

  return (
    <div className="flex gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={() => handleAction(a.key)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95",
              a.primary
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
