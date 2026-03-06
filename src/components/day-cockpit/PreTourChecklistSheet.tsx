import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Wrench, Fuel, MapPin, Smartphone, ShieldCheck, Bell, BellOff } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "werkzeug", label: "Werkzeug & Ausrüstung eingepackt", icon: <Wrench className="h-5 w-5" /> },
  { id: "tank", label: "Tank / Ladung geprüft", icon: <Fuel className="h-5 w-5" /> },
  { id: "navi", label: "Navigation & GPS aktiv", icon: <MapPin className="h-5 w-5" /> },
  { id: "handy", label: "Handy geladen & Empfang", icon: <Smartphone className="h-5 w-5" /> },
  { id: "sicherheit", label: "Sicherheitsausrüstung dabei", icon: <ShieldCheck className="h-5 w-5" /> },
];

interface PreTourChecklistSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { notifyClients: boolean }) => void;
  isStarting?: boolean;
  appointmentCount?: number;
}

export function PreTourChecklistSheet({ open, onOpenChange, onConfirm, isStarting, appointmentCount }: PreTourChecklistSheetProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notifyClients, setNotifyClients] = useState(true);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = checked.size === DEFAULT_CHECKLIST.length;

  const handleConfirm = () => {
    onConfirm({ notifyClients });
    setChecked(new Set());
    setNotifyClients(true);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-0" style={{ background: "#1a1a1a" }}>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-bold text-white">
            Checkliste vor Tour-Start
          </DrawerTitle>
          <DrawerDescription className="text-sm" style={{ color: "#999" }}>
            Bitte alle Punkte bestätigen, bevor du losfährst.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {DEFAULT_CHECKLIST.map((item, idx) => {
            const isChecked = checked.has(item.id);
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => toggle(item.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{
                  background: isChecked ? "#F5970A15" : "#222",
                  border: isChecked ? "1px solid #F5970A40" : "1px solid transparent",
                }}
              >
                {isChecked ? (
                  <CheckCircle2 className="h-6 w-6 flex-shrink-0" style={{ color: "#F5970A" }} />
                ) : (
                  <Circle className="h-6 w-6 flex-shrink-0" style={{ color: "#555" }} />
                )}
                <span className="flex items-center gap-2 text-left">
                  <span style={{ color: isChecked ? "#F5970A" : "#888" }}>{item.icon}</span>
                  <span className="text-sm font-medium" style={{ color: isChecked ? "#fff" : "#aaa" }}>
                    {item.label}
                  </span>
                </span>
              </motion.button>
            );
          })}

          {/* Notify clients toggle */}
          <div className="pt-2 border-t" style={{ borderColor: "#333" }}>
            <button
              onClick={() => setNotifyClients(!notifyClients)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{
                background: notifyClients ? "#22c55e15" : "#222",
                border: notifyClients ? "1px solid #22c55e40" : "1px solid transparent",
              }}
            >
              {notifyClients ? (
                <Bell className="h-6 w-6 flex-shrink-0" style={{ color: "#22c55e" }} />
              ) : (
                <BellOff className="h-6 w-6 flex-shrink-0" style={{ color: "#555" }} />
              )}
              <div className="text-left flex-1">
                <span className="text-sm font-medium block" style={{ color: notifyClients ? "#fff" : "#aaa" }}>
                  Kunden benachrichtigen
                </span>
                <span className="text-[11px]" style={{ color: "#666" }}>
                  {notifyClients
                    ? `${appointmentCount || 0} Kunden erhalten eine Push-Nachricht`
                    : "Keine Benachrichtigung beim Start"}
                </span>
              </div>
            </button>
          </div>
        </div>

        <DrawerFooter className="gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!allChecked || isStarting}
            className="w-full h-14 text-lg font-bold rounded-xl disabled:opacity-40"
            style={{
              background: allChecked ? "#F5970A" : "#555",
              color: "#111",
            }}
          >
            {isStarting ? "Wird gestartet…" : `Tour starten (${checked.size}/${DEFAULT_CHECKLIST.length})`}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full text-sm" style={{ color: "#666" }}>
              Abbrechen
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
