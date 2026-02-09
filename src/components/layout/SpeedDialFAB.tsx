import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, User, PawPrint, Calendar, MessageCircle, LifeBuoy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpeedDialItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  subItems?: SpeedDialItem[];
}

export function SpeedDialFAB() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(null);

  const quickStartItems: SpeedDialItem[] = [
    {
      id: "customer",
      label: "Neuer Kunde",
      icon: <User className="h-4 w-4" />,
      action: () => {
        navigate("/kunden?action=new");
        setIsOpen(false);
        setExpandedSubMenu(null);
      },
    },
    {
      id: "horse",
      label: "Neues Pferd",
      icon: <PawPrint className="h-4 w-4" />,
      action: () => {
        navigate("/kunden?action=newHorse");
        setIsOpen(false);
        setExpandedSubMenu(null);
      },
    },
    {
      id: "appointment",
      label: "Neuer Termin",
      icon: <Calendar className="h-4 w-4" />,
      action: () => {
        navigate("/kalender?action=new");
        setIsOpen(false);
        setExpandedSubMenu(null);
      },
    },
  ];

  const mainItems: SpeedDialItem[] = [
    {
      id: "hufi",
      label: "Hufi fragen",
      icon: <MessageCircle className="h-5 w-5" />,
      action: () => {
        navigate("/chat");
        setIsOpen(false);
      },
    },
    {
      id: "help",
      label: "Hilfe",
      icon: <LifeBuoy className="h-5 w-5" />,
      action: () => {
        navigate("/support");
        setIsOpen(false);
      },
    },
    {
      id: "quickstart",
      label: "Neu anlegen",
      icon: <Zap className="h-5 w-5" />,
      action: () => {
        setExpandedSubMenu(expandedSubMenu === "quickstart" ? null : "quickstart");
      },
      subItems: quickStartItems,
    },
  ];

  const handleClose = () => {
    setIsOpen(false);
    setExpandedSubMenu(null);
  };

  return (
    <>
      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleClose}
        />
      )}

      {/* Speed Dial Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* Speed Dial Items */}
        {isOpen && mainItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-end gap-2"
          >
            {/* Sub-items for Neu anlegen */}
            {item.id === "quickstart" && expandedSubMenu === "quickstart" && item.subItems && (
              <div className="flex flex-col items-end gap-2 mr-14">
                {item.subItems.map((subItem) => (
                  <div
                    key={subItem.id}
                    className="flex items-center gap-2"
                  >
                    <span className="px-3 py-1.5 bg-card rounded-lg text-sm font-medium whitespace-nowrap border border-border">
                      {subItem.label}
                    </span>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 rounded-lg bg-card hover:bg-muted border border-border"
                      onClick={subItem.action}
                    >
                      {subItem.icon}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Main item row */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-card rounded-lg text-sm font-medium whitespace-nowrap border border-border">
                {item.label}
              </span>

              <Button
                size="icon"
                variant={item.id === "quickstart" && expandedSubMenu === "quickstart" ? "default" : "secondary"}
                className={cn(
                  "h-12 w-12 rounded-lg border",
                  item.id === "quickstart" && expandedSubMenu === "quickstart"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-border"
                )}
                onClick={item.action}
              >
                {item.icon}
              </Button>
            </div>
          </div>
        ))}

        {/* Main FAB Button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-lg",
            "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    </>
  );
}
