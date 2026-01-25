import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, User, PawPrint, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpeedDialItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color?: string;
}

export function SpeedDialFAB() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const speedDialItems: SpeedDialItem[] = [
    {
      id: "customer",
      label: "Neuer Kunde",
      icon: <User className="h-5 w-5" />,
      action: () => {
        navigate("/kunden?action=new");
        setIsOpen(false);
      },
    },
    {
      id: "horse",
      label: "Neues Pferd",
      icon: <PawPrint className="h-5 w-5" />,
      action: () => {
        navigate("/kunden?action=newHorse");
        setIsOpen(false);
      },
    },
    {
      id: "appointment",
      label: "Neuer Termin",
      icon: <Calendar className="h-5 w-5" />,
      action: () => {
        navigate("/kalender?action=new");
        setIsOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Speed Dial Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Speed Dial Items */}
        <AnimatePresence>
          {isOpen && speedDialItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="flex items-center gap-3"
            >
              {/* Label */}
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.05 + 0.1 }}
                className="px-3 py-1.5 bg-background rounded-lg shadow-lg text-sm font-medium whitespace-nowrap border"
              >
                {item.label}
              </motion.span>
              
              {/* Action Button */}
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full shadow-lg bg-background hover:bg-muted border"
                onClick={item.action}
              >
                {item.icon}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Main FAB Button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
            "bg-primary hover:bg-primary/90",
            isOpen && "rotate-45 bg-muted hover:bg-muted/90 text-foreground"
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
