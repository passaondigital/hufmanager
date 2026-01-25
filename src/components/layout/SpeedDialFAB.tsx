import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      label: "Hilfe & Anleitung",
      icon: <LifeBuoy className="h-5 w-5" />,
      action: () => {
        navigate("/support");
        setIsOpen(false);
      },
    },
    {
      id: "quickstart",
      label: "Schnell-Start",
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Speed Dial Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* Speed Dial Items */}
        <AnimatePresence>
          {isOpen && mainItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="flex flex-col items-end gap-2"
            >
              {/* Sub-items for Schnell-Start */}
              <AnimatePresence>
                {item.id === "quickstart" && expandedSubMenu === "quickstart" && item.subItems && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col items-end gap-2 mr-14"
                  >
                    {item.subItems.map((subItem, subIndex) => (
                      <motion.div
                        key={subItem.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: subIndex * 0.03 }}
                        className="flex items-center gap-2"
                      >
                        <span className="px-3 py-1.5 bg-card rounded-lg shadow-lg text-sm font-medium whitespace-nowrap border border-border">
                          {subItem.label}
                        </span>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full shadow-md bg-card hover:bg-muted border border-border"
                          onClick={subItem.action}
                        >
                          {subItem.icon}
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main item row */}
              <div className="flex items-center gap-3">
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="px-3 py-1.5 bg-card rounded-lg shadow-lg text-sm font-medium whitespace-nowrap border border-border"
                >
                  {item.label}
                </motion.span>
                
                <Button
                  size="icon"
                  variant={item.id === "quickstart" && expandedSubMenu === "quickstart" ? "default" : "secondary"}
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg border",
                    item.id === "quickstart" && expandedSubMenu === "quickstart"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted border-border"
                  )}
                  onClick={item.action}
                >
                  {item.icon}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Main FAB Button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            isOpen && "rotate-45"
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
